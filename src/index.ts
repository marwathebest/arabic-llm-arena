import { classify, isCategory, CATEGORIES, type Category } from './classify.ts';
import { updateElo, START_RATING, type Outcome } from './elo.ts';
import { judge } from './judge.ts';
import { getProviders, streamChat, SYSTEM_PROMPT, MODEL_IDS, type Env, type ModelId, type ChatResult } from './providers.ts';
import { sseMessage } from './sse.ts';

const MAX_PROMPT_CHARS = 2000;
const BATTLES_PER_MINUTE = 5;
const BATTLES_PER_DAY = 60;
/** Votes needed in a category before the router trusts its leader. */
const MIN_VOTES_FOR_ROUTING = 5;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
/** `code` lets the front end show a translated message; `error` is the English fallback. */
const fail = (message: string, status = 400, code = 'generic') => json({ error: message, code }, status);

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const { pathname } = url;
    try {
      if (pathname === '/api/config' && req.method === 'GET') return config(env);
      if (pathname === '/api/battle' && req.method === 'POST') return await startBattle(req, env, ctx);
      if (pathname === '/api/vote' && req.method === 'POST') return await vote(req, env, ctx);
      if (pathname === '/api/leaderboard' && req.method === 'GET') return await leaderboard(env);
      const m = pathname.match(/^\/api\/battle\/([\w-]{36})$/);
      if (m && req.method === 'GET') return await battleStatus(m[1], env);
      if (pathname.startsWith('/api/')) return fail('Not found', 404);
      return env.ASSETS.fetch(req);
    } catch (err) {
      console.error(err);
      return fail('Server error', 500);
    }
  },
} satisfies ExportedHandler<Env>;

function config(env: Env): Response {
  const providers = getProviders(env);
  return json({
    categories: CATEGORIES,
    maxPromptChars: MAX_PROMPT_CHARS,
    models: Object.fromEntries(MODEL_IDS.map((id) => [id, { label: providers[id].label, live: providers[id].live }])),
  });
}

// ── POST /api/battle ─────────────────────────────────────────────────────────
// Streams both answers over one SSE response. Sides are shuffled so the voter can't tell which is which.

async function startBattle(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const body = (await req.json().catch(() => null)) as { prompt?: unknown; category?: unknown } | null;
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) return fail('Prompt is empty', 400, 'empty');
  if (prompt.length > MAX_PROMPT_CHARS) return fail(`Prompt is longer than ${MAX_PROMPT_CHARS} characters`, 400, 'too_long');
  const category: Category = isCategory(body?.category) ? body.category : classify(prompt);

  const ipHash = await sha256(`arena:${req.headers.get('CF-Connecting-IP') ?? 'local'}`);
  const now = Date.now();
  const counts = await env.DB.prepare(
    `SELECT SUM(created_at > ?1) AS minute, COUNT(*) AS day FROM battles WHERE ip_hash = ?2 AND created_at > ?3`,
  )
    .bind(now - 60_000, ipHash, now - 86_400_000)
    .first<{ minute: number | null; day: number }>();
  if ((counts?.minute ?? 0) >= BATTLES_PER_MINUTE) return fail('Too many rounds — wait a minute and try again.', 429, 'rate_minute');
  if ((counts?.day ?? 0) >= BATTLES_PER_DAY) return fail('Daily limit reached — come back tomorrow.', 429, 'rate_day');

  const providers = getProviders(env);
  const [modelA, modelB]: ModelId[] = Math.random() < 0.5 ? ['humain', 'openai'] : ['openai', 'humain'];
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO battles (id, created_at, ip_hash, category, prompt, model_a, model_b) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, now, ipHash, category, prompt, modelA, modelB)
    .run();

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  let clientGone = false;
  // Writes are serialized so events from the two sides never interleave mid-message.
  let queue = Promise.resolve();
  const send = (event: string, data: unknown) => {
    queue = queue.then(async () => {
      if (clientGone) return;
      try {
        await writer.write(enc.encode(sseMessage(event, data)));
      } catch {
        clientGone = true; // keep generating so the answer is still saved for the leaderboard
      }
    });
    return queue;
  };

  const messages = (p: string) => [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    { role: 'user' as const, content: p },
  ];

  const run = async (side: 'a' | 'b', model: ModelId): Promise<ChatResult | Error> => {
    try {
      const result = await streamChat(providers[model], messages(prompt), (text) => void send('delta', { side, text }), category);
      await send('done', { side, ttftMs: result.ttftMs, totalMs: result.totalMs });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`side ${side} (${model}) failed:`, message);
      await send('error', { side, message: 'This model failed to answer. The round will not count.' });
      return err instanceof Error ? err : new Error(message);
    }
  };

  const work = (async () => {
    await send('meta', { battleId: id, category });
    const [ra, rb] = await Promise.all([run('a', modelA), run('b', modelB)]);
    const col = (r: ChatResult | Error) =>
      r instanceof Error
        ? [null, null, null, null, null, r.message.slice(0, 500)]
        : [r.text, r.ttftMs, r.totalMs, r.tokensOut, r.costUsd, null];
    await env.DB.prepare(
      `UPDATE battles SET
         answer_a = ?, ttft_a = ?, total_a = ?, tokens_a = ?, cost_a = ?, error_a = ?,
         answer_b = ?, ttft_b = ?, total_b = ?, tokens_b = ?, cost_b = ?, error_b = ?
       WHERE id = ?`,
    )
      .bind(...col(ra), ...col(rb), id)
      .run();
    await send('end', { ok: !(ra instanceof Error || rb instanceof Error) });
    await queue;
    if (!clientGone) await writer.close().catch(() => {});
  })();
  ctx.waitUntil(work);

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

