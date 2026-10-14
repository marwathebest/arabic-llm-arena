// Arabic LLM Arena — front end. No framework: one fetch-streamed battle, one vote, one leaderboard.

const I18N = {
  ar: {
    'nav.play': 'جرّب', 'nav.board': 'الترتيب', 'nav.how': 'كيف يعمل',
    'hero.kicker': 'HUMAIN ضد OpenAI · تقييم أعمى',
    'hero.title': 'أي نموذج <em>يفهمنا</em> أكثر؟',
    'hero.lede': 'اكتب سؤالك بالفصحى أو باللهجة السعودية. نموذجان يجيبان بدون أسمائهما، وأنت تختار الأفضل. كل تصويت يحدّث ترتيب Elo لكل فئة، ويقارن رأيك برأي حَكَم آلي.',
    'stats.rounds': 'جولة', 'stats.votes': 'تصويت', 'stats.agree': 'اتفاق البشر مع الحَكَم الآلي',
    'demo.both': 'وضع تجريبي: لم تُضَف مفاتيح API بعد، لذلك الإجابات مولّدة محلياً لعرض طريقة العمل.',
    'demo.one': 'وضع تجريبي جزئي: {m} يعمل بإجابات محلية حتى يُضاف مفتاحه.',
    'play.title': 'الساحة', 'play.label': 'سؤالك', 'play.placeholder': 'مثال: وش أفضل طريقة أتعلم فيها البرمجة وأنا مبتدئ؟',
    'play.category': 'الفئة', 'play.send': 'ابدأ الجولة', 'play.sending': 'جارٍ التوليد…',
    'play.notice': 'تُحفظ الأسئلة والإجابات بدون أي بيانات شخصية لبناء الترتيب، فلا تكتب معلومات خاصة.',
    'cat.auto': 'تلقائي', 'cat.dialect': 'لهجة سعودية', 'cat.msa': 'فصحى', 'cat.code': 'برمجة',
    'cat.culture': 'ثقافة وتاريخ', 'cat.translation': 'ترجمة', 'cat.other': 'أخرى', 'cat.all': 'الكل',
    'pane.hidden': 'نموذج مخفي', 'meta.category': 'الفئة: {c}',
    'vote.q': 'أي إجابة أفضل؟', 'vote.a': '← A أفضل', 'vote.b': 'B أفضل →', 'vote.tie': 'تعادل', 'vote.bad': 'كلاهما سيئ',
    'judge.title': 'رأي الحَكَم الآلي', 'judge.wait': 'الحَكَم الآلي يقيّم…', 'judge.none': 'لم يصل رأي الحَكَم.',
    'judge.agree': '✓ الحَكَم يتفق معك', 'judge.disagree': '✗ الحَكَم يختلف معك',
    'out.a': 'A أفضل', 'out.b': 'B أفضل', 'out.tie': 'تعادل', 'out.both_bad': 'كلاهما سيئ',
    'rev.ttft': 'أول كلمة', 'rev.total': 'المدة', 'rev.tokens': 'توكنز', 'rev.cost': 'التكلفة', 'rev.demo': 'تجريبي',
    'board.title': 'الترتيب', 'board.elo': 'تقييم Elo', 'board.perf': 'الأداء (متوسط لكل إجابة)',
    'th.model': 'النموذج', 'th.elo': 'Elo', 'th.wlt': 'ف / خ / ت', 'th.rate': 'نسبة الفوز',
    'th.ttft': 'أول كلمة', 'th.total': 'المدة', 'th.cost': 'التكلفة', 'th.n': 'إجابات',
    'board.empty': 'لا توجد تصويتات في هذه الفئة بعد. كن أول من يصوّت.',
    'router.pick': 'الموجّه الذكي: لأسئلة «{c}» استخدم <b>{m}</b> (بناءً على {n} تصويت).',
    'router.wait': 'الموجّه الذكي يحتاج {n} تصويتات على الأقل في هذه الفئة ليقترح نموذجاً.',
    'how.title': 'كيف يعمل',
    'how.s1t': 'تقييم أعمى', 'how.s1': 'السيرفر يخلط ترتيب النموذجين عشوائياً، ولا يكشف الأسماء إلا بعد التصويت.',
    'how.s2t': 'بث مباشر', 'how.s2': 'الإجابتان تُبثّان معاً عبر SSE، مع قياس زمن أول كلمة والمدة الكاملة.',
    'how.s3t': 'Elo لكل فئة', 'how.s3': 'كل تصويت يحدّث تقييم Elo للفئة وللترتيب العام، مثل نظام الشطرنج.',
    'how.s4t': 'حَكَم آلي', 'how.s4': 'نموذج يقيّم الإجابتين بمخرجات JSON منظمة، ونقيس نسبة اتفاقه مع البشر.',
    'foot.by': 'بناء مروة عبدالله صبيعي', 'foot.src': 'الكود على GitHub ←',
    'err.generic': 'حدث خطأ، حاول مرة ثانية.',
    'err.empty': 'اكتب سؤالك أولاً.', 'err.too_long': 'السؤال أطول من 2000 حرف.',
    'err.rate_minute': 'جولات كثيرة خلال دقيقة، انتظر قليلاً ثم حاول.', 'err.rate_day': 'وصلت للحد اليومي، ارجع بكرة.',
    'err.streaming': 'الإجابات لم تكتمل بعد.', 'err.failed_round': 'أحد النموذجين فشل في هذه الجولة، لذلك لا تُحتسب.',
    'err.voted': 'تم التصويت على هذه الجولة مسبقاً.',
    samples: [
      'وش أفضل طريقة أتعلم فيها البرمجة وأنا مبتدئ؟',
      'اشرح لي قصة تأسيس الدولة السعودية الأولى باختصار',
      'اكتب دالة JavaScript تتحقق من رقم جوال سعودي',
      'ترجم للإنجليزية: «الله يعطيك العافية على تعبك»',
      'ما الفرق بين الذكاء الاصطناعي وتعلم الآلة؟',
    ],
  },
  en: {
    'nav.play': 'Play', 'nav.board': 'Leaderboard', 'nav.how': 'How it works',
    'hero.kicker': 'HUMAIN vs OpenAI · blind evaluation',
    'hero.title': 'Which model <em>gets</em> Arabic better?',
    'hero.lede': 'Ask in Modern Standard Arabic or Saudi dialect. Two anonymous models answer, you pick the better one. Every vote updates a per-category Elo rating and is compared with an AI judge.',
    'stats.rounds': 'rounds', 'stats.votes': 'votes', 'stats.agree': 'human–AI judge agreement',
    'demo.both': 'Demo mode: no API keys yet, so answers are generated locally to show the flow.',
    'demo.one': 'Partial demo mode: {m} uses local answers until its key is added.',
    'play.title': 'The arena', 'play.label': 'Your prompt', 'play.placeholder': 'e.g. وش أفضل طريقة أتعلم فيها البرمجة وأنا مبتدئ؟',
    'play.category': 'Category', 'play.send': 'Start round', 'play.sending': 'Generating…',
    'play.notice': 'Prompts and answers are stored without personal data to build the leaderboard. Don’t include private information.',
    'cat.auto': 'Auto-detect', 'cat.dialect': 'Saudi dialect', 'cat.msa': 'MSA (Fusha)', 'cat.code': 'Code',
    'cat.culture': 'Culture & history', 'cat.translation': 'Translation', 'cat.other': 'Other', 'cat.all': 'All',
    'pane.hidden': 'Hidden model', 'meta.category': 'Category: {c}',
    'vote.q': 'Which answer is better?', 'vote.a': '← A is better', 'vote.b': 'B is better →', 'vote.tie': 'Tie', 'vote.bad': 'Both bad',
    'judge.title': 'AI judge verdict', 'judge.wait': 'AI judge is reviewing…', 'judge.none': 'The judge did not respond.',
    'judge.agree': '✓ The judge agrees with you', 'judge.disagree': '✗ The judge disagrees',
    'out.a': 'A is better', 'out.b': 'B is better', 'out.tie': 'Tie', 'out.both_bad': 'Both bad',
    'rev.ttft': 'first token', 'rev.total': 'total', 'rev.tokens': 'tokens', 'rev.cost': 'cost', 'rev.demo': 'demo',
    'board.title': 'Leaderboard', 'board.elo': 'Elo rating', 'board.perf': 'Performance (average per answer)',
    'th.model': 'Model', 'th.elo': 'Elo', 'th.wlt': 'W / L / T', 'th.rate': 'Win rate',
    'th.ttft': 'First token', 'th.total': 'Total', 'th.cost': 'Cost', 'th.n': 'Answers',
    'board.empty': 'No votes in this category yet. Be the first.',
    'router.pick': 'Smart router: for “{c}” prompts use <b>{m}</b> (based on {n} votes).',
    'router.wait': 'The smart router needs at least {n} votes in this category to recommend a model.',
    'how.title': 'How it works',
    'how.s1t': 'Blind by design', 'how.s1': 'The server shuffles which model is A or B and only reveals names after you vote.',
    'how.s2t': 'Live streaming', 'how.s2': 'Both answers stream at once over SSE, timing first token and total latency.',
    'how.s3t': 'Elo per category', 'how.s3': 'Each vote updates an Elo rating for its category and overall, like chess.',
    'how.s4t': 'AI judge', 'how.s4': 'A model grades both answers with structured JSON output; we track how often it agrees with humans.',
    'foot.by': 'Built by Marwah Abdullah Sabei', 'foot.src': 'Source on GitHub →',
    'err.generic': 'Something went wrong, please try again.',
    'err.empty': 'Write a prompt first.', 'err.too_long': 'The prompt is longer than 2000 characters.',
    'err.rate_minute': 'Too many rounds in a minute — wait a bit and try again.', 'err.rate_day': 'Daily limit reached — come back tomorrow.',
    'err.streaming': 'The answers are not finished yet.', 'err.failed_round': 'A model failed in this round, so it does not count.',
    'err.voted': 'This round already has a vote.',
    samples: [
      'وش أفضل طريقة أتعلم فيها البرمجة وأنا مبتدئ؟',
      'Briefly explain the founding of the first Saudi state',
      'Write a JavaScript function that validates a Saudi mobile number',
      'ترجم للإنجليزية: «الله يعطيك العافية على تعبك»',
      'What is the difference between AI and machine learning?',
    ],
  },
};

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const lang = () => (document.documentElement.lang === 'en' ? 'en' : 'ar');
const t = (key, vars = {}) =>
  String(I18N[lang()][key] ?? key).replace(/\{(\w+)\}/g, (_, k) => escapeHtml(String(vars[k] ?? '')));

