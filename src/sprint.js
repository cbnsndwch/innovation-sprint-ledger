(() => {
  'use strict';
  const { $, h, Ledger, toast, modal, copyText, lines, fmtDate, today } = LL;
  const BUILTIN_SECTORS = /*@SECTORS*/[];
  const SKILL_FILES = /*@SKILLS*/{}; // { 'sector-research/SKILL.md': '…', … } bundled at build time

  // Sprint 1: one PESTEL dimension per person. Hints stay sector-neutral: the same board serves all eight packs.
  const PESTEL = [
    ['political', 'Political', 'Government policy, public funding and promotion, trade, international relations, local politics'],
    ['economic', 'Economic', 'Demand, prices, exchange rates, interest rates, labor costs, investment'],
    ['social', 'Social', 'Demographics, habits, values, how people buy, trust and expectations'],
    ['technological', 'Technological', 'AI, platforms, payments, automation, data, infrastructure'],
    ['environmental', 'Environmental', 'Climate and weather risk, sustainability pressure, resources, waste'],
    ['legal', 'Legal', 'Regulation, licensing, consumer protection, labor law, data privacy']
  ];
  // Sprint 2: how the sector works. Starter questions come from the team's Sector Exploration Pack when it has them.
  const SECTOR_DIMS = [
    ['ecosystem', 'Ecosystem and actors', /ecosystem|actor/i, 'Which types of companies capture most of the value, and who is entering or leaving?'],
    ['valuechain', 'Value chain', /value chain/i, 'At which step of the chain do customers or operators lose time, money or trust? Who captures the margin?'],
    ['frictions', 'Processes and frictions', /process|friction/i, 'What do people still do manually, or work around, today? What evidence shows it matters?'],
    ['competition', 'Existing solutions and competition', /solution|competi/i, 'How is the problem solved today, and by whom? What do those solutions fail to do?'],
    ['segments', 'Segments and needs', /segment|need/i, 'Which customer is most affected? How big is that group?'],
    ['models', 'Business models and monetization', /business model|moneti|revenue/i, 'Which revenue model fits? Who pays, and why?']
  ];
  const BIZ_MODELS = ['B2C', 'B2B', 'B2B2C', 'Platform', 'Institutional'];
  const TABS = [['brief', 'Brief'], ['team', 'Team'], ['pestel', '1 · PESTEL'], ['sector', '2 · Sector'], ['opportunities', 'Opportunities'], ['hypotheses', 'Hypotheses'], ['evidence', 'Evidence'], ['handoff', 'Handoff']];

  let tab = LL.lsGet('isl:tab', 'brief');
  let evFilter = LL.lsGet('isl:evFilter', 'all');
  let openRef = null; // { slot, id }
  const L = () => Ledger.state.ledger;
  const S = () => Ledger.state.sector;
  const members = () => L().team.members.map(m => m.name);
  const saveL = LL.debounce(() => Ledger.saveLedger(), 300);
  const byCreated = (a, b) => String(a.createdAt || a.id).localeCompare(String(b.createdAt || b.id));
  const all = (slot) => Object.values(Ledger.state[slot]);
  const findings = (sprint, dim) => all('findings').filter(f => f.sprint === sprint && (!dim || f.dimension === dim)).sort((a, b) => (b.key ? 1 : 0) - (a.key ? 1 : 0) || byCreated(a, b));
  const opportunities = () => all('opportunities').sort((a, b) => (b.shortlisted ? 1 : 0) - (a.shortlisted ? 1 : 0) || byCreated(a, b));
  const hypotheses = () => all('hypotheses').filter(x => !x.archived).sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || String(a.id).localeCompare(b.id));
  const decisions = () => all('decisions').sort((a, b) => String(b.date || '').localeCompare(a.date || '') || String(b.id).localeCompare(a.id));
  const sessions = () => all('sessions').sort((a, b) => String(b.date || b.id).localeCompare(a.date || a.id));
  const dimLabel = (sprint, d) => ((sprint === 'pestel' ? PESTEL : SECTOR_DIMS).find(x => x[0] === d) || [d, d])[1];
  const starter = (dimId) => {
    const dim = SECTOR_DIMS.find(x => x[0] === dimId), qs = (S() && S().sprint2Questions) || [];
    const q = qs.find(x => dim[2].test(x.dimension));
    return q ? q.question : dim[3];
  };
  const selected = () => Ledger.state.hypotheses[L().selection.hypothesisId] || null;
  const sourcesOf = (o) => (Array.isArray(o.sources) ? o.sources : []).filter(s => s && (s.label || s.url));

  // ---------------- shell ----------------
  const app = $('#app');
  const tabsEl = h('div', { class: 'tabs', role: 'tablist' });
  const titleEl = h('div', { class: 'brand-name' }, 'Innovation Sprint');
  const subEl = h('div', { class: 'brand-sub' }, 'Workshop 1 · Opportunity Discovery');
  const meHost = h('div'), pillHost = h('div'), bannerHost = h('div');
  const main = h('main', { class: 'wrap' });
  app.append(
    h('header', { class: 'topbar' }, h('div', { class: 'topbar-in' },
      h('div', { class: 'brand' }, h('div', { class: 'brand-mark' }, 'IS'), h('div', null, titleEl, subEl)),
      tabsEl, h('div', { class: 'spacer' }), meHost,
      h('button', { class: 'btn sm accent', onclick: () => aiSetup(), title: 'One prompt that sets up Claude, ChatGPT or Grok for your team' }, '✦ Set up your AI'),
      h('button', { class: 'btn sm', onclick: () => teamShare(), title: 'Send your work to your team, or add theirs' }, '⇄ Share'), pillHost)),
    bannerHost, main);
  LL.storageBar(pillHost);

  function go(id) { tab = id; LL.lsSet('isl:tab', id); render(); window.scrollTo(0, 0); }
  function renderTabs() {
    tabsEl.innerHTML = '';
    for (const [id, label] of TABS) tabsEl.append(h('button', { class: 'tab', role: 'tab', 'aria-selected': String(tab === id), onclick: () => go(id) }, label));
  }
  function renderMe() {
    meHost.innerHTML = '';
    const ms = members(), cur = LL.me();
    if (!ms.length) return;
    const sel = h('select', { class: 'me-sel' + (cur ? '' : ' unset'), title: 'Who is using this laptop? New findings get your name.', onchange: e => { LL.setMe(e.target.value); render(); } },
      h('option', { value: '' }, 'Who are you?'), ms.map(n => h('option', { value: n, selected: n === cur }, (n === L().team.leader ? '★ ' : '') + n)), h('option', { value: 'Facilitator', selected: cur === 'Facilitator' }, 'Facilitator'));
    meHost.append(sel);
  }

  function render() {
    const l = L(), s = S();
    titleEl.textContent = l.team.name || (l.team.number ? 'Team ' + l.team.number : 'Innovation Sprint');
    subEl.textContent = (s ? s.name + ' · ' : '') + 'Workshop 1 · Opportunity Discovery';
    document.title = (l.team.name ? l.team.name + ' · ' : '') + 'Sprint Ledger';
    renderTabs(); renderMe();
    const y = window.scrollY;
    main.innerHTML = '';
    main.append(strip());
    const views = { brief: briefView, team: teamView, pestel: () => sprintView('pestel'), sector: () => sprintView('sector'), opportunities: oppView, hypotheses: hypView, evidence: evidenceView, handoff: handoffView };
    main.append((views[tab] || briefView)());
    window.scrollTo(0, y);
    if (openRef && Ledger.state[openRef.slot][openRef.id] && !drawer.classList.contains('open')) openItem(openRef.slot, openRef.id);
  }

  // ---------------- progress strip: gates + timer ----------------
  function gates() {
    const l = L(), hs = hypotheses(), sel = selected();
    const covered = (sprint, dims) => dims.filter(([d]) => findings(sprint, d).length).length;
    const core = ['customer', 'problem', 'solution', 'valueProp', 'revenueModel'];
    const scored = hs.length >= 3 && hs.every(x => l.matrix.criteria.every(c => (x.scores || {})[c.id]));
    return [
      ['Team Leader chosen', !!l.team.leader, 'team'],
      ['PESTEL: all 6 dimensions', covered('pestel', PESTEL) === 6, 'pestel', covered('pestel', PESTEL) + '/6'],
      ['Key external factors picked', findings('pestel').filter(f => f.key).length >= 3, 'pestel', findings('pestel').filter(f => f.key).length + ' ★'],
      ['Sector: all 6 dimensions', covered('sector', SECTOR_DIMS) === 6, 'sector', covered('sector', SECTOR_DIMS) + '/6'],
      ['Opportunity list', opportunities().length >= 3, 'opportunities', String(opportunities().length)],
      ['Three hypotheses', hs.filter(x => core.every(k => (x[k] || '').trim())).length >= 3, 'hypotheses', hs.filter(x => core.every(k => (x[k] || '').trim())).length + '/3'],
      ['Matrix scored', scored, 'hypotheses'],
      ['Idea chosen + decision logged', !!(sel && l.selection.decidedAt), 'hypotheses'],
      ['Launch market justified with data', !!(sel && (sel.launchMarket || '').trim() && (sel.launchMarketWhy || '').trim()), 'hypotheses']
    ];
  }
  function strip() {
    const g = gates(), done = g.filter(x => x[1]).length;
    const srcs = allSources(), checked = srcs.filter(x => x.src.verified).length;
    return h('div', { class: 'strip' },
      h('div', { class: 'card' }, h('div', { class: 'kicker' }, 'Workshop 1 · closes with decisions'),
        h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' } }, h('span', { class: 'big-num' }, `${done} / ${g.length}`), h('span', { class: 'muted small' }, 'steps done')),
        h('div', { class: 'gates' }, g.map(([label, ok, t, extra]) => h('button', { class: 'gate' + (ok ? ' ok' : ''), title: label, onclick: () => go(t) }, h('span', { class: 'gdot' }, ok ? '✓' : ''), h('span', null, label), extra && !ok ? h('span', { class: 'muted' }, ' · ' + extra) : null)))),
      timerCard(),
      h('div', { class: 'card ev-mini', onclick: () => go('evidence'), title: 'Every source a person opened and checked' },
        h('div', { class: 'kicker' }, 'Sources checked by a person'),
        h('div', { class: 'big-num', style: { marginTop: '6px' } }, `${checked} / ${srcs.length}`),
        h('div', { class: 'meter' }, srcs.length ? h('i', { style: { width: (checked / srcs.length * 100) + '%', background: 'var(--ok)' } }) : null),
        h('div', { class: 'small muted' }, srcs.length ? 'AI answers aren’t evidence until someone checks the source.' : 'Every finding needs a source you can open.')));
  }

  // ---------------- shared agenda timer ----------------
  // The timer lives in ledger.json: on a shared folder the whole team sees the same countdown.
  let timerTick = null;
  function timerState() {
    const w = L().workshop, ag = w.agenda, t = w.timer || {};
    const i = ag.findIndex(b => b.id === t.blockId);
    if (i < 0 || !t.startedAt) return { i: -1, ag };
    const left = Math.round((ag[i].minutes || 0) * 60 - (Date.now() - new Date(t.startedAt).getTime()) / 1000);
    return { i, ag, block: ag[i], left };
  }
  const mmss = (s) => (s < 0 ? '−' : '') + Math.floor(Math.abs(s) / 60) + ':' + String(Math.abs(s) % 60).padStart(2, '0');
  function startBlock(i) {
    const ag = L().workshop.agenda; if (!ag[i]) { L().workshop.timer = { blockId: '', startedAt: null }; saveL(); render(); return; }
    L().workshop.timer = { blockId: ag[i].id, startedAt: LL.nowIso() }; saveL();
    if (ag[i].tab && ag[i].tab !== tab) go(ag[i].tab); else render();
  }
  function timerCard() {
    const st = timerState();
    const clock = h('div', { class: 'clock' }), label = h('div', { class: 'next-task' }), sub = h('div', { class: 'small muted' });
    const paint = () => {
      const s = timerState();
      if (s.i < 0) { clock.textContent = '—'; label.textContent = 'Agenda not started'; sub.textContent = 'Workshop 1 · ' + s.ag.reduce((n, b) => n + (+b.minutes || 0), 0) + ' minutes in ' + s.ag.length + ' blocks'; clock.className = 'clock'; return; }
      clock.textContent = mmss(s.left); clock.className = 'clock' + (s.left < 0 ? ' over' : s.left < 120 ? ' soon' : '');
      label.textContent = (s.i + 1) + '. ' + s.block.label;
      sub.textContent = s.ag[s.i + 1] ? 'Then: ' + s.ag[s.i + 1].label : 'Last block. Close with decisions.';
    };
    paint();
    clearInterval(timerTick); timerTick = setInterval(paint, 1000);
    return h('div', { class: 'card timer' }, h('div', { class: 'card-head' }, h('div', { class: 'kicker' }, 'Sprint clock'), h('button', { class: 'icon-btn', title: 'Edit agenda', onclick: () => go('team') }, '✎')),
      h('div', { style: { display: 'flex', gap: '14px', alignItems: 'center' } }, clock, h('div', { style: { minWidth: 0, flex: 1 } }, label, sub)),
      h('div', { style: { display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' } },
        st.i < 0 ? h('button', { class: 'btn sm primary', onclick: () => startBlock(0) }, '▶ Start the agenda')
          : [h('button', { class: 'btn sm primary', onclick: () => startBlock(st.i + 1) }, st.ag[st.i + 1] ? 'Next block →' : 'Finish'),
            h('button', { class: 'btn sm ghost', onclick: () => startBlock(st.i) }, 'Restart block')]));
  }

  // ---------------- editable helpers (ledger.json fields) ----------------
  function editable({ kind = 'text', get, set, placeholder, view, rows = 3, hint }) {
    const box = h('div');
    const show = () => {
      box.innerHTML = '';
      const v = get();
      const empty = kind === 'list' ? !v.length : !v;
      box.append(empty ? h('p', { class: 'placeholder', onclick: edit }, placeholder || 'Click to add') : view ? view(v) : h('p', { class: 'prose' }, v));
    };
    const edit = () => {
      box.innerHTML = '';
      const ta = h('textarea', { rows: kind === 'list' ? Math.max(rows, get().length + 1) : rows, placeholder: kind === 'list' ? 'One per line' : '' });
      ta.value = kind === 'list' ? get().join('\n') : get();
      const done = (save) => { if (save) { set(kind === 'list' ? lines(ta.value) : ta.value.trim()); saveL(); } show(); render(); };
      ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) done(true); if (e.key === 'Escape') done(false); });
      box.append(ta, hint ? h('div', { class: 'small muted', style: { marginTop: '4px' } }, hint) : null,
        h('div', { style: { display: 'flex', gap: '6px', marginTop: '8px' } }, h('button', { class: 'btn sm primary', onclick: () => done(true) }, 'Save'), h('button', { class: 'btn sm ghost', onclick: () => done(false) }, 'Cancel'), h('span', { class: 'small muted', style: { alignSelf: 'center' } }, kind === 'list' ? 'One item per line · Ctrl+Enter saves' : 'Ctrl+Enter saves')));
      ta.focus();
    };
    box.edit = edit; show();
    return box;
  }
  function card(cls, kicker, body, onEdit, extra) {
    return h('section', { class: 'card ' + cls }, h('div', { class: 'card-head' }, h('div', { class: 'kicker' }, kicker), extra, onEdit ? h('button', { class: 'icon-btn edit-btn', title: 'Edit', onclick: onEdit }, '✎') : null), body);
  }
  const ul = (arr) => h('ul', { class: 'ul' }, arr.map(x => h('li', null, x)));

  // ---------------- Brief: the Sector Exploration Pack ----------------
  function briefView() {
    const s = S();
    if (!s) return sectorPicker();
    const g = h('div', { class: 'canvas' });
    g.append(h('section', { class: 'card c12 brief-hero' },
      h('div', { class: 'kicker' }, s.label || 'Sector Exploration Pack'),
      h('h1', { class: 'hero-name' }, s.name),
      s.referenceMarket ? h('div', { class: 'chips', style: { margin: '2px 0 10px' } }, h('span', { class: 'chip primary' }, '📍 Reference market: ' + s.referenceMarket)) : null,
      s.intro ? h('p', { class: 'hero-sum' }, s.intro) : null));
    if (s.challenge) g.append(h('section', { class: 'card c12 challenge' }, h('div', { class: 'kicker' }, 'The Exploration Challenge'), h('p', null, s.challenge),
      h('div', { class: 'small', style: { opacity: .8, marginTop: '8px' } }, 'The pack doesn’t pick the problem, customer, solution or business model for you. Your team does, with evidence.')));
    if (s.definition || s.inside.length) g.append(h('section', { class: 'card c12' }, h('div', { class: 'kicker' }, 'The sector and its limits'),
      s.definition ? h('p', { class: 'lead' }, s.definition) : null,
      h('div', { class: 'inout' },
        h('div', null, h('h4', { class: 'in' }, 'Inside'), ul(s.inside || [])),
        h('div', null, h('h4', { class: 'out' }, 'Outside'), ul(s.outside || []), s.outsideNote ? h('p', { class: 'small muted' }, s.outsideNote) : null))));
    const vc = s.valueChain || {};
    if ((vc.steps || []).length) g.append(h('section', { class: 'card c12' }, h('div', { class: 'kicker' }, 'Example value chain'),
      vc.note ? h('p', { class: 'small muted', style: { marginTop: 0 } }, vc.note) : null,
      h('div', { class: 'flow' }, vc.steps.map((x, i) => [i ? h('div', { class: 'arrow' }, '→') : null, h('div', { class: 'step' }, h('span', { class: 'n' }, String(i + 1).padStart(2, '0')), h('b', null, x.name), h('div', { class: 'small muted', style: { marginTop: '4px' } }, x.actors))])),
      (vc.enabling || []).length ? h('div', { class: 'enabling' }, h('span', { class: 'kicker' }, vc.enablingLabel || 'Enabling layer'), h('div', { class: 'chips' }, vc.enabling.map(x => h('span', { class: 'chip' }, x)))) : null));
    if ((s.players || []).length) g.append(h('section', { class: 'card c12' }, h('div', { class: 'kicker' }, 'Who is in the sector and how they make money'),
      s.playersNote ? h('p', { class: 'small muted', style: { marginTop: 0 } }, s.playersNote) : null,
      h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, 'Company type'), h('th', null, 'How it makes money'), h('th', null, 'Example players'))),
        h('tbody', null, s.players.map(p => h('tr', null, h('td', null, h('b', null, p.type)), h('td', null, p.howMoney), h('td', { class: 'muted' }, p.examples)))))),
      (s.revenueModels || []).length ? h('div', { style: { marginTop: '12px' } }, h('div', { class: 'kicker', style: { marginBottom: '6px' } }, 'Revenue models you’ll run into'), h('div', { class: 'chips' }, s.revenueModels.map(x => h('span', { class: 'chip' }, x)))) : null));
    if ((s.keyFigures || []).length) g.append(h('section', { class: 'card c8' }, h('div', { class: 'kicker' }, 'Key figures · verified by the organizers'),
      h('div', { class: 'figs' }, s.keyFigures.map(f => h('div', { class: 'fig' }, h('span', { class: 'chip' }, f.level), h('p', null, f.figure), h('div', { class: 'small muted' }, f.source)))),
      s.figuresNote ? h('p', { class: 'small muted' }, '⚠ ' + s.figuresNote) : null));
    const side = h('section', { class: 'card c4' }, h('div', { class: 'kicker' }, 'Reliable sources to start'));
    for (const grp of s.sources || []) side.append(h('h4', { class: 'mini-h' }, grp.group), ul(grp.items));
    if ((s.glossary || []).length) side.append(h('div', { class: 'kicker', style: { margin: '16px 0 6px' } }, 'Quick glossary'), h('dl', { class: 'gloss' }, s.glossary.map(x => [h('dt', null, x.term), h('dd', null, x.def)])));
    g.append(side);
    for (const ex of s.extra || []) g.append(h('section', { class: 'card c12' }, h('div', { class: 'kicker' }, ex.title), (ex.blocks || []).map(b => b.t === 'table'
      ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('tbody', null, b.rows.map(r => h('tr', null, r.map(c => h('td', null, c)))))))
      : h('p', null, b.text))));
    g.append(h('div', { class: 'c12 small muted', style: { textAlign: 'right' } }, h('button', { class: 'btn sm ghost', onclick: () => sectorPicker(true) }, 'Change sector pack…')));
    return g;
  }
  function sectorPicker(asModal) {
    const body = h('div');
    const useSector = async (sec, how) => {
      const probs = SectorPack.check(sec);
      if (probs.length && !(await modal({ title: 'This pack looks incomplete', body: 'Found: ' + probs.join('; ') + '. Use it anyway? The Brief tab shows whatever it could read, and an agent can fix it with the pack-to-sector skill.', actions: [{ label: 'Cancel', value: false }, { label: 'Use it', value: true, cls: 'primary' }] }))) return;
      await Ledger.save('sector.json', sec); toast('Sector pack loaded' + (how ? ' from ' + how : '')); go('brief');
    };
    const docIn = h('input', { type: 'file', accept: '.docx,.json', class: 'hidden', onchange: async e => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const sec = /\.json$/i.test(f.name) ? JSON.parse(await f.text()) : await SectorPack.fromDocx(await f.arrayBuffer());
        if (!/\.json$/i.test(f.name)) { sec.sourceFile = f.name; sec.parsedAt = LL.nowIso(); }
        await useSector(sec, f.name);
      } catch (err) { toast('Couldn’t read that file: ' + err.message, 5000); }
    } });
    body.append(
      h('p', null, 'Load your team’s ', h('b', null, 'Sector Exploration Pack'), '. Pick it from the list, or drop in the .docx you were given and the board reads it for you.'),
      BUILTIN_SECTORS.length ? h('div', { class: 'sector-list' }, BUILTIN_SECTORS.map(sec => h('button', { class: 'btn', onclick: () => useSector(LL.clone(sec)) }, h('b', null, sec.name), h('span', { class: 'small muted' }, ' · ' + (sec.referenceMarket || '').split('(')[0])))) : null,
      h('div', { style: { marginTop: '12px' } }, h('button', { class: 'btn primary', onclick: () => docIn.click() }, 'Load a pack (.docx or sector.json)…'), docIn));
    if (asModal === true) { modal({ title: 'Sector pack', body, actions: [{ label: 'Close', value: null }] }); return; }
    return h('div', { class: 'canvas' }, h('section', { class: 'card c12 welcome' }, h('h2', null, 'Start with your sector'), body,
      h('ol', { class: 'small', style: { marginTop: '16px' } },
        h('li', null, h('b', null, 'Set up your AI: '), 'click ', h('b', null, '✦ Set up your AI'), ' (top right), copy the prompt, and paste it into Claude, ChatGPT or Grok. It walks you through the workshop.'),
        h('li', null, h('b', null, 'Working as a team? '), 'Everyone opens this same file. Use ', h('b', null, '⇄ Share'), ' to send your work to the Team Leader, who adds everyone’s work and shares it back.'))));
  }

  // ---------------- Team: people, Team Leader, who-does-what, agenda ----------------
  function teamView() {
    const l = L(), t = l.team, ms = members();
    const g = h('div', { class: 'canvas' });
    const nameEd = editable({ get: () => t.name, set: v => { t.name = v; }, placeholder: 'Team name (or number)', rows: 1, view: v => h('h1', { class: 'hero-name' }, v) });
    const memEd = editable({ kind: 'list', get: () => ms, set: v => { const old = Object.fromEntries(t.members.map(m => [m.name, m])); t.members = v.map(n => old[n] || { name: n }); if (!v.includes(t.leader)) t.leader = ''; },
      placeholder: 'Add the 5 or 6 people on your team, one per line.', view: v => h('div', null, h('div', { class: 'chips' }, v.map(n => h('button', { class: 'chip member' + (n === t.leader ? ' primary' : ''), title: 'Make Team Leader', onclick: () => { t.leader = n; saveL(); render(); } }, (n === t.leader ? '★ ' : '') + n))),
        h('div', { class: 'small muted', style: { marginTop: '8px' } }, t.leader ? 'Click a name to change the Team Leader.' : 'Click a name to make them Team Leader.')) });
    g.append(h('section', { class: 'card c8' }, h('div', { class: 'card-head' }, h('div', { class: 'kicker' }, 'The team'), h('button', { class: 'icon-btn edit-btn', onclick: () => memEd.edit() }, '✎')), nameEd, memEd));
    g.append(card('c4 leader', 'The Team Leader', h('div', null,
      h('p', { class: 'small', style: { marginTop: 0 } }, 'Talks to the facilitators, checks everyone understood the instructions, watches time and deliverables, and makes sure everyone takes part.'),
      h('p', { class: 'small muted' }, 'Not the boss: can’t impose decisions and has no casting vote.'))));
    const agEd = editable({ kind: 'list', get: () => t.agreements, set: v => { t.agreements = v; }, placeholder: 'How you’ll work, e.g. “We decide by consensus; if we can’t in 3 minutes, we vote with the matrix criteria.”', view: v => ul(v) });
    g.append(card('c6', 'How we’ll work', agEd, () => agEd.edit()));
    g.append(contribCard());
    g.append(shareCard());

    // assignments
    const asg = (sprint, dims) => {
      const a = l.assignments[sprint];
      const rows = dims.map(([d, label]) => h('tr', null, h('td', null, label), h('td', null, h('select', { onchange: e => { a[d] = e.target.value; saveL(); render(); } }, h('option', { value: '' }, '—'), ms.map(n => h('option', { value: n, selected: a[d] === n }, n))))));
      const auto = () => { if (!ms.length) { toast('Add team members first'); return; } const off = sprint === 'sector' ? 1 : 0; dims.forEach(([d], i) => { a[d] = ms[(i + off) % ms.length]; }); saveL(); render(); };
      return h('section', { class: 'card c6' }, h('div', { class: 'card-head' }, h('div', { class: 'kicker' }, sprint === 'pestel' ? 'Sprint 1 · who takes which PESTEL dimension' : 'Sprint 2 · who takes which sector dimension'), h('button', { class: 'btn sm', onclick: auto }, 'Share out')),
        h('table', { class: 'tbl asg' }, h('tbody', null, rows)),
        ms.length && ms.length < 6 ? h('p', { class: 'small muted' }, 'Six dimensions, ' + ms.length + ' people: one person takes two, or pair up on one.') : null);
    };
    g.append(asg('pestel', PESTEL), asg('sector', SECTOR_DIMS));

    // agenda
    const ag = l.workshop.agenda, st = timerState();
    const total = ag.reduce((n, b) => n + (+b.minutes || 0), 0);
    g.append(h('section', { class: 'card c12' }, h('div', { class: 'card-head' }, h('div', { class: 'kicker' }, `Workshop 1 agenda · ${total} min`), h('button', { class: 'btn sm ghost', onclick: () => { l.workshop.agenda = LL.clone(LL.DEFAULT_AGENDA); saveL(); render(); } }, 'Reset to default')),
      h('table', { class: 'tbl agenda' }, h('tbody', null, ag.map((b, i) => h('tr', { class: i === st.i ? 'now' : '' },
        h('td', { class: 'mono small muted' }, String(i + 1)),
        h('td', null, h('input', { type: 'text', value: b.label, onchange: e => { b.label = e.target.value; saveL(); } })),
        h('td', { style: { width: '90px' } }, h('input', { type: 'number', min: 1, max: 120, value: b.minutes, onchange: e => { b.minutes = Math.max(1, +e.target.value || 1); saveL(); render(); } })),
        h('td', { class: 'small muted', style: { width: '30px' } }, 'min'),
        h('td', { style: { width: '90px' } }, h('button', { class: 'btn sm' + (i === st.i ? ' primary' : ''), onclick: () => startBlock(i) }, i === st.i ? 'Running' : '▶ Start')))))),
      total !== 120 ? h('p', { class: 'small', style: { color: 'var(--warn)' } }, 'The session is 120 minutes. This agenda adds up to ' + total + '.') : null));
    return g;
  }
  function contribCard() {
    const ms = members();
    const fs = all('findings'), srcs = allSources();
    const rows = ms.map(n => [n, fs.filter(f => f.author === n).length, srcs.filter(x => x.src.verifiedBy === n).length, all('opportunities').filter(o => o.author === n).length]);
    const max = Math.max(1, ...rows.map(r => r[1]));
    return card('c6', 'Who did what', ms.length ? h('div', null,
      h('table', { class: 'tbl contrib' }, h('thead', null, h('tr', null, h('th', null, ''), h('th', null, 'Findings'), h('th', null, 'Sources checked'), h('th', null, 'Opportunities'))),
        h('tbody', null, rows.map(([n, f, v, o]) => h('tr', null, h('td', null, n), h('td', null, h('div', { class: 'bar' }, h('i', { style: { width: (f / max * 100) + '%' } }), h('span', null, f))), h('td', null, v), h('td', null, o))))),
      h('p', { class: 'small muted' }, 'No single person should hold the research. Anyone on the team can be asked to explain the problem, the customer and the evidence.'))
      : h('p', { class: 'placeholder' }, 'Add team members to see who contributed what.'));
  }

  // ---------------- Sprint 1 and 2: research boards ----------------
  function sprintView(sprint) {
    const dims = sprint === 'pestel' ? PESTEL : SECTOR_DIMS;
    const a = L().assignments[sprint];
    const wrap = h('div');
    const keyCount = findings(sprint).filter(f => f.key).length;
    wrap.append(h('div', { class: 'board-bar' },
      h('div', null, h('h2', { style: { fontSize: '22px' } }, sprint === 'pestel' ? 'Sprint 1 · PESTEL analysis' : 'Sprint 2 · How the sector works'),
        h('div', { class: 'small muted' }, sprint === 'pestel'
          ? 'Each person researches one dimension: what is changing and who it affects. Then the team stars the external factors that matter most.'
          : 'Each person researches one dimension. Then the team shares and turns the findings into a list of possible opportunities. No customer or solution yet.')),
      h('span', { class: 'spacer' }),
      sprint === 'pestel' ? h('span', { class: 'chip' + (keyCount >= 3 ? ' ok' : '') }, '★ ' + keyCount + ' key factors') : h('button', { class: 'btn', onclick: () => go('opportunities') }, 'Opportunities →'),
      h('button', { class: 'btn', onclick: () => closeSprint(sprint) }, 'Close this sprint')));
    if (S() && S().pestelNote && sprint === 'pestel') wrap.append(h('p', { class: 'small muted', style: { margin: '-4px 0 12px' } }, 'From the pack: ' + S().pestelNote));
    const grid = h('div', { class: 'dims' });
    for (const [d, label, x] of dims) {
      const items = findings(sprint, d), who = a[d];
      const mine = who && who === LL.me();
      grid.append(h('section', { class: 'dim card' + (mine ? ' mine' : '') },
        h('div', { class: 'dim-head' }, h('h3', null, label), h('span', { class: 'spacer' }), who ? h('span', { class: 'chip' + (mine ? ' primary' : '') }, mine ? 'You' : who) : h('button', { class: 'chip ghosty', onclick: () => go('team') }, 'Assign'), h('span', { class: 'count' }, items.length)),
        h('p', { class: 'dim-q' }, sprint === 'pestel' ? x : starter(d)),
        h('div', { class: 'dim-actions' },
          h('button', { class: 'btn sm accent', title: 'Paste into Claude (or another AI). It answers with sources and a block you can paste back.', onclick: () => copyText(researchPrompt(sprint, d), 'Research prompt copied') }, '1 · Copy research prompt'),
          h('button', { class: 'btn sm', onclick: () => pasteFromAi(sprint, d) }, '2 · Paste AI answer'),
          h('button', { class: 'btn sm ghost', onclick: () => newFinding(sprint, d) }, '+ Add')),
        h('div', { class: 'findings' }, items.length ? items.map(f => findingCard(f, sprint)) : h('p', { class: 'small muted', style: { margin: '6px 2px' } }, 'No findings yet.'))));
    }
    wrap.append(grid);
    return wrap;
  }
  function findingCard(f, sprint) {
    const srcs = sourcesOf(f), ver = srcs.filter(s => s.verified).length;
    return h('article', { class: 'finding' + (f.key ? ' key' : ''), onclick: () => openItem('findings', f.id) },
      h('div', { class: 'f-top' }, h('span', { class: 'story-id' }, f.id),
        f.origin === 'ai' ? h('span', { class: 'badge', title: 'Came from an AI answer' }, 'AI') : null,
        h('span', { class: 'spacer' }),
        srcs.length ? h('span', { class: 'badge ' + (ver === srcs.length ? 'ok' : 'warn'), title: ver + ' of ' + srcs.length + ' sources checked by a person' }, (ver === srcs.length ? '✓ ' : '') + ver + '/' + srcs.length + ' src') : h('span', { class: 'badge bad', title: 'No source yet' }, 'no source'),
        sprint === 'pestel' ? h('button', { class: 'star' + (f.key ? ' on' : ''), title: f.key ? 'Key factor (click to unstar)' : 'Star as a key external factor', onclick: (e) => { e.stopPropagation(); f.key = !f.key; Ledger.save(f._file, f); render(); } }, f.key ? '★' : '☆') : null),
      h('p', { class: 'f-title' }, f.title || h('span', { class: 'muted' }, '(no headline)')),
      f.whoAffected ? h('div', { class: 'small muted' }, '→ ' + f.whoAffected) : null,
      f.author ? h('div', { class: 'f-by' }, f.author) : null);
  }
  async function newFinding(sprint, dim, extra) {
    const id = await Ledger.create('findings', 'F', Object.assign({ sprint, dimension: dim, author: LL.me(), title: '', detail: '', whoAffected: '', implication: '', sources: [], origin: 'team', key: false, notes: '' }, extra || {}));
    if (id && !extra) openItem('findings', id); else render();
    return id;
  }
  async function closeSprint(sprint) {
    const label = sprint === 'pestel' ? 'Sprint 1 (PESTEL)' : 'Sprint 2 (sector)';
    const keys = findings(sprint).filter(f => f.key);
    const ta = h('textarea', { rows: 3 });
    ta.value = sprint === 'pestel' ? (keys.length ? 'Key external factors: ' + keys.map(f => f.title).join('; ') + '.' : '') : (opportunities().length ? 'Possible opportunities: ' + opportunities().map(o => o.title).filter(Boolean).join('; ') + '.' : '');
    const how = h('select', null, h('option', { value: 'consensus' }, 'Consensus'), h('option', { value: 'vote' }, 'Vote'));
    const v = await modal({ title: 'Close ' + label, body: h('div', null,
      h('p', { class: 'small muted' }, 'Every sprint ends with a concrete decision. Write down what the team decided, so it’s on record for Workshop 2 and the jury.'),
      h('label', { class: 'field' }, h('span', null, 'What we decided'), ta), h('label', { class: 'field' }, h('span', null, 'How'), how)),
      actions: [{ label: 'Cancel', value: false }, { label: 'Log the decision', value: true, cls: 'primary' }] });
    if (!v || !ta.value.trim()) return;
    await Ledger.create('decisions', 'D', { workshop: 1, step: sprint, decision: ta.value.trim(), how: how.value, rationale: '', date: today(), by: LL.me() });
    toast('Decision logged'); render();
  }

  // ---------------- AI round-trip ----------------
  function parseAiJson(text) {
    const cands = [...String(text).matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map(m => m[1]).reverse();
    const a = text.indexOf('{'), b = text.lastIndexOf('}');
    if (a >= 0 && b > a) cands.push(text.slice(a, b + 1));
    for (const c of cands) try { const o = JSON.parse(c.trim()); if (o && typeof o === 'object') return o; } catch {}
    return null;
  }
  const normSources = (arr) => (Array.isArray(arr) ? arr : []).map(s => typeof s === 'string' ? { label: s } : s).filter(s => s && (s.label || s.url || s.publisher || s.title))
    .map(s => ({ label: s.label || [s.publisher, s.title].filter(Boolean).join(', '), url: s.url || '', year: String(s.year || ''), verified: false, verifiedBy: '', verifiedAt: null }));
  async function pasteFromAi(sprint, dim) {
    const ta = h('textarea', { rows: 10, placeholder: 'Paste the whole answer. The board picks up the JSON block at the end.' });
    const v = await modal({ title: 'Paste the AI answer · ' + dimLabel(sprint, dim), wide: true, body: h('div', null, ta,
      h('p', { class: 'small muted' }, 'Everything comes in as “AI” with its sources unchecked. Read each one. Delete what you don’t believe, and open the sources before you rely on them.')),
      actions: [{ label: 'Cancel', value: null }, { label: 'Add findings', value: () => ta.value, cls: 'primary' }] });
    if (!v) return;
    const o = parseAiJson(v), list = o && (Array.isArray(o) ? o : o.findings);
    if (!Array.isArray(list) || !list.length) { toast('No findings block found. Ask the AI to finish with the JSON block from the prompt.', 5000); return; }
    for (const f of list) await Ledger.create('findings', 'F', { sprint, dimension: dim, author: LL.me(), title: f.title || '', detail: f.detail || f.whatIsChanging || '', whoAffected: f.whoAffected || f.who || '', implication: f.implication || f.soWhat || '', sources: normSources(f.sources), origin: 'ai', key: false, notes: '' });
    toast(list.length + ' finding(s) added. Now check them.'); render();
  }

  // ---------------- prompts ----------------
  function ctx(withFigures = true) {
    const s = S();
    if (!s) return 'Program: Innovation Sprint Challenge (Spain-US Chamber of Commerce, Miami International Week). Workshop 1: AI Opportunity Discovery Sprint.';
    return [`Program: Innovation Sprint Challenge (Spain-US Chamber of Commerce, Miami International Week), Workshop 1: AI Opportunity Discovery Sprint. We are an MBA team; our output must be defensible in front of investors.`,
      `Sector: ${s.name}. ${s.definition || ''}`,
      s.inside && s.inside.length ? `Inside the sector: ${s.inside.join('; ')}.` : '',
      s.outside && s.outside.length ? `Outside (partners or channels only, not the core of the idea): ${s.outside.join('; ')}.` : '',
      s.referenceMarket ? `Reference market: ${s.referenceMarket}.` : '',
      s.challenge ? `\nExploration Challenge: ${s.challenge}` : '',
      withFigures && (s.keyFigures || []).length ? '\nKey figures from our Sector Exploration Pack (checked by the organizers):\n' + s.keyFigures.map(f => `- [${f.level}] ${f.figure} (${f.source})`).join('\n') : '',
      (s.sources || []).length ? '\nReliable sources suggested by the pack: ' + s.sources.map(g => g.group + ': ' + g.items.join(', ')).join('. ') + '.' : ''
    ].filter(Boolean).join('\n');
  }
  const RULES = `Rules for your answer:
- Use real, checkable sources only: publisher, title, year, URL. If you aren't sure a source exists or says this, write "source to find" instead of guessing. Never invent numbers.
- Separate facts from your interpretation. Flag estimates, preliminary data, and anything older than two years.
- Keep each item short. We will check every source before we rely on it.`;
  const FINDINGS_JSON = 'Finish with ONE JSON block that our team board can import, in exactly this shape:\n```json\n{"findings":[{"title":"one-line headline","detail":"what we found, with the number","whoAffected":"which customers or operators","implication":"why it could matter for a business opportunity","sources":[{"label":"Publisher, title","url":"https://…","year":"2026"}]}]}\n```';
  function researchPrompt(sprint, dim) {
    const label = dimLabel(sprint, dim);
    if (sprint === 'pestel') return `I'm on an MBA team in a 15-minute research sprint. My job is the ${label.toUpperCase()} dimension of a PESTEL analysis of this sector.

${ctx()}

Task: find the 4 to 6 most important ${label.toLowerCase()} factors that are CHANGING now (last 2 years and next 3) and affect this sector in the United States, with special attention to our reference market. For each factor give:
1. What is changing, with a number or a date when there is one
2. Who it affects (which customers, operators or businesses), and how many if known
3. Why it could matter for a business opportunity (one line, no business idea yet)
4. Its source

${RULES}
- Don't propose a business idea yet. We're mapping what is changing and who it affects.

${FINDINGS_JSON}`;
    return `I'm on an MBA team in a 20-minute research sprint about how this sector works. My dimension is ${label.toUpperCase()}.
Starter question from our pack: ${starter(dim)}

${ctx()}

Task: answer the starter question for this sector in the United States, with special attention to our reference market. Give 4 to 6 findings. For each one: what you found (with numbers), who experiences it, why it could point to an opportunity, and the source. Look especially for: things people still do manually or work around, places where customers or operators lose time, money or trust, and what today's solutions fail to do.

${RULES}
- We are NOT choosing a customer or a solution yet. Describe problems, who has them, how they are solved today, and the evidence.

${FINDINGS_JSON}`;
  }
  const fLine = (f) => `- ${f.id} [${dimLabel(f.sprint, f.dimension)}] ${f.title}${f.whoAffected ? ' | affects: ' + f.whoAffected : ''}${f.implication ? ' | so what: ' + f.implication : ''}${sourcesOf(f).length ? ' | sources: ' + sourcesOf(f).map(s => s.label + (s.year ? ' ' + s.year : '') + (s.verified ? ' (checked)' : ' (unchecked)')).join('; ') : ' | no source'}`;
  function oppPrompt() {
    const keys = findings('pestel').filter(f => f.key), sec = findings('sector');
    return `We finished two research sprints. Help us turn the findings into a list of possible opportunities. Don't pick one: the team decides.

${ctx(false)}

Key external factors (Sprint 1, starred by the team):
${keys.map(fLine).join('\n') || '- (none starred yet)'}

How the sector works (Sprint 2):
${sec.map(fLine).join('\n') || '- (none yet)'}

Task: propose 6 to 8 candidate opportunities. Each one is a specific friction experienced by a clearly defined customer (a person, an operator or a business), not a trend. For each:
- title (a few words)
- friction: what goes wrong, costs time, money or trust
- who experiences it, as specifically as possible, and roughly how many
- how it's solved today, and what that fails to do
- why now: which external factor above makes it more urgent
- evidence: which finding ids support it, and what evidence is still missing
Point out where two findings contradict each other, and which opportunities rest on unchecked sources.

Finish with ONE JSON block in exactly this shape:
\`\`\`json
{"opportunities":[{"title":"","friction":"","who":"","howSolvedToday":"","whyNow":"","evidence":"","findingIds":["F001"]}]}
\`\`\``;
  }
  const oLine = (o) => `- ${o.id} ${o.title}: ${o.friction || ''}${o.who ? ' | who: ' + o.who : ''}${o.howSolvedToday ? ' | today: ' + o.howSolvedToday : ''}${o.whyNow ? ' | why now: ' + o.whyNow : ''}${o.evidence ? ' | evidence: ' + o.evidence : ''}`;
  function hypPrompt() {
    const os = opportunities(), short = os.filter(o => o.shortlisted);
    return `Help our team write THREE distinct business hypotheses. We will compare them with a weighted decision matrix and choose one ourselves.

${ctx(false)}

Opportunities${short.length ? ' we shortlisted' : ' we listed'}:
${(short.length ? short : os).map(oLine).join('\n') || '- (none yet)'}

For each hypothesis give: title, customer (specific), problem, solution (it can be digital, physical, in-person, financial, technological, operational or hybrid), value proposition (why they'd switch from what they do today), revenue model (who pays, for what, how often), business model type (B2C, B2B, B2B2C, platform or institutional), a launch market, and why now.
Make the three genuinely different: a different customer, or a different business model. Not three versions of one app.
For each, name the single assumption that would kill it if it's wrong.

Finish with ONE JSON block in exactly this shape:
\`\`\`json
{"hypotheses":[{"title":"","customer":"","problem":"","solution":"","valueProp":"","revenueModel":"","businessModel":"B2B","launchMarket":"","whyNow":"","killerAssumption":""}]}
\`\`\``;
  }
  const hLine = (x) => `${x.id} · ${x.title || '(untitled)'}
  Customer: ${x.customer || '-'}
  Problem: ${x.problem || '-'}
  Solution: ${x.solution || '-'}
  Value proposition: ${x.valueProp || '-'}
  Revenue model: ${x.revenueModel || '-'}${x.businessModel ? ' (' + x.businessModel + ')' : ''}
  Launch market: ${x.launchMarket || '-'}${x.launchMarketWhy ? ' because ' + x.launchMarketWhy : ''}`;
  function challengePrompt() {
    return `Act as a skeptical seed investor on the jury of a startup competition. Here are three business hypotheses from an MBA team. Don't score them and don't pick one. Stress-test them.

${ctx(false)}

${hypotheses().map(hLine).join('\n\n')}

For each hypothesis:
1. The three hardest questions you'd ask in a 5-minute Q&A
2. The weakest assumption, and what evidence would change your mind
3. Who already solves this, and why they haven't won the market
Then say which hypothesis has the least evidence behind it right now. Be direct and brief.`;
  }
  function launchPrompt(x) {
    return `Our team chose this business hypothesis. Help us pick and justify an initial U.S. launch market with data.

${ctx()}

${hLine(x)}

Compare three candidate launch markets (one of them: ${x.launchMarket || 'our reference market'}). For each: size of our customer group there (with a number and source), how reachable they are, competition, and one risk. Then recommend one and give the two strongest data points for it, with sources. ${RULES.split('\n').slice(1).join(' ')}`;
  }
  function summaryMd() {
    const l = L(), s = S(), x = selected(), keys = findings('pestel').filter(f => f.key);
    const ms = Object.fromEntries(hypotheses().map(hh => [hh.id, matrixScore(hh)]));
    const ds = decisions().slice().reverse(), last = sessions()[0];
    const open = [...(x && x.openQuestions ? x.openQuestions : []), ...(last && last.evidenceGaps ? lines(last.evidenceGaps) : [])];
    const unchecked = allSources().filter(e => !e.src.verified);
    return `# ${l.team.name || 'Our team'}: Workshop 1 output
Sector: ${s ? s.name : '-'} · Team: ${members().join(', ') || '-'}${l.team.leader ? ' · Team Leader: ' + l.team.leader : ''}

## The idea we chose
${x ? hLine(x).split('\n').map(t => t.trim()).join('\n') + (x.whyNow ? '\nWhy now: ' + x.whyNow : '') : '(not chosen yet)'}

## Why this one
${x ? `Matrix score ${ms[x.id]}/100 vs ${hypotheses().filter(hh => hh.id !== x.id).map(hh => hh.id + ' ' + (hh.title || '') + ' ' + ms[hh.id] + '/100').join(', ')}. Decided by ${l.selection.method || '-'}.${l.selection.rationale ? ' ' + l.selection.rationale : ''}` : '-'}
Criteria: ${l.matrix.criteria.map(c => c.label + ' ' + c.weight + '%').join(', ')}

## Key external factors (PESTEL)
${keys.map(fLine).join('\n') || '- (none starred)'}

## Evidence behind the problem
${x ? (x.opportunityIds || []).map(id => Ledger.state.opportunities[id]).filter(Boolean).map(oLine).join('\n') || '- (no linked opportunities)' : '-'}
${x && sourcesOf(x).length ? sourcesOf(x).map(sr => `- ${sr.label}${sr.year ? ' (' + sr.year + ')' : ''}${sr.url ? ' ' + sr.url : ''}${sr.verified ? ' ✓ checked' : ' (unchecked)'}`).join('\n') : ''}

## Decisions on record
${ds.map(d => `- ${d.date} [${d.step}] ${d.decision} (${d.how || '-'})`).join('\n') || '- (none)'}

## Still open
${open.map(q => '- ' + q).join('\n') || '- (nothing listed)'}
${unchecked.length ? `- ${unchecked.length} source(s) nobody has checked yet` : ''}
${last && last.questionsForNext ? '\n## Questions for Workshop 2\n' + lines(last.questionsForNext).map(q => '- ' + q).join('\n') : ''}
`;
  }
  function w2Prompt() {
    return `This is our team's output from Workshop 1 of the Innovation Sprint Challenge. Next is Workshop 2, the Go to Market and Brand Sprint: positioning, brand (name, tagline, logo) and the marketing and acquisition funnel to reach our target market.

Read it, then:
1. Restate our customer, problem and value proposition in two sentences each. Tell us if anything is vague.
2. List what Workshop 2 needs that we don't have yet (customer detail, channels, competitors' positioning).
3. Ask us up to five questions we should answer before the session.

${summaryMd()}`;
  }
  function slidesPrompt() {
    return `Our final pitch is max 12 slides for 8 minutes, to investors, for a seed round. Workshop 1 can use about 4 of them. From the material below, propose an outline of at most 4 slides: for each, a headline that states a conclusion (not a topic), the one number or piece of evidence that proves it, and what to cut. Don't invent data that isn't in the material.

${summaryMd()}`;
  }
  function juryPrompt() {
    return `Quiz me like a jury member at a startup pitch. Any member of our team can be asked, so I need to explain our project without notes.

${summaryMd()}

Ask me one question at a time (5 in total) about the problem, the customer, the evidence, why we chose this idea over the other two, and the launch market. After each answer, give me one line of feedback on clarity and brevity. If I don't know, coach me to say so honestly and to explain how we'd find out.`;
  }

  // ---------------- Opportunities ----------------
  function oppView() {
    const os = opportunities();
    const wrap = h('div');
    wrap.append(h('div', { class: 'board-bar' },
      h('div', null, h('h2', { style: { fontSize: '22px' } }, 'Possible opportunities'),
        h('div', { class: 'small muted' }, 'What problems exist, who has them, how they’re solved today, and what evidence says it matters. Shortlist the ones worth turning into hypotheses.')),
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn accent', onclick: () => copyText(oppPrompt(), 'Opportunity prompt copied'), title: 'Sends your starred factors and sector findings to Claude' }, 'Copy “find the opportunities” prompt'),
      h('button', { class: 'btn', onclick: () => pasteList('opportunities') }, 'Paste AI answer'),
      h('button', { class: 'btn primary', onclick: newOpp }, '+ Opportunity')));
    if (!os.length) { wrap.append(h('div', { class: 'empty' }, h('p', null, 'No opportunities yet. Share your Sprint 2 findings as a team, then write each friction you found as one card.'), h('button', { class: 'btn primary', onclick: newOpp }, '+ Add the first one'))); return wrap; }
    wrap.append(h('div', { class: 'opps' }, os.map(o => {
      const linked = (o.findingIds || []).map(id => Ledger.state.findings[id]).filter(Boolean);
      return h('article', { class: 'card opp' + (o.shortlisted ? ' short' : ''), onclick: () => openItem('opportunities', o.id) },
        h('div', { class: 'f-top' }, h('span', { class: 'story-id' }, o.id), o.origin === 'ai' ? h('span', { class: 'badge' }, 'AI') : null, h('span', { class: 'spacer' }),
          h('button', { class: 'btn sm' + (o.shortlisted ? ' primary' : ''), onclick: e => { e.stopPropagation(); o.shortlisted = !o.shortlisted; Ledger.save(o._file, o); render(); } }, o.shortlisted ? '✓ Shortlisted' : 'Shortlist')),
        h('h3', null, o.title || '(untitled)'),
        o.friction ? h('p', { class: 'opp-f' }, o.friction) : null,
        h('dl', { class: 'kv' },
          o.who ? [h('dt', null, 'Who'), h('dd', null, o.who)] : null,
          o.howSolvedToday ? [h('dt', null, 'Today'), h('dd', null, o.howSolvedToday)] : null,
          o.whyNow ? [h('dt', null, 'Why now'), h('dd', null, o.whyNow)] : null),
        h('div', { class: 'chips', style: { marginTop: '8px' } }, linked.map(f => h('span', { class: 'chip', title: f.title }, f.id)), !linked.length && !sourcesOf(o).length ? h('span', { class: 'badge bad' }, 'no evidence linked') : null));
    })));
    return wrap;
  }
  async function newOpp() {
    const id = await Ledger.create('opportunities', 'O', { title: '', friction: '', who: '', howSolvedToday: '', whyNow: '', evidence: '', findingIds: [], sources: [], author: LL.me(), shortlisted: false, origin: 'team' });
    if (id) openItem('opportunities', id);
  }
  async function pasteList(slot) {
    const ta = h('textarea', { rows: 10, placeholder: 'Paste the whole answer. The board picks up the JSON block at the end.' });
    const v = await modal({ title: 'Paste the AI answer', wide: true, body: h('div', null, ta, h('p', { class: 'small muted' }, 'Everything comes in marked “AI”. Edit, merge or delete it until it says what your team thinks.')),
      actions: [{ label: 'Cancel', value: null }, { label: 'Add', value: () => ta.value, cls: 'primary' }] });
    if (!v) return;
    const o = parseAiJson(v), list = o && (Array.isArray(o) ? o : o[slot]);
    if (!Array.isArray(list) || !list.length) { toast('No ' + slot + ' block found. Ask the AI to finish with the JSON block from the prompt.', 5000); return; }
    for (const x of list) {
      if (slot === 'opportunities') await Ledger.create('opportunities', 'O', { title: x.title || '', friction: x.friction || '', who: x.who || '', howSolvedToday: x.howSolvedToday || '', whyNow: x.whyNow || '', evidence: x.evidence || '', findingIds: (x.findingIds || []).filter(id => Ledger.state.findings[id]), sources: normSources(x.sources), author: LL.me(), shortlisted: false, origin: 'ai' });
      else await Ledger.create('hypotheses', 'H', { order: hypotheses().length + 1, title: x.title || '', customer: x.customer || '', problem: x.problem || '', solution: x.solution || '', valueProp: x.valueProp || '', revenueModel: x.revenueModel || '', businessModel: BIZ_MODELS.includes(x.businessModel) ? x.businessModel : '', launchMarket: x.launchMarket || '', launchMarketWhy: '', whyNow: x.whyNow || '', openQuestions: x.killerAssumption ? [x.killerAssumption] : [], opportunityIds: [], sources: [], scores: {}, author: LL.me(), origin: 'ai' });
    }
    toast(list.length + ' added'); render();
  }

  // ---------------- Hypotheses + weighted decision matrix ----------------
  function matrixScore(x) {
    const cs = L().matrix.criteria, scale = L().matrix.scale || 5;
    const tw = cs.reduce((n, c) => n + (+c.weight || 0), 0) || 1;
    return Math.round(cs.reduce((n, c) => n + (+c.weight || 0) * (+((x.scores || {})[c.id]) || 0), 0) / (tw * scale) * 100);
  }
  function hypView() {
    const hs = hypotheses(), l = L(), sel = selected();
    const wrap = h('div');
    wrap.append(h('div', { class: 'board-bar' },
      h('div', null, h('h2', { style: { fontSize: '22px' } }, 'Three business hypotheses'),
        h('div', { class: 'small muted' }, 'Write three, compare them on the same criteria, and choose one. Try for consensus. If you can’t get there in time, vote using the matrix criteria.')),
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn', onclick: () => copyText(hypPrompt(), 'Hypotheses prompt copied') }, 'Copy “draft three” prompt'),
      h('button', { class: 'btn', onclick: () => pasteList('hypotheses') }, 'Paste AI answer'),
      hs.length ? h('button', { class: 'btn accent', onclick: () => copyText(challengePrompt(), 'Challenge prompt copied'), title: 'A skeptical investor attacks your three hypotheses' }, 'Copy “challenge us” prompt') : null,
      h('button', { class: 'btn primary', onclick: newHyp }, '+ Hypothesis')));
    if (sel) wrap.append(chosenPanel(sel));
    if (!hs.length) { wrap.append(h('div', { class: 'empty' }, h('p', null, 'Start from your shortlisted opportunities. Each hypothesis names a customer, a problem, a solution, a value proposition and a revenue model.'), h('button', { class: 'btn primary', onclick: newHyp }, '+ Write the first one'))); return wrap; }
    wrap.append(h('div', { class: 'hyps' }, hs.map(x => {
      const core = [['customer', 'Customer'], ['problem', 'Problem'], ['solution', 'Solution'], ['valueProp', 'Value proposition'], ['revenueModel', 'Revenue model']];
      return h('article', { class: 'card hyp' + (sel && sel.id === x.id ? ' chosen' : ''), onclick: () => openItem('hypotheses', x.id) },
        h('div', { class: 'f-top' }, h('span', { class: 'story-id' }, x.id), x.businessModel ? h('span', { class: 'chip' }, x.businessModel) : null, x.origin === 'ai' ? h('span', { class: 'badge' }, 'AI') : null, h('span', { class: 'spacer' }), h('span', { class: 'score' }, matrixScore(x), h('small', null, '/100'))),
        h('h3', null, x.title || '(untitled)'),
        h('dl', { class: 'kv' }, core.map(([k, lab]) => [h('dt', null, lab), h('dd', { class: x[k] ? '' : 'muted' }, x[k] || '—')])));
    })));
    wrap.append(matrixCard(hs));
    return wrap;
  }
  function matrixCard(hs) {
    const l = L(), m = l.matrix, scale = m.scale || 5, ms = members();
    const tw = m.criteria.reduce((n, c) => n + (+c.weight || 0), 0);
    const scores = hs.map(matrixScore), top = Math.max(...scores);
    const scoreBtns = (x, c) => h('div', { class: 'sc' }, Array.from({ length: scale }, (_, i) => i + 1).map(n => h('button', { 'aria-pressed': String(+((x.scores || {})[c.id]) === n), onclick: () => { x.scores = Object.assign({}, x.scores, { [c.id]: +((x.scores || {})[c.id]) === n ? 0 : n }); Ledger.save(x._file, x); render(); } }, n)));
    const table = h('table', { class: 'tbl matrix' },
      h('thead', null, h('tr', null, h('th', null, 'Criterion'), h('th', { style: { width: '84px' } }, 'Weight %'), hs.map(x => h('th', null, x.id + ' · ' + (x.title || '').slice(0, 28))))),
      h('tbody', null, m.criteria.map((c, ci) => h('tr', null,
        h('td', null, h('input', { type: 'text', value: c.label, title: c.hint || '', onchange: e => { c.label = e.target.value; saveL(); } }), c.hint ? h('div', { class: 'small muted' }, c.hint) : null),
        h('td', null, h('input', { type: 'number', min: 0, max: 100, value: c.weight, onchange: e => { c.weight = Math.max(0, +e.target.value || 0); saveL(); render(); } }),
          h('button', { class: 'icon-btn small', title: 'Remove criterion', onclick: () => { m.criteria.splice(ci, 1); saveL(); render(); } }, '✕')),
        hs.map(x => h('td', null, scoreBtns(x, c)))))),
      h('tfoot', null, h('tr', null, h('td', null, h('button', { class: 'btn sm ghost', onclick: () => { m.criteria.push({ id: 'c' + Date.now().toString(36), label: 'New criterion', weight: 0, hint: '' }); saveL(); render(); } }, '+ Criterion')),
        h('td', { class: tw === 100 ? 'ok-t' : 'warn-t' }, tw + '%'), hs.map((x, i) => h('td', { class: 'total' + (scores[i] === top && top > 0 ? ' top' : '') }, scores[i], h('small', null, '/100'))))));
    const votes = l.selection.votes;
    const voteRow = ms.length ? h('div', { class: 'votes' }, h('div', { class: 'kicker', style: { marginBottom: '6px' } }, 'No consensus? Vote'),
      h('div', { class: 'vote-grid' }, ms.map(n => h('label', { class: 'vote' }, h('span', null, n), h('select', { onchange: e => { votes[n] = e.target.value; saveL(); render(); } }, h('option', { value: '' }, '—'), hs.map(x => h('option', { value: x.id, selected: votes[n] === x.id }, x.id)))))),
      Object.values(votes).some(Boolean) ? h('div', { class: 'small', style: { marginTop: '6px' } }, hs.map(x => x.id + ': ' + Object.values(votes).filter(v => v === x.id).length).join(' · ')) : null) : null;
    return h('section', { class: 'card matrix-card' },
      h('div', { class: 'card-head' }, h('div', { class: 'kicker' }, 'Weighted decision matrix · score 1 (weak) to ' + scale + ' (strong)'), h('button', { class: 'btn sm primary', onclick: decide }, selected() ? 'Change the decision' : 'Decide')),
      tw !== 100 ? h('p', { class: 'small', style: { color: 'var(--warn)', margin: '0 0 8px' } }, 'Weights add up to ' + tw + '%. Make them 100% so the scores are comparable.') : null,
      h('div', { class: 'tbl-wrap' }, table), voteRow);
  }
  async function newHyp() {
    const id = await Ledger.create('hypotheses', 'H', { order: hypotheses().length + 1, title: '', customer: '', problem: '', solution: '', valueProp: '', revenueModel: '', businessModel: '', launchMarket: '', launchMarketWhy: '', whyNow: '', openQuestions: [], opportunityIds: [], sources: [], scores: {}, author: LL.me(), origin: 'team' });
    if (id) openItem('hypotheses', id);
  }
  async function decide() {
    const hs = hypotheses(); if (!hs.length) return;
    const l = L(), best = hs.slice().sort((a, b) => matrixScore(b) - matrixScore(a))[0];
    const pick = h('select', null, hs.map(x => h('option', { value: x.id, selected: (l.selection.hypothesisId || best.id) === x.id }, x.id + ' · ' + (x.title || '') + ' · ' + matrixScore(x) + '/100')));
    const how = h('select', null, h('option', { value: 'consensus', selected: l.selection.method !== 'vote' }, 'Consensus'), h('option', { value: 'vote', selected: l.selection.method === 'vote' }, 'Vote on the matrix criteria'));
    const why = h('textarea', { rows: 3, placeholder: 'In one or two sentences: why this one, and what made the others weaker.' }); why.value = l.selection.rationale || '';
    const v = await modal({ title: 'Choose the hypothesis', body: h('div', null,
      h('label', { class: 'field' }, h('span', null, 'We choose'), pick), h('label', { class: 'field' }, h('span', null, 'Decided by'), how), h('label', { class: 'field' }, h('span', null, 'Why'), why),
      h('p', { class: 'small muted' }, 'Everyone on the team should be able to explain this choice to the jury.')),
      actions: [{ label: 'Cancel', value: false }, { label: 'Decide', value: true, cls: 'primary' }] });
    if (!v) return;
    const x = Ledger.state.hypotheses[pick.value];
    Object.assign(l.selection, { hypothesisId: x.id, method: how.value, rationale: why.value.trim(), decidedAt: LL.nowIso() });
    await Ledger.saveLedger();
    await Ledger.create('decisions', 'D', { workshop: 1, step: 'hypothesis', decision: `Chose ${x.id} · ${x.title || ''} (matrix ${matrixScore(x)}/100).`, how: how.value, rationale: why.value.trim(), date: today(), by: LL.me(),
      votes: how.value === 'vote' ? Object.assign({}, l.selection.votes) : undefined });
    toast('Decision logged'); render();
  }
  function chosenPanel(x) {
    const f = (k, label, big) => h('div', { class: 'cf' + (big ? ' big' : '') }, h('div', { class: 'kicker' }, label), h('p', { class: x[k] ? '' : 'placeholder' }, x[k] || 'Not written yet'));
    const srcs = sourcesOf(x);
    return h('section', { class: 'card chosen-panel' },
      h('div', { class: 'card-head' }, h('div', { class: 'kicker' }, 'Our chosen idea · ' + x.id + ' · decided ' + fmtDate(L().selection.decidedAt) + (L().selection.method ? ' by ' + L().selection.method : '')),
        h('button', { class: 'btn sm', onclick: () => copyText(launchPrompt(x), 'Launch market prompt copied') }, 'Copy launch-market prompt'), h('button', { class: 'btn sm', onclick: () => openItem('hypotheses', x.id) }, 'Edit')),
      h('h2', { class: 'chosen-title' }, x.title || '(untitled)'),
      h('div', { class: 'chosen-grid' }, f('customer', 'Customer', true), f('problem', 'Problem', true), f('solution', 'Solution'), f('valueProp', 'Value proposition'), f('revenueModel', 'Revenue model'),
        h('div', { class: 'cf' }, h('div', { class: 'kicker' }, 'Launch market'), h('p', { class: x.launchMarket ? '' : 'placeholder' }, x.launchMarket || 'Where do you start?'), x.launchMarketWhy ? h('p', { class: 'small muted' }, x.launchMarketWhy) : h('p', { class: 'small', style: { color: 'var(--warn)' } }, 'Justify it with data (Exploration Challenge).'))),
      h('div', { class: 'small muted', style: { marginTop: '8px' } }, srcs.length ? srcs.filter(s => s.verified).length + ' of ' + srcs.length + ' sources checked' : 'No sources attached to the chosen idea yet.', L().selection.rationale ? ' · Why: ' + L().selection.rationale : ''));
  }

  // ---------------- Evidence: every source in one place ----------------
  function allSources() {
    const out = [];
    for (const slot of ['findings', 'opportunities', 'hypotheses']) for (const o of all(slot)) sourcesOf(o).forEach((src, i) => out.push({ slot, o, src, i }));
    return out;
  }
  function verify(entry, on) {
    const { o, src } = entry;
    if (on && !LL.me()) { toast('Pick your name at the top first, so the team knows who checked it.'); return; }
    src.verified = on; src.verifiedBy = on ? LL.me() : ''; src.verifiedAt = on ? LL.nowIso() : null;
    Ledger.save(o._file, o); render();
  }
  function evidenceView() {
    const items = allSources();
    const shown = items.filter(e => evFilter === 'all' || (evFilter === 'unchecked' ? !e.src.verified : evFilter === 'checked' ? e.src.verified : evFilter === 'ai' ? e.o.origin === 'ai' : true));
    const wrap = h('div');
    const noSrc = all('findings').filter(f => !sourcesOf(f).length);
    wrap.append(h('div', { class: 'board-bar' },
      h('div', null, h('h2', { style: { fontSize: '22px' } }, 'Evidence'), h('div', { class: 'small muted' }, 'A source counts as checked when someone on the team opened it and saw it says what we claim. An AI saying so doesn’t count.')),
      h('span', { class: 'spacer' }),
      h('div', { class: 'seg' }, [['all', 'All'], ['unchecked', 'Unchecked'], ['checked', 'Checked'], ['ai', 'From AI']].map(([v, lab]) => h('button', { 'aria-pressed': String(evFilter === v), onclick: () => { evFilter = v; LL.lsSet('isl:evFilter', v); render(); } }, lab)))));
    if (noSrc.length) wrap.append(h('div', { class: 'banner-in warn', style: { marginBottom: '12px' } }, h('div', null, h('b', null, noSrc.length + ' finding(s) have no source. '), h('span', { class: 'small' }, noSrc.slice(0, 8).map(f => f.id).join(', ') + (noSrc.length > 8 ? '…' : '') + '. Add one, or treat them as opinions.'))));
    if (!items.length) { wrap.append(h('div', { class: 'empty' }, 'No sources yet. Sources come in with every finding, opportunity and hypothesis.')); return wrap; }
    wrap.append(h('div', { class: 'tbl-wrap card' }, h('table', { class: 'tbl evtbl' },
      h('thead', null, h('tr', null, h('th', null, 'Source'), h('th', null, 'Used for'), h('th', null, 'Checked'))),
      h('tbody', null, shown.map(e => h('tr', { class: e.src.verified ? 'ok-row' : '' },
        h('td', null, e.src.url ? h('a', { href: e.src.url, target: '_blank', rel: 'noopener' }, e.src.label || e.src.url) : h('span', null, e.src.label), e.src.year ? h('span', { class: 'muted small' }, ' · ' + e.src.year) : null,
          !e.src.url && !e.src.pack ? h('div', { class: 'small', style: { color: 'var(--warn)' } }, 'No link. Find the original.') : null),
        h('td', { class: 'small' }, h('a', { href: '#', onclick: (ev) => { ev.preventDefault(); openItem(e.slot, e.o.id); } }, e.o.id), ' ', (e.o.title || '').slice(0, 70), e.o.origin === 'ai' ? h('span', { class: 'badge', style: { marginLeft: '6px' } }, 'AI') : null),
        h('td', { style: { whiteSpace: 'nowrap' } }, e.src.verified
          ? h('span', null, h('span', { class: 'badge ok' }, '✓ ' + (e.src.verifiedBy || 'checked')), ' ', h('button', { class: 'icon-btn small', title: 'Undo', onclick: () => verify(e, false) }, '↺'))
          : h('button', { class: 'btn sm', onclick: () => verify(e, true) }, 'I checked it'))))))));
    return wrap;
  }

  // ---------------- Handoff: decisions + session close ----------------
  function handoffView() {
    const ds = decisions(), last = sessions()[0];
    const wrap = h('div', { class: 'canvas' });
    wrap.append(h('section', { class: 'card c12 callout' }, h('div', { class: 'kicker' }, 'Next: Workshop 2 · Go to Market and Brand Sprint'),
      h('div', { class: 'next-task' }, selected() ? 'Positioning, brand and the acquisition funnel for “' + (selected().title || selected().id) + '”.' : 'Choose your hypothesis first. Workshop 2 builds the brand and go-to-market for it.'),
      h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' } },
        h('button', { class: 'btn accent', onclick: () => copyText(w2Prompt(), 'Workshop 2 brief copied') }, 'Copy Workshop 2 brief'),
        h('button', { class: 'btn', onclick: () => copyText(slidesPrompt(), 'Slide outline prompt copied') }, 'Copy slide outline prompt (≤4)'),
        h('button', { class: 'btn', onclick: () => copyText(juryPrompt(), 'Jury drill prompt copied') }, 'Copy jury drill prompt'),
        h('button', { class: 'btn', onclick: () => LL.download('workshop-1-' + (L().team.name || 'team').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.md', summaryMd(), 'text/markdown') }, 'Download summary (.md)'))));
    wrap.append(h('section', { class: 'card c6' }, h('div', { class: 'card-head' }, h('div', { class: 'kicker' }, 'Decisions on record · ' + ds.length), h('button', { class: 'btn sm', onclick: addDecision }, '+ Decision')),
      ds.length ? h('div', { class: 'decisions' }, ds.map(d => h('div', { class: 'decision' }, h('div', { class: 'small muted' }, fmtDate(d.date) + ' · ' + (d.step || '') + ' · ' + (d.how || '') + (d.by ? ' · logged by ' + d.by : '')), h('p', null, d.decision), d.rationale ? h('p', { class: 'small muted' }, d.rationale) : null)))
        : h('p', { class: 'placeholder', onclick: addDecision }, 'Each sprint closes with a decision. They show up here.')));
    const s = last || {};
    wrap.append(h('section', { class: 'card c6' }, h('div', { class: 'card-head' }, h('div', { class: 'kicker' }, last ? 'Session handoff · ' + fmtDate(s.date) : 'Session handoff'), h('button', { class: 'btn sm primary', onclick: () => sessionForm(last) }, last ? 'Edit' : 'Write the handoff')),
      last ? h('div', { class: 'session-grid' }, [['What we decided', s.decided], ['Evidence still missing', s.evidenceGaps], ['Questions for Workshop 2', s.questionsForNext], ['Before Workshop 2, who does what', s.nextTask]].map(([k, v]) => h('div', null, h('div', { class: 'kicker' }, k), h('p', { class: v ? '' : 'muted' }, v || '—'))))
        : h('p', { class: 'muted' }, 'Before you leave: what you decided, what evidence is still missing, what to ask in Workshop 2, and who does what before then.')));
    return wrap;
  }
  async function addDecision() {
    const ta = h('textarea', { rows: 3 }), why = h('textarea', { rows: 2 });
    const step = h('select', null, [['pestel', 'Sprint 1 · PESTEL'], ['sector', 'Sprint 2 · Sector'], ['opportunities', 'Opportunities'], ['hypothesis', 'Hypothesis'], ['team', 'Team / how we work'], ['other', 'Other']].map(([v, lab]) => h('option', { value: v }, lab)));
    const how = h('select', null, h('option', { value: 'consensus' }, 'Consensus'), h('option', { value: 'vote' }, 'Vote'));
    const v = await modal({ title: 'Log a decision', body: h('div', null, h('label', { class: 'field' }, h('span', null, 'Decision'), ta), h('label', { class: 'field' }, h('span', null, 'Why'), why),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } }, h('label', { class: 'field' }, h('span', null, 'Step'), step), h('label', { class: 'field' }, h('span', null, 'How'), how))),
      actions: [{ label: 'Cancel', value: false }, { label: 'Log it', value: true, cls: 'primary' }] });
    if (!v || !ta.value.trim()) return;
    await Ledger.create('decisions', 'D', { workshop: 1, step: step.value, decision: ta.value.trim(), how: how.value, rationale: why.value.trim(), date: today(), by: LL.me() });
    render();
  }
  async function sessionForm(s) {
    const id = (s && s.id) || today();
    const sel = selected();
    const draft = Object.assign({ id, date: id, workshop: 1, title: 'Workshop 1 · Opportunity Discovery', decided: sel ? `We chose ${sel.id} · ${sel.title || ''}: ${sel.customer || ''}. ${sel.problem || ''}` : '', evidenceGaps: '', questionsForNext: '', nextTask: '', notes: '' }, s || {});
    const f = (k, label, ph) => { const el = h('textarea', { rows: 2, placeholder: ph }); el.value = draft[k] || ''; el.addEventListener('input', () => draft[k] = el.value); return h('label', { class: 'field' }, h('span', null, label), el); };
    const v = await modal({ title: 'Session handoff', body: h('div', { style: { maxHeight: '62vh', overflow: 'auto', paddingRight: '4px' } },
      f('decided', 'What we decided', 'The idea, the customer, the launch market.'),
      f('evidenceGaps', 'Evidence still missing', 'One per line: what we assumed but haven’t proven.'),
      f('questionsForNext', 'Questions for Workshop 2', 'One per line: what to ask the marketing expert.'),
      f('nextTask', 'Before Workshop 2, who does what', 'e.g. Ana: check the GMCVB figure. Ben: find 3 competitors’ pricing.'),
      f('notes', 'Notes', 'Anything else')),
      actions: [{ label: 'Cancel', value: false }, { label: 'Save', value: true, cls: 'primary' }] });
    if (!v) return;
    delete draft._file;
    await Ledger.save(`sessions/${draft.id}.json`, draft); toast('Handoff saved'); render();
  }

  // ---------------- item drawer (finding / opportunity / hypothesis) ----------------
  const scrim = h('div', { class: 'scrim', onclick: () => closeDrawer() });
  const drawer = h('aside', { class: 'drawer', 'aria-label': 'Details' });
  document.body.append(scrim, drawer);
  function closeDrawer() { drawer.classList.remove('open'); scrim.classList.remove('open'); openRef = null; render(); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && drawer.classList.contains('open') && !document.querySelector('.modal')) closeDrawer(); });

  const FIELDS = {
    findings: [['title', 'Headline', 'One line: what is changing, or what we found', 1], ['detail', 'What we found', 'With the number, the date, the trend', 3], ['whoAffected', 'Who it affects', 'Which customers, operators or businesses. How many?', 2], ['implication', 'So what?', 'Why it could matter for an opportunity. No business idea yet.', 2], ['notes', 'Notes', 'Doubts, contradictions, what to check', 2]],
    opportunities: [['title', 'Name it', 'A few words', 1], ['friction', 'The friction', 'What goes wrong, or costs time, money or trust', 2], ['who', 'Who experiences it', 'As specific as you can. How many of them?', 2], ['howSolvedToday', 'How it’s solved today', 'Workarounds, competitors, and what they fail to do', 2], ['whyNow', 'Why now', 'The external factor that makes it urgent', 2], ['evidence', 'Evidence it matters', 'Data, reviews, reports. Link findings below.', 2]],
    hypotheses: [['title', 'Working name', 'A few words', 1], ['customer', 'Customer', 'Who pays or uses it. Be specific.', 2], ['problem', 'Problem', 'The friction, in the customer’s terms', 2], ['solution', 'Solution', 'What you offer: digital, physical, in-person, financial, operational or hybrid', 2], ['valueProp', 'Value proposition', 'Why they’d pick this over what they do today', 2], ['revenueModel', 'Revenue model', 'Who pays, for what, how often', 2], ['whyNow', 'Why now', 'The PESTEL factor behind it', 2], ['launchMarket', 'Launch market', 'Where you start', 1], ['launchMarketWhy', 'Why that market (with data)', 'A figure and its source', 2]]
  };
  const TITLES = { findings: 'Finding', opportunities: 'Opportunity', hypotheses: 'Hypothesis' };

  function openItem(slot, id) {
    const o = Ledger.state[slot][id]; if (!o) return;
    openRef = { slot, id };
    const path = o._file || `${slot}/${id}.json`;
    const save = LL.debounce(() => Ledger.save(path, o), 500);
    const input = (key, ph, rows) => {
      const el = rows > 1 ? h('textarea', { rows, placeholder: ph }) : h('input', { type: 'text', placeholder: ph });
      el.value = o[key] || '';
      el.addEventListener('input', () => { o[key] = el.value; save(); });
      return el;
    };
    const body = h('div', { class: 'drawer-body' });
    if (slot === 'findings') body.append(h('div', { class: 'chips', style: { marginBottom: '12px' } },
      h('span', { class: 'chip primary' }, (o.sprint === 'pestel' ? 'Sprint 1 · ' : 'Sprint 2 · ') + dimLabel(o.sprint, o.dimension)),
      o.author ? h('span', { class: 'chip' }, 'by ' + o.author) : null, o.origin === 'ai' ? h('span', { class: 'chip' }, 'from AI') : null,
      o.sprint === 'pestel' ? h('button', { class: 'chip', style: { border: 0, cursor: 'pointer' }, onclick: () => { o.key = !o.key; Ledger.save(path, o); openItem(slot, id); } }, o.key ? '★ Key factor' : '☆ Star as key factor') : null));
    if (slot === 'hypotheses') body.append(h('div', { style: { marginBottom: '12px' } }, h('div', { class: 'kicker', style: { marginBottom: '6px' } }, 'Business model'),
      h('div', { class: 'seg' }, BIZ_MODELS.map(b => h('button', { 'aria-pressed': String(o.businessModel === b), onclick: () => { o.businessModel = o.businessModel === b ? '' : b; Ledger.save(path, o); openItem(slot, id); } }, b)))));
    for (const [k, label, ph, rows] of FIELDS[slot]) body.append(h('label', { class: 'field' }, h('span', null, label), input(k, ph, rows)));
    if (slot === 'hypotheses') {
      const oq = h('textarea', { rows: 2, placeholder: 'One per line: what has to be true, that you haven’t proven yet' }); oq.value = (o.openQuestions || []).join('\n');
      oq.addEventListener('input', () => { o.openQuestions = lines(oq.value); save(); });
      body.append(h('label', { class: 'field' }, h('span', null, 'Assumptions to validate'), oq));
    }
    if (slot === 'opportunities') body.append(linker(o, 'findingIds', all('findings').sort((a, b) => (b.key ? 1 : 0) - (a.key ? 1 : 0) || byCreated(a, b)), f => `${f.id} ${f.key ? '★ ' : ''}${f.title}`, 'Findings behind it', save));
    if (slot === 'hypotheses') body.append(linker(o, 'opportunityIds', opportunities(), x => `${x.id} ${x.shortlisted ? '✓ ' : ''}${x.title}`, 'Opportunities it builds on', save));
    body.append(sourcesEditor(o, path, () => openItem(slot, id)));

    drawer.innerHTML = '';
    drawer.append(
      h('div', { class: 'drawer-head' }, h('span', { class: 'story-id', style: { fontSize: '14px' } }, o.id), h('h3', { style: { flex: 1, fontSize: '18px' } }, TITLES[slot]), h('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: closeDrawer }, '✕')),
      body,
      h('div', { class: 'drawer-foot' }, h('span', { class: 'small muted', style: { flex: 1 } }, 'Saved automatically to ', h('code', null, path)),
        h('button', { class: 'btn danger sm', onclick: async () => { const v = await modal({ title: 'Delete ' + o.id + '?', body: 'This removes the file for the whole team.', actions: [{ label: 'Cancel', value: false }, { label: 'Delete', value: true, cls: 'danger' }] }); if (v) { await Ledger.remove(path); closeDrawer(); toast('Deleted ' + o.id); } } }, 'Delete')));
    drawer.classList.add('open'); scrim.classList.add('open');
  }
  function linker(o, key, items, label, title, save) {
    o[key] = Array.isArray(o[key]) ? o[key] : [];
    const box = h('div', { class: 'linker' });
    if (!items.length) box.append(h('p', { class: 'small muted' }, 'Nothing to link yet.'));
    for (const it of items) box.append(h('label', { class: 'lk' }, h('input', { type: 'checkbox', checked: o[key].includes(it.id), onchange: e => { o[key] = e.target.checked ? [...new Set([...o[key], it.id])] : o[key].filter(x => x !== it.id); save(); } }), h('span', null, label(it))));
    return h('div', { class: 'field' }, h('div', { class: 'kicker', style: { margin: '6px 0' } }, title), box);
  }
  function sourcesEditor(o, path, redraw) {
    o.sources = Array.isArray(o.sources) ? o.sources : [];
    const save = LL.debounce(() => Ledger.save(path, o), 500);
    const box = h('div', { class: 'src-box' });
    o.sources.forEach((s, i) => {
      const inp = (k, ph, w) => { const el = h('input', { type: 'text', placeholder: ph, value: s[k] || '', style: w ? { width: w } : null }); el.addEventListener('input', () => { s[k] = el.value; if (s.verified && k !== 'year') { s.verified = false; s.verifiedBy = ''; } save(); }); return el; };
      box.append(h('div', { class: 'src-row' + (s.verified ? ' ok' : '') },
        h('div', { class: 'src-in' }, inp('label', 'Publisher, title'), h('div', { style: { display: 'flex', gap: '6px' } }, inp('url', 'https://…'), inp('year', 'Year', '74px'))),
        h('div', { class: 'src-side' },
          s.verified ? h('span', { class: 'badge ok', title: s.verifiedAt ? fmtDate(s.verifiedAt) : '' }, '✓ ' + (s.verifiedBy || 'checked'))
            : h('button', { class: 'btn sm', onclick: () => { if (!LL.me()) { toast('Pick your name at the top first.'); return; } Object.assign(s, { verified: true, verifiedBy: LL.me(), verifiedAt: LL.nowIso() }); Ledger.save(path, o); redraw(); } }, 'I checked it'),
          h('button', { class: 'icon-btn small', title: 'Remove', onclick: () => { o.sources.splice(i, 1); Ledger.save(path, o); redraw(); } }, '✕'))));
    });
    const figs = (S() && S().keyFigures) || [];
    return h('div', { class: 'field' }, h('div', { class: 'kicker', style: { margin: '10px 0 6px' } }, 'Sources · ' + o.sources.filter(s => s.verified).length + '/' + o.sources.length + ' checked'), box,
      h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' } },
        h('button', { class: 'btn sm', onclick: () => { o.sources.push({ label: '', url: '', year: '', verified: false, verifiedBy: '', verifiedAt: null }); Ledger.save(path, o); redraw(); } }, '+ Source'),
        figs.length ? h('select', { style: { width: 'auto', maxWidth: '100%' }, onchange: e => { const f = figs[+e.target.value]; if (!f) return; const yr = (/(20\d\d)/.exec(f.source) || [])[1] || ''; o.sources.push({ label: f.source + ': ' + f.figure, url: '', year: yr, pack: true, verified: true, verifiedBy: 'Sector Exploration Pack', verifiedAt: LL.nowIso() }); Ledger.save(path, o); redraw(); } },
          h('option', { value: '' }, '+ Cite a figure from the pack…'), figs.map((f, i) => h('option', { value: i }, '[' + f.level + '] ' + f.figure.slice(0, 80)))) : null),
      h('small', { class: 'muted', style: { display: 'block', marginTop: '6px' } }, 'Only click “I checked it” after you opened the source and saw it says this. Editing the source clears the check.'));
  }

  // ---------------- sharing (no server: a shared folder, or files / pasted text) ----------------
  function shareCard() {
    const folder = Ledger.store && Ledger.store.kind === 'folder';
    return card('c12 share-card', 'How the team shares one board', h('div', { class: 'share-grid' },
      h('div', null, h('h4', null, '1 · Team Leader collects'), h('p', { class: 'small' }, 'Everyone works on their own laptop. Every so often each person clicks ', h('b', null, '⇄ Share → Share my work'), ' and sends it to the Team Leader (WhatsApp, Teams, email). The Team Leader clicks ', h('b', null, 'Add a teammate’s work'), ' for each one, then shares the merged board back.')),
      h('div', null, h('h4', null, '2 · One shared folder'), h('p', { class: 'small' }, 'If everyone has OneDrive, Google Drive or Dropbox on their laptop, make one shared folder and have everyone ', h('b', null, 'Connect a folder'), ' to it (Chrome or Edge). Work then shows up on everyone’s board by itself, within the time the sync takes.'),
        folder ? h('p', { class: 'small muted' }, 'You’re connected to “' + Ledger.store.label + '”.') : null),
      h('div', null, h('h4', null, '3 · One person drives'), h('p', { class: 'small' }, 'One laptop on the big screen holds the board. The others research with the copy-ready prompts and dictate their findings, or send them as text.'))),
      null, h('button', { class: 'btn sm', onclick: () => teamShare() }, '⇄ Share'));
  }
  async function teamShare() {
    const v = await modal({ title: 'Share', body: h('div', null,
      h('p', null, h('b', null, 'Share my work: '), 'pack up everything on your board and send it to your Team Leader.'),
      h('p', null, h('b', null, 'Add a teammate’s work: '), 'merge what a teammate sent you into your board. Adding the same work twice is harmless.')),
      actions: [{ label: 'Close', value: null }, { label: 'Add a teammate’s work', value: 'add' }, { label: 'Share my work', value: 'share', cls: 'primary' }] });
    if (v === 'share') LL.shareWork();
    if (v === 'add') LL.addWork();
  }

  // ---------------- set up your AI ----------------
  const skillNames = () => [...new Set(Object.keys(SKILL_FILES).map(k => k.split('/')[0]))];
  const skillBody = (name) => String(SKILL_FILES[name + '/SKILL.md'] || '').replace(/^---[\s\S]*?---\s*/, '');
  function setupPrompt() {
    const l = L(), you = LL.me(), a = l.assignments;
    const mine = (sprint, dims) => dims.filter(([d]) => a[sprint][d] && a[sprint][d] === you).map(([, label]) => label);
    const st = timerState();
    return `You're my team's AI partner for the Innovation Sprint Challenge (Spain-US Chamber of Commerce, Miami International Week), Workshop 1: AI Opportunity Discovery Sprint. Read everything below, then start.

ABOUT ME AND MY TEAM
- Me: ${you || '(ask my name)'}${you && you === l.team.leader ? ' (Team Leader)' : ''}
- Team: ${l.team.name || '(no name yet)'} · ${members().join(', ') || '(members not listed yet)'}${l.team.leader ? ' · Team Leader: ' + l.team.leader : ''}
- My Sprint 1 (PESTEL) dimension: ${mine('pestel', PESTEL).join(', ') || 'not assigned yet'}
- My Sprint 2 (sector) dimension: ${mine('sector', SECTOR_DIMS).join(', ') || 'not assigned yet'}
- Right now: ${st.i >= 0 ? 'agenda block ' + (st.i + 1) + ' of ' + st.ag.length + ', "' + st.block.label + '", ' + Math.max(0, Math.round(st.left / 60)) + ' minutes left' : 'the agenda has not started'}

HOW WE WORK TOGETHER
- Our team keeps its work on a board (a page called sprint.html). You can't see it. When I ask you for findings, opportunities or hypotheses, finish your answer with ONE JSON block in the exact shape the playbooks below show. I paste it into the board with "Paste AI answer".
- The playbooks mention files (findings/F###.json and so on). If you can't write files, ignore that part and give me the JSON block instead. If you CAN read and write files in a folder I gave you, follow AGENTS.md in that folder.
- I'm an MBA student under time pressure, maybe working in my second language. Be brief and concrete. One step at a time.
- The rules that matter most: AI proposes, the TEAM decides. Use real, checkable sources only (publisher, title, year, URL), and write "source to find" rather than guess. Never claim a source is verified: only a person who opened it can. Every sprint ends with a decision. Every member must be able to explain our choices to the jury.

THE WORKSHOP 1 AGENDA (120 minutes)
${l.workshop.agenda.map((b, i) => `${i + 1}. ${b.label} (${b.minutes} min)`).join('\n')}

OUR SECTOR
${ctx()}
${S() && (S().sprint2Questions || []).length ? '\nSprint 2 starter questions from our pack:\n' + S().sprint2Questions.map(q => `- ${q.dimension}: ${q.question}`).join('\n') : ''}

PLAYBOOK 1 · RESEARCH ONE DIMENSION (Sprints 1 and 2)
${skillBody('sector-research')}

PLAYBOOK 2 · OPPORTUNITIES → THREE HYPOTHESES → MATRIX → DECISION
${skillBody('opportunity-matrix')}

PLAYBOOK 3 · CLOSE THE SESSION, AND PREPARE WORKSHOP 2
${skillBody('workshop-handoff')}

START NOW: greet me in one line. Say where we are in the agenda and what my next step is. Offer to start on my dimension.`;
  }
  async function writeAgentFolder() {
    const st = Ledger.store;
    const schema = SKILL_FILES['sprint-ledger/references/SCHEMA.md'] || '';
    await Ledger.putBlob('AGENTS.md', schema);
    await Ledger.putBlob('CLAUDE.md', '@AGENTS.md\n');
    for (const [rel, text] of Object.entries(SKILL_FILES)) for (const root of ['.claude/skills', '.agents/skills']) await Ledger.putBlob(root + '/' + rel, text);
    await Ledger.writeChain;
    toast('Set up “' + st.label + '” for your agent');
  }
  async function aiSetup() {
    const folder = Ledger.store && Ledger.store.kind === 'folder';
    const names = skillNames();
    const body = h('div', { class: 'ai-setup' },
      h('section', null, h('h4', null, '1 · Chat with Claude, ChatGPT or Grok', h('span', { class: 'chip primary', style: { marginLeft: '8px' } }, 'easiest')),
        h('p', { class: 'small' }, 'Works on the web, the desktop apps and phones. Copy the prompt and paste it as the first message of a new chat. It already knows your team, your sector and today’s plan, and it guides you step by step.'),
        h('p', { class: 'small muted' }, 'Using Claude? Put it in a Project’s instructions instead, so every chat in that project starts set up.'),
        !LL.me() ? h('p', { class: 'small', style: { color: 'var(--warn)' } }, 'Pick your name at the top first, so the prompt knows who you are and which dimension is yours.') : null,
        h('button', { class: 'btn accent', onclick: () => copyText(setupPrompt(), 'Setup prompt copied. Paste it into your AI') }, 'Copy setup prompt')),
      h('section', null, h('h4', null, '2 · An agent that works in a folder'),
        h('p', { class: 'small' }, 'Claude Code, Claude desktop with a folder, Codex, Cursor or Grok. The board writes the instructions and skills into your folder. Then open that folder in your agent and say ', h('b', null, '“Read AGENTS.md and get me started.”')),
        folder ? h('button', { class: 'btn', onclick: async () => { await writeAgentFolder(); } }, 'Set up “' + Ledger.store.label + '” for my agent')
          : h('button', { class: 'btn', onclick: async () => { const s2 = await LL.pickFolder(); if (s2) { await Ledger.open(s2); await writeAgentFolder(); } } }, LL.fsSupported() ? 'Connect a folder and set it up' : 'Needs Chrome or Edge')),
      names.length ? h('section', null, h('h4', null, '3 · Skills for the Claude app (optional)'),
        h('p', { class: 'small' }, 'In Claude (web or desktop): Settings → Capabilities → Skills → upload each .zip. Claude then uses them on its own in every chat.'),
        h('div', { class: 'chips' }, names.map(n => h('button', { class: 'btn sm', onclick: () => {
          const files = Object.fromEntries(Object.entries(SKILL_FILES).filter(([k]) => k.startsWith(n + '/')));
          const a = h('a', { href: URL.createObjectURL(LL.makeZip(files)), download: n + '.zip' }); document.body.append(a); a.click(); a.remove();
        } }, '⬇ ' + n)))) : null);
    await modal({ title: 'Set up your AI', body, wide: true, actions: [{ label: 'Close', value: null }] });
  }

  // ---------------- wire up ----------------
  Ledger.on((type, detail) => {
    if (type === 'load') { bannerHost.innerHTML = ''; render(); }
    if (type === 'imported' && !S() && detail && detail.sector) { const sec = BUILTIN_SECTORS.find(x => x.id === detail.sector); if (sec) Ledger.save('sector.json', LL.clone(sec)); }
    if (type === 'external') {
      const editing = openRef && detail.includes(`${openRef.slot}/${openRef.id}.json`);
      const active = document.activeElement;
      const typing = active && /TEXTAREA|INPUT|SELECT/.test(active.tagName) || (active && active.isContentEditable);
      if (detail.length <= 3) toast(detail.length === 1 ? 'Teammate update: ' + detail[0] : detail.length + ' files updated');
      if (editing && typing) return; // don't yank the field out from under the user
      if (editing) openItem(openRef.slot, openRef.id);
      if (!typing) render();
    }
    if (type === 'merged') {
      toast('Merged with a teammate’s change to ' + detail);
      const active = document.activeElement;
      if (!(active && (/TEXTAREA|INPUT|SELECT/.test(active.tagName) || active.isContentEditable))) render();
    }
    if (type === 'badjson') toast('Couldn’t read ' + detail + '. It isn’t valid JSON. Ask your agent to fix it.', 5000);
  });

  LL.boot({
    needReconnect: (name, reconnect, cache) => { LL.reconnectBanner(bannerHost, name, reconnect, cache); render(); }
  }).catch(e => { console.error(e); toast('Startup problem: ' + e.message); });
  render();
  window.SprintApp = { render, researchPrompt, oppPrompt, hypPrompt, challengePrompt, summaryMd, w2Prompt, matrixScore, parseAiJson, setupPrompt, writeAgentFolder, SKILL_FILES };
})();
