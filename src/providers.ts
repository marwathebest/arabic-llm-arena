import { SSEParser } from './sse.ts';
import type { Category } from './classify.ts';

export type ModelId = 'humain' | 'openai';
export const MODEL_IDS: ModelId[] = ['humain', 'openai'];

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  HUMAIN_API_KEY?: string;
  HUMAIN_BASE_URL?: string;
  HUMAIN_MODEL?: string;
  HUMAIN_AUTH_STYLE?: string;
  HUMAIN_PRICE_IN?: string;
  HUMAIN_PRICE_OUT?: string;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  OPENAI_MODEL?: string;
  OPENAI_PRICE_IN?: string;
  OPENAI_PRICE_OUT?: string;
  JUDGE_MODEL?: string;
}

export interface Provider {
  id: ModelId;
  label: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  authStyle: 'bearer' | 'api-key';
  /** USD per 1M tokens */
  priceIn: number;
  priceOut: number;
  /** false = no key configured, answers come from the built-in demo generator */
  live: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  text: string;
  ttftMs: number;
  totalMs: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export function getProviders(env: Env): Record<ModelId, Provider> {
  const humainKey = env.HUMAIN_API_KEY ?? '';
  const humainUrl = env.HUMAIN_BASE_URL ?? '';
  const openaiKey = env.OPENAI_API_KEY ?? '';
  return {
    humain: {
      id: 'humain',
      label: `HUMAIN · ${env.HUMAIN_MODEL || 'ALLaM'}`,
      baseUrl: humainUrl,
      apiKey: humainKey,
      model: env.HUMAIN_MODEL || 'allam',
      authStyle: env.HUMAIN_AUTH_STYLE === 'api-key' ? 'api-key' : 'bearer',
      priceIn: num(env.HUMAIN_PRICE_IN, 0),
      priceOut: num(env.HUMAIN_PRICE_OUT, 0),
      live: Boolean(humainKey && humainUrl),
    },
    openai: {
      id: 'openai',
      label: `OpenAI · ${env.OPENAI_MODEL || 'gpt-5-mini'}`,
      baseUrl: env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      apiKey: openaiKey,
      model: env.OPENAI_MODEL || 'gpt-5-mini',
      authStyle: 'bearer',
      priceIn: num(env.OPENAI_PRICE_IN, 0.25),
      priceOut: num(env.OPENAI_PRICE_OUT, 2),
      live: Boolean(openaiKey),
    },
  };
}

export const SYSTEM_PROMPT =
  'أنت مساعد مفيد ودقيق. أجب بنفس لغة السؤال ولهجته (إذا كتب المستخدم باللهجة السعودية فأجب بها). ' +
  'كن واضحاً ومختصراً، ولا تتجاوز 250 كلمة إلا إذا طُلب منك ذلك.';

/** Rough token count when a provider doesn't report usage (~4 chars per token). */
export const estimateTokens = (text: string) => Math.max(1, Math.ceil(text.length / 4));

export function costOf(p: Provider, tokensIn: number, tokensOut: number): number {
  return (tokensIn * p.priceIn + tokensOut * p.priceOut) / 1_000_000;
}

export function authHeaders(p: Provider): Record<string, string> {
  return p.authStyle === 'api-key' ? { 'api-key': p.apiKey } : { Authorization: `Bearer ${p.apiKey}` };
}

export function chatUrl(p: Provider): string {
  return `${p.baseUrl.replace(/\/+$/, '')}/chat/completions`;
}

/**
 * Streams one chat completion from any OpenAI-compatible endpoint,
 * calling onDelta for every text fragment as it arrives.
 */
export async function streamChat(
  p: Provider,
  messages: ChatMessage[],
  onDelta: (text: string) => void | Promise<void>,
  category: Category,
): Promise<ChatResult> {
  if (!p.live) return mockChat(p, messages, onDelta, category);

  const started = Date.now();
  const body: Record<string, unknown> = { model: p.model, messages, stream: true };
  // OpenAI's newer models only accept max_completion_tokens; most other providers still use max_tokens.
  if (p.id === 'openai') {
    body.max_completion_tokens = 4000;
    body.stream_options = { include_usage: true };
  } else {
    body.max_tokens = 1200;
  }

  const res = await fetch(chatUrl(p), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(p) },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    throw new Error(`${p.label} returned HTTP ${res.status} ${detail}`.trim());
  }