const state = {
  config: null,
  board: null,
  tab: 'all',
  battleId: null,
  texts: { a: '', b: '' },
  failed: false,
  myVote: null,
};

// ── Safe mini markdown ───────────────────────────────────────────────────────
// Model output is untrusted: everything is escaped first, then a small subset is re-enabled.

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function inline(s) {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
}

export function renderMarkdown(src) {
  const blocks = escapeHtml(src).split(/```/);
  let html = '';
  blocks.forEach((block, i) => {
    if (i % 2 === 1) {
      html += `<pre><code>${block.replace(/^[\w+-]*\n/, '')}</code></pre>`;
      return;
    }
    let list = null;
    const close = () => { if (list) { html += `</${list}>`; list = null; } };
    for (const raw of block.split('\n')) {
      const line = raw.trimEnd();
      let m;
      if (!line.trim()) { close(); continue; }
      if ((m = line.match(/^\s*[-*•]\s+(.*)/))) {
        if (list !== 'ul') { close(); html += '<ul>'; list = 'ul'; }
        html += `<li>${inline(m[1])}</li>`;
      } else if ((m = line.match(/^\s*(\d+)[.)]\s+(.*)/))) {
        if (list !== 'ol') { close(); html += '<ol>'; list = 'ol'; }
        html += `<li>${inline(m[2])}</li>`;
      } else if ((m = line.match(/^#{1,6}\s+(.*)/))) {
        close(); html += `<h3>${inline(m[1])}</h3>`;
      } else if ((m = line.match(/^&gt;\s?(.*)/))) {
        close(); html += `<blockquote>${inline(m[1])}</blockquote>`;
      } else {
        close(); html += `<p>${inline(line)}</p>`;
      }
    }
    close();
  });
  return html;
}

// ── i18n / theme ─────────────────────────────────────────────────────────────

function applyLang() {
  for (const el of $$('[data-i18n]')) el.innerHTML = t(el.dataset.i18n);
  $('#prompt').placeholder = t('play.placeholder');
  $('#langBtn').textContent = lang() === 'ar' ? 'EN' : 'عربي';
  renderCategories();
  renderSamples();
  renderDemoBanner();
  renderBoard();
  if (state.battleId) $('#battleMeta').textContent = t('meta.category', { c: t(`cat.${state.category}`) });
}

function setLang(l) {
  const d = document.documentElement;
  d.lang = l;
  d.dir = l === 'ar' ? 'rtl' : 'ltr';
  try { localStorage.setItem('arena-lang', l); } catch {}
  applyLang();
}

$('#langBtn').addEventListener('click', () => setLang(lang() === 'ar' ? 'en' : 'ar'));
$('#themeBtn').addEventListener('click', () => {
  const d = document.documentElement;
  const next = d.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  d.setAttribute('data-theme', next);
  try { localStorage.setItem('arena-theme', next); } catch {}
});

// ── Composer ─────────────────────────────────────────────────────────────────

function renderCategories() {
  const sel = $('#category');
  const current = sel.value || 'auto';
  const cats = state.config?.categories ?? ['dialect', 'msa', 'code', 'culture', 'translation', 'other'];
  sel.innerHTML = ['auto', ...cats].map((c) => `<option value="${c}">${t(`cat.${c}`)}</option>`).join('');
  sel.value = current;
}

function renderSamples() {
  $('#samples').innerHTML = I18N[lang()].samples
    .map((s) => `<button type="button" dir="auto">${escapeHtml(s)}</button>`)
    .join('');
}

$('#samples').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  $('#prompt').value = b.textContent;
  updateCount();
  $('#prompt').focus();
});

const updateCount = () => ($('#charCount').textContent = `${$('#prompt').value.length} / ${state.config?.maxPromptChars ?? 2000}`);
$('#prompt').addEventListener('input', updateCount);
$('#prompt').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $('#composer').requestSubmit();
});

function renderDemoBanner() {
  const models = state.config?.models;
  const banner = $('#demoBanner');
  if (!models) return;
  const off = Object.values(models).filter((m) => !m.live);
  banner.hidden = off.length === 0;
  banner.textContent = off.length === 2 ? t('demo.both') : off.length === 1 ? t('demo.one', { m: off[0].label }) : '';
}

// ── Battle ───────────────────────────────────────────────────────────────────

function resetBattle() {
  state.texts = { a: '', b: '' };
  state.failed = false;
  state.myVote = null;
  state.battleId = null;
  $('#battle').hidden = false;
  $('.panes').hidden = false;
  $('#battleMeta').textContent = '';
  $('#vote').hidden = true;
  $('#judge').hidden = true;
  $$('[data-vote]').forEach((b) => { b.disabled = false; b.classList.remove('chosen'); });
  for (const pane of $$('.pane')) {
    pane.classList.remove('winner');
    $('.who', pane).textContent = t('pane.hidden');
    $('.timing', pane).textContent = '';
    $('.answer', pane).innerHTML = '';
    $('.answer', pane).classList.add('streaming');
    $('.reveal-row', pane).innerHTML = '';
  }
}

const pane = (side) => $(`.pane[data-side="${side}"]`);
const apiError = (body) => (I18N[lang()][`err.${body?.code}`] ? t(`err.${body.code}`) : body?.error || t('err.generic'));
const fmtMs = (ms) => (ms == null ? '—' : ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`);
const fmtCost = (usd, live) => (!live ? `<span class="demo-tag">${t('rev.demo')}</span>` : usd == null ? '—' : usd < 0.01 ? `$${usd.toFixed(5)}` : `$${usd.toFixed(3)}`);

let renderQueued = false;
function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    for (const side of ['a', 'b']) $('.answer', pane(side)).innerHTML = renderMarkdown(state.texts[side]);
  });
}

