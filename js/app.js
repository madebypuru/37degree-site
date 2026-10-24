(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MON = MONTHS.map((m) => m.slice(0, 3));
  const pad = (n) => String(n).padStart(2, '0');
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return { y, m, d }; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const strip = (h) => String(h || '').replace(/<[^>]+>/g, '');
  const now = new Date();
  const TODAY = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const ROWS = 7;
  const VIEWS = ['days', 'months', 'highlights'];
  const MAIL = 'mailto:puru@37degr.ee?cc=haneef@37degr.ee&subject=' + encodeURIComponent('Work with 37degree');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mq = matchMedia('(max-width: 760px)');

  const timeline = $('.timeline');
  const track = $('.track');
  const agenda = $('.agenda');
  const bar = $('.dynbar');
  const focusEl = $('.focus');
  const ghost = $('.ghost');
  const note = $('.note');
  const sheet = $('.sheet');
  const scrim = $('.scrim');
  const flyLayer = $('.flylayer');

  if (new URLSearchParams(location.search).has('draft')) document.body.classList.add('draft');

  /* ── Data ─────────────────────────────────────────── */
  // content comes from the Notion "Website calendar" via js/cms.js; data.js EVENTS is the offline fallback
  const normalize = (ev) => (ev.type === 'step' && ev.section === 'video' && CASES[ev.case] && CASES[ev.case].video
    ? { ...ev, type: 'video', src: CASES[ev.case].video, poster: CASES[ev.case].cover } : ev);
  const SOURCE = window.CMS && window.CMS.events && window.CMS.events.length ? window.CMS.events : EVENTS;
  const ALL = [...SOURCE.map(normalize), { id: 'open-slot', date: TODAY, type: 'slot', row: 2, span: 3, highlight: true, title: 'this slot is open' }]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const BY_ID = Object.fromEntries(ALL.map((e) => [e.id, e]));
  const CASE_ORDER = Object.keys(CASES).sort((a, b) => (CASES[a].start < CASES[b].start ? -1 : 1));

  // two kinds of thing on the calendar: notes (how we got here) and work (what we shipped)
  const WORK_TYPES = ['case', 'step', 'video', 'project', 'moment'];
  const isWork = (ev) => WORK_TYPES.includes(ev.type) || !!ev.case;
  const isProject = (ev) => ev.type === 'project' || ev.type === 'moment';

  // people and testimonials arrive inline from Notion, or by key from data.js
  const personOf = (ev) => {
    if (typeof ev.who !== 'object') return PEOPLE[ev.person];
    const known = PEOPLE[(ev.who.short || '').toLowerCase()] || {};
    const links = [...(known.links || []), ...(ev.who.links || [])].filter((l, i, a) => a.findIndex((x) => x.href === l.href) === i);
    return { ...known, ...ev.who, bio: ev.who.bio || known.bio, links };
  };
  const testiOf = (ev) => (typeof ev.who === 'object' ? ev.who : TESTIMONIALS[ev.who]);

  function durationOf(a, b) {
    const days = Math.round((new Date(b) - new Date(a)) / 864e5) + 1;
    if (days <= 13) return `${days} days`;
    if (days <= 60) return `${Math.round(days / 7)} weeks`;
    return `${Math.round(days / 30.4)} months`;
  }
  // multi-day work drawn as bars across the columns: case studies and any project with an end date
  const RANGES = ALL.filter((e) => e.type === 'case' || (e.type === 'project' && e.end)).map((e) => {
    const C = e.type === 'case' && CASES[e.case];
    return C
      ? { id: e.id, caseId: e.case, start: e.date || C.start, end: e.end || C.end, label: C.short, len: C.duration }
      : { id: e.id, start: e.date, end: e.end, label: e.client || strip(e.title), len: durationOf(e.date, e.end) };
  });
  const clickable = (ev) => ev.type !== 'quote' && !(ev.type === 'note' && !ev.detail) && !(ev.type === 'milestone' && !ev.detail && !ev.case);

  let visited = new Set();
  try { visited = new Set(JSON.parse(localStorage.getItem('37cal.v2.visited') || '[]')); } catch (_) {}
  function markVisited(...ids) {
    ids = ids.filter(Boolean);
    ids.forEach((id) => visited.add(id));
    try { localStorage.setItem('37cal.v2.visited', JSON.stringify([...visited])); } catch (_) {}
    ids.forEach((id) => $$(`[data-id="${id}"]`).forEach((el) => el.classList.add('is-visited')));
  }

  const fullDate = (s) => { const p = parse(s); return `${p.d} ${MONTHS[p.m - 1]} ${p.y}`; };
  function fmtRange(a, b) {
    const p = parse(a), q = parse(b);
    return p.y === q.y ? `${p.d} ${MON[p.m - 1]} – ${q.d} ${MON[q.m - 1]} ${q.y}` : `${p.d} ${MON[p.m - 1]} ${p.y} – ${q.d} ${MON[q.m - 1]} ${q.y}`;
  }
  const icon = {
    x: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="m2 2 8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    play: '<svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1.2v7.6L8.6 5z" fill="currentColor"/></svg>',
    plus: '<svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M1 6h10M6 1v10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  };

  /* ── Cards ────────────────────────────────────────── */
  // notes are sticky notes: each kind gets its own pastel (an event can set `color` to override)
  const TINT = { note: 'yellow', person: 'blue', testimonial: 'pink', milestone: 'green', logos: 'purple', snippets: 'orange' };
  const tintOf = (ev) => (isWork(ev) || !TINT[ev.type] ? '' : `tint-${ev.color || TINT[ev.type]}`);
  const DEFAULT_SPAN = { note: 2, milestone: 2, quote: 2, person: 2, case: 4, step: 2, testimonial: 2, video: 2, logos: 2, snippets: 3, slot: 3, project: 2, moment: 2 };
  const tagsHTML = (ev) => (ev.services && ev.services.length ? `<div class="tags">${ev.services.map((s) => `<span class="pill">${s}</span>`).join('')}</div>` : '');

  // logos are drawn as masks in the surrounding text colour, sized so wide wordmarks and square marks feel equal
  const LOGO_BY_SRC = Object.fromEntries(LOGOS.map((l) => [l.src, l]));
  function logoHTML(src, base, label) {
    const l = LOGO_BY_SRC[src] || { ar: 4, name: label || '' };
    const h = Math.round(base * clamp(Math.sqrt(3.5 / l.ar), 0.62, 1.5));
    // absolute URL: a url() inside a custom property resolves against the stylesheet, not the page
    const abs = new URL(src, document.baseURI).href;
    return `<i class="logo" role="img" aria-label="${label || l.name}" style="--src:url('${abs}');--ar:${l.ar};height:${h}px"></i>`;
  }
  // the last print in the DOM sits on top, so reverse: the first photo shows first, same as the open deck
  const prints = (ev) => (ev.photos ? `<div class="stack">${ev.photos.slice(0, 3).reverse().map((s) => `<img src="${s}" alt="" loading="lazy">`).join('')}</div>` : '');

  function cardHTML(ev) {
    const p = parse(ev.date);
    const date = `<div class="card__date">${p.d} ${MONTHS[p.m - 1]}</div>`;
    const work = isWork(ev);
    let inner = '';
    switch (ev.type) {
      case 'quote':
        inner = `<span>${ev.title}</span>`; break;
      case 'note':
        inner = `<div><div class="card__title">${ev.title}</div>${date}</div>${prints(ev)}`; break;
      case 'milestone':
        inner = ev.metric
          ? `<div class="num">${ev.metric}</div><div><div class="card__title">${ev.title}</div>${date}</div>`
          : `<div><div class="card__title">${ev.title}</div>${date}</div>`;
        if (work) inner = `<div class="kicker">${ev.case ? CASES[ev.case].short : ev.client || ''}</div>` + inner;
        break;
      case 'person': {
        const P = personOf(ev);
        inner = `<div><div class="card__title">${ev.title}</div>${date}</div>
          <div class="by"><span class="avatar">${P.mono}</span><span><b>${P.short}</b> · ${P.role}</span></div>${prints(ev)}`;
        break;
      }
      case 'testimonial': {
        const T = testiOf(ev);
        inner = `<q>${T.quote}</q><div class="by"><span class="avatar"><img src="${T.img}" alt=""></span><span><b>${T.name}</b></span></div>`;
        break;
      }
      case 'logos':
        inner = `<div><div class="card__title">${ev.title}</div>${date}</div><div class="logos">${LOGOS.slice(0, 3).map((l) => logoHTML(l.src, 14)).join('')}</div>`;
        break;
      case 'snippets':
        inner = `<div><div class="card__title">${ev.title}</div>${date}</div><div class="stack">${SNIPPETS.slice(0, 3).map((s) => `<img src="${s}" alt="" loading="lazy">`).join('')}</div>`;
        break;
      case 'slot':
        inner = `<span class="plus">${icon.plus}</span><div class="card__title">${ev.title}</div><p>Your launch, built with 37degree. Pick a week.</p>`;
        break;
      case 'case': {
        const C = CASES[ev.case];
        inner = `<div class="case-top"><span class="client">${C.client}</span><span class="pill">${C.duration}</span></div>
          <div><div class="card__title">${C.title}</div>${date}</div>
          <div class="frame"><img src="${C.cover}" alt="" loading="lazy"></div>`;
        break;
      }
      case 'step': {
        const C = CASES[ev.case];
        inner = `<div><div class="kicker">${C.short}</div><div class="card__title">${ev.title}</div>${date}</div>
          ${ev.img ? `<div class="thumb"><img src="${ev.img}" alt="" loading="lazy"></div>` : ''}`;
        break;
      }
      case 'project':
        inner = `<div class="case-top"><span class="client">${ev.client || ''}</span>${ev.end ? `<span class="pill">${durationOf(ev.date, ev.end)}</span>` : ''}</div>
          <div><div class="card__title">${ev.title}</div>${date}</div>
          ${ev.photos ? `<div class="frame"><img src="${ev.photos[0]}" alt="" loading="lazy"></div>` : tagsHTML(ev)}`;
        break;
      case 'moment':
        inner = `<div><div class="kicker">${ev.client || ''}</div><div class="card__title">${ev.title}</div>${date}</div>
          ${ev.photos ? `<div class="thumb"><img src="${ev.photos[0]}" alt="" loading="lazy"></div>` : ''}`;
        break;
      case 'video':
        inner = `<div class="row"><span class="play">${icon.play}</span></div>
          <div class="poster"><img src="${ev.poster}" alt="" loading="lazy"></div>
          <div><div class="kicker">Sidecar × IICS 2025</div><div class="card__title">${ev.title}</div>${date}</div>`;
        break;
    }
    const tag = clickable(ev) ? 'button' : 'div';
    const kind = ev.type === 'quote' || ev.type === 'slot' ? '' : work ? 'work-card' : 'note-card';
    const cls = ['card', kind, tintOf(ev), `card--${ev.type}`, ev.type === 'project' && 'card--case', ev.photos && 'has-photos', visited.has(ev.id) && 'is-visited', ev.tbc && 'is-tbc'].filter(Boolean).join(' ');
    const extra = ev.case ? ` data-case="${ev.case}"` : '';
    const label = tag === 'button' ? ` aria-label="${labelFor(ev)}"` : '';
    return `<${tag} class="${cls}" data-id="${ev.id}"${extra}${label}>${inner}</${tag}>`;
  }
  function labelFor(ev) {
    if (ev.type === 'case') return `Work: ${strip(CASES[ev.case].title)}`;
    if (ev.type === 'testimonial') return `Note: what ${testiOf(ev).name} said`;
    if (ev.type === 'person') return `Note: meet ${personOf(ev).name}`;
    return `${isWork(ev) ? 'Work' : 'Note'}: ${strip(ev.title)}, ${fullDate(ev.date)}`;
  }

  /* ── Columns ──────────────────────────────────────── */
  let view = 'days';

  function columnsFor(v) {
    const list = v === 'highlights' ? ALL.filter((e) => e.highlight) : ALL;
    const keyOf = v === 'months' ? (e) => e.date.slice(0, 7) : (e) => e.date;
    const cols = [];
    for (const ev of list) {
      const key = keyOf(ev);
      let col = cols[cols.length - 1];
      if (!col || col.key !== key) cols.push((col = { key, events: [] }));
      col.events.push(ev);
    }
    return cols.map((c) => {
      const isMonth = v === 'months';
      const first = c.events[0].date;
      return {
        ...c, isMonth,
        date: isMonth ? `${c.key}-01` : first,
        end: isMonth ? `${c.key}-31` : c.events[c.events.length - 1].date,
        p: parse(first),
        isToday: isMonth ? TODAY.startsWith(c.key) : c.key === TODAY,
      };
    });
  }

  // cards without a set row start a little lower in some columns, so the week reads staggered like a real calendar
  const STAGGER = [1, 2, 1, 3];
  function placeDay(events, idx = 0) {
    let cursor = STAGGER[idx % STAGGER.length];
    const items = events.map((ev) => {
      const base = ev.type === 'person' || ev.type === 'testimonial' ? 2 : ev.span || DEFAULT_SPAN[ev.type] || 2;
      const span = Math.min(ev.photos ? Math.max(base, ev.type === 'project' ? 4 : 3) : base, ROWS);
      let row = ev.row || cursor;
      if (row + span - 1 > ROWS) row = Math.max(1, ROWS - span + 1);
      cursor = row + span;
      return { ev, row, span, lane: 0 };
    });
    const lanesEnd = [];
    [...items].sort((a, b) => a.row - b.row).forEach((it) => {
      let lane = lanesEnd.findIndex((end) => end < it.row);
      if (lane === -1) { lane = lanesEnd.length; lanesEnd.push(0); }
      lanesEnd[lane] = it.row + it.span - 1;
      it.lane = lane;
    });
    items.forEach((it) => { it.solo = !items.some((o) => o !== it && o.row < it.row + it.span && it.row < o.row + o.span); });
    return { items, lanes: lanesEnd.length };
  }

  // Months view: each month is a small month calendar, its biggest moment, and a short agenda
  const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  function monthHTML(c) {
    const { y, m } = c.p;
    const iso = (d) => `${y}-${pad(m)}-${pad(d)}`;
    const byDay = {};
    c.events.forEach((ev) => { (byDay[parse(ev.date).d] = byDay[parse(ev.date).d] || []).push(ev); });
    const inProject = (d) => RANGES.some((r) => r.start <= iso(d) && iso(d) <= r.end);
    let cells = WEEK.map((w) => `<span class="mcal__w">${w}</span>`).join('') + '<span></span>'.repeat((new Date(y, m - 1, 1).getDay() + 6) % 7);
    for (let d = 1, n = new Date(y, m, 0).getDate(); d <= n; d++) {
      const evs = byDay[d] || [];
      const first = evs.find((e) => clickable(e) && e.type !== 'slot') || evs.find(clickable);
      const work = evs.some(isWork);
      const tinted = !work && evs.map(tintOf).find(Boolean);
      const cls = ['mcal__d', inProject(d) && 'in-range', evs.length && (work ? 'is-work' : 'is-note'), tinted, iso(d) === TODAY && 'is-today'].filter(Boolean).join(' ');
      cells += first
        ? `<button class="${cls}" data-day="${first.id}" aria-label="${labelFor(first)}">${d}</button>`
        : `<span class="${cls}">${d}</span>`;
    }
    const pick = (fn) => c.events.find(fn);
    const hero = pick((e) => e.type === 'case') || pick((e) => e.type === 'project' && e.photos) || pick((e) => e.type === 'slot') || pick((e) => e.photos) || pick((e) => e.type === 'snippets') || pick((e) => e.type === 'testimonial');
    const notes = c.events.filter((e) => !isWork(e) && e.type !== 'quote' && e.type !== 'slot').length;
    const works = c.events.filter(isWork).length;
    const sum = [notes && `Notes ${notes}`, works && `Work ${works}`].filter(Boolean).join(' · ');
    return `<div class="mbody">
      <div class="mcal">${cells}</div>
      ${hero ? `<div class="mhero">${cardHTML(hero)}</div>` : ''}
      ${sum ? `<div class="msum">${sum}</div>` : ''}
      <div class="mlist">${c.events.filter((e) => e !== hero).map(rowHTML).join('')}</div>
    </div>`;
  }
  function rowHTML(ev) {
    if (ev.type === 'quote') return `<div class="mquote">${ev.title}</div>`;
    const p = parse(ev.date);
    const title = ev.type === 'testimonial' ? `${testiOf(ev).name}: “${testiOf(ev).quote}”`
      : ev.type === 'case' ? strip(CASES[ev.case].title) : strip(ev.title);
    const tag = clickable(ev) ? 'button' : 'div';
    const cls = ['mrow', isWork(ev) ? 'is-work' : tintOf(ev), visited.has(ev.id) && 'is-visited'].filter(Boolean).join(' ');
    return `<${tag} class="${cls}" data-id="${ev.id}"${tag === 'button' ? ` aria-label="${labelFor(ev)}"` : ''}><i></i><span class="t">${title}</span><span class="d">${MON[p.m - 1]} ${p.d}</span></${tag}>`;
  }

  function colHTML(c, idx) {
    const head = c.isMonth
      ? `<span class="d">${MONTHS[c.p.m - 1]}</span><span class="y">${c.p.y}</span>`
      : `<span class="d">${c.isToday ? 'Today' : `${MON[c.p.m - 1]} ${c.p.d}`}</span><span class="y">${c.isToday ? `${MON[c.p.m - 1]} ${c.p.d}, ${c.p.y}` : c.p.y}</span>`;
    let body, style = '';
    if (c.isMonth) {
      body = monthHTML(c);
    } else {
      const { items, lanes } = placeDay(c.events, idx);
      const gridCols = lanes > 1 ? ` style="grid-template-columns:repeat(${lanes}, minmax(0, 1fr))"` : '';
      body = `<div class="col-body"${gridCols}>${items.map((it) => {
        const colPos = lanes > 1 ? (it.solo ? '1 / -1' : `${it.lane + 1}`) : '1';
        return cardHTML(it.ev).replace(/^<(\w+) /, `<$1 style="grid-row:${it.row} / span ${it.span};grid-column:${colPos}" `);
      }).join('')}</div>`;
    }
    const cls = ['col', c.isMonth && 'is-month', view === 'highlights' && 'is-highlight', c.isToday && 'col--today'].filter(Boolean).join(' ');
    return `<section class="${cls}" data-date="${c.date}" data-end="${c.end}"${style}>
      ${c.isToday ? '<span class="nowline" aria-hidden="true"></span>' : ''}
      <div class="col-head">${head}</div>${body}</section>`;
  }

  const introCopy = `<h1>Our story, <em>by the day</em>.</h1>
    <p>37degree is a design-led growth studio for Tech &amp; AI companies. Notes are how we got here. Work is what we've shipped.</p>
    <div class="legend"><span><i class="n"></i>Notes</span><span><i class="w"></i>Work</span></div>`;

  function outroHTML() {
    const row = (P) => `<a href="${P.links[0].href}"><span class="avatar avatar--md">${P.mono}</span><span><b>${P.links[0].label}</b><span>${P.role}</span></span></a>`;
    return `<div class="outro">
      <h2>This could be the start of something incredibly <em>special</em>.</h2>
      <div class="who">${row(PEOPLE.puru)}${row(PEOPLE.haneef)}</div>
      <small><a href="https://x.com/madebypuru" target="_blank" rel="noopener">X</a> · <a href="https://www.linkedin.com/company/107024182" target="_blank" rel="noopener">LinkedIn</a> · © ${now.getFullYear()} 37degree</small>
    </div>`;
  }

  /* ── Render ───────────────────────────────────────── */
  function render() {
    closeAll(true);
    if (mq.matches) return renderAgenda();
    track.innerHTML =
      `<section class="col col--intro"><div class="col-head"></div><div class="intro">${introCopy}</div></section>` +
      columnsFor(view).map((c, i) => colHTML(c, i)).join('') +
      `<section class="col col--end"><div class="col-head"></div>${outroHTML()}</section>`;
    layoutBars();
    syncBar();
    buildMinimap();
  }

  function layoutBars() {
    $$('.allday-bar', track).forEach((b) => b.remove());
    if (view === 'highlights') return;
    const cols = $$('.col[data-date]', track);
    const lanesEnd = [];
    const depth = new Map(); // how many bar lanes cross each column
    for (const r of [...RANGES].sort((a, b) => (a.start < b.start ? -1 : 1))) {
      const inRange = cols.filter((c) => c.dataset.end >= r.start && c.dataset.date <= r.end);
      if (!inRange.length) continue;
      const a = inRange[0], b = inRange[inRange.length - 1];
      const left = a.offsetLeft + 10, right = b.offsetLeft + b.offsetWidth - 10;
      // overlapping projects stack into lanes, like overlapping all-day events
      let lane = lanesEnd.findIndex((x) => x < left);
      if (lane === -1) { lane = lanesEnd.length; lanesEnd.push(0); }
      lanesEnd[lane] = right + 4;
      inRange.forEach((c) => depth.set(c, Math.max(depth.get(c) || 1, lane + 1)));
      const el = document.createElement('button');
      el.className = 'allday-bar';
      if (r.caseId) el.dataset.caseBar = r.caseId; else el.dataset.openId = r.id;
      el.style.left = `${left}px`;
      el.style.width = `${right - left}px`;
      el.style.top = `calc(var(--head) + 6px + ${lane * 26}px)`;
      el.innerHTML = `${r.label}<span>${r.len}</span>`;
      el.setAttribute('aria-label', `Work: ${r.label}, ${r.len}`);
      track.appendChild(el);
    }
    // only columns under stacked bars make room for them
    cols.forEach((c) => c.style.setProperty('--allday', `${(depth.get(c) || 1) * 26 + 4}px`));
  }

  function renderAgenda() {
    const list = view === 'highlights' ? ALL.filter((e) => e.highlight) : ALL;
    let html = `<div class="ag-intro">${introCopy}</div>`;
    let month = '', day = '';
    const closeDay = () => { if (day) html += '</div></div>'; day = ''; };
    for (const ev of list) {
      const p = parse(ev.date);
      if (ev.date.slice(0, 7) !== month) {
        closeDay();
        month = ev.date.slice(0, 7);
        html += `<div class="ag-month">${MONTHS[p.m - 1]} <span>${p.y}</span></div>`;
      }
      if (ev.date !== day) {
        closeDay();
        day = ev.date;
        html += `<div class="ag-day${ev.date === TODAY ? ' is-today' : ''}"><div class="ag-date"><b>${p.d}</b><span>${ev.date === TODAY ? 'Today' : MON[p.m - 1]}</span></div><div class="ag-cards">`;
      }
      html += cardHTML(ev);
    }
    closeDay();
    agenda.innerHTML = html + `<div class="ag-outro">${outroHTML()}</div>`;
    syncBar();
  }

  /* ── Where you are: the minimap ───────────────────── */
  const mini = $('.minimap');
  const miniTicks = $('.minimap__ticks');
  const miniWin = $('.minimap__win');
  function buildMinimap() {
    if (mq.matches) return;
    const W = mini.clientWidth, total = track.scrollWidth || 1;
    miniTicks.innerHTML = $$('.col[data-date]', track).map((c) => {
      const x = ((c.offsetLeft / total) * W).toFixed(1);
      if (c.classList.contains('col--today')) return `<i class="is-today" style="left:${x}px"></i>`;
      if (c.querySelector('.card--case')) return `<i class="is-case" style="left:${x}px"></i>`;
      const n = c.querySelector('.note-card');
      return `<i class="${n ? `is-note ${[...n.classList].find((k) => k.startsWith('tint-'))}` : ''}" style="left:${x}px"></i>`;
    }).join('');
    updateMinimap();
  }
  function updateMinimap() {
    const W = mini.clientWidth, total = track.scrollWidth || 1;
    const w = Math.max(14, (timeline.clientWidth / total) * W);
    miniWin.style.width = `${w}px`;
    miniWin.style.left = `${clamp((timeline.scrollLeft / total) * W, 0, W - w)}px`;
    mini.setAttribute('aria-valuenow', Math.round((timeline.scrollLeft / Math.max(1, total - timeline.clientWidth)) * 100));
  }
  function scrubTo(x, smooth) {
    const r = mini.getBoundingClientRect();
    const f = clamp((x - r.left) / r.width, 0, 1);
    timeline.scrollTo({ left: f * track.scrollWidth - timeline.clientWidth / 2, behavior: smooth && !reduced.matches ? 'smooth' : 'auto' });
  }
  let scrubbing = false;
  mini.addEventListener('pointerdown', (e) => { scrubbing = true; mini.setPointerCapture(e.pointerId); scrubTo(e.clientX, true); });
  mini.addEventListener('pointermove', (e) => scrubbing && scrubTo(e.clientX, false));
  mini.addEventListener('pointerup', () => (scrubbing = false));
  mini.addEventListener('keydown', (e) => {
    const by = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (by) { e.preventDefault(); timeline.scrollBy({ left: by * (timeline.clientWidth - 280), behavior: 'smooth' }); }
  });
  let ticking = false;
  timeline.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; updateMinimap(); });
  });

  /* ── Light / dark ─────────────────────────────────── */
  const dark = matchMedia('(prefers-color-scheme: dark)');
  $('.theme-btn').addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme || (dark.matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('37cal.theme', next); } catch (_) {}
  });

  /* ── Moving through time ──────────────────────────── */
  function scrollToDate(date) {
    const cols = $$('.col[data-date]', track);
    const col = cols.find((c) => c.dataset.end >= date) || cols[cols.length - 1];
    if (col) timeline.scrollLeft = Math.max(0, col.offsetLeft - 40);
  }

  timeline.addEventListener('wheel', (e) => {
    if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    // a long month scrolls on its own; everywhere else the wheel moves through time
    const mb = e.target instanceof Element && e.target.closest('.mbody');
    if (mb && mb.scrollHeight > mb.clientHeight + 2) {
      const atTop = mb.scrollTop <= 0, atEnd = mb.scrollTop + mb.clientHeight >= mb.scrollHeight - 1;
      if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atEnd)) return;
    }
    e.preventDefault();
    timeline.scrollLeft += e.deltaY * (e.deltaMode === 1 ? 32 : 1);
  }, { passive: false });

  let drag = null, dragMoved = false;
  timeline.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('a')) return;
    drag = { x: e.clientX, sl: timeline.scrollLeft };
    dragMoved = false;
  });
  addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!dragMoved && Math.abs(dx) > 5) { dragMoved = true; document.body.style.cursor = 'grabbing'; }
    if (dragMoved) timeline.scrollLeft = drag.sl - dx;
  });
  addEventListener('pointerup', () => { drag = null; document.body.style.cursor = ''; setTimeout(() => (dragMoved = false), 0); });

  timeline.addEventListener('keydown', (e) => {
    if (e.target !== timeline) return;
    const by = { ArrowRight: 280, ArrowLeft: -280 }[e.key];
    if (by) { e.preventDefault(); timeline.scrollBy({ left: by, behavior: 'smooth' }); }
  });

  /* ── Zoom bar ─────────────────────────────────────── */
  const seg = $('.dyn-seg');
  const ind = $('.dyn-ind');
  function syncBar() {
    $$('[data-view]', seg).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.view === view)));
    const on = $(`[data-view="${view}"]`, seg);
    if (on && on.offsetWidth) { ind.style.left = `${on.offsetLeft}px`; ind.style.width = `${on.offsetWidth}px`; }
  }
  function setView(v) {
    if (v === view) return;
    const anchorCol = !mq.matches && timeline.scrollLeft > 200
      ? $$('.col[data-date]', track).find((c) => c.offsetLeft >= timeline.scrollLeft - 20) : null;
    const anchor = anchorCol && anchorCol.dataset.date;
    view = v;
    render();
    if (anchor) scrollToDate(anchor); else timeline.scrollLeft = 0;
  }
  function zoom(dir) {
    let i = clamp(VIEWS.indexOf(view) - dir, 0, VIEWS.length - 1);
    if (mq.matches && VIEWS[i] === 'months') i = clamp(i - dir, 0, VIEWS.length - 1);
    setView(VIEWS[i]);
  }

  function setOwner(av, label, tint) {
    bar.className = ['dynbar', tint].filter(Boolean).join(' ');
    const a = $('.dyn-av');
    a.className = 'dyn-av' + (av.logo ? ' is-logo' : '');
    a.innerHTML = av.logo ? logoHTML(av.logo, 9) : av.img ? `<img src="${av.img}" alt="">` : av.mono;
    $('.dyn-who').textContent = label;
    bar.classList.add('is-owner');
  }
  const clearOwner = () => { bar.className = 'dynbar'; };

  /* ── Notes: lift out, blur the rest ───────────────── */
  let open = null; // { kind: 'note' | 'sheet', el, ... }

  function ownerOf(ev) {
    if (ev.type === 'person') { const P = personOf(ev); return [{ mono: P.mono }, P.name]; }
    if (ev.type === 'testimonial') { const T = testiOf(ev); return [T.img ? { img: T.img } : { mono: T.name[0] }, T.name]; }
    if (ev.type === 'slot') return [{ mono: '+' }, 'New event'];
    return [{ mono: '37' }, 'By 37degree'];
  }
  function footHTML(ev, text) {
    const [av, label] = ownerOf(ev);
    return `<div class="note__foot"><span class="avatar avatar--md">${av.img ? `<img src="${av.img}" alt="">` : av.mono}</span><span>${text || label}</span>
      <button class="note__x" data-close aria-label="Close">${icon.x}</button></div>`;
  }
  function noteHTML(ev) {
    const when = `<span class="meta">${fullDate(ev.date)}</span>`;
    switch (ev.type) {
      case 'note':
        return `${deckHTML(ev)}<div class="note__body">${when}<h3>${ev.title}</h3><p>${ev.detail}</p></div>${footHTML(ev)}`;
      case 'milestone':
        return `<div class="note__body">${when}${ev.metric ? `<div class="big">${ev.metric}</div>` : ''}<h3 style="margin-top:0">${ev.title}</h3><p>${ev.detail}</p></div>${footHTML(ev)}`;
      case 'person': {
        const P = personOf(ev);
        return `${deckHTML(ev)}<div class="note__body profile">${ev.photos ? '' : `<span class="avatar avatar--lg">${P.mono}</span>`}
          <div><span class="meta">${P.role}</span><h3>Meet ${P.short}</h3><p>${P.bio}</p>
          <div class="links">${P.links.map((l) => `<a class="pill" href="${l.href}"${l.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${l.label}</a>`).join('')}</div></div></div>
          ${footHTML(ev, `Joined ${fullDate(ev.date)}`)}`;
      }
      case 'testimonial': {
        const T = testiOf(ev);
        return `<div class="note__body">${when}<p class="quote">“${T.quote}”</p></div>${footHTML(ev, `${T.name} · ${T.role}`)}`;
      }
      case 'logos':
        return `<div class="note__body">${when}<h3>Team trusted by the likes of</h3><div class="logo-grid">${LOGOS.map((l) => `<div>${logoHTML(l.src, 22)}</div>`).join('')}</div></div>${footHTML(ev)}`;
      case 'snippets':
        return `<div class="story">
            <div class="story__bars">${SNIPPETS.map(() => '<i><b></b></i>').join('')}</div>
            ${SNIPPETS.map((s) => `<img src="${s}" alt="">`).join('')}
            <div class="story__nav"><button data-prev aria-label="Previous"></button><button data-next aria-label="Next"></button></div>
          </div>${footHTML(ev, 'Motion snippets · 37degree')}`;
      case 'slot':
        return `<div class="note__body"><span class="meta">New event</span>
          <form class="invite">
            <input class="t" name="title" value="Our launch × 37degree" aria-label="Event title">
            <label>When<select name="when"><option>This month</option><option selected>Next month</option><option>Next quarter</option><option>Just exploring</option></select></label>
            <label>What<select name="what"><option>Brand launch</option><option>Product design</option><option>Website</option><option>Something else</option></select></label>
            <label>Guests<span class="guests"><span class="pill">puru@37degr.ee</span><span class="pill">haneef@37degr.ee</span></span></label>
            <label>Notes<textarea name="notes" rows="3" placeholder="What are you building?"></textarea></label>
            <button class="btn" type="submit">Send invite</button>
          </form></div>${footHTML(ev, 'Opens in your email')}`;
    }
    return '';
  }

  // photos in an open note: a pile of prints, click to send the top one to the back
  const deckHTML = (ev) => (ev.photos ? `<div class="deck" role="button" tabindex="0" aria-label="Next photo">
      ${ev.photos.map((s, i) => `<img src="${s}" alt="" draggable="false" data-i="${i}">`).join('')}
      <span class="deck__hint"><span class="deck__n">1</span> / ${ev.photos.length} · tap to flip</span>
    </div>` : '');
  const DECK_REST = [{ r: -2, x: 0, y: -6 }, { r: 6, x: 22, y: 0 }, { r: -8, x: -22, y: 6 }, { r: 9, x: 28, y: 8 }];
  function runDeck(root) {
    const imgs = $$('img', root);
    let order = imgs.map((_, i) => i);
    let busy = false;
    const slot = (k) => DECK_REST[Math.min(k, DECK_REST.length - 1)];
    const rest = (k) => `translate(${slot(k).x}px, ${slot(k).y}px) rotate(${slot(k).r}deg) scale(${1 - k * 0.03})`;
    const lay = () => order.forEach((i, k) => { imgs[i].style.zIndex = String(imgs.length - k); imgs[i].style.transform = rest(k); });
    const flip = () => {
      if (busy || imgs.length < 2) return;
      busy = true;
      const top = imgs[order[0]];
      order = [...order.slice(1), order[0]];
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        top.getAnimations().forEach((a) => a.cancel());
        lay();
        busy = false;
      };
      setTimeout(done, 650);
      if (reduced.matches) return done();
      const a = top.animate([
        { transform: rest(0), zIndex: imgs.length },
        { transform: 'translate(62%, -14%) rotate(16deg) scale(1.02)', offset: 0.45 },
        { transform: rest(imgs.length - 1) },
      ], { duration: 560, easing: 'cubic-bezier(.3,.7,.2,1)' });
      // halfway through, the print slips behind the pile
      setTimeout(() => { top.style.zIndex = '0'; order.slice(0, -1).forEach((i, k) => { imgs[i].style.zIndex = String(imgs.length - k); imgs[i].style.transform = rest(k); }); }, 250);
      a.finished.then(done, done);
      $('.deck__n', root).textContent = String(order[0] + 1);
    };
    root.addEventListener('click', flip);
    root.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
    lay();
  }

  const CARD_ROT = [-8, 7, -1]; // matches .has-photos .stack img:nth-child(1..3)
  function flyPrints(el) {
    const from = $$('.stack img', el), to = $$('.deck img', note);
    if (!from.length || !to.length) return null;
    flyLayer.style.zIndex = '72';
    const clones = from.map((img, i) => {
      const target = to.find((d) => d.getAttribute('src') === img.getAttribute('src'));
      if (!target) return null;
      const a = img.getBoundingClientRect(), b = target.getBoundingClientRect();
      const k = Number(target.dataset.i);
      const ow = img.offsetWidth, oh = img.offsetHeight, tw = target.offsetWidth, th = target.offsetHeight;
      const c = document.createElement('img');
      c.src = img.src;
      c.className = 'print-fly';
      c.style.zIndex = String(10 - k);
      flyLayer.appendChild(c);
      c.animate([
        { left: `${a.left + a.width / 2 - ow / 2}px`, top: `${a.top + a.height / 2 - oh / 2}px`, width: `${ow}px`, height: `${oh}px`, transform: `rotate(${CARD_ROT[i] || 0}deg)` },
        { left: `${b.left + b.width / 2 - tw / 2}px`, top: `${b.top + b.height / 2 - th / 2}px`, width: `${tw}px`, height: `${th}px`, transform: `rotate(${DECK_REST[Math.min(k, DECK_REST.length - 1)].r}deg)` },
      ], { duration: 580, delay: (from.length - 1 - i) * 55, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
      return c;
    }).filter(Boolean);
    return () => { clones.forEach((c) => c.remove()); flyLayer.style.zIndex = ''; };
  }

  const rectKeys = (r, radius) => ({ left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, borderRadius: radius });

  function openNote(ev, el) {
    closeAll(true);
    const tint = tintOf(ev);
    note.className = ['note', ev.type === 'snippets' && 'note--wide', tint].filter(Boolean).join(' ');
    ghost.className = ['ghost', tint].filter(Boolean).join(' ');
    note.innerHTML = noteHTML(ev);
    note.setAttribute('aria-label', labelFor(ev));
    note.hidden = false;
    if (ev.photos) runDeck($('.deck', note));
    focusEl.hidden = false;
    requestAnimationFrame(() => focusEl.classList.add('is-in'));
    open = { kind: 'note', ev, el, cleanup: null };
    setOwner(...ownerOf(ev), tint);
    markVisited(ev.id);

    const reveal = () => { note.classList.remove('is-ghosting'); ghost.hidden = true; requestAnimationFrame(() => note.classList.add('is-in')); };
    if (reduced.matches) reveal();
    else {
      note.classList.add('is-ghosting');
      const from = el.getBoundingClientRect(), to = note.getBoundingClientRect();
      ghost.hidden = false;
      el.classList.add('is-lifted');
      // the prints peeking out of the card fly up into the deck
      const landed = ev.photos ? flyPrints(el) : null;
      if (landed) setTimeout(landed, 980);
      const a = ghost.animate([rectKeys(from, '16px'), rectKeys(to, '24px')], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
      open.ghostAnim = a;
      const settle = () => open && open.ev === ev && note.classList.contains('is-ghosting') && reveal();
      a.finished.then(settle, () => {});
      setTimeout(settle, 700);
    }

    if (ev.type === 'snippets') open.cleanup = runStory($('.story', note));
    if (ev.type === 'slot') {
      $('form', note).addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const body = `Hi Puru & Haneef,\n\nWhat: ${f.get('what')}\nWhen: ${f.get('when')}\n\n${f.get('notes') || ''}\n`;
        location.href = `mailto:puru@37degr.ee?cc=haneef@37degr.ee&subject=${encodeURIComponent(f.get('title'))}&body=${encodeURIComponent(body)}`;
      });
    }
    setTimeout(() => { const f = $('[data-close]', note); f && f.focus({ preventScroll: true }); }, 50);
  }

  function closeNote(o, instant) {
    o.cleanup && o.cleanup();
    focusEl.classList.remove('is-in');
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (!open || open.el !== o.el) o.el.classList.remove('is-lifted');
      if (open && open.kind === 'note') return;
      note.hidden = true; note.innerHTML = ''; note.classList.remove('is-in', 'is-ghosting');
      ghost.hidden = true; focusEl.hidden = true;
    };
    if (instant || reduced.matches || !document.contains(o.el)) return finish();
    note.classList.remove('is-in');
    setTimeout(() => {
      if (open) return finish();
      const from = note.getBoundingClientRect(), to = o.el.getBoundingClientRect();
      note.classList.add('is-ghosting');
      ghost.hidden = false;
      ghost.animate([rectKeys(from, '24px'), rectKeys(to, '16px')], { duration: 360, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' })
        .finished.then(finish, finish);
      setTimeout(finish, 700);
    }, 140);
    o.el.focus({ preventScroll: true });
  }

  function runStory(root) {
    const imgs = $$('img', root), bars = $$('.story__bars i', root);
    let i = 0, t;
    const show = (n) => {
      i = (n + imgs.length) % imgs.length;
      imgs.forEach((im, k) => im.classList.toggle('is-on', k === i));
      bars.forEach((b, k) => { b.className = k < i ? 'is-done' : k === i ? 'is-on' : ''; });
      const fill = $('b', bars[i]);
      fill.style.animation = 'none'; void fill.offsetWidth; fill.style.animation = '';
      clearTimeout(t);
      t = setTimeout(() => show(i + 1), 2800);
    };
    $('[data-prev]', root).onclick = () => show(i - 1);
    $('[data-next]', root).onclick = () => show(i + 1);
    show(0);
    return () => clearTimeout(t);
  }

  /* ── Work: the side sheet ─────────────────────────── */
  function daysHTML(d) {
    const n = d.total;
    return `<div class="days" style="--n:${n}">
      <div class="days__head">${Array.from({ length: n }, (_, i) => `<span>D${i + 1}</span>`).join('')}</div>
      <div class="days__grid" style="grid-template-columns:repeat(${n}, 1fr)">${d.items.map((it, i) =>
        `<div class="days__bar" style="grid-column:${it.from} / ${it.to + 1};animation-delay:${200 + i * 140}ms">${it.label}<span>Day ${it.from}–${it.to}</span></div>`).join('')}</div>
    </div>`;
  }
  function blockHTML(b) {
    const g = b.img ? `<div class="gallery ${b.img.length === 1 ? 'one' : b.img.length === 3 ? 'three' : ''}">${b.img.map((s) => `<img src="${s}" alt="" loading="lazy">`).join('')}</div>` : '';
    return `<section id="sec-${b.id}">
      <h2>${b.h}</h2>
      ${(b.p || []).map((t) => `<p>${t}</p>`).join('')}
      ${b.list ? `<ul class="items">${b.list.map(([t, d]) => `<li><b>${t}</b><span>${d}</span></li>`).join('')}</ul>` : ''}
      ${b.days ? daysHTML(b.days) : ''}
      ${g}
      ${b.video ? `<video src="${b.video}" controls playsinline preload="none" poster="assets/img/side-cover.png"></video>` : ''}
      ${b.metrics ? `<div class="metrics">${b.metrics.map(([n, l]) => `<div class="metric"><div class="metric__num">${n}</div><div class="metric__label">${l}</div></div>`).join('')}</div>` : ''}
      ${b.quote ? `<blockquote><p>“${b.quote.text}”</p><span class="meta">${b.quote.who} · ${b.quote.role}</span></blockquote>` : ''}
      ${b.scorecard ? `<div class="score">${b.scorecard.map(([t, d]) => `<div>${t}<span><i></i>Delivered · ${d}</span></div>`).join('')}</div>` : ''}
    </section>`;
  }
  function sheetHTML(C) {
    const next = CASES[CASE_ORDER[(CASE_ORDER.indexOf(C.id) + 1) % CASE_ORDER.length]];
    const live = C.live ? `<div><dt>Live</dt><dd><a href="${C.live}" target="_blank" rel="noopener">${C.live.replace(/^https?:\/\//, '')} ↗</a></dd></div>` : '';
    return `<div class="sheet__bar">
        ${C.logo ? logoHTML(C.logo, 17, C.client) : `<span class="client">${C.client}</span>`}
        <span class="pill">${C.duration}</span><span class="meta">${fmtRange(C.start, C.end)}</span>
        <button class="note__x" data-close aria-label="Close">${icon.x}</button>
      </div>
      <div class="sheet__body">
        <div class="tags">${C.tags.map((t) => `<span class="pill">${t}</span>`).join('')}</div>
        <h1>${C.title}</h1>
        <p class="lede">${C.lede}</p>
        <dl class="metagrid">${C.meta.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}${live}</dl>
        <img class="cover" src="${C.cover}" alt="">
        ${C.blocks.map(blockHTML).join('')}
        <button class="sheet__next" data-case-next="${next.id}"><span><span class="meta">Next · ${next.duration}</span><div class="t">${next.title}</div></span><span aria-hidden="true">→</span></button>
        <div class="sheet__cta"><span class="t">Your launch could be <em>next</em>.</span><a class="btn" href="${MAIL}">Work with us</a></div>
      </div>`;
  }

  // a project or moment from Notion: everything comes from its row and page body
  const WORKS = ALL.filter((e) => e.type === 'case' || e.type === 'project');
  function projectSheetHTML(ev) {
    const parent = ev.parent && BY_ID[ev.parent];
    const anchor = parent || ev;
    const next = WORKS[(WORKS.indexOf(anchor) + 1) % WORKS.length] || WORKS[0];
    const nextTitle = next.type === 'case' ? CASES[next.case].title : next.title;
    const nextAttr = next.type === 'case' ? `data-case-next="${next.case}"` : `data-open-id="${next.id}"`;
    const nextLen = next.type === 'case' ? CASES[next.case].duration : next.end ? durationOf(next.date, next.end) : fullDate(next.date);
    const when = ev.end ? fmtRange(ev.date, ev.end) : fullDate(ev.date);
    const meta = [
      ['Client', ev.client],
      ['When', when],
      ['Services', (ev.services || []).join(', ')],
      ['Part of', parent && `<button class="linkish" data-open-id="${parent.id}">${strip(parent.title)} →</button>`],
      ['Live', ev.live && `<a href="${ev.live}" target="_blank" rel="noopener">${ev.live.replace(/^https?:\/\/(www\.)?/, '')} ↗</a>`],
    ].filter(([, v]) => v);
    const [cover, ...rest] = ev.photos || [];
    return `<div class="sheet__bar">
        <span class="client">${ev.client || '37degree'}</span>
        ${ev.end ? `<span class="pill">${durationOf(ev.date, ev.end)}</span>` : ''}<span class="meta">${when}</span>
        <button class="note__x" data-close aria-label="Close">${icon.x}</button>
      </div>
      <div class="sheet__body">
        ${tagsHTML(ev)}
        <h1>${ev.title}</h1>
        ${ev.summary ? `<p class="lede">${ev.summary}</p>` : ''}
        <dl class="metagrid">${meta.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
        ${cover ? `<img class="cover" src="${cover}" alt="">` : ''}
        ${rest.length ? `<div class="gallery ${rest.length === 1 ? 'one' : ''}">${rest.map((s) => `<img src="${s}" alt="" loading="lazy">`).join('')}</div>` : ''}
        ${ev.body ? `<section class="prose">${ev.body}</section>` : ''}
        <button class="sheet__next" ${nextAttr}><span><span class="meta">Next · ${nextLen}</span><div class="t">${nextTitle}</div></span><span aria-hidden="true">→</span></button>
        <div class="sheet__cta"><span class="t">Your launch could be <em>next</em>.</span><a class="btn" href="${MAIL}">Work with us</a></div>
      </div>`;
  }

  function openProject(ev, srcEl) {
    if (!ev) return;
    closeAll(true);
    const card = srcEl || $(`.card[data-id="${ev.id}"]`, mq.matches ? agenda : track);
    sheet.innerHTML = projectSheetHTML(ev);
    sheet.scrollTop = 0;
    sheet.hidden = false;
    scrim.hidden = false;
    const fly = card && ev.type === 'project' && ev.photos ? flyOut(card, { stack: ev.photos.slice(0, 3) }) : null;
    requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('is-in'); sheet.classList.add('is-in'); }));
    if (!mq.matches) bar.style.left = `${Math.max(140, (innerWidth - Math.min(720, innerWidth)) / 2)}px`;
    open = { kind: 'sheet', id: ev.id, el: card, fly };
    setOwner({ mono: (ev.client || '37')[0] }, ev.client || 'By 37degree');
    markVisited(ev.id);
    history.replaceState(null, '', `${location.pathname}${location.search}#work/${ev.id}`);
    setTimeout(() => { const x = $('[data-close]', sheet); x && x.focus({ preventScroll: true }); }, 50);
  }

  // the project's screens leave the card and fan out beside the sheet
  const FAN = [{ x: -0.3, y: -0.46, r: -6 }, { x: 0.3, y: -0.06, r: 5 }, { x: -0.06, y: 0.48, r: -2 }];
  function flyOut(card, C) {
    if (!card || reduced.matches || mq.matches) return null;
    const frame = $('.frame', card) || card;
    const r = frame.getBoundingClientRect();
    if (r.right < 0 || r.left > innerWidth) return null;
    const L = innerWidth - Math.min(720, innerWidth);
    if (L < 380) return null;
    const tw = Math.min(400, L * 0.54);
    const cx = L / 2, cy = innerHeight / 2;
    const start = rectKeys(r, '10px');
    const anims = C.stack.map((src, i) => {
      const img = document.createElement('img');
      img.src = src;
      flyLayer.appendChild(img);
      const th = tw * 0.62, f = FAN[i % FAN.length];
      const end = { left: `${cx + f.x * tw - tw / 2}px`, top: `${cy + f.y * th - th / 2}px`, width: `${tw}px`, height: `${th}px`, borderRadius: '10px' };
      return img.animate(
        [{ ...start, transform: 'rotate(0deg)', opacity: i === 0 ? 1 : 0 }, { ...end, transform: `rotate(${f.r}deg)`, opacity: 1 }],
        { duration: 640, delay: i * 60, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
    });
    card.classList.add('is-flown');
    return { card, anims };
  }
  function flyBack(f, instant) {
    if (!f) return;
    const clones = f.anims.map((a) => a.effect.target);
    const done = () => { clones.forEach((c) => c.remove()); f.card.classList.remove('is-flown'); };
    if (instant) return done();
    f.anims.forEach((a) => { a.updatePlaybackRate(1.3); a.reverse(); });
    Promise.all(f.anims.map((a) => a.finished)).then(done, done);
    setTimeout(done, 900);
  }

  function openCase(id, section, srcEl, opts = {}) {
    const C = CASES[id];
    if (!C) return;
    closeAll(true);
    const caseCard = $(`.card--case[data-case="${id}"]`, mq.matches ? agenda : track);
    sheet.innerHTML = sheetHTML(C);
    sheet.scrollTop = 0;
    sheet.hidden = false;
    scrim.hidden = false;
    const fly = opts.noFly ? null : flyOut(caseCard, C);
    requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('is-in'); sheet.classList.add('is-in'); }));
    if (!mq.matches) bar.style.left = `${Math.max(140, (innerWidth - Math.min(720, innerWidth)) / 2)}px`;
    open = { kind: 'sheet', id, el: srcEl || caseCard, fly };
    setOwner(C.logo ? { logo: C.logo } : { mono: C.client[0] }, C.short);
    markVisited(caseCard && caseCard.dataset.id, srcEl && srcEl.dataset.id);
    history.replaceState(null, '', `${location.pathname}${location.search}#work/${id}`);
    setTimeout(() => { const x = $('[data-close]', sheet); x && x.focus({ preventScroll: true }); }, 50);
    if (section) {
      setTimeout(() => {
        const sec = $(`#sec-${section}`, sheet);
        if (!sec) return;
        sec.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
        sec.classList.add('is-target');
        const v = opts.play && $('video', sec);
        if (v) v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
      }, 450);
    }
  }

  function closeSheet(o, instant) {
    sheet.classList.remove('is-in');
    scrim.classList.remove('is-in');
    bar.style.left = '';
    $$('video', sheet).forEach((v) => v.pause());
    flyBack(o.fly, instant);
    const hide = () => { if (!open || open.kind !== 'sheet') { sheet.hidden = true; scrim.hidden = true; } };
    instant ? hide() : setTimeout(hide, 500);
    history.replaceState(null, '', location.pathname + location.search);
    !instant && o.el && o.el.focus({ preventScroll: true });
  }

  function closeAll(instant) {
    if (!open) return;
    const o = open;
    open = null;
    clearOwner();
    o.kind === 'note' ? closeNote(o, instant) : closeSheet(o, instant);
  }

  /* ── Events ───────────────────────────────────────── */
  document.addEventListener('click', (e) => {
    const t = e.target;
    const v = t.closest('[data-view]');
    if (v) return setView(v.dataset.view);
    if (t.closest('[data-close]') || t === focusEl || t === scrim) return closeAll();
    const nextBtn = t.closest('[data-case-next]');
    if (nextBtn) {
      const id = nextBtn.dataset.caseNext;
      closeAll(true);
      if (!mq.matches) scrollToDate(CASES[id].start);
      return requestAnimationFrame(() => openCase(id));
    }
    const caseBar = t.closest('[data-case-bar]');
    if (caseBar && !dragMoved) return openCase(caseBar.dataset.caseBar);
    const openBtn = t.closest('[data-open-id]');
    if (openBtn && !dragMoved) {
      const target = BY_ID[openBtn.dataset.openId];
      if (!target) return;
      if (target.type === 'case') return openCase(target.case);
      if (open && open.kind === 'sheet' && !mq.matches) scrollToDate(target.date);
      return requestAnimationFrame(() => openProject(target));
    }
    const card = t.closest('button.card, button.mrow, button[data-day]');
    if (!card || dragMoved) return;
    const ev = BY_ID[card.dataset.id || card.dataset.day];
    if (ev.type === 'case') return openCase(ev.case, null, card);
    if (ev.type === 'video') return openCase('sidecar', 'video', card, { noFly: true, play: true });
    if (isProject(ev)) return openProject(ev, card);
    if (ev.case) return openCase(ev.case, ev.section, card, { noFly: true });
    openNote(ev, card);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) { e.preventDefault(); closeAll(); }
    // − and + zoom out and in, like a calendar app
    const inField = e.target instanceof Element && e.target.closest('input, textarea, select');
    if (!open && !inField && (e.key === '-' || e.key === '=' || e.key === '+')) zoom(e.key === '-' ? -1 : 1);
  });

  addEventListener('resize', () => {
    if (open && open.kind === 'sheet' && open.fly) { flyBack(open.fly, true); open.fly = null; }
    if (!mq.matches) { layoutBars(); buildMinimap(); }
  });
  mq.addEventListener('change', () => { if (mq.matches && view === 'months') view = 'days'; render(); });

  function fromHash() {
    const m = location.hash.match(/^#work\/([\w-]+)/);
    if (!m || (open && open.id === m[1])) return;
    if (CASES[m[1]]) {
      if (!mq.matches) scrollToDate(CASES[m[1]].start);
      return setTimeout(() => openCase(m[1]), 250);
    }
    const ev = BY_ID[m[1]];
    if (!ev || !isProject(ev)) return;
    if (!mq.matches) scrollToDate(ev.date);
    setTimeout(() => openProject(ev), 250);
  }
  addEventListener('hashchange', fromHash);

  render();
  document.fonts && document.fonts.ready.then(() => {
    syncBar();
    if (!mq.matches) { layoutBars(); buildMinimap(); }
    requestAnimationFrame(() => seg.classList.add('is-ready'));
  });
  fromHash();
})();