// ── POST /api/vote ───────────────────────────────────────────────────────────

interface BattleRow {
  id: string;
  category: Category;
  prompt: string;
  model_a: ModelId;
  model_b: ModelId;
  answer_a: string | null;
  answer_b: string | null;
  error_a: string | null;
  error_b: string | null;
  tokens_a: number | null;
  tokens_b: number | null;
  cost_a: number | null;
  cost_b: number | null;
  ttft_a: number | null;
  ttft_b: number | null;
  total_a: number | null;
  total_b: number | null;
  winner: Outcome | null;
  judge: Outcome | null;
  judge_reason: string | null;
}

const OUTCOMES: Outcome[] = ['a', 'b', 'tie', 'both_bad'];

async function vote(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const body = (await req.json().catch(() => null)) as { battleId?: unknown; winner?: unknown } | null;
  const battleId = typeof body?.battleId === 'string' ? body.battleId : '';
  const winner = body?.winner as Outcome;
  if (!OUTCOMES.includes(winner)) return fail('Invalid vote');

  const b = await env.DB.prepare(`SELECT * FROM battles WHERE id = ?`).bind(battleId).first<BattleRow>();
  if (!b) return fail('Round not found', 404);
  if (b.answer_a === null && b.answer_b === null && !b.error_a && !b.error_b) return fail('Answers are still streaming', 409, 'streaming');
  if (b.error_a || b.error_b) return fail('A model failed in this round, so it cannot be voted on', 409, 'failed_round');

  // Atomic claim: only the first vote on a round counts.
  const claimed = await env.DB.prepare(`UPDATE battles SET winner = ?, voted_at = ? WHERE id = ? AND winner IS NULL`)
    .bind(winner, Date.now(), battleId)
    .run();
  if (!claimed.meta.changes) return fail('This round already has a vote', 409, 'voted');

  for (const category of [b.category, 'all']) await applyElo(env, category, b.model_a, b.model_b, winner);

  const providers = getProviders(env);
  ctx.waitUntil(
    judge(providers.openai, env.JUDGE_MODEL || providers.openai.model, b.prompt, b.answer_a ?? '', b.answer_b ?? '')
      .then((v) => env.DB.prepare(`UPDATE battles SET judge = ?, judge_reason = ? WHERE id = ?`).bind(v.winner, v.reason, battleId).run())
      .catch((err) => console.error('judge failed:', err)),
  );

  const reveal = (side: 'a' | 'b') => {
    const model = side === 'a' ? b.model_a : b.model_b;
    return {
      model,
      label: providers[model].label,
      live: providers[model].live,
      tokens: side === 'a' ? b.tokens_a : b.tokens_b,
      costUsd: side === 'a' ? b.cost_a : b.cost_b,
      ttftMs: side === 'a' ? b.ttft_a : b.ttft_b,
      totalMs: side === 'a' ? b.total_a : b.total_b,
    };
  };
  return json({ ok: true, a: reveal('a'), b: reveal('b') });
}