function handleEvent(event, data) {
  if (event === 'meta') {
    state.battleId = data.battleId;
    state.category = data.category;
    $('#battleMeta').textContent = t('meta.category', { c: t(`cat.${data.category}`) });
  } else if (event === 'delta') {
    state.texts[data.side] += data.text;
    scheduleRender();
  } else if (event === 'done') {
    $('.answer', pane(data.side)).classList.remove('streaming');
    $('.timing', pane(data.side)).textContent = `${fmtMs(data.ttftMs)} · ${fmtMs(data.totalMs)}`;
  } else if (event === 'error') {
    state.failed = true;
    const el = $('.answer', pane(data.side));
    el.classList.remove('streaming');
    el.innerHTML = `<p class="err">${escapeHtml(data.message)}</p>`;
  } else if (event === 'end') {
    if (!state.failed && state.battleId) {
      $('#vote').hidden = false;
      $('#vote').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

function parseSSE(buffer, onEvent) {
  const parts = buffer.split('\n\n');
  const rest = parts.pop();
  for (const part of parts) {
    let event = 'message';
    const data = [];
    for (const line of part.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
    }
    if (data.length) onEvent(event, JSON.parse(data.join('\n')));
  }
  return rest;
}

$('#composer').addEventListener('submit', async (e) => {
  e.preventDefault();
  const prompt = $('#prompt').value.trim();
  if (!prompt) return;
  const btn = $('#sendBtn');
  btn.disabled = true;
  btn.textContent = t('play.sending');
  resetBattle();
  $('#battle').scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const category = $('#category').value;
    const res = await fetch('/api/battle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, category: category === 'auto' ? undefined : category }),
    });
    if (!res.ok) throw new Error(apiError(await res.json().catch(() => ({}))));
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer = parseSSE(buffer + decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n'), handleEvent);
    }
  } catch (err) {
    $('.panes').hidden = true;
    $('#battleMeta').innerHTML = `<span class="err">${escapeHtml(err.message || t('err.generic'))}</span>`;
  } finally {
    btn.disabled = false;
    btn.textContent = t('play.send');
  }
});

// ── Vote + reveal + judge ────────────────────────────────────────────────────

$('#vote').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-vote]');
  if (!b || !state.battleId || state.myVote) return;
  state.myVote = b.dataset.vote;
  $$('[data-vote]').forEach((x) => (x.disabled = true));
  b.classList.add('chosen');

  try {
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ battleId: state.battleId, winner: state.myVote }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(apiError(data));
    for (const side of ['a', 'b']) {
      const r = data[side];
      const p = pane(side);
      $('.who', p).textContent = r.label;
      if (state.myVote === side) p.classList.add('winner');
      $('.reveal-row', p).innerHTML =
        `<span>${t('rev.ttft')} <b>${fmtMs(r.ttftMs)}</b></span>` +
        `<span>${t('rev.total')} <b>${fmtMs(r.totalMs)}</b></span>` +
        `<span>${t('rev.tokens')} <b>${r.tokens ?? '—'}</b></span>` +
        `<span>${t('rev.cost')} <b>${fmtCost(r.costUsd, r.live)}</b></span>`;
    }
    loadBoard();
    pollJudge(state.battleId, state.myVote);
  } catch (err) {
    $('#judge').hidden = false;
    $('#judgeText').textContent = err.message || t('err.generic');
  }
});

