(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MON = MONTHS.map((m) => m.slice(0, 3));
  const pad = (n) => String(n).padStart(2, '0');
  const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return { y, m, d }; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TODAY = isoOf(new Date());
  const ROWS = 7;
  const VIEWS = ['highlights', 'months', 'days'];
  const MAIL = 'mailto:puru@37degr.ee?cc=haneef@37degr.ee&subject=' + encodeURIComponent('Work with 37degree');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mq = matchMedia('(max-width: 760px)');

  const timeline = $('.timeline');
  const track = $('.track');
  const agenda = $('.agenda');
  const bar = $('.dynbar');
  const pop = $('.pop');
  const sheet = $('.sheet');
  const scrim = $('.scrim');
  const flyLayer = $('.flylayer');
  const monthLabel = $('.month-label');

  if (new URLSearchParams(location.search).has('draft')) document.body.classList.add('draft');

  /* ── Data ─────────────────────────────────────────── */
  const ALL = [...EVENTS, { id: 'open-slot', date: TODAY, type: 'slot', row: 2, span: 3, highlight: true, title: 'this slot is open' }]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const BY_ID = Object.fromEntries(ALL.map((e) => [e.id, e]));
  const CASE_ORDER = Object.keys(CASES).sort((a, b) => (CASES[a].start < CASES[b].start ? -1 : 1));

  /* ── Visited, remembered between visits ───────────── */
  let visited = new Set();
  try { visited = new Set(JSON.parse(localStorage.getItem('37cal.visited') || '[]')); } catch (_) {}
  function markVisited(...ids) {
    ids.filter(Boolean).forEach((id) => visited.add(id));
    try { localStorage.setItem('37cal.visited', JSON.stringify([...visited])); } catch (_) {}
    ids.forEach((id) => $$(`[data-id="${id}"]`).forEach((el) => el.classList.add('is-visited')));
  }

  /* ── Formatting ───────────────────────────────────── */
  const fullDate = (s) => { const p = parse(s); return `${p.d} ${MONTHS[p.m - 1]} ${p.y}`; };
  function fmtRange(a, b) {
    const p = parse(a), q = parse(b);
    return p.y === q.y ? `${p.d} ${MON[p.m - 1]} – ${q.d} ${MON[q.m - 1]} ${q.y}` : `${p.d} ${MON[p.m - 1]} ${p.y} – ${q.d} ${MON[q.m - 1]} ${q.y}`;
  }
  const icon = {
    x: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="m2 2 8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    play: '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1.2v7.6L8.6 5z" fill="currentColor"/></svg>',
    plus: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M1 6h10M6 1v10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    check: '<svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="m1.2 4.2 1.8 1.8L6.8 2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  /* ── Cards ────────────────────────────────────────── */
  const clickable = (ev) => !(ev.type === 'quote' || ((ev.type === 'note' || ev.type === 'milestone') && !ev.detail && !ev.case));
  const DEFAULT_SPAN = { note: 2, milestone: 2, quote: 2, person: 3, case: 4, step: 2, testimonial: 3, video: 2, logos: 2, snippets: 4, slot: 3 };

  function cardHTML(ev) {
    const p = parse(ev.date);
    const date = `<div class="card__date">${p.d} ${MONTHS[p.m - 1]}</div>`;
    let inner = '';
    switch (ev.type) {
      case 'quote':
        inner = `<span>${ev.title}</span>`; break;
      case 'note':
        inner = `<div><div class="card__title">${ev.title}</div>${date}</div>`; break;
      case 'milestone':
        inner = ev.metric
          ? `<div><div class="ms-num">${ev.metric}</div>${ev.sub ? `<div class="sub">${ev.sub}</div>` : ''}</div><div><div class="card__title">${ev.title}</div>${date}</div>`
          : `<div><div class="card__title">${ev.title}</div>${ev.sub ? `<div class="sub">${ev.sub}</div>` : ''}${date}</div>`;
        break;
      case 'person': {
        const P = PEOPLE[ev.person];
        inner = `<div><div class="card__title">${ev.title}</div>${date}</div>
          <div class="who"><span class="avatar">${P.mono}</span><div><b>${P.name}</b><span>${P.role}</span></div></div>
          <div class="guests"><span class="check">${icon.check}</span>joined</div>`;
        break;
      }
      case 'case': {
        const C = CASES[ev.case];
        inner = `<div class="case-top">${C.logo ? `<img src="${C.logo}" alt="${C.client}">` : `<span class="client">${C.client}</span>`}<span class="pill">${C.duration}</span></div>
          <div><div class="card__title">${C.title}</div>${date}</div>
          <div class="stack">${C.stack.map((s) => `<img src="${s}" alt="" loading="lazy">`).join('')}</div>
          <div class="tags">${C.tags.map((t) => `<span class="pill">${t}</span>`).join('')}</div>`;
        break;
      }
      case 'step': {
        const C = CASES[ev.case];
        inner = `<div><div class="card__kicker"><i></i>${C.short}</div><div class="card__title" style="margin-top:8px">${ev.title}</div>${date}</div>
          ${ev.img ? `<div class="thumb"><img src="${ev.img}" alt="" loading="lazy"></div>` : ''}`;
        break;
      }
      case 'testimonial': {
        const T = TESTIMONIALS[ev.who];
        inner = `<div class="who"><span class="avatar avatar--sm"><img src="${T.img}" alt=""></span><div><b>${T.name}</b><span>${T.role}</span></div></div>
          <q>${T.quote}</q>${date}`;
        break;
      }
      case 'video':
        inner = `<div class="row"><span class="play">${icon.play}</span></div>
          <div class="poster"><img src="${ev.poster}" alt="" loading="lazy"></div>
          <div><div class="card__title">${ev.title}</div>${date}</div>`;
        break;
      case 'logos':
        inner = `<div class="card__title">${ev.title}</div><div class="logos">${LOGOS.slice(0, 3).map((l) => `<img src="${l.src}" alt="${l.name}">`).join('')}</div>${date}`;
        break;
      case 'snippets':
        inner = `<div><div class="card__title">${ev.title}</div>${date}</div><div class="stack">${SNIPPETS.slice(0, 3).map((s) => `<img src="${s}" alt="" loading="lazy">`).join('')}</div>`;
        break;
      case 'slot':
        inner = `<span class="plus">${icon.plus}</span><div class="card__title">${ev.title}</div>
          <p>Your launch, brand or product, built with 37degree. Pick a week and we'll take it from there.</p>`;
        break;
    }
    const tag = clickable(ev) ? 'button' : 'div';
    const cls = ['card', `card--${ev.type}`, visited.has(ev.id) && 'is-visited', ev.tbc && 'is-tbc'].filter(Boolean).join(' ');
    const extra = ev.case ? ` data-case="${ev.case}"` : '';
    const label = tag === 'button' ? ` aria-label="${labelFor(ev)}"` : '';
    return `<${tag} class="${cls}" data-id="${ev.id}"${extra}${label}>${inner}</${tag}>`;
  }
  function labelFor(ev) {
    const strip = (h) => String(h || '').replace(/<[^>]+>/g, '');
    if (ev.type === 'case') return `Open case study: ${strip(CASES[ev.case].title)}`;
    if (ev.type === 'testimonial') return `Read what ${TESTIMONIALS[ev.who].name} said`;
    if (ev.type === 'person') return `Meet ${PEOPLE[ev.person].name}`;
    return `${strip(ev.title)}, ${fullDate(ev.date)}`;
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
      const first = c.events[0].date;
      const p = parse(first);
      const isMonth = v === 'months';
      const end = isMonth ? `${c.key}-31` : c.events[c.events.length - 1].date;
      const isToday = isMonth ? TODAY.startsWith(c.key) : c.key === TODAY;
      return { ...c, date: isMonth ? `${c.key}-01` : first, end, p, isMonth, isToday };
    });
  }

  function placeDay(events) {
    let cursor = 1;
    const items = events.map((ev) => {
      const span = Math.min(ev.span || DEFAULT_SPAN[ev.type] || 2, ROWS);
      let row = ev.row || cursor;
      if (row + span - 1 > ROWS) row = Math.max(1, ROWS - span + 1);
      cursor = row + span;
      return { ev, row, span, lane: 0 };
    });
    // events that overlap in time share the column side by side, like overlapping meetings
    const lanesEnd = [];
    [...items].sort((a, b) => a.row - b.row).forEach((it) => {
      let lane = lanesEnd.findIndex((end) => end < it.row);
      if (lane === -1) { lane = lanesEnd.length; lanesEnd.push(0); }
      lanesEnd[lane] = it.row + it.span - 1;
      it.lane = lane;
    });
    const lanes = lanesEnd.length;
    items.forEach((it) => {
      it.solo = !items.some((o) => o !== it && o.row < it.row + it.span && it.row < o.row + o.span);
    });
    return { items, lanes };
  }

  function colHTML(c, i, cols) {
    const prev = cols[i - 1];
    const newMonth = !c.isMonth && (!prev || prev.p.m !== c.p.m || prev.p.y !== c.p.y);
    const head = c.isMonth
      ? `<span class="d">${MONTHS[c.p.m - 1]}</span><span class="y">${c.p.y}</span>`
      : c.isToday
        ? `<span class="d">Today</span><span class="y">${MON[c.p.m - 1]} ${c.p.d} · ${c.p.y}</span>`
        : `<span class="d">${MON[c.p.m - 1]} ${c.p.d}</span><span class="y">${c.p.y}</span>`;
    let body;
    let style = '';
    if (c.isMonth) {
      const lanes = Math.ceil(c.events.length / ROWS);
      style = ` style="--lanes:${lanes}"`;
      body = `<div class="col-body is-compact" style="--crows:${ROWS}">${c.events.map(cardHTML).join('')}</div>`;
    } else {
      const { items, lanes } = placeDay(c.events);
      const gridCols = lanes > 1 ? ` style="grid-template-columns:repeat(${lanes}, minmax(0, 1fr))"` : '';
      body = `<div class="col-body"${gridCols}>${items.map((it) => {
        const colPos = lanes > 1 ? (it.solo ? '1 / -1' : `${it.lane + 1}`) : '1';
        return cardHTML(it.ev).replace(/^<(\w+) /, `<$1 style="grid-row:${it.row} / span ${it.span};grid-column:${colPos}" `);
      }).join('')}</div>`;
    }
    const cls = ['col', c.isMonth && 'is-month', view === 'highlights' && 'is-highlight', newMonth && 'is-newmonth', c.isToday && 'col--today'].filter(Boolean).join(' ');
    return `<section class="${cls}" data-date="${c.date}" data-end="${c.end}"${style} aria-label="${c.isMonth ? `${MONTHS[c.p.m - 1]} ${c.p.y}` : fullDate(c.date)}">
      ${c.isToday ? '<span class="nowline" aria-hidden="true"></span>' : ''}
      <div class="col-head">${head}</div>${body}</section>`;
  }

  const metricsHTML = `<div class="metrics">
      <div class="metric"><div class="metric__num">4.85</div><div class="metric__label">Rating</div></div>
      <div class="metric"><div class="metric__num">50+</div><div class="metric__label">Projects completed</div></div>
    </div>`;
  const introCopy = `<h1>How 37degree <em>started</em>, and everything we've shipped since.</h1>
    <p>We're a design-led growth studio for Tech &amp; AI companies. This is our calendar: the day the studio began, the people who built it, and the projects we've delivered, on the day they happened.</p>`;

  function introHTML() {
    return `<section class="col col--intro" data-intro>
      <div class="col-head"><span class="meta">Studio calendar</span></div>
      <div class="intro">
        <span class="pill" style="align-self:flex-start"><i class="dot"></i>Taking projects for ${MONTHS[(new Date().getMonth() + 1) % 12]}</span>
        ${introCopy}
        ${metricsHTML}
        <div class="ctas"><button class="btn btn--primary" data-go="work">See the work</button><a class="btn btn--ghost" href="${MAIL}">Say hello</a></div>
        <div class="hint"><span class="kbd">←</span><span class="kbd">→</span> scroll or drag through time <span class="arrow">→</span></div>
      </div>
    </section>`;
  }

  function outroHTML() {
    const row = (P) => `<a class="person-row" href="${P.links[0].href}"><span class="avatar">${P.mono}</span><span><b>${P.links[0].label}</b><span>${P.role}</span></span></a>`;
    return `<div class="outro">
      <span class="meta">What's next</span>
      <h2>This could be the start of something incredibly <em>special</em>.</h2>
      <div class="people">${row(PEOPLE.puru)}${row(PEOPLE.haneef)}</div>
      <div class="socials"><a href="https://x.com/madebypuru" target="_blank" rel="noopener">X</a><a href="https://www.linkedin.com/company/107024182" target="_blank" rel="noopener">LinkedIn</a><a href="https://37degr.ee">37degr.ee</a></div>
      <small>Crafted by 37degree. © ${new Date().getFullYear()} 37degree. All rights reserved.</small>
    </div>`;
  }

  /* ── Render ───────────────────────────────────────── */
  function render() {
    closeAll(true);
    if (mq.matches) return renderAgenda();
    const cols = columnsFor(view);
    track.innerHTML = introHTML() + cols.map(colHTML).join('') +
      `<section class="col col--end"><div class="col-head"><span class="meta">Fin</span></div>${outroHTML()}</section>`;
    layoutOverlays();
    syncSeg();
    updateMonth(true);
  }

  function layoutOverlays() {
    $$('.allday-bar', track).forEach((b) => b.remove());
    if (view !== 'highlights') {
      const cols = $$('.col[data-date]', track);
      for (const id of CASE_ORDER) {
        const C = CASES[id];
        const inRange = cols.filter((c) => c.dataset.end >= C.start && c.dataset.date <= C.end);
        if (!inRange.length) continue;
        const a = inRange[0], b = inRange[inRange.length - 1];
        const el = document.createElement('button');
        el.className = 'allday-bar';
        el.dataset.caseBar = id;
        el.style.left = `${a.offsetLeft + 10}px`;
        el.style.width = `${b.offsetLeft + b.offsetWidth - a.offsetLeft - 20}px`;
        el.innerHTML = `<b>${C.short}</b><span class="len">${C.duration}</span>`;
        el.setAttribute('aria-label', `${C.short}, ${C.duration}, open case study`);
        track.appendChild(el);
      }
    }
    buildMinimap();
  }

  /* ── Agenda (phones) ──────────────────────────────── */
  function renderAgenda() {
    const list = view === 'highlights' ? ALL.filter((e) => e.highlight) : ALL;
    let html = `<div class="ag-intro">${introCopy}${metricsHTML}</div>`;
    let month = '', day = '';
    for (const ev of list) {
      const m = ev.date.slice(0, 7);
      if (m !== month) {
        if (day) html += '</div></div>';
        day = '';
        month = m;
        const p = parse(ev.date);
        html += `<div class="ag-month" data-month="${MONTHS[p.m - 1]}|${p.y}">${MONTHS[p.m - 1]} <span>${p.y}</span></div>`;
      }
      if (ev.date !== day) {
        if (day) html += '</div></div>';
        day = ev.date;
        const p = parse(ev.date);
        html += `<div class="ag-day${ev.date === TODAY ? ' is-today' : ''}"><div class="ag-date"><b>${p.d}</b><span>${ev.date === TODAY ? 'Today' : MON[p.m - 1]}</span></div><div class="ag-cards">`;
      }
      html += cardHTML(ev);
    }
    if (day) html += '</div></div>';
    agenda.innerHTML = html + `<div class="ag-outro">${outroHTML()}</div>`;
    syncSeg();
    updateMonth(true);
  }

  /* ── Where am I: month label + minimap ────────────── */
  function currentCol() {
    const cols = $$('.col[data-date]', track);
    const edge = timeline.scrollLeft + 80;
    return cols.find((c) => c.offsetLeft + c.offsetWidth > edge) || cols[cols.length - 1];
  }
  let lastMonth = '';
  function updateMonth(force) {
    let m, y;
    if (mq.matches) {
      const heads = $$('.ag-month', agenda);
      const top = agenda.scrollTop + 4;
      const h = heads.filter((el) => el.offsetTop <= top).pop() || heads[0];
      if (!h) return;
      [m, y] = h.dataset.month.split('|');
    } else {
      const col = timeline.scrollLeft < 200 ? $('.col[data-date]', track) : currentCol();
      if (!col) return;
      const p = parse(col.dataset.date);
      m = MONTHS[p.m - 1]; y = p.y;
    }
    const key = `${m} ${y}`;
    if (key === lastMonth && !force) return;
    lastMonth = key;
    monthLabel.innerHTML = `<span class="m">${m}</span> <span class="y">${y}</span>`;
    monthLabel.classList.remove('is-flip');
    void monthLabel.offsetWidth;
    monthLabel.classList.add('is-flip');
  }

  const mini = $('.minimap');
  const miniTicks = $('.minimap__ticks');
  const miniWin = $('.minimap__win');
  function buildMinimap() {
    const W = mini.clientWidth, total = track.scrollWidth;
    miniTicks.innerHTML = $$('.col[data-date]', track).map((c) => {
      const x = (c.offsetLeft / total) * W;
      const cls = c.classList.contains('col--today') ? 'is-today' : c.querySelector('.card--case') ? 'is-case' : '';
      return `<i class="${cls}" style="left:${x.toFixed(1)}px"></i>`;
    }).join('');
    updateMinimap();
  }
  function updateMinimap() {
    const W = mini.clientWidth, total = track.scrollWidth || 1;
    const w = Math.max(10, (timeline.clientWidth / total) * W);
    const x = (timeline.scrollLeft / total) * W;
    miniWin.style.width = `${w}px`;
    miniWin.style.left = `${clamp(x, 0, W - w)}px`;
    mini.setAttribute('aria-valuenow', Math.round((timeline.scrollLeft / Math.max(1, total - timeline.clientWidth)) * 100));
  }
  function scrubTo(clientX, smooth) {
    const r = mini.getBoundingClientRect();
    const f = clamp((clientX - r.left) / r.width, 0, 1);
    timeline.scrollTo({ left: f * track.scrollWidth - timeline.clientWidth / 2, behavior: smooth ? 'smooth' : 'auto' });
  }
  let scrubbing = false;
  mini.addEventListener('pointerdown', (e) => { scrubbing = true; mini.setPointerCapture(e.pointerId); scrubTo(e.clientX, true); });
  mini.addEventListener('pointermove', (e) => scrubbing && scrubTo(e.clientX, false));
  mini.addEventListener('pointerup', () => (scrubbing = false));
  mini.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1); }
  });

  let ticking = false;
  timeline.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; updateMonth(); updateMinimap(); placePop(); });
  });
  agenda.addEventListener('scroll', () => requestAnimationFrame(() => updateMonth()));

  /* ── Moving through time ──────────────────────────── */
  function scrollToDate(date, smooth = true) {
    const cols = $$('.col[data-date]', track);
    const col = cols.find((c) => c.dataset.end >= date) || cols[cols.length - 1];
    if (!col) return;
    timeline.scrollTo({ left: Math.max(0, col.offsetLeft - 40), behavior: smooth && !reduced.matches ? 'smooth' : 'auto' });
  }
  function step(dir) {
    timeline.scrollBy({ left: dir * (timeline.clientWidth - 288), behavior: reduced.matches ? 'auto' : 'smooth' });
  }
  function go(where) {
    if (mq.matches) {
      if (where === 'work') { const el = $(`.card--case`, agenda); el && el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      if (where === 'today') { const el = $('.ag-day.is-today', agenda); el && el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      if (where === 'start') agenda.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (where === 'start') timeline.scrollTo({ left: 0, behavior: 'smooth' });
    if (where === 'prev') step(-1);
    if (where === 'next') step(1);
    if (where === 'work') scrollToDate(CASES[CASE_ORDER[0]].start);
    if (where === 'today') {
      const col = $('.col--today', track);
      if (col) timeline.scrollTo({ left: col.offsetLeft - timeline.clientWidth / 2 + col.offsetWidth / 2, behavior: 'smooth' });
    }
  }

  // a vertical wheel moves you sideways through time
  timeline.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      timeline.scrollLeft += e.deltaY * (e.deltaMode === 1 ? 32 : 1);
    }
  }, { passive: false });

  // drag the canvas with a mouse
  let drag = null, dragMoved = false;
  timeline.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('a, input, select, textarea')) return;
    drag = { x: e.clientX, sl: timeline.scrollLeft };
    dragMoved = false;
  });
  addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!dragMoved && Math.abs(dx) > 5) { dragMoved = true; document.body.style.cursor = 'grabbing'; }
    if (dragMoved) timeline.scrollLeft = drag.sl - dx;
  });
  addEventListener('pointerup', () => {
    drag = null;
    document.body.style.cursor = '';
    setTimeout(() => (dragMoved = false), 0);
  });

  timeline.addEventListener('keydown', (e) => {
    if (e.target !== timeline) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); timeline.scrollBy({ left: 288, behavior: 'smooth' }); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); timeline.scrollBy({ left: -288, behavior: 'smooth' }); }
    if (e.key === 'Home') timeline.scrollTo({ left: 0, behavior: 'smooth' });
    if (e.key === 'End') timeline.scrollTo({ left: track.scrollWidth, behavior: 'smooth' });
  });

  /* ── Zoom ─────────────────────────────────────────── */
  const seg = $('.seg');
  const segHandle = $('.seg__handle');
  function syncSeg() {
    $$('[data-view]', seg).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.view === view)));
    const on = $(`[data-view="${view}"]`, seg);
    if (on) { segHandle.style.left = `${on.offsetLeft}px`; segHandle.style.width = `${on.offsetWidth}px`; }
    const i = VIEWS.indexOf(view);
    $('[data-zoom="-1"]').disabled = i === 0;
    $('[data-zoom="1"]').disabled = i === VIEWS.length - 1;
  }
  function setView(v) {
    if (v === view) return;
    // keep your place: re-open the new zoom level at the same moment in time
    const col = !mq.matches && timeline.scrollLeft > 200
      ? $$('.col[data-date]', track).find((c) => c.offsetLeft >= timeline.scrollLeft - 20) || currentCol()
      : null;
    const anchor = col && col.dataset.date;
    view = v;
    render();
    if (anchor) scrollToDate(anchor, false);
    else timeline.scrollLeft = 0;
  }

  /* ── Dynamic bar: shows who's behind what's open ──── */
  function setOwner(av, label) {
    const a = $('.owner__av');
    a.className = 'owner__av' + (av.logo ? ' is-logo' : '');
    a.innerHTML = av.img ? `<img src="${av.img}" alt="">` : av.logo ? `<img src="${av.logo}" alt="">` : av.mono;
    $('.owner__label').textContent = label;
    bar.classList.add('is-owner');
  }
  const clearOwner = () => bar.classList.remove('is-owner');

  /* ── Popovers ─────────────────────────────────────── */
  let open = null; // { kind: 'pop' | 'sheet', ev, el, cleanup }

  function ownerOf(ev) {
    switch (ev.type) {
      case 'person': { const P = PEOPLE[ev.person]; return [{ mono: P.mono }, P.name]; }
      case 'testimonial': { const T = TESTIMONIALS[ev.who]; return [{ img: T.img }, T.name]; }
      case 'slot': return [{ mono: '+' }, 'New event'];
      default: return [{ mono: '37' }, 'By 37degree'];
    }
  }
  function footHTML(ev, note) {
    const [av, label] = ownerOf(ev);
    const a = av.img ? `<img src="${av.img}" alt="">` : av.mono;
    return `<div class="pop__foot"><span class="avatar avatar--sm">${a}</span><span>${note || label}</span>
      <button class="icon-btn x" data-close aria-label="Close">${icon.x}</button></div>`;
  }

  function popHTML(ev) {
    const when = `<p class="meta" style="margin-bottom:10px">${fullDate(ev.date)}</p>`;
    switch (ev.type) {
      case 'note':
      case 'milestone':
        return `<div class="pop__body">${when}<h3>${ev.metric ? `${ev.metric} ` : ''}${ev.title}</h3><p>${ev.detail}</p></div>${footHTML(ev)}`;
      case 'person': {
        const P = PEOPLE[ev.person];
        return `<div class="pop__body profile"><span class="avatar avatar--lg">${P.mono}</span>
          <div><span class="role">${P.role}</span><h3 style="margin-top:8px">Meet ${P.short}</h3><p>${P.bio}</p>
          <div class="links">${P.links.map((l) => `<a class="pill" href="${l.href}"${l.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${l.label}</a>`).join('')}</div></div></div>${footHTML(ev, `Joined ${fullDate(ev.date)}`)}`;
      }
      case 'testimonial': {
        const T = TESTIMONIALS[ev.who];
        return `<div class="pop__body"><p class="bigquote">“${T.quote}”</p></div>${footHTML(ev, `${T.name} · ${T.role}`)}`;
      }
      case 'video':
        return `<div class="pop__media"><video src="${ev.src}" poster="${ev.poster}" controls playsinline preload="auto"></video></div>${footHTML(ev, `${ev.title} · Sidecar`)}`;
      case 'logos':
        return `<div class="pop__body">${when}<h3>Team trusted by the likes of</h3><div class="logo-grid">${LOGOS.map((l) => `<div><img src="${l.src}" alt="${l.name}"></div>`).join('')}</div></div>${footHTML(ev)}`;
      case 'snippets':
        return `<div class="story">
            <div class="story__bars">${SNIPPETS.map(() => '<i><b></b></i>').join('')}</div>
            ${SNIPPETS.map((s) => `<img src="${s}" alt="">`).join('')}
            <div class="story__nav"><button data-prev aria-label="Previous"></button><button data-next aria-label="Next"></button></div>
          </div>${footHTML(ev, 'Motion snippets · 37degree')}`;
      case 'slot':
        return `<div class="pop__body"><p class="meta" style="margin-bottom:6px">New event</p>
          <form class="invite">
            <input class="invite__title" name="title" value="Our launch × 37degree" aria-label="Event title">
            <label>When<select name="when"><option>This month</option><option selected>Next month</option><option>Next quarter</option><option>Just exploring</option></select></label>
            <label>What<select name="what"><option>Brand launch</option><option>Product design</option><option>Website</option><option>Something else</option></select></label>
            <label>Guests<span class="guests"><span class="pill">puru@37degr.ee</span><span class="pill">haneef@37degr.ee</span></span></label>
            <label>Notes<textarea name="notes" rows="3" placeholder="What are you building?"></textarea></label>
            <button class="btn btn--primary send" type="submit">Send invite</button>
          </form></div>${footHTML(ev, 'Opens in your email')}`;
    }
    return '';
  }

  function openPop(ev, el) {
    closeAll(true);
    pop.className = 'pop' + (ev.type === 'video' || ev.type === 'snippets' ? ' pop--wide' : '');
    pop.innerHTML = popHTML(ev);
    pop.setAttribute('aria-label', labelFor(ev));
    pop.hidden = false;
    el.classList.add('is-active');
    open = { kind: 'pop', ev, el, cleanup: null };
    placePop();
    requestAnimationFrame(() => pop.classList.add('is-in'));
    setOwner(...ownerOf(ev));
    markVisited(ev.id);

    if (ev.type === 'video') {
      const v = $('video', pop);
      v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
      open.cleanup = () => v.pause();
    }
    if (ev.type === 'snippets') open.cleanup = runStory($('.story', pop));
    if (ev.type === 'slot') {
      $('form', pop).addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const body = `Hi Puru & Haneef,\n\nWhat: ${f.get('what')}\nWhen: ${f.get('when')}\n\n${f.get('notes') || ''}\n`;
        location.href = `mailto:puru@37degr.ee?cc=haneef@37degr.ee&subject=${encodeURIComponent(f.get('title'))}&body=${encodeURIComponent(body)}`;
      });
    }
    const focusEl = $('.invite__title', pop) || $('[data-close]', pop);
    focusEl && focusEl.focus({ preventScroll: true });
  }

  function placePop() {
    if (!open || open.kind !== 'pop' || mq.matches) return;
    const r = open.el.getBoundingClientRect();
    if (r.right < 0 || r.left > innerWidth) return closeAll();
    const w = pop.offsetWidth, h = pop.offsetHeight, g = 12, tb = 64;
    let left;
    if (r.right + g + w < innerWidth - 12) { left = r.right + g; pop.style.transformOrigin = 'left top'; }
    else if (r.left - g - w > 12) { left = r.left - g - w; pop.style.transformOrigin = 'right top'; }
    else { left = clamp(r.left, 12, innerWidth - w - 12); pop.style.transformOrigin = 'center top'; }
    pop.style.left = `${left}px`;
    pop.style.top = `${clamp(r.top, tb + 12, innerHeight - h - 84)}px`;
  }

  function runStory(root) {
    const imgs = $$('img', root), bars = $$('.story__bars i', root);
    const dur = 2800;
    let i = 0, t;
    const show = (n) => {
      i = (n + imgs.length) % imgs.length;
      imgs.forEach((im, k) => im.classList.toggle('is-on', k === i));
      bars.forEach((b, k) => { b.className = k < i ? 'is-done' : k === i ? 'is-on' : ''; });
      const fill = $('b', bars[i]);
      fill.style.animation = 'none'; void fill.offsetWidth; fill.style.animation = '';
      clearTimeout(t);
      t = setTimeout(() => show(i + 1), dur);
    };
    $('[data-prev]', root).onclick = () => show(i - 1);
    $('[data-next]', root).onclick = () => show(i + 1);
    show(0);
    return () => clearTimeout(t);
  }

  /* ── Case study sheet ─────────────────────────────── */
  function daysHTML(d) {
    const n = d.total;
    return `<div class="days" style="--n:${n}">
      <div class="days__head">${Array.from({ length: n }, (_, i) => `<span>D${i + 1}<small>Day</small></span>`).join('')}</div>
      <div class="days__grid" style="grid-template-columns:repeat(${n}, 1fr)">${d.items.map((it, i) =>
        `<div class="days__bar is-in" style="grid-column:${it.from} / ${it.to + 1};animation-delay:${200 + i * 140}ms">${it.label}<span>Day ${it.from}–${it.to}</span></div>`).join('')}</div>
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
        ${C.logo ? `<img src="${C.logo}" alt="${C.client}">` : `<span class="client">${C.client}</span>`}
        <span class="pill">${C.duration}</span><span class="meta">${fmtRange(C.start, C.end)}</span>
        <button class="icon-btn x" data-close aria-label="Close case study">${icon.x}</button>
      </div>
      <div class="sheet__body">
        <div class="tags">${C.tags.map((t) => `<span class="pill">${t}</span>`).join('')}</div>
        <h1>${C.title}</h1>
        <p class="lede">${C.lede}</p>
        <dl class="metagrid">${C.meta.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}${live}</dl>
        <img class="cover" src="${C.cover}" alt="">
        ${C.blocks.map(blockHTML).join('')}
        <button class="sheet__next" data-case-next="${next.id}"><span><span class="meta">Next case · ${next.duration}</span><div class="t" style="margin-top:8px">${next.title}</div></span><span aria-hidden="true">→</span></button>
        <div class="sheet__cta"><span class="t">Your launch could be <em>next</em>.</span><a class="btn btn--primary" href="${MAIL}">Work with us!</a></div>
      </div>`;
  }

  // the screenshots leave their card and fan out beside the sheet
  const FAN = [{ x: -0.3, y: -0.46, r: -6 }, { x: 0.3, y: -0.08, r: 5 }, { x: -0.08, y: 0.46, r: -2 }];
  const REST = [-4, 3, 0];
  function flyOut(stackEl) {
    if (!stackEl || reduced.matches || mq.matches) return null;
    const sheetW = Math.min(760, innerWidth);
    const L = innerWidth - sheetW;
    if (L < 380) return null;
    const imgs = $$('img', stackEl);
    const tw = Math.min(400, L * 0.54);
    const cx = L / 2, cy = (innerHeight + 64) / 2;
    const anims = imgs.map((img, i) => {
      const r = img.getBoundingClientRect();
      const ow = img.offsetWidth, oh = img.offsetHeight;
      const ox = r.left + r.width / 2, oy = r.top + r.height / 2;
      const clone = img.cloneNode();
      Object.assign(clone.style, { left: `${ox - ow / 2}px`, top: `${oy - oh / 2}px`, width: `${ow}px`, height: `${oh}px` });
      flyLayer.appendChild(clone);
      const th = tw * (oh / ow);
      const f = FAN[i % FAN.length];
      const tx = cx + f.x * tw, ty = cy + f.y * th;
      const from = `translate(0px, 0px) scale(1) rotate(${REST[i]}deg)`;
      const to = `translate(${tx - ox}px, ${ty - oy}px) scale(${tw / ow}) rotate(${f.r}deg)`;
      return clone.animate([{ transform: from }, { transform: to }], { duration: 620, delay: i * 55, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
    });
    stackEl.classList.add('is-flown');
    return { stackEl, anims };
  }
  function flyBack(f, instant) {
    if (!f) return;
    const done = () => { flyLayer.innerHTML = ''; f.stackEl.classList.remove('is-flown'); };
    if (instant) return done();
    f.anims.forEach((a) => { a.updatePlaybackRate(1.25); a.reverse(); });
    Promise.all(f.anims.map((a) => a.finished)).then(done, done);
  }

  function openCase(id, section, srcEl, opts = {}) {
    const C = CASES[id];
    if (!C) return;
    closeAll(true);
    const caseCard = $(`.card--case[data-case="${id}"]`, mq.matches ? agenda : track);
    let stackEl = null;
    if (caseCard && !opts.noFly) {
      const r = caseCard.getBoundingClientRect();
      if (r.right > 0 && r.left < innerWidth) stackEl = $('.stack', caseCard);
    }
    sheet.innerHTML = sheetHTML(C);
    sheet.scrollTop = 0;
    sheet.hidden = false;
    scrim.hidden = false;
    const fly = flyOut(stackEl);
    requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('is-in'); sheet.classList.add('is-in'); }));
    // the bar slides over to sit under the fanned-out screens
    if (!mq.matches) bar.style.left = `${Math.max(150, (innerWidth - Math.min(760, innerWidth)) / 2)}px`;
    const src = srcEl || caseCard;
    src && src.classList.add('is-active');
    open = { kind: 'sheet', id, el: src, fly };
    setOwner(C.logo ? { logo: C.logo } : { mono: C.client[0] }, C.short);
    markVisited(caseCard && caseCard.dataset.id, srcEl && srcEl.dataset.id);
    history.replaceState(null, '', `${location.pathname}${location.search}#work/${id}`);
    $('[data-close]', sheet).focus({ preventScroll: true });
    if (section) {
      setTimeout(() => {
        const sec = $(`#sec-${section}`, sheet);
        if (!sec) return;
        sec.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
        sec.classList.add('is-target');
      }, 420);
    }
  }

  function closeAll(instant) {
    if (!open) return;
    const o = open;
    open = null;
    o.el && o.el.classList.remove('is-active');
    o.cleanup && o.cleanup();
    clearOwner();
    if (o.kind === 'pop') {
      pop.classList.remove('is-in');
      const hide = () => { if (!open || open.kind !== 'pop') { pop.hidden = true; pop.innerHTML = ''; } };
      instant ? hide() : setTimeout(hide, 180);
    } else {
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
  }

  /* ── Events ───────────────────────────────────────── */
  document.addEventListener('pointerdown', (e) => {
    if (open && open.kind === 'pop' && !pop.contains(e.target) && !(open.el && open.el.contains(e.target)) && !bar.contains(e.target)) closeAll();
  });

  document.addEventListener('click', (e) => {
    const t = e.target;
    const goBtn = t.closest('[data-go]');
    if (goBtn) { closeAll(); return go(goBtn.dataset.go); }
    const v = t.closest('[data-view]');
    if (v) return setView(v.dataset.view);
    const z = t.closest('[data-zoom]');
    if (z) { const i = clamp(VIEWS.indexOf(view) + Number(z.dataset.zoom), 0, VIEWS.length - 1); return setView(VIEWS[i]); }
    if (t.closest('[data-close]')) return closeAll();
    if (t === scrim) return closeAll();
    const nextBtn = t.closest('[data-case-next]');
    if (nextBtn) {
      const id = nextBtn.dataset.caseNext;
      closeAll(true);
      if (!mq.matches) scrollToDate(CASES[id].start, false);
      return requestAnimationFrame(() => openCase(id));
    }
    const caseBar = t.closest('[data-case-bar]');
    if (caseBar) return dragMoved || openCase(caseBar.dataset.caseBar);
    const card = t.closest('button.card');
    if (!card || dragMoved) return;
    const ev = BY_ID[card.dataset.id];
    if (open && open.el === card) return closeAll();
    if (ev.type === 'case') return openCase(ev.case, null, card);
    if (ev.case) return openCase(ev.case, ev.section, card);
    openPop(ev, card);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) { e.preventDefault(); closeAll(); }
  });

  addEventListener('resize', () => {
    if (open && open.kind === 'sheet' && open.fly) { flyBack(open.fly, true); open.fly = null; }
    if (!mq.matches) { layoutOverlays(); placePop(); }
    syncSeg();
  });
  mq.addEventListener('change', () => { if (mq.matches && view === 'months') view = 'days'; render(); });

  /* ── Boot ─────────────────────────────────────────── */
  render();
  document.fonts && document.fonts.ready.then(() => {
    syncSeg();
    if (!mq.matches) layoutOverlays();
    requestAnimationFrame(() => seg.classList.add('is-ready'));
  });
  function fromHash() {
    const m = location.hash.match(/^#work\/(\w+)/);
    if (!m || !CASES[m[1]] || (open && open.id === m[1])) return;
    closeAll(true);
    if (!mq.matches) scrollToDate(CASES[m[1]].start, false);
    setTimeout(() => openCase(m[1]), 250);
  }
  addEventListener('hashchange', fromHash);
  fromHash();
})();