  const parser = new SSEParser();
  const decoder = new TextDecoder();
  const reader = res.body.getReader();
  let text = '';
  let ttftMs = 0;
  let usage: { prompt_tokens?: number; completion_tokens?: number } | undefined;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const evt of parser.feed(decoder.decode(value, { stream: true }))) {
      if (evt.data === '[DONE]') continue;
      let json: any;
      try {
        json = JSON.parse(evt.data);
      } catch {
        continue;
      }
      if (json.usage) usage = json.usage;
      const delta: string | undefined = json.choices?.[0]?.delta?.content;
      if (delta) {
        if (!ttftMs) ttftMs = Date.now() - started;
        text += delta;
        await onDelta(delta);
      }
    }
  }

  const tokensIn = usage?.prompt_tokens ?? estimateTokens(messages.map((m) => m.content).join('\n'));
  const tokensOut = usage?.completion_tokens ?? estimateTokens(text);
  return {
    text,
    ttftMs: ttftMs || Date.now() - started,
    totalMs: Date.now() - started,
    tokensIn,
    tokensOut,
    costUsd: costOf(p, tokensIn, tokensOut),
  };
}

// ── Demo mode ────────────────────────────────────────────────────────────────
// Lets the arena run end to end (and be deployed as a public demo) before any API key exists.

const DEMO_OPENINGS: Record<ModelId, Record<Category, string>> = {
  humain: {
    dialect: 'هلا والله! سؤالك حلو، وخلني أجاوبك على السريع وبشكل واضح:',
    msa: 'سؤال وجيه. إليك الإجابة بإيجاز ووضوح:',
    code: 'تمام، هذا حل مبسّط مع شرح سريع:',
    culture: 'هذا موضوع قريب من القلب، وإليك أهم النقاط:',
    translation: 'هذه الترجمة مع مراعاة السياق المحلي:',
    other: 'Sure, here is a clear and short answer:',
  },
  openai: {
    dialect: 'أكيد! هذي إجابة مختصرة على سؤالك:',
    msa: 'بالتأكيد. فيما يلي إجابة منظمة:',
    code: 'Here is a working approach, step by step:',
    culture: 'إليك نظرة عامة على الموضوع:',
    translation: 'Here is the translation:',
    other: 'Here is a structured answer:',
  },
};

const DEMO_POINTS = [
  'النقطة الأولى: حدّد الهدف بوضوح قبل أي خطوة.',
  'النقطة الثانية: ابدأ بنسخة صغيرة تشتغل، ثم طوّرها.',
  'النقطة الثالثة: اختبر النتيجة على مستخدمين حقيقيين وقِس الفرق.',
  'النقطة الرابعة: وثّق ما تعلّمته حتى تكرّره بسهولة.',
];

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function demoAnswer(p: Provider, prompt: string, category: Category): string {
  const seed = hashString(p.id + prompt);
  const count = 2 + (seed % 3);
  const points = DEMO_POINTS.slice(0, count).map((pt) => `- ${pt}`).join('\n');
  return (
    `${DEMO_OPENINGS[p.id][category]}\n\n${points}\n\n` +
    // Must not name the model: the round is blind until the vote.
    '> **وضع تجريبي:** هذه إجابة مولّدة محلياً لأن مفتاح هذا النموذج غير مُعدّ بعد.'
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function mockChat(
  p: Provider,
  messages: ChatMessage[],
  onDelta: (text: string) => void | Promise<void>,
  category: Category,
): Promise<ChatResult> {
  const started = Date.now();
  const prompt = messages[messages.length - 1]?.content ?? '';
  const full = demoAnswer(p, prompt, category);
  const seed = hashString(p.id + prompt);
  await sleep(250 + (seed % 500));
  const ttftMs = Date.now() - started;
  const parts = full.match(/\S+\s*/g) ?? [full];
  for (const part of parts) {
    await onDelta(part);
    await sleep(18 + (seed % 25));
  }
  const tokensIn = estimateTokens(messages.map((m) => m.content).join('\n'));
  const tokensOut = estimateTokens(full);
  return { text: full, ttftMs, totalMs: Date.now() - started, tokensIn, tokensOut, costUsd: costOf(p, tokensIn, tokensOut) };
}
