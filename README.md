# Arabic LLM Arena

**Which model understands Arabic, and Saudi dialect, better: HUMAIN's ALLaM or OpenAI?**

A blind, side-by-side evaluation arena. You ask a question, two anonymous models answer live, you vote, and only then are the names revealed. Every vote updates a per-category **Elo rating**, and an **AI judge** grades the same round so we can measure how often it agrees with humans.

> Built by [Marwah Abdullah Sabei](https://github.com/marwathebest) as a portfolio project for web development and applied AI.

## Why

Saudi companies adopting generative AI face a real choice: a local, Arabic-first model (HUMAIN / ALLaM, data kept in-Kingdom) or a global model (OpenAI). Generic English benchmarks don't answer *"which one is better for **our** users, in **our** dialect?"* This arena collects that evidence directly from people, split by category:

| Category | Example |
|---|---|
| Saudi dialect | وش أفضل طريقة أتعلم فيها البرمجة؟ |
| MSA (Fusha) | ما الفرق بين الذكاء الاصطناعي وتعلم الآلة؟ |
| Culture & history | اشرح قصة تأسيس الدولة السعودية الأولى |
| Code | Write a function that validates a Saudi mobile number |
| Translation | ترجم: «الله يعطيك العافية» |

## Features

- **Blind by design:** the server randomly assigns models to sides A and B, and names are only returned by the vote endpoint. Demo answers are tested to never leak the model name.
- **Live streaming:** both answers stream at once over a single Server-Sent Events response, with time-to-first-token and total latency measured server-side.
- **Elo per category:** the same rating system as chess and LMSYS Chatbot Arena (K = 32; "both bad" counts as a tie), kept per category and overall.
- **Smart router:** once a category has at least 5 votes, the leaderboard recommends which model to use by default for that kind of prompt.
- **AI judge (LLM-as-a-judge):** after the human vote, a model grades the round using **structured output (JSON Schema)**; the site tracks the human–judge agreement rate.
- **Cost and latency dashboard:** tokens, USD cost per answer (from configurable per-model prices), and average latency per model.
- **Auto category detection:** a keyword classifier with Arabic normalization (hamza, taa marbuta, diacritics) and Saudi dialect markers; users can override it.
- **Abuse and cost protection:** per-IP rate limits (5 rounds/minute, 60/day, IPs stored only as SHA-256 hashes), a 2,000-character prompt cap, and API keys kept server-side as Worker secrets.
- **Bilingual UI:** Arabic (RTL) and English, light and dark themes, mobile-first, no framework, and a safe Markdown renderer that escapes model output before rendering.
- **Demo mode:** with no API keys, both sides answer from a local generator, so the full flow can be shown and deployed before keys exist.

## Architecture

```
browser ──POST /api/battle──▶ Cloudflare Worker ──┬─▶ HUMAIN  (ALLaM)  ─┐  SSE, both
   ▲                                               └─▶ OpenAI  (GPT)    ─┘  streamed live
   └──────── vote ──▶ Elo per category ──▶ D1 (SQLite) ◀── AI judge (JSON schema)
```

| Endpoint | Purpose |
|---|---|
| `POST /api/battle` | Validates and rate-limits, classifies the prompt, shuffles sides, streams both answers (SSE), saves answers and metrics |
| `POST /api/vote` | Atomically claims the single vote, updates Elo for the category and overall, reveals models, starts the AI judge in the background |
| `GET /api/battle/:id` | Returns the judge's verdict, but only after a human has voted, so it can't bias the vote |
| `GET /api/leaderboard` | Elo tables, router picks, latency and cost averages, human–judge agreement |
| `GET /api/config` | Model labels, and whether each side is live or in demo mode |

**Stack:** Cloudflare Workers (TypeScript), D1 (SQLite), vanilla HTML/CSS/JS, `node:test`.

| File | What's in it |
|---|---|
| `src/index.ts` | Routing, SSE fan-out, voting, leaderboard SQL |
| `src/providers.ts` | OpenAI-compatible streaming client, cost math, demo generator |
| `src/judge.ts` | LLM-as-a-judge with a JSON Schema response format |
| `src/elo.ts` | Elo math |
| `src/classify.ts` | Arabic normalization and category classifier |
| `src/sse.ts` | Incremental SSE parser that handles events split across network chunks |

## Run locally

```bash
npm install
npm run db:migrate:local
cp .dev.vars.example .dev.vars   # add keys, or leave empty for demo mode
npm run dev                      # http://localhost:8787
npm test                         # unit tests
```

### Connecting the models

Both sides speak the **OpenAI-compatible Chat Completions** format, so HUMAIN can be reached either through its own API or through ALLaM on Microsoft Azure AI Foundry:

| Variable | Meaning |
|---|---|
| `HUMAIN_BASE_URL` | Base URL ending before `/chat/completions` |
| `HUMAIN_API_KEY` | Secret: `wrangler secret put HUMAIN_API_KEY` |
| `HUMAIN_MODEL` | Model / deployment name |
| `HUMAIN_AUTH_STYLE` | `bearer` (default) or `api-key` (Azure) |
| `OPENAI_API_KEY` | Secret: `wrangler secret put OPENAI_API_KEY` |
| `OPENAI_MODEL`, `JUDGE_MODEL` | Default `gpt-5-mini` |
| `*_PRICE_IN` / `*_PRICE_OUT` | USD per 1M tokens, used for cost tracking |

## Deploy

```bash
npx wrangler login
npx wrangler d1 create arena          # paste the id into wrangler.jsonc
npm run db:migrate:remote
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put HUMAIN_API_KEY
npm run deploy
```

## Known limitations and next steps

- **Self-preference bias:** the judge is an OpenAI model, and LLM judges tend to favour their own family. That's exactly why the agreement rate is shown rather than trusting the judge. Next step: a judge from a third provider, plus judging each round twice with sides swapped to cancel position bias.
- **Elo and ordering:** Elo depends on vote order. With more data, switch to a Bradley–Terry fit with bootstrap confidence intervals, as LMSYS does.
- **Classifier:** the classifier is keyword-based. Next step: let a small model classify, and measure it against hand-labelled prompts.
- **Prompt storage:** prompts are stored (without personal data) to build the leaderboard, and the UI says so. Add a retention policy before heavy public use.
