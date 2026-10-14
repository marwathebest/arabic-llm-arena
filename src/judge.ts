import { authHeaders, chatUrl, type Provider } from './providers.ts';
import type { Outcome } from './elo.ts';

export interface Verdict {
  winner: Outcome;
  reason: string;
}

const JUDGE_INSTRUCTIONS = `You are an impartial judge comparing two AI answers to the same user prompt.
The user is usually Saudi and often writes in Saudi dialect or Arabic.
Judge on, in order: factual correctness, following the prompt, answering in the user's language and dialect,
cultural appropriateness, clarity and concision. Ignore answer order and length on their own.
Return "a" or "b" for the better answer, "tie" if equally good, or "both_bad" if neither is acceptable.
Write "reason" in Arabic, at most two short sentences.`;

const SCHEMA = {
  name: 'verdict',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      winner: { type: 'string', enum: ['a', 'b', 'tie', 'both_bad'] },
      reason: { type: 'string' },
    },
    required: ['winner', 'reason'],
  },
};

export function parseVerdict(raw: string): Verdict {
  const json = JSON.parse(raw);
  if (!['a', 'b', 'tie', 'both_bad'].includes(json?.winner)) throw new Error(`bad verdict: ${raw.slice(0, 120)}`);
  return { winner: json.winner, reason: String(json.reason ?? '').slice(0, 400) };
}

/**
 * Asks an LLM to pick the better answer, using structured output so the verdict is always valid JSON.
 * Without a key it falls back to a transparent heuristic so the demo still shows the flow.
 */
export async function judge(p: Provider, model: string, prompt: string, a: string, b: string): Promise<Verdict> {
  if (!p.live) {
    const winner: Outcome = Math.abs(a.length - b.length) < 20 ? 'tie' : a.length > b.length ? 'a' : 'b';
    return { winner, reason: 'وضع تجريبي: الحَكَم الآلي يختار الإجابة الأكثر تفصيلاً حتى يُضاف مفتاح OpenAI.' };
  }

  const res = await fetch(chatUrl(p), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(p) },
    body: JSON.stringify({
      model,
      max_completion_tokens: 4000,
      response_format: { type: 'json_schema', json_schema: SCHEMA },
      messages: [
        { role: 'system', content: JUDGE_INSTRUCTIONS },
        { role: 'user', content: `PROMPT:\n${prompt}\n\n=== ANSWER A ===\n${a}\n\n=== ANSWER B ===\n${b}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`judge HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data: any = await res.json();
  return parseVerdict(data.choices?.[0]?.message?.content ?? '');
}