async function applyElo(env: Env, category: string, modelA: ModelId, modelB: ModelId, outcome: Outcome) {
  await env.DB.batch(
    [modelA, modelB].map((m) =>
      env.DB.prepare(`INSERT OR IGNORE INTO ratings (category, model, rating) VALUES (?, ?, ?)`).bind(category, m, START_RATING),
    ),
  );
  const rows = await env.DB.prepare(`SELECT model, rating FROM ratings WHERE category = ? AND model IN (?, ?)`)
    .bind(category, modelA, modelB)
    .all<{ model: ModelId; rating: number }>();
  const rating = (m: ModelId) => rows.results.find((r) => r.model === m)?.rating ?? START_RATING;
  const [na, nb] = updateElo(rating(modelA), rating(modelB), outcome);

  const tally = (side: 'a' | 'b') =>
    outcome === side ? 'wins = wins + 1' : outcome === 'a' || outcome === 'b' ? 'losses = losses + 1' : 'ties = ties + 1';
  await env.DB.batch([
    env.DB.prepare(`UPDATE ratings SET rating = ?, ${tally('a')} WHERE category = ? AND model = ?`).bind(na, category, modelA),
    env.DB.prepare(`UPDATE ratings SET rating = ?, ${tally('b')} WHERE category = ? AND model = ?`).bind(nb, category, modelB),
  ]);
}

// ── GET /api/battle/:id ──────────────────────────────────────────────────────
// Only reveals the AI judge after a human has voted, so it can't influence the vote.

async function battleStatus(id: string, env: Env): Promise<Response> {
  const b = await env.DB.prepare(`SELECT winner, judge, judge_reason FROM battles WHERE id = ?`)
    .bind(id)
    .first<Pick<BattleRow, 'winner' | 'judge' | 'judge_reason'>>();
  if (!b) return fail('Round not found', 404);
  if (!b.winner) return json({ voted: false });
  return json({ voted: true, winner: b.winner, judge: b.judge, judgeReason: b.judge_reason });
}

// ── GET /api/leaderboard ─────────────────────────────────────────────────────

async function leaderboard(env: Env): Promise<Response> {
  const providers = getProviders(env);
  const [ratings, perf, agreement, totals] = await env.DB.batch([
    env.DB.prepare(`SELECT category, model, rating, wins, losses, ties FROM ratings`),
    // Each battle row has one model on side a and one on side b; unpivot to per-model stats.
    env.DB.prepare(`
      SELECT model, COUNT(*) AS answers, AVG(ttft) AS ttft, AVG(total) AS total, AVG(cost) AS cost, AVG(tokens) AS tokens
      FROM (
        SELECT model_a AS model, ttft_a AS ttft, total_a AS total, cost_a AS cost, tokens_a AS tokens FROM battles WHERE answer_a IS NOT NULL
        UNION ALL
        SELECT model_b, ttft_b, total_b, cost_b, tokens_b FROM battles WHERE answer_b IS NOT NULL
      ) GROUP BY model`),
    env.DB.prepare(`SELECT COUNT(*) AS judged, SUM(winner = judge) AS agreed FROM battles WHERE winner IS NOT NULL AND judge IS NOT NULL`),
    env.DB.prepare(`SELECT COUNT(*) AS rounds, SUM(winner IS NOT NULL) AS votes FROM battles`),
  ]);

  type RatingRow = { category: string; model: ModelId; rating: number; wins: number; losses: number; ties: number };
  const byCategory: Record<string, (RatingRow & { label: string; votes: number })[]> = {};
  for (const r of ratings.results as RatingRow[]) {
    (byCategory[r.category] ??= []).push({ ...r, label: providers[r.model]?.label ?? r.model, votes: r.wins + r.losses + r.ties });
  }
  for (const list of Object.values(byCategory)) list.sort((x, y) => y.rating - x.rating);

  // The "router": per category, which model should answer by default, once there's enough evidence.
  const router: Record<string, { model: ModelId; label: string; votes: number } | null> = {};
  for (const cat of ['all', ...CATEGORIES]) {
    const list = byCategory[cat];
    const votes = list?.[0]?.votes ?? 0;
    router[cat] = list && votes >= MIN_VOTES_FOR_ROUTING ? { model: list[0].model, label: list[0].label, votes } : null;
  }

  const agree = agreement.results[0] as { judged: number; agreed: number | null };
  const total = totals.results[0] as { rounds: number; votes: number | null };
  return json({
    categories: byCategory,
    router,
    minVotesForRouting: MIN_VOTES_FOR_ROUTING,
    performance: (perf.results as any[]).map((p) => ({ ...p, label: providers[p.model as ModelId]?.label ?? p.model })),
    judgeAgreement: { judged: agree.judged, agreed: agree.agreed ?? 0 },
    totals: { rounds: total.rounds, votes: total.votes ?? 0 },
  });
}