async function pollJudge(battleId, myVote) {
  $('#judge').hidden = false;
  $('#judgeText').textContent = t('judge.wait');
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    if (state.battleId !== battleId) return;
    const data = await fetch(`/api/battle/${battleId}`).then((r) => r.json()).catch(() => null);
    if (data?.judge) {
      const agree = data.judge === myVote ? t('judge.agree') : t('judge.disagree');
      $('#judgeText').innerHTML =
        `<strong>${t(`out.${data.judge}`)}</strong> — ${escapeHtml(data.judgeReason ?? '')}` +
        `<br><span class="${data.judge === myVote ? 'ok' : 'err'}">${agree}</span>`;
      loadBoard();
      return;
    }
  }
  $('#judgeText').textContent = t('judge.none');
}

// ── Leaderboard ──────────────────────────────────────────────────────────────

async function loadBoard() {
  try {
    state.board = await fetch('/api/leaderboard').then((r) => r.json());
  } catch {
    return;
  }
  renderBoard();
}

function renderBoard() {
  const b = state.board;
  if (!b) return;
  const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : '—');
  $('#statRounds').textContent = b.totals.rounds;
  $('#statVotes').textContent = b.totals.votes;
  $('#statAgree').textContent = pct(b.judgeAgreement.agreed, b.judgeAgreement.judged);

  const cats = ['all', ...(state.config?.categories ?? [])];
  $('#tabs').innerHTML = cats
    .map((c) => `<button type="button" role="tab" data-tab="${c}" aria-selected="${c === state.tab}">${t(`cat.${c}`)}</button>`)
    .join('');

  const rows = b.categories[state.tab] ?? [];
  $('#eloTable').innerHTML = rows.length
    ? `<div class="table-scroll"><table><thead><tr>
        <th>${t('th.model')}</th><th>${t('th.elo')}</th><th>${t('th.wlt')}</th><th>${t('th.rate')}</th>
      </tr></thead><tbody>${rows
        .map((r) => {
          const decisive = r.wins + r.losses;
          const rate = decisive ? r.wins / decisive : 0;
          return `<tr><td>${escapeHtml(r.label)}</td><td class="n">${Math.round(r.rating)}</td>
            <td class="n">${r.wins} / ${r.losses} / ${r.ties}</td>
            <td><div class="bar" title="${pct(r.wins, decisive)}"><i style="width:${rate * 100}%"></i></div></td></tr>`;
        })
        .join('')}</tbody></table></div>`
    : `<p class="empty">${t('board.empty')}</p>`;

  const pick = b.router[state.tab];
  $('#router').innerHTML = pick
    ? t('router.pick', { c: t(`cat.${state.tab}`), m: pick.label, n: pick.votes })
    : t('router.wait', { n: b.minVotesForRouting });

  const perf = b.performance ?? [];
  const live = (id) => state.config?.models?.[id]?.live ?? true;
  $('#perfTable').innerHTML = perf.length
    ? `<div class="table-scroll"><table><thead><tr>
        <th>${t('th.model')}</th><th>${t('th.ttft')}</th><th>${t('th.total')}</th><th>${t('th.cost')}</th><th>${t('th.n')}</th>
      </tr></thead><tbody>${perf
        .map((p) => `<tr><td>${escapeHtml(p.label)}</td><td class="n">${fmtMs(p.ttft)}</td><td class="n">${fmtMs(p.total)}</td>
          <td class="n">${fmtCost(p.cost, live(p.model))}</td><td class="n">${p.answers}</td></tr>`)
        .join('')}</tbody></table></div>`
    : `<p class="empty">${t('board.empty')}</p>`;
}

$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  state.tab = b.dataset.tab;
  renderBoard();
});

// ── Boot ─────────────────────────────────────────────────────────────────────

(async function boot() {
  applyLang();
  try {
    state.config = await fetch('/api/config').then((r) => r.json());
  } catch {}
  applyLang();
  updateCount();
  loadBoard();
})();
