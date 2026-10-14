import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expectedScore, updateElo } from '../src/elo.ts';
import { classify, normalizeArabic, arabicRatio } from '../src/classify.ts';
import { SSEParser, sseMessage } from '../src/sse.ts';
import { parseVerdict } from '../src/judge.ts';
import { costOf, demoAnswer, getProviders } from '../src/providers.ts';

test('elo: equal ratings give 50% and symmetric updates', () => {
  assert.equal(expectedScore(1000, 1000), 0.5);
  const [a, b] = updateElo(1000, 1000, 'a');
  assert.equal(a, 1016);
  assert.equal(b, 984);
});

test('elo: tie and both_bad move ratings toward each other and conserve points', () => {
  for (const outcome of ['tie', 'both_bad'] as const) {
    const [a, b] = updateElo(1100, 900, outcome);
    assert.ok(a < 1100 && b > 900);
    assert.ok(Math.abs(a + b - 2000) < 1e-9);
  }
});

test('elo: upset win moves more than expected win', () => {
  const [favWin] = updateElo(1200, 1000, 'a');
  const [, underdogWin] = updateElo(1200, 1000, 'b');
  assert.ok(underdogWin - 1000 > favWin - 1200);
});

test('classify: Saudi dialect', () => {
  assert.equal(classify('وش افضل مطعم في الرياض؟ ابغى شي زين'), 'dialect');
  assert.equal(classify('ودي اسوي مشروع للبورتفوليو وش تنصحني'), 'dialect');
});

test('classify: MSA, culture, code, translation, other', () => {
  assert.equal(classify('ما هي أسباب التغير المناخي وآثاره على المنطقة؟'), 'msa');
  assert.equal(classify('حدثني عن تاريخ الدرعية ودورها في تأسيس المملكة'), 'culture');
  assert.equal(classify('اكتب لي كود Python يرتب قائمة'), 'code');
  assert.equal(classify('ترجم هذه الجملة إلى الإنجليزية: صباح الخير'), 'translation');
  assert.equal(classify('What is the capital of Japan?'), 'other');
});

test('classify: normalization handles hamza, taa marbuta, diacritics', () => {
  assert.equal(normalizeArabic('إِجابَة'), 'اجابه');
  assert.ok(arabicRatio('hello مرحبا') > 0.4);
});

test('sse: parses events split across chunks', () => {
  const p = new SSEParser();
  assert.deepEqual(p.feed('event: delta\ndata: {"x"'), []);
  assert.deepEqual(p.feed(':1}\n\ndata: [DONE]\n'), [{ event: 'delta', data: '{"x":1}' }]);
  assert.deepEqual(p.feed('\n'), [{ event: 'message', data: '[DONE]' }]);
});

test('sse: round-trips sseMessage with CRLF and keep-alives', () => {
  const p = new SSEParser();
  const msg = sseMessage('meta', { id: 'ق' }).replace(/\n/g, '\r\n');
  assert.deepEqual(p.feed(': ping\r\n' + msg), [{ event: 'meta', data: '{"id":"ق"}' }]);
});

test('judge: parseVerdict accepts valid and rejects invalid JSON', () => {
  assert.deepEqual(parseVerdict('{"winner":"b","reason":"أدق"}'), { winner: 'b', reason: 'أدق' });
  assert.throws(() => parseVerdict('{"winner":"c","reason":""}'));
  assert.throws(() => parseVerdict('not json'));
});

test('providers: demo mode without keys, live with keys, cost math', () => {
  const env = { OPENAI_PRICE_IN: '1', OPENAI_PRICE_OUT: '4' } as any;
  const off = getProviders(env);
  assert.equal(off.humain.live, false);
  assert.equal(off.openai.live, false);
  assert.equal(costOf(off.openai, 1_000_000, 500_000), 3);

  const on = getProviders({ ...env, OPENAI_API_KEY: 'k', HUMAIN_API_KEY: 'k' } as any);
  assert.equal(on.openai.live, true);
  assert.equal(on.humain.live, false, 'HUMAIN also needs a base URL');
  assert.ok(demoAnswer(off.humain, 'سؤال', 'dialect').includes('وضع تجريبي'));
});

test('providers: demo answers never reveal which model wrote them', () => {
  const p = getProviders({} as any);
  for (const id of ['humain', 'openai'] as const) {
    const text = demoAnswer(p[id], 'سؤال تجريبي', 'msa').toLowerCase();
    assert.ok(!text.includes('humain') && !text.includes('openai') && !text.includes('allam') && !text.includes('gpt'));
  }
});
