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
  const VIEWS = ['projects', 'timeline', 'months'];
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
  const side = $('.side');
  const stripFilters = $('.strip__filters');

  if (new URLSearchParams(location.search).has('draft')) document.body.classList.add('draft');

  /* ── Data ─────────────────────────────────────────── */
  // content comes from the Notion "Website calendar" via js/cms.js; data.js EVENTS is the offline fallback
  const normalize = (ev) => (ev.type === 'step' && ev.section === 'video' && CASES[ev.case] && CASES[ev.case].video
    ? { ...ev, type: 'video', src: CASES[ev.case].video, poster: CASES[ev.case].cover } : ev);
  const SOURCE = window.CMS && window.CMS.events && window.CMS.events.length ? window.CMS.events : EVENTS;
  const ALL = [...SOURCE.map(normalize), { id: 'open-slot', date: TODAY, type: 'slot', row: 2, span: new URLSearchParams(location.search).has('folders') ? 4 : 3, highlight: true, title: 'this slot is open' }]
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
    // Phosphor
    arrow: '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M224.49,136.49l-72,72a12,12,0,0,1-17-17L187,140H40a12,12,0,0,1,0-24H187L135.51,64.48a12,12,0,0,1,17-17l72,72A12,12,0,0,1,224.49,136.49Z"/></svg>',
    note: '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,160l-56,56V160Z" opacity="0.2"/><path d="M88,96a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H96A8,8,0,0,1,88,96Zm8,40h64a8,8,0,0,0,0-16H96a8,8,0,0,0,0,16Zm32,16H96a8,8,0,0,0,0,16h32a8,8,0,0,0,0-16ZM224,48V156.69A15.86,15.86,0,0,1,219.31,168L168,219.31A15.86,15.86,0,0,1,156.69,224H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32H208A16,16,0,0,1,224,48ZM48,208H152V160a8,8,0,0,1,8-8h48V48H48Zm120-40v28.7L196.69,168Z"/></svg>',
    folder: '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M224,88V200.89a7.11,7.11,0,0,1-7.11,7.11H40a8,8,0,0,1-8-8V64a8,8,0,0,1,8-8H93.33a8,8,0,0,1,4.8,1.6L128,80h88A8,8,0,0,1,224,88Z" opacity="0.2"/><path d="M216,72H130.67L102.93,51.2a16.12,16.12,0,0,0-9.6-3.2H40A16,16,0,0,0,24,64V200a16,16,0,0,0,16,16H216.89A15.13,15.13,0,0,0,232,200.89V88A16,16,0,0,0,216,72Zm0,128H40V64H93.33L123.2,86.4A8,8,0,0,0,128,88h88Z"/></svg>',
    card: '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M224,56V200a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V56a8,8,0,0,1,8-8H216A8,8,0,0,1,224,56Z" opacity="0.2"/><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM80,84A12,12,0,1,1,68,72,12,12,0,0,1,80,84Zm40,0a12,12,0,1,1-12-12A12,12,0,0,1,120,84Z"/></svg>',
    x: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="m2 2 8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    play: '<svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1.2v7.6L8.6 5z" fill="currentColor"/></svg>',
    plus: '<svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M1 6h10M6 1v10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  };

  /* ── Cards ────────────────────────────────────────── */
  // notes are sticky notes: each kind gets its own pastel (an event can set `color` to override)
  const TINT = { note: 'yellow', person: 'blue', testimonial: 'pink', milestone: 'green', logos: 'purple', snippets: 'orange' };
  // with folders on, the work lives in folders, so what's left of it (moments, steps, milestones) reads as notes too
  const workNote = (ev) => FOLDERS && isWork(ev) && !isFolder(ev);
  const tintOf = (ev) => (workNote(ev) ? `tint-${ev.color || (ev.type === 'milestone' ? 'green' : 'yellow')}`
    : isWork(ev) || !TINT[ev.type] ? '' : `tint-${ev.color || TINT[ev.type]}`);
  const DEFAULT_SPAN = { note: 2, milestone: 2, quote: 2, person: 2, case: 4, step: 2, testimonial: 2, video: 2, logos: 2, snippets: 3, slot: 3, project: 2, moment: 2 };
  const tagsHTML = (ev) => (ev.services && ev.services.length ? `<div class="tags">${ev.services.map((s) => `<span class="pill">${s}</span>`).join('')}</div>` : '');

  // logos are drawn as masks in the surrounding text colour, sized so wide wordmarks and square marks feel equal
  const LOGO_BY_SRC = Object.fromEntries(LOGOS.map((l) => [l.src, l]));
  function logoHTML(src, base, label) {
    const l = LOGO_BY_SRC[src] || { ar: 4, name: label || '' };
    return maskLogo(src, l, Math.round(base * clamp(Math.sqrt(3.5 / l.ar), 0.62, 1.5)), label);
  }
  function maskLogo(src, l, h, label) {
    // absolute URL: a url() inside a custom property resolves against the stylesheet, not the page
    const abs = new URL(src, document.baseURI).href;
    return `<i class="logo" role="img" aria-label="${label || l.name}" style="--src:url('${abs}');--ar:${l.ar};height:${h}px"></i>`;
  }
  // wall logos use their hand-set height, so the letters match from logo to logo
  const evenLogo = (l, scale = 1) => maskLogo(l.src, l, Math.round((l.h || 16) * scale));
  // the last print in the DOM sits on top, so reverse: the first photo shows first, same as the open deck
  const prints = (ev) => (ev.photos ? `<div class="stack">${ev.photos.slice(0, 3).reverse().map((s) => `<img src="${s}" alt="" loading="lazy">`).join('')}</div>` : '');

  // work becomes glass folders with the project's screens peeking out of the top,
  // tinted from the work itself; the open slot is an empty folder waiting for yours
  const FOLDERS = !new URLSearchParams(location.search).has('cards'); // v3: folders by default, ?cards for the white cards
  if (FOLDERS) document.body.classList.add('use-folders');
  const isFolder = (ev) => FOLDERS && (ev.type === 'case' || ev.type === 'slot' || (ev.type === 'project' && ev.photos));
  // the client on the folder: the symbol from their logo if we have one (a client whose name starts with it), else their initial
  function clientAvatar(client) {
    const l = LOGOS.find((x) => x.mk && client.toLowerCase().startsWith(x.match || x.name.split(' ')[0].toLowerCase()));
    if (!l) return `<span class="fold__av">${client.trim()[0] || '·'}</span>`;
    const abs = new URL(l.src, document.baseURI).href;
    return `<span class="fold__av"><i class="fold__mk" role="img" aria-label="${l.name}" style="--src:url('${abs}');--mk:${l.mk}"></i></span>`;
  }
  function folderHTML({ papers = [], pill = '', name = '', title, sub, empty }) {
    const tint = papers[0] ? ` data-tint="${papers[0]}"` : '';
    const who = name ? `<span class="fold__who">${clientAvatar(name)}<span class="fold__av fold__av--us"><img src="assets/img/mark.svg" alt="37degree"></span></span>` : '';
    return `<div class="fold${empty ? ' fold--empty' : ''}"${tint}>
        <i class="fold__back"></i>
        <div class="fold__papers">${papers.slice(0, 3).map((src) => `<img src="${src}" alt="" loading="lazy">`).join('')}</div>
        <div class="fold__front"><i class="fold__glass"></i>${empty ? `<span class="plus">${icon.plus}</span>` : ''}${who}${pill ? `<span class="fold__pill">${pill}</span>` : ''}</div>
      </div>
      <div class="fold__label"><div class="card__title">${title}</div><div class="card__date">${sub}</div></div>`;
  }

  function cardHTML(ev) {
    const p = parse(ev.date);
    const date = `<div class="card__date">${p.d} ${MONTHS[p.m - 1]}</div>`;
    const work = isWork(ev);
    let inner = '';
    if (isFolder(ev)) {
      const when = `${p.d} ${MONTHS[p.m - 1]}`;
      if (ev.type === 'case') {
        const C = CASES[ev.case];
        inner = folderHTML({ papers: C.stack || [C.cover], pill: C.duration, name: C.client, title: C.title, sub: `${C.client} · ${when}` });
      } else if (ev.type === 'project') {
        inner = folderHTML({ papers: ev.photos, pill: ev.end ? durationOf(ev.date, ev.end) : '', name: ev.client || '', title: ev.title, sub: [ev.client, when].filter(Boolean).join(' · ') });
      } else inner = folderHTML({ empty: true, title: ev.title, sub: 'Your launch · pick a week' });
    } else switch (ev.type) {
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
        inner = `<q>${T.quote}</q><div class="by"><span class="avatar">${T.img ? `<img src="${T.img}" alt="">` : T.name[0]}</span><span><b>${T.name}</b>${T.role ? ` · ${T.role}` : ''}</span></div>`;
        break;
      }
      case 'logos':
        inner = `<div><div class="card__title">${ev.title}</div>${date}</div><div class="logos">${LOGOS.slice(0, 3).map((l) => evenLogo(l, 0.8)).join('')}</div>`;
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
    const cls = ['card', kind, tintOf(ev), `card--${ev.type}`, ev.type === 'project' && 'card--case', isFolder(ev) && 'card--folder', workNote(ev) && 'work-card--note', ev.photos && !isFolder(ev) && 'has-photos', visited.has(ev.id) && 'is-visited', ev.tbc && 'is-tbc'].filter(Boolean).join(' ');
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
  // a client comes for the work, so the work opens first; ?view=timeline links straight to the story
  const asked = new URLSearchParams(location.search).get('view');
  let view = VIEWS.includes(asked) ? asked : 'projects';

  function columnsFor(v) {
    const list = v === 'timeline' ? ALL.filter((e) => e.highlight) : ALL;
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
      // a busy day gets a wider column, so its cards stay full size side by side
      if (lanes > 1) style = ` style="flex-basis:${(view === 'timeline' ? 320 : 280) * lanes}px"`;
      body = `<div class="col-body"${gridCols}>${items.map((it) => {
        const colPos = lanes > 1 ? (it.solo ? '1 / -1' : `${it.lane + 1}`) : '1';
        return cardHTML(it.ev).replace(/^<(\w+) /, `<$1 style="grid-row:${it.row} / span ${it.span};grid-column:${colPos}" `);
      }).join('')}</div>`;
    }
    const cls = ['col', c.isMonth && 'is-month', view === 'timeline' && 'is-highlight', c.isToday && 'col--today'].filter(Boolean).join(' ');
    return `<section class="${cls}" data-date="${c.date}" data-end="${c.end}"${style}>
      ${c.isToday ? '<span class="nowline" aria-hidden="true"></span>' : ''}
      <div class="col-head">${head}</div>${body}</section>`;
  }

  const introCopy = `<h1>Our story, <em>by the day</em>.</h1>
    <p>37degree is a design-led growth studio for Tech &amp; AI companies. Notes are how we got here. Work is what we've shipped.</p>
    <div class="legend"><span>${icon.note}Notes</span><span>${FOLDERS ? icon.folder : icon.card}Work</span></div>`;

  function outroHTML() {
    const row = (P) => `<a href="${P.links[0].href}"><span class="avatar avatar--md">${P.mono}</span><span><b>${P.links[0].label}</b><span>${P.role}</span></span></a>`;
    return `<div class="outro">
      <h2>This could be the start of something incredibly <em>special</em>.</h2>
      <div class="outro__go"><a class="btn outro__cta" href="${MAIL}">Work with us ${icon.arrow}</a>${moreHTML()}</div>
      <div class="who">${row(PEOPLE.puru)}${row(PEOPLE.haneef)}</div>
      <small><a href="https://x.com/madebypuru" target="_blank" rel="noopener">X</a> · <a href="https://www.linkedin.com/company/107024182" target="_blank" rel="noopener">LinkedIn</a> · © ${now.getFullYear()} 37degree</small>
    </div>`;
  }

  /* ── The sidebar: who we are, the way in, who trusts us ── */
  // one line that scrolls forever, so 6 logos or 15 take the same room. Two copies make the loop seamless;
  // the duration comes from the strip's length, so the speed stays the same however many logos there are
  const LOGO_GAP = 28, LOGO_SPEED = 20; // px, px per second
  const TRUSTED = LOGOS.filter((l) => !l.avatarOnly);
  // two rows drifting opposite ways, each at the same speed however many logos it holds
  function logoRow(list, reverse) {
    const set = list.map((l) => evenLogo(l)).join('');
    const length = list.reduce((sum, l) => sum + l.ar * (l.h || 16) + LOGO_GAP, 0);
    return `<div class="marquee${reverse ? ' marquee--rev' : ''}" style="--gap:${LOGO_GAP}px;--dur:${Math.round(length / LOGO_SPEED)}s">
        <div class="marquee__track"><div class="marquee__set">${set}</div><div class="marquee__set" aria-hidden="true">${set}</div></div>
      </div>`;
  }
  function logosHTML() {
    return `<span class="side__label">Trusted by</span>
      <div class="marquees">${logoRow(TRUSTED.filter((_, i) => i % 2 === 0))}${logoRow(TRUSTED.filter((_, i) => i % 2), true)}</div>`;
  }
  const statement = 'Design-led growth for Tech &amp; AI <em>companies</em>.';
  // what the sidebar stands on: two numbers and a client in their own words, all from the calendar's cards
  const PROOF = ALL.filter((e) => e.type === 'milestone' && ['$1M+', '50+'].includes(e.metric));
  const SIDE_QUOTE = ALL.find((e) => e.type === 'testimonial' && e.who && e.who.name === 'Sudhanshu');
  // the sidebar in two halves: the pitch up top with room to breathe, and everything that backs it up together at the foot
  const proofHTML = () => `<div class="side__proof">
      ${SIDE_QUOTE ? `<div class="side__peek">${cardHTML(SIDE_QUOTE)}</div>` : ''}
      <div class="side__pocket">
        <dl class="side__stats">${PROOF.map((e) => `<div><dt>${strip(e.title)}</dt><dd>${e.metric}</dd></div>`).join('')}</dl>
        <div class="side__trust">${logosHTML()}</div>
      </div>
    </div>`;
  function sideHTML() {
    const story = `<p>Our story, by the day. Notes are how we got here. Work is what we've shipped.</p><div class="legend"><span>${icon.note}Notes</span><span>${FOLDERS ? icon.folder : icon.card}Work</span></div>`;
    return `<div class="side__top">
        <h1>${statement}</h1>
        <a class="btn side__cta" href="${MAIL}">Work with us ${icon.arrow}</a>
      </div>
      ${view === 'projects' ? '' : `<div class="side__mid">${story}</div>`}
      ${proofHTML()}`;
  }

  /* ── Projects: the work on the calendar, nothing to click to see it ── */
  // the sort of work a client looks for; each gathers the services set on a card
  const FILTERS = [
    { id: 'selected', label: 'Selected work' },
    { id: 'all', label: 'All work' },
    { id: 'case', label: 'Case studies' },
    { id: 'web', label: 'Websites', tags: ['Website'] },
    { id: 'brand', label: 'Branding', tags: ['Branding', 'Naming', 'Strategy'] },
    { id: 'video', label: 'Video &amp; motion', tags: ['Video', 'Motion'] },
    { id: 'product', label: 'Product &amp; web apps', tags: ['Product design', 'Web app'] },
    { id: 'campaign', label: 'Campaigns &amp; events', tags: ['Campaign', 'Event', 'Print'] },
    { id: 'deck', label: 'Pitch decks', tags: ['Pitch deck'] },
  ];
  // the long-form case studies live in the site code, so their services do too
  const CASE_TAGS = { kampanion: ['Product design'], sidecar: ['Branding', 'Website', 'Event', 'Print', 'Video'], deccan: ['Website'] };
  // "Omnipair: an OKLCH brand system" under the name Omnipair only needs the second half
  function workTitle(title, client) {
    const t = strip(title), at = t.indexOf(': ');
    const head = t.slice(0, at).toLowerCase(), first = client.toLowerCase().split(/[\s,·]/)[0];
    if (at < 0 || !head.startsWith(first) || head.includes('×')) return t;
    const rest = t.slice(at + 2);
    return rest[0].toUpperCase() + rest.slice(1);
  }
  // the first thing shown takes centre stage, so highlighted films and case studies lead, then other highlights, newest first
  const rank = (w) => (w.ev.highlight ? (w.clip || w.isCase ? 2 : 1) : 0);
  const PROJECTS = ALL.flatMap((ev) => {
    if (ev.type === 'case') {
      const C = CASES[ev.case];
      return [{ ev, client: C.client, title: strip(C.title), tags: CASE_TAGS[ev.case] || [], pics: C.stack, isCase: true }];
    }
    if (ev.type !== 'project' && ev.type !== 'moment') return [];
    const clip = ev.clips && ev.clips[0];
    // stills only dress a clip, and assets/img/mock holds stand-ins that aren't our work, so neither earns a tile of its own
    const pics = (ev.photos || []).filter((s) => !s.includes('/img/mock/'));
    if (!clip && !pics.length) return [];
    const client = ev.client || '37degree';
    return [{ ev, client, title: workTitle(ev.title, client), tags: ev.services || [], clip, pics: clip ? pics : pics.filter((s) => !/-still\.jpg$/.test(s)), poster: pics.find((s) => /-still\.jpg$/.test(s)) }];
  }).sort((a, b) => rank(b) - rank(a) || (a.ev.date < b.ev.date ? 1 : -1));

  // Projects opens on a short, edited cut with a visible end, so nobody feels they're scrolling forever
  let filter = 'selected';
  const inFilter = (f, w) => f.id === 'all' || (f.id === 'selected' ? !!w.ev.highlight : f.id === 'case' ? w.isCase : w.tags.some((t) => f.tags.includes(t)));
  // on desktop the filters fold into one quiet menu, so the work has the screen to itself
  const filterMenuHTML = () => `<button class="fmenu__btn" aria-expanded="false" aria-haspopup="true"><span>${FILTERS.find((f) => f.id === filter).label}</span><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="fmenu__list" hidden>${filtersHTML()}</div>`;
  function filtersHTML() {
    return `<div class="filters" role="group" aria-label="Filter the work">${FILTERS.map((f) => {
      const n = PROJECTS.filter((w) => inFilter(f, w)).length;
      return n ? `<button class="filter" data-filter="${f.id}" aria-pressed="${f.id === filter}">${f.label}</button>` : '';
    }).join('')}</div>`;
  }

  // what sits under the work: public facts about the client when we have them (who backs them, what they raised), else what we did
  // stand-in facts live in a git-ignored file that only localhost loads, so they can't reach the live site or its source
  function factsOf(w) {
    const facts = [...(w.ev.facts || []), ...((window.DUMMY_FACTS || {})[w.ev.id] || [])];
    // two at most: this is a line to glance at, and the sheet can hold the rest
    return facts.length ? facts.slice(0, 2) : w.tags.length ? [{ label: 'Scope', value: w.tags.slice(0, 2).join(', ') }] : [];
  }
  // one project at a time, centre stage: who it's for above the work, then the facts and how to open it below
  function tileHTML(w, i) {
    const media = w.clip
      ? `<video src="${w.clip}" ${w.poster ? `poster="${w.poster}"` : ''} muted loop playsinline preload="metadata"></video>`
      : w.pics.slice(0, 3).map((src) => `<img src="${src}" alt="" loading="lazy">`).join('');
    return `<button class="wk${w.isCase ? ' wk--case' : ''}" style="--i:${Math.min(i, 3)}" data-open-id="${w.ev.id}" aria-label="${w.client}: ${w.title}">
        <span class="wk__who">${clientAvatar(w.client)}<b>${w.client}</b></span>
        <span class="wk__m">${media}</span>
        <span class="wk__cap"><span class="wk__about"><span class="wk__title">${w.title}</span><span class="wk__open"><span>${w.isCase ? 'Read case study' : 'View project'}</span><i>${icon.arrow}</i></span></span><span class="wk__figs">${factsOf(w).map((f) => `<span class="wk__fig"><i>${f.label}</i><b>${f.value}</b></span>`).join('')}</span></span>
      </button>`;
  }
  const filtered = () => PROJECTS.filter((w) => inFilter(FILTERS.find((x) => x.id === filter), w));
  // the personality from the timeline: every third project has a sticky note beside it, a client's words then a bit of our story
  const QUOTES = ALL.filter((e) => e.type === 'testimonial' && e !== SIDE_QUOTE);
  const STORY = ALL.filter((e) => e.type === 'note' && e.highlight);
  function stickyFor(i) {
    if ((filter !== 'selected' && filter !== 'all') || i % 3 !== 1) return '';
    const n = (i - 1) / 3, list = n % 2 ? STORY : QUOTES, ev = list[Math.floor(n / 2) % (list.length || 1)];
    return ev ? `<div class="sticky">${cardHTML(ev)}</div>` : '';
  }
  // posters and square posts don't crop into a landscape tile, so they sit side by side; screens and films fill it
  const wallClips = new IntersectionObserver((entries) => entries.forEach(({ target, isIntersecting }) => {
    if (isIntersecting && !reduced.matches) target.play().catch(() => {}); else target.pause();
  }), { threshold: 0.35 });
  function shapeBlocks(root) {
    $$('.wk__m', root).forEach((m) => {
      const v = $('video', m);
      if (v) return wallClips.observe(v);
      const img = $('img', m);
      const shape = () => m.classList.toggle('is-set', img.naturalHeight > img.naturalWidth * 0.8);
      img.complete && img.naturalWidth ? shape() : img.addEventListener('load', shape, { once: true });
    });
  }
  const moreHTML = () => (view === 'projects' && filter === 'selected' ? `<button class="wall__more" data-filter="all">See all ${PROJECTS.length} projects ${icon.arrow}</button>` : '');
  function renderProjects() {
    track.innerHTML = filtered().map((w, i) => {
      const key = w.ev.date.slice(0, 7);
      return `<section class="col col--wall" data-date="${key}-01" data-end="${key}-31">
        <div class="col-head">${clientAvatar(w.client)}<b>${w.client}</b></div>
        <div class="slide">${tileHTML(w, i)}${stickyFor(i)}</div>
      </section>`;
    }).join('') + `<section class="col col--end"><div class="col-head"></div><div class="slide"><div class="wall__end">${outroHTML()}</div></div></section>`;
    slideIx = 0;
    syncCount();
    shapeBlocks(track);
    buildMinimap();
  }
  function agendaProjectsHTML() {
    return `<div class="ag-intro"><h1>${statement}</h1></div>${filtersHTML()}<div class="ag-wall">${filtered().map((w, i) => tileHTML(w, i) + stickyFor(i)).join('')}</div><div class="ag-logos">${logosHTML()}</div><div class="ag-outro">${outroHTML()}</div>`;
  }
  function setFilter(id) {
    filter = id;
    if (mq.matches) { agenda.innerHTML = agendaProjectsHTML(); return shapeBlocks(agenda); }
    renderProjects();
    timeline.scrollLeft = 0;
    stripFilters.innerHTML = filterMenuHTML();
  }

  /* ── Render ───────────────────────────────────────── */
  function render() {
    closeAll(true);
    document.body.dataset.showing = view;
    if (mq.matches) return renderAgenda();
    side.innerHTML = sideHTML();
    stripFilters.innerHTML = view === 'projects' ? filterMenuHTML() : '';
    if (view === 'projects') { renderProjects(); return syncBar(); }
    track.innerHTML =
      columnsFor(view).map((c, i) => colHTML(c, i)).join('') +
      `<section class="col col--end"><div class="col-head"></div>${outroHTML()}</section>`;
    layoutBars();
    syncBar();
    buildMinimap();
  }

  function layoutBars() {
    $$('.allday-bar', track).forEach((b) => b.remove());
    if (view !== 'months') return;
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
    if (view === 'projects') { agenda.innerHTML = agendaProjectsHTML(); agenda.scrollTop = 0; shapeBlocks(agenda); return syncBar(); }
    const list = view === 'timeline' ? ALL.filter((e) => e.highlight) : ALL;
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
    agenda.innerHTML = html + `<div class="ag-logos">${logosHTML()}</div><div class="ag-outro">${outroHTML()}</div>`;
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
      if (c.querySelector('.card--case, .wk--case')) return `<i class="is-case" style="left:${x}px"></i>`;
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
    requestAnimationFrame(() => { ticking = false; updateMinimap(); followScroll(); });
  });

  /* ── The side panel gets out of the way ───────────── */
  // scrolling forward slides it off and the work runs under it; scrolling back or reaching for the left edge brings it over the work
  const SIDE_W = () => side.offsetWidth;
  let sideLast = 0, sideIdle = 0;
  function showSide() {
    document.body.classList.remove('side-hidden');
    side.classList.toggle('is-over', timeline.scrollLeft > 8);
  }
  function hideSide() {
    if (side.matches(':hover, :focus-within')) return;
    document.body.classList.add('side-hidden');
    side.classList.remove('is-over');
    settleSide();
  }
  // never rest on the empty strip the panel left: finish the move so the work sits against the edge
  function settleSide() {
    clearTimeout(sideIdle);
    sideIdle = setTimeout(() => {
      if (drag || !document.body.classList.contains('side-hidden')) return;
      if (timeline.scrollLeft < SIDE_W()) timeline.scrollTo({ left: SIDE_W(), behavior: reduced.matches ? 'auto' : 'smooth' });
    }, 160);
  }
  timeline.addEventListener('scroll', () => {
    if (mq.matches) return;
    const x = timeline.scrollLeft, dx = x - sideLast;
    if (x <= 8) { sideLast = x; return showSide(); }
    if (document.body.classList.contains('side-hidden')) settleSide();
    if (Math.abs(dx) < 6) return;
    sideLast = x;
    if (dx > 0) hideSide(); else showSide();
  }, { passive: true });
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' && e.clientX <= 20 && e.clientY > 44 && document.body.classList.contains('side-hidden')) showSide();
  });
  side.addEventListener('pointerleave', () => { if (timeline.scrollLeft > 8 && !open) hideSide(); });
  side.addEventListener('focusin', showSide);

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
    if (view === 'projects') return; // newest first, and the sheet opens over wherever you are
    const cols = $$('.col[data-date]', track);
    const col = cols.find((c) => c.dataset.end >= date) || cols[cols.length - 1];
    if (col) timeline.scrollLeft = Math.max(0, col.offsetLeft - 40);
  }

  /* ── Projects scroll freely; the arrows are a shortcut, and the counter follows along ── */
  let slideIx = 0, steppingUntil = 0;
  const slides = () => $$('.col--wall, .col--end', track);
  // always say how far along you are, so the end is in sight
  function syncCount() {
    const last = slides().length - 1;
    $('.dyn-count').textContent = `${Math.min(slideIx + 1, last)} / ${last}`;
    $('[data-step="-1"]').disabled = slideIx === 0;
    $('[data-step="1"]').disabled = slideIx === last;
  }
  function goSlide(i, smooth = true) {
    const list = slides();
    slideIx = clamp(i, 0, list.length - 1);
    steppingUntil = Date.now() + 800;
    syncCount();
    const el = list[slideIx];
    // the first sits beside the panel; the rest stop dead centre
    const left = slideIx === 0 ? 0 : el.offsetLeft - (timeline.clientWidth - el.offsetWidth) / 2;
    timeline.scrollTo({ left, behavior: smooth && !reduced.matches ? 'smooth' : 'auto' });
  }
  function followScroll() {
    if (view !== 'projects' || mq.matches || Date.now() < steppingUntil) return;
    const mid = timeline.scrollLeft + timeline.clientWidth / 2, list = slides();
    const dist = (el) => Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
    const at = timeline.scrollLeft <= 8 ? 0 : list.indexOf(list.reduce((a, b) => (dist(b) < dist(a) ? b : a)));
    if (at !== slideIx && at >= 0) { slideIx = at; syncCount(); }
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
  addEventListener('pointerup', () => {
    drag = null; document.body.style.cursor = ''; setTimeout(() => (dragMoved = false), 0);
  });

  timeline.addEventListener('keydown', (e) => {
    if (e.target !== timeline) return;
    const by = { ArrowRight: 280, ArrowLeft: -280 }[e.key];
    if (by && view === 'projects') { e.preventDefault(); return goSlide(slideIx + Math.sign(by)); }
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
    const anchorCol = !mq.matches && view !== 'projects' && v !== 'projects' && timeline.scrollLeft > 200
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
    bar.className = ['dynbar', tint, bar.classList.contains('is-tucked') && 'is-tucked'].filter(Boolean).join(' ');
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
        return `<div class="note__body">${when}<h3>Team trusted by the likes of</h3><div class="logo-grid">${LOGOS.map((l) => `<div>${evenLogo(l)}</div>`).join('')}</div></div>${footHTML(ev)}`;
      case 'snippets':
        return `<div class="story">
            <div class="story__bars">${SNIPPETS.map(() => '<i><b></b></i>').join('')}</div>
            ${SNIPPETS.map((s) => `<figure class="story__f" style="--src:url('${new URL(s, document.baseURI).href}')"><img src="${s}" alt=""></figure>`).join('')}
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

  // where the centred note would sit, scaled down evenly to the size of a button: same shape, just smaller and elsewhere
  function pillTransform(r) {
    const to = note.getBoundingClientRect();
    const sc = Math.max(0.08, r.width / to.width);
    const dx = r.left + r.width / 2 - (to.left + to.width / 2), dy = r.top + r.height / 2 - (to.top + to.height / 2);
    return `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${sc})`;
  }
  // where the note sits when it is still the card: scaled to the card's width, top edges together,
  // cropped to the card's height. The text is real the whole way, so nothing pops in.
  function cardState(r) {
    const n = note.getBoundingClientRect(), s = r.width / n.width;
    const dx = r.left - (n.left + n.width / 2) + (s * n.width) / 2, dy = r.top - (n.top + n.height / 2) + (s * n.height) / 2;
    const cut = Math.max(0, n.height - r.height / s);
    return { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${s})`, clipPath: `inset(0 0 ${cut}px 0 round ${16 / s}px)` };
  }
  // the clip opens past the edges at the end so the note's shadow is there as it lands
  const noteState = () => ({ transform: 'translate(-50%, -50%)', clipPath: 'inset(-80px -80px -80px -80px round 24px)' });
  const rectKeys = (r, radius) => ({ left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, borderRadius: radius });

  function openNote(ev, el) {
    // measure the source first: opening swaps the bar's buttons for the owner pill, which would hide a bar button
    const fromRect = el.getBoundingClientRect();
    const pill = el.matches('.dyn-cta, .side__cta, .outro__cta'); // from "Work with us": grow out of the pill, fade back into it
    closeAll(true);
    note.style.transform = note.style.transition = focusEl.style.opacity = '';
    const tint = tintOf(ev);
    note.className = ['note', ev.type === 'snippets' && 'note--story', tint].filter(Boolean).join(' ');
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
    else if (pill) {
      // from "Work with us": the card itself, already in its final shape, grows out of the button and moves into place
      note.classList.add('is-in');
      note.animate([{ transform: pillTransform(fromRect), opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: 'translate(-50%, -50%)', opacity: 1 }],
        { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
    } else {
      // the card itself grows into the note, words and all
      note.classList.add('is-growing', 'is-in');
      el.classList.add('is-lifted');
      // the prints peeking out of the card fly up into the deck
      const landed = ev.photos ? flyPrints(el) : null;
      if (landed) setTimeout(landed, 980);
      const grow = () => note.classList.remove('is-growing');
      note.animate([cardState(fromRect), noteState()], { duration: 460, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }).finished.then(grow, grow);
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

  // a card coming back from a note settles into place with a small rise instead of popping back
  function land(el) {
    if (!el.classList.contains('is-lifted')) return;
    el.classList.remove('is-lifted');
    el.classList.add('is-back');
    setTimeout(() => el.classList.remove('is-back'), 450);
  }
  function closeNote(o, instant) {
    o.cleanup && o.cleanup();
    focusEl.classList.remove('is-in');
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (!open || open.el !== o.el) land(o.el);
      if (open && open.kind === 'note') return;
      note.getAnimations().forEach((a) => a.cancel());
      note.hidden = true; note.innerHTML = ''; note.classList.remove('is-in', 'is-ghosting', 'is-growing');
      ghost.hidden = true; focusEl.hidden = true;
    };
    if (instant || reduced.matches || !document.contains(o.el)) return finish();
    if (o.el.matches('.dyn-cta, .side__cta, .outro__cta')) {
      // back into "Work with us": the same card shrinks and moves back, content and all
      const r = o.el.getBoundingClientRect();
      if (!r.width) return finish();
      note.animate([{ transform: 'translate(-50%, -50%)', opacity: 1 }, { opacity: 1, offset: 0.7 }, { transform: pillTransform(r), opacity: 0 }],
        { duration: 420, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).finished.then(finish, finish);
      setTimeout(finish, 700);
      return;
    }
    // the note shrinks back into its card, words still on it; the card fades up underneath as it lands
    const r = o.el.getBoundingClientRect();
    if (!r.width || r.right < 0 || r.left > innerWidth) return finish();
    note.getAnimations().forEach((a) => a.cancel());
    note.animate([{ ...noteState(), opacity: 1 }, { opacity: 1, offset: 0.65 }, { ...cardState(r), opacity: 0 }],
      { duration: 420, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).finished.then(finish, finish);
    setTimeout(() => { if (!open || open.el !== o.el) land(o.el); }, 230);
    setTimeout(finish, 700);
    o.el.focus({ preventScroll: true });
  }

  function runStory(root) {
    const imgs = $$('.story__f', root), bars = $$('.story__bars i', root);
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

  /* ── Work: a sheet of paper slid up from the bottom ── */
  // set in the calendar's own type: card dates, white work cards, the pink testimonial note
  const MARK = '<svg viewBox="140 140 560 560" width="14" height="14" aria-hidden="true"><path fill="#FF3600" d="M172.635 281.507c-15.807 0-28.621 12.79-28.621 28.568v80.357c0 15.778 12.814 28.568 28.621 28.568h80.25c15.808 0 28.622-12.79 28.622-28.568V281.507zm137.494-137.493c-15.808 0-28.622 12.79-28.622 28.568v108.925H419V144.014zm137.493 412.479c-15.807 0-28.622 12.791-28.622 28.569v80.356c0 15.778 12.815 28.569 28.622 28.569h80.25c15.807 0 28.622-12.791 28.622-28.569V556.493zM419 144.014v137.493h137.494V172.582c0-15.778-12.815-28.568-28.622-28.568zm137.494 137.493V419h137.493V310.075c0-15.778-12.815-28.568-28.622-28.568zm0 137.493v137.493h108.871c15.807 0 28.622-12.79 28.622-28.568V419z"/></svg>';

  function daysHTML(d) {
    const n = d.total;
    return `<div class="days" style="--n:${n}">
      <div class="days__head">${Array.from({ length: n }, (_, i) => `<span>D${i + 1}</span>`).join('')}</div>
      <div class="days__grid" style="grid-template-columns:repeat(${n}, 1fr)">${d.items.map((it, i) =>
        `<div class="days__bar" style="grid-column:${it.from} / ${it.to + 1};animation-delay:${200 + i * 140}ms">${it.label}${it.to - it.from >= 2 ? `<span>Day ${it.from}–${it.to}</span>` : ''}</div>`).join('')}</div>
    </div>`;
  }
  // the work, shown the way it ships: each screen alone in a calm grey tile. Wide screens take the full width,
  // phone screens pair up side by side, and clips loop silently while they're on screen (see shapeTiles)
  const isClip = (src) => /\.(mp4|webm|mov)$/i.test(src);
  const galleryHTML = (srcs) => `<div class="pp-show">${srcs.map((src) => `<figure class="pp-tile">${isClip(src)
    ? `<video src="${src}" muted loop playsinline preload="metadata"></video>`
    : `<img src="${src}" alt="" loading="lazy">`}</figure>`).join('')}</div>`;
  const clipWatch = new IntersectionObserver((entries) => entries.forEach(({ target, isIntersecting }) => {
    if (isIntersecting && !reduced.matches) target.play().catch(() => {}); else target.pause();
  }), { root: sheet, threshold: 0.3 });
  function shapeTiles(root) {
    $$('.pp-show', root).forEach((show) => {
      const tiles = $$('.pp-tile', show);
      const sized = tiles.map((t) => new Promise((done) => {
        const m = $('img, video', t);
        const ready = () => { const w = m.naturalWidth || m.videoWidth, h = m.naturalHeight || m.videoHeight; t.classList.toggle('is-phone', h > w * 1.15); done(); };
        if (m.tagName === 'VIDEO') { clipWatch.observe(m); m.readyState >= 1 ? ready() : m.addEventListener('loadedmetadata', ready, { once: true }); m.addEventListener('error', done, { once: true }); }
        else m.complete && m.naturalWidth ? ready() : (m.addEventListener('load', ready, { once: true }), m.addEventListener('error', done, { once: true }));
      }));
      // phones pair up; one left over in a run sits alone at full width
      Promise.all(sized).then(() => {
        let run = [];
        const close = () => { if (run.length % 2) run[run.length - 1].classList.add('is-solo'); run = []; };
        tiles.forEach((t) => (t.classList.contains('is-phone') ? run.push(t) : close()));
        close();
        show.classList.add('is-shaped');
      });
    });
  }
  function blockHTML(b) {
    return `<section class="pp-sec" id="sec-${b.id}">
      <h2>${b.h}</h2>
      ${(b.p || []).map((t) => `<p>${t}</p>`).join('')}
      ${b.list ? `<ul class="pp-points">${b.list.map(([t, d]) => `<li><b>${t}</b><span>${d}</span></li>`).join('')}</ul>` : ''}
      ${b.days ? daysHTML(b.days) : ''}
      ${b.img ? galleryHTML(b.img) : ''}
      ${b.video ? `<video src="${b.video}" controls playsinline preload="none" poster="assets/img/side-cover.png"></video>` : ''}
      ${b.metrics ? `<div class="pp-results">${b.metrics.map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join('')}</div>` : ''}
      ${b.quote ? `<figure class="pp-quote"><blockquote>“${b.quote.text}”</blockquote><figcaption>${b.quote.who}, ${b.quote.role}</figcaption></figure>` : ''}
      ${b.scorecard ? `<div class="pp-score">${b.scorecard.map(([t, d]) => `<div><span>${t}</span><b>${d}</b></div>`).join('')}</div>` : ''}
    </section>`;
  }
  // the next piece of work: one quiet row
  // the next piece of work as a tile you can press: its cover, what it is, and a round arrow
  function nextHTML(n) {
    return `<button class="pp-next" ${n.attr}>
        ${n.pic ? `<span class="pp-next__pic"><img src="${n.pic}" alt="" loading="lazy"></span>` : ''}
        <span class="pp-next__txt">
          <span class="pp-next__k">Next ${n.kind}</span>
          <span class="pp-next__t">${strip(n.title)}</span>
          <span class="pp-next__c">${n.client} · ${n.len}</span>
        </span>
        <span class="pp-next__go">${icon.arrow}</span>
      </button>`;
  }
  // the end of the paper: what's next, the ask, and the signature pressed into the page
  function endHTML(next) {
    return `<div class="pp-end">
        ${nextHTML(next)}
        <div class="pp-cta">
          <div><p class="pp-cta__t">Have something to launch?</p><p class="pp-cta__s">Pick a week and tell us what you’re building.</p></div>
          <a class="pp-btn" href="${MAIL}">Work with us ${icon.arrow}</a>
        </div>
      </div>
      <div class="pp-sign" aria-label="Thanks, Puru and Haneef">
        <span class="pp-sign__by">With love, Puru &amp; Haneef</span>
        <span class="pp-sign__word" aria-hidden="true">Thanks</span>
      </div>`;
  }
  // one quiet line on top: who, and when (the pill above already says who, so then only when)
  function headHTML(client, a, b, len) {
    const when = b ? fmtRange(a, b) : fullDate(a);
    return `<p class="pp-meta">${client ? `<span class="pp-client">${client}</span>` : ''}<span>${when}${len ? ` · ${len}` : ''}</span></p>`;
  }
  function nextCase(C) {
    const n = CASES[CASE_ORDER[(CASE_ORDER.indexOf(C.id) + 1) % CASE_ORDER.length]];
    return { attr: `data-case-next="${n.id}"`, kind: 'case study', pic: n.cover, client: n.client, title: n.title, len: n.duration };
  }
  const factsHTML = (facts) => `<dl class="pp-facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;

  // a pill above the paper (its sibling, so it can stay outside it), pinned as you read: the work before and after this one, and whose it is
  function navHTML(ev) {
    const i = WORKS.indexOf(ev), at = (k) => WORKS[(i + k + WORKS.length) % WORKS.length];
    const btn = (w, dir) => (w === ev || !w ? '' : `<button class="pp-nav__b" ${w.type === 'case' ? `data-case-next="${w.case}"` : `data-open-id="${w.id}"`}
      aria-label="${dir < 0 ? 'Previous' : 'Next'}: ${strip(w.type === 'case' ? CASES[w.case].title : w.title)}">${icon.arrow}</button>`);
    const name = ev.type === 'case' ? CASES[ev.case].client : ev.client || strip(ev.title);
    return i < 0 ? '' : `<nav class="pp-nav"><div class="pp-nav__in">${btn(at(-1), -1)}<span class="pp-nav__l">${clientAvatar(name)}<b>${name}</b></span>${btn(at(1), 1)}</div></nav>`;
  }

  function sheetHTML(C) {
    // the numbers row already says the result, so the list doesn't repeat it
    const facts = [...C.meta.filter(([k]) => !(C.results && k === 'Result')), ...(C.live ? [['Live', `<a href="${C.live}" target="_blank" rel="noopener">${C.live.replace(/^https?:\/\//, '')} ↗</a>`]] : [])];
    const nav = navHTML(WORKS.find((w) => w.type === 'case' && w.case === C.id));
    return `${nav}<article class="paper">
        ${headHTML(nav ? '' : C.client, C.start, C.end, C.duration)}
        <header class="pp-hero">
          <h1>${strip(C.title)}</h1>
          <p class="pp-lede">${C.lede}</p>
        </header>
        ${factsHTML(facts)}
        ${C.results ? `<div class="pp-results">${C.results.map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join('')}</div>` : ''}
        ${C.blocks.map(blockHTML).join('')}
        ${endHTML(nextCase(C))}
      </article>`;
  }

  // a project or moment from Notion: everything comes from its row and page body
  const WORKS = ALL.filter((e) => e.type === 'case' || e.type === 'project');
  function projectSheetHTML(ev) {
    const parent = ev.parent && BY_ID[ev.parent];
    const n = WORKS[(WORKS.indexOf(parent || ev) + 1) % WORKS.length] || WORKS[0];
    const next = n.type === 'case'
      ? { attr: `data-case-next="${n.case}"`, kind: 'case study', pic: CASES[n.case].cover, client: CASES[n.case].client, title: CASES[n.case].title, len: CASES[n.case].duration }
      : { attr: `data-open-id="${n.id}"`, kind: 'project', pic: n.photos && n.photos[0], client: n.client || '37degree', title: n.title, len: n.end ? durationOf(n.date, n.end) : fullDate(n.date) };
    const facts = [
      ['Client', ev.client],
      ['Services', (ev.services || []).join('<br>')],
      ['Industry', ev.industry],
      ['Stack', (ev.stack || []).join('<br>')],
      ['Year', ev.date.slice(0, 4)],
      ['Part of', parent && `<button class="linkish" data-open-id="${parent.id}">${strip(parent.title)} →</button>`],
      ['Live', ev.live && `<a href="${ev.live}" target="_blank" rel="noopener">${ev.live.replace(/^https?:\/\/(www\.)?/, '')} ↗</a>`],
    ].filter(([, v]) => v);
    const photos = ev.photos || [];
    // stills pulled from a clip only dress the folder; in the sheet the clip itself plays
    const showcase = [...(ev.clips || []), ...photos.filter((src) => !(ev.clips || []).length || !/-still\.jpg$/.test(src))];
    const nav = navHTML(parent || ev);
    return `${nav}<article class="paper">
        ${headHTML(nav ? '' : ev.client || '37degree', ev.date, ev.end, ev.end ? durationOf(ev.date, ev.end) : '')}
        <header class="pp-hero">
          <h1>${strip(ev.title)}</h1>
          ${ev.summary ? `<p class="pp-lede">${ev.summary}</p>` : ''}
        </header>
        ${factsHTML(facts)}
        ${ev.body ? `<section class="pp-sec pp-prose">${ev.body}</section>` : ''}
        ${showcase.length ? `<section class="pp-sec pp-sec--work">${galleryHTML(showcase)}</section>` : ''}
        ${endHTML(next)}
      </article>`;
  }

  // each sheet remembers where you were in it; others always open at the top
  const sheetScroll = new Map();
  function showSheet(html, id) {
    sheet.classList.remove('is-in', 'is-leaving');
    sheet.style.transform = sheet.style.transition = scrim.style.opacity = '';
    sheet.innerHTML = `<button class="sheet__x" data-close aria-label="Close">${icon.x}</button>${html}`;
    sheet.hidden = false;
    sheet.scrollTop = sheetScroll.get(id) || 0; // only works once visible
    scrim.hidden = false;
    bar.classList.add('is-tucked');
    shapeTiles(sheet);
    // its sections rise in one after another as the paper arrives, so nothing lands all at once
    $$('.paper > *', sheet).forEach((c, i) => c.style.setProperty('--i', Math.min(i, 6)));
    requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('is-in'); sheet.classList.add('is-in'); }));
    setTimeout(() => { const x = $('.sheet__x', sheet); x && x.focus({ preventScroll: true }); }, 50);
    // the signature writes itself once you reach the end of the page
    const sign = $('.pp-sign', sheet);
    if (sign) {
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { sign.classList.add('is-signed'); io.disconnect(); } }, { root: sheet, threshold: 0.25 });
      io.observe(sign);
    }
  }

  // ?layout=center keeps the paper in the middle with screens in both margins;
  // by default the paper sits on the right and the left half is a stage for the work
  const CENTERED = new URLSearchParams(location.search).get('layout') === 'center';
  if (CENTERED) document.body.classList.add('sheet-center');
  const stageWidth = () => {
    const paper = !CENTERED && !mq.matches && $('.paper', sheet);
    return paper ? paper.getBoundingClientRect().left : 0;
  };

  // the work's screens leave the card and settle beside the paper
  const SPOTS = CENTERED
    ? [{ side: -1, y: 0.3, r: -6 }, { side: 1, y: 0.4, r: 5 }, { side: -1, y: 0.72, r: 3 }, { side: 1, y: 0.8, r: -4 }]
    : [{ x: 0.3, y: 0.3, r: -6 }, { x: 0.68, y: 0.42, r: 5 }, { x: 0.34, y: 0.72, r: 3 }, { x: 0.7, y: 0.82, r: -4 }];
  function flyOut(card, shots) {
    if (!card || !shots || !shots.length || reduced.matches || mq.matches) return null;
    const paper = $('.paper', sheet);
    const frame = $('.fold__papers', card) || $('.frame', card) || $('.stack', card) || $('.thumb', card) || card;
    const r = frame.getBoundingClientRect();
    if (!paper || r.right < 0 || r.left > innerWidth) return null;
    const gutter = (innerWidth - paper.offsetWidth) / 2;
    const stage = stageWidth();
    const tw = CENTERED ? Math.min(gutter - 48, 340) : Math.min(stage * 0.42, 360);
    if (tw < 120) return null;
    const th = tw * 0.66;
    const start = rectKeys(r, '10px');
    // out of a folder, each screen leaves from its own paper: same spot, same tilt
    const papers = frame.classList.contains('fold__papers') ? $$('img', frame) : null;
    const from = (i) => (papers && papers[i]
      ? { ...start, transform: getComputedStyle(papers[i]).transform.replace('none', 'rotate(0deg)'), opacity: 0 }
      : { ...start, transform: 'rotate(0deg)', opacity: i === 0 ? 1 : 0 });
    const anims = shots.slice(0, SPOTS.length).map((src, i) => {
      const img = document.createElement('img');
      img.src = src;
      if (papers) img.className = 'fold-fly';
      flyLayer.appendChild(img);
      const s = SPOTS[i];
      const cx = CENTERED ? (s.side < 0 ? gutter / 2 : innerWidth - gutter / 2) : stage * s.x;
      const end = { left: `${cx - tw / 2}px`, top: `${innerHeight * s.y - th / 2}px`, width: `${tw}px`, height: `${th}px`, borderRadius: '10px' };
      return img.animate(
        papers && papers[i]
          ? [from(i), { opacity: 1, offset: 0.25 }, { ...end, transform: `rotate(${s.r}deg)`, opacity: 1 }]
          : [from(i), { ...end, transform: `rotate(${s.r}deg)`, opacity: 1 }],
        { duration: 680, delay: 120, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' }); // all at once, together with the sheet
    });
    // a folder's papers cross-fade into their flying copies instead of vanishing, so nothing jumps over the glass
    const fades = papers ? papers.map((p) => p.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 80, delay: 120, easing: 'ease-out', fill: 'forwards' })) : null;
    if (!papers) card.classList.add('is-flown');
    return { card, anims, frame, papers, fades };
  }
  // click any image of the work to see it whole: on the left stage, or full screen on phones and the centred layout
  const viewer = document.createElement('div');
  viewer.className = 'viewer';
  viewer.hidden = true;
  viewer.innerHTML = '<img class="viewer__pic" alt=""><span class="viewer__n"></span>';
  document.body.appendChild(viewer);
  let viewing = null; // { list, i }
  const sheetPics = () => [...new Set([...$$('.flylayer img:not(.print-fly)'), ...$$('.paper img')].map((i) => i.getAttribute('src')))];
  function stageBox() {
    const w = stageWidth();
    return w ? { left: 0, top: 0, width: w, height: innerHeight } : { left: 0, top: 0, width: innerWidth, height: innerHeight };
  }
  // dir 1: the current image leaves to the left and the next comes in from the right; -1 the other way
  async function showPic(i, fromEl, dir = 1) {
    const { list } = viewing;
    viewing.i = (i + list.length) % list.length;
    const src = list[viewing.i];
    const probe = new Image();
    probe.src = src;
    await probe.decode().catch(() => {});
    if (!viewing) return;
    const S = stageBox(), pad = mq.matches ? 16 : 48;
    const k = Math.min((S.width - pad * 2) / (probe.naturalWidth || 4), (S.height - pad * 2) / (probe.naturalHeight || 3), 1.6);
    const w = (probe.naturalWidth || 4) * k, h = (probe.naturalHeight || 3) * k;
    const to = { left: S.left + (S.width - w) / 2, top: S.top + (S.height - h) / 2, width: w, height: h };
    const img = $('.viewer__pic', viewer);
    const had = viewing.shown;
    viewing.shown = true;
    if (had && !reduced.matches) {
      const old = img.cloneNode();
      old.classList.remove('viewer__pic');
      viewer.appendChild(old);
      const r = img.getBoundingClientRect();
      const out = dir > 0 ? -(r.right + 40) : innerWidth - r.left + 40;
      const gone = () => old.remove();
      old.animate([{ transform: 'none' }, { transform: `translateX(${out}px) rotate(${dir * -3}deg)` }], { duration: 560, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' }).finished.then(gone, gone);
    }
    img.src = src;
    $('.viewer__n', viewer).textContent = list.length > 1 ? `${viewing.i + 1} / ${list.length} · ${mq.matches ? 'swipe' : '← →'} to browse` : '';
    Object.assign(img.style, { left: `${to.left}px`, top: `${to.top}px`, width: `${w}px`, height: `${h}px` });
    if (reduced.matches) return;
    if (fromEl) img.animate([rectKeys(fromEl.getBoundingClientRect(), '8px'), rectKeys(to, '8px')], { duration: 520, delay: had ? 60 : 0, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    else if (had) img.animate([{ transform: `translateX(${dir > 0 ? S.width - to.left + 40 : -(to.left + w + 40)}px)` }, { transform: 'none' }], { duration: 560, delay: 60, easing: 'cubic-bezier(.3,0,.1,1)', fill: 'backwards' });
    else img.animate([{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'ease-out' });
  }
  function openViewer(src, fromEl) {
    if (viewing) return showPic(Math.max(0, viewing.list.indexOf(src)), fromEl);
    const list = sheetPics();
    viewing = { list, i: 0, shown: false };
    const S = stageBox();
    viewer.style.width = `${S.width}px`;
    viewer.classList.toggle('is-full', S.width === innerWidth);
    viewer.hidden = false;
    requestAnimationFrame(() => viewer.classList.add('is-in'));
    flyLayer.classList.add('is-dim');
    showPic(Math.max(0, list.indexOf(src)), fromEl);
  }
  // phones: swipe left for the next image, right for the previous; a tap still closes
  let swipeX = null;
  viewer.addEventListener('touchstart', (e) => { swipeX = e.touches[0].clientX; }, { passive: true });
  viewer.addEventListener('touchend', (e) => {
    const dx = swipeX === null ? 0 : e.changedTouches[0].clientX - swipeX;
    swipeX = null;
    if (!viewing || Math.abs(dx) < 40) return;
    e.preventDefault(); // no click, so the swipe doesn't close the viewer
    showPic(viewing.i + (dx < 0 ? 1 : -1), null, dx < 0 ? 1 : -1);
  });
  function closeViewer(instant) {
    if (!viewing) return;
    viewing = null;
    viewer.classList.remove('is-in');
    flyLayer.classList.remove('is-dim');
    const hide = () => { if (!viewing) viewer.hidden = true; };
    instant ? hide() : setTimeout(hide, 220);
  }

  function flyBack(f, instant) {
    if (!f) return;
    const clones = f.anims.map((a) => a.effect.target);
    const done = () => { clones.forEach((c) => c.remove()); f.card.classList.remove('is-flown'); f.fades && f.fades.forEach((x) => x.cancel()); };
    if (instant) return done();
    // every screen heads home at once, at the same pace the sheet drops
    const pick = (k) => ({ left: k.left, top: k.top, width: k.width, height: k.height, borderRadius: k.borderRadius, transform: k.transform, opacity: k.opacity });
    // into a folder, each screen lands on its own paper (measured now, in case the card moved or isn't hovered)
    // and cross-fades into it, so it settles behind the glass instead of popping in
    const box = f.papers && rectKeys(f.frame.getBoundingClientRect(), '10px');
    const back = f.anims.map((a, i) => {
      // first and last keyframes: the way out may have extra steps (a fade) between them
      const kf = a.effect.getKeyframes().map(pick);
      const from = kf[0], to = kf[kf.length - 1];
      const home = f.papers && f.papers[i];
      const frames = home
        ? [to, { opacity: 1, offset: 0.7 }, { ...box, transform: getComputedStyle(home).transform.replace('none', 'rotate(0deg)'), opacity: 0 }]
        : [to, from];
      const anim = a.effect.target.animate(frames, { duration: 480, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'both' });
      a.cancel();
      return anim;
    });
    // and the papers fade back in underneath as the copies fade out
    if (f.papers) f.fades = f.papers.map((p) => { const x = p.animate([{ opacity: 0 }, { opacity: 0, offset: 0.7 }, { opacity: 1 }], { duration: 480, fill: 'forwards' }); return x; })
      .concat(f.fades || []);
    Promise.all(back.map((x) => x.finished)).then(done, done);
    setTimeout(done, 700);
  }


  function openProject(ev, srcEl) {
    if (!ev) return;
    closeAll(true);
    const card = srcEl || $(`.card[data-id="${ev.id}"]`, mq.matches ? agenda : track);
    showSheet(projectSheetHTML(ev), ev.id);
    const fly = card && ev.photos ? flyOut(card, ev.photos) : null;
    open = { kind: 'sheet', id: ev.id, el: card, fly };
    setOwner({ mono: (ev.client || '37')[0] }, ev.client || 'By 37degree');
    markVisited(ev.id);
    history.replaceState(null, '', `${location.pathname}${location.search}#work/${ev.id}`);
  }

  function openCase(id, section, srcEl, opts = {}) {
    const C = CASES[id];
    if (!C) return;
    closeAll(true);
    const caseCard = $(`.card--case[data-case="${id}"]`, mq.matches ? agenda : track);
    showSheet(sheetHTML(C), id);
    const fly = opts.noFly ? null : flyOut(caseCard || srcEl, C.stack);
    open = { kind: 'sheet', id, el: srcEl || caseCard, fly };
    setOwner(C.logo ? { logo: C.logo } : { mono: C.client[0] }, C.short);
    markVisited(caseCard && caseCard.dataset.id, srcEl && srcEl.dataset.id);
    history.replaceState(null, '', `${location.pathname}${location.search}#work/${id}`);
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

  // phones: at the top of a pop-up, pulling down drags it with your finger; let go far enough and it closes, else it springs back
  function pullToClose(el, { kind, move, backdrop, close }) {
    let pull = null;
    const set = (d) => { move(d); backdrop.style.opacity = d ? String(Math.max(0, 1 - d / 500)) : ''; };
    el.addEventListener('touchstart', (e) => {
      pull = mq.matches && open && open.kind === kind && el.scrollTop <= 0 && e.touches.length === 1 ? { y: e.touches[0].clientY, d: 0 } : null;
    }, { passive: true });
    el.addEventListener('touchmove', (e) => {
      if (!pull) return;
      const d = e.touches[0].clientY - pull.y;
      if (d <= 0 && !pull.d) { pull = null; return; } // a normal scroll up into it
      e.preventDefault(); // no rubber-band: the pop-up itself moves
      pull.d = Math.max(0, d);
      el.style.transition = 'none';
      set(pull.d);
    }, { passive: false });
    const release = (e) => {
      if (!pull) return;
      const { d } = pull;
      pull = null;
      if (!d) return;
      e.preventDefault(); // a pull isn't a tap: don't let it click what's under the finger
      if (d > 110 && open && open.kind === kind) return close(d);
      el.style.transition = 'transform .35s cubic-bezier(.2,.8,.2,1)';
      set(0);
      setTimeout(() => { if (!pull) el.style.transition = ''; }, 380);
    };
    el.addEventListener('touchend', release);
    el.addEventListener('touchcancel', release);
  }
  pullToClose(sheet, {
    kind: 'sheet',
    backdrop: scrim,
    move: (d) => { sheet.style.transform = d ? `translateY(${d}px)` : ''; },
    // hand over to the usual close: it carries on down from where your finger left it
    close: () => { scrim.style.opacity = ''; sheet.style.transition = sheet.style.transform = ''; closeAll(); },
  });
  pullToClose(note, {
    kind: 'note',
    backdrop: focusEl,
    move: (d) => { note.style.transform = d ? `translate(-50%, calc(-50% + ${d}px))` : ''; },
    // a note you pull away keeps going down and off the screen, then closes
    close: (d) => {
      focusEl.style.opacity = '';
      focusEl.classList.remove('is-in');
      note.style.transition = note.style.transform = '';
      const o = open; // only ever close the note that was pulled, even if this lands late
      const done = () => { if (open === o) closeAll(true); };
      note.animate([{ transform: `translate(-50%, calc(-50% + ${d}px))` }, { transform: 'translate(-50%, calc(-50% + 100vh))' }],
        { duration: 320, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).finished.then(done, done);
      setTimeout(done, 400);
    },
  });

  function closeSheet(o, instant) {
    closeViewer(true);
    sheetScroll.set(o.id, sheet.scrollTop);
    // the whole sheet drops straight down from where you are, while the screens fly home
    sheet.classList.add('is-leaving');
    scrim.classList.remove('is-in');
    bar.style.left = '';
    bar.classList.remove('is-tucked');
    $$('video', sheet).forEach((v) => { v.pause(); clipWatch.unobserve(v); });
    flyBack(o.fly, instant);
    const hide = () => {
      if (open && open.kind === 'sheet') return;
      sheet.hidden = true; scrim.hidden = true;
      sheet.classList.remove('is-in', 'is-leaving');
    };
    instant ? hide() : setTimeout(hide, 520);
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
  // folder glass takes its hue from the most saturated colours in the project's first screen
  const hues = new Map();
  const PASTELS = [35, 52, 141, 210, 268, 328]; // the note hues: orange, yellow, green, blue, purple, pink
  function hueOf(src) {
    if (!hues.has(src)) hues.set(src, new Promise((done) => {
      const im = new Image();
      im.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = c.height = 32;
          const x = c.getContext('2d', { willReadFrequently: true });
          x.drawImage(im, 0, 0, 32, 32);
          const d = x.getImageData(0, 0, 32, 32).data;
          let r = 0, g = 0, b = 0, wt = 0;
          for (let i = 0; i < d.length; i += 4) {
            const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
            const l = (mx + mn) / 510, sat = mx ? (mx - mn) / mx : 0;
            if (l < 0.06 || l > 0.96) continue;
            const w = sat * sat * sat + 0.002;
            r += d[i] * w; g += d[i + 1] * w; b += d[i + 2] * w; wt += w;
          }
          done(wt ? hsl(r / wt, g / wt, b / wt) : null);
        } catch (err) { done(null); }
      };
      im.onerror = () => done(null);
      im.src = src;
    }));
    return hues.get(src);
  }
  function hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d) return { h: 0, s: 0 };
    const s = d / (1 - Math.abs(2 * l - 1));
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: Math.round((h * 60 + 360) % 360), s };
  }
  function tintFolders() {
    $$('.fold[data-tint]:not([data-tinted])').forEach((f) => {
      f.dataset.tinted = '';
      hueOf(f.dataset.tint).then((t) => {
        if (!t || t.s < 0.12) return; // greys keep the default soft blue
        // snap to the nearest note pastel, so folders sit in the same family as the notes
        const gap = (h) => Math.min(Math.abs(h - t.h), 360 - Math.abs(h - t.h));
        f.style.setProperty('--fh', PASTELS.reduce((a, b) => (gap(b) < gap(a) ? b : a)));
      });
    });
  }
  // the glass outline as one path sized to the folder: rounded body, right half rising on a soft S-curve.
  // a single clip-path keeps the blur and stays seamless when the card scales on hover
  function foldPath(w, h, rise = 16, r = 22, cw = 44) {
    const x = w * 0.48;
    return `M0 ${rise + r}A${r} ${r} 0 0 1 ${r} ${rise}L${x} ${rise}C${x + cw * 0.39} ${rise} ${x + cw * 0.39} 0 ${x + cw * 0.77} 0`
      + `L${w - r} 0A${r} ${r} 0 0 1 ${w} ${r}L${w} ${h - r}A${r} ${r} 0 0 1 ${w - r} ${h}L${r} ${h}A${r} ${r} 0 0 1 0 ${h - r}Z`;
  }
  const shaper = new ResizeObserver((entries) => entries.forEach(({ target, contentRect: { width, height } }) => {
    if (width && height) target.style.clipPath = `path('${foldPath(width, height)}')`;
  }));
  function shapeFolders() {
    $$('.fold__glass:not([data-shaped])').forEach((g) => { g.dataset.shaped = ''; shaper.observe(g); });
  }
  if (FOLDERS) {
    const refresh = () => { tintFolders(); shapeFolders(); };
    refresh();
    new MutationObserver(refresh).observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (viewing && t.closest('.viewer')) return closeViewer();
    const pic = open && open.kind === 'sheet' && !t.closest('.pp-next') && t.closest('.paper img, .flylayer img:not(.print-fly)');
    if (pic) return openViewer(pic.getAttribute('src'), pic);
    // "Work with us" opens the new-event invite, lifting off the bar's button; the mailto stays as the fallback
    const cta = t.closest('.dyn-cta, .side__cta, .outro__cta, .pp-btn');
    if (cta) {
      e.preventDefault();
      const slot = ALL.find((x) => x.type === 'slot');
      closeAll(true);
      // it grows out of whichever button is on screen: the sidebar's, or the bar's once the sidebar has gone
      const sideGone = mq.matches || document.body.classList.contains('side-hidden') || !$('.side__cta') || !$('.side__cta').offsetParent;
      return openNote(slot, cta.matches('.outro__cta') ? cta : $(sideGone ? '.dyn-cta' : '.side__cta'));
    }
    const v = t.closest('[data-view]');
    if (v) return setView(v.dataset.view);
    const f = t.closest('[data-filter]');
    if (f) return setFilter(f.dataset.filter);
    const menuBtn = t.closest('.fmenu__btn'), menu = $('.fmenu__list', stripFilters);
    if (menuBtn) { menu.hidden = !menu.hidden; return menuBtn.setAttribute('aria-expanded', String(!menu.hidden)); }
    if (menu && !menu.hidden) { menu.hidden = true; $('.fmenu__btn', stripFilters).setAttribute('aria-expanded', 'false'); }
    const step = t.closest('[data-step]');
    if (step) return goSlide(slideIx + Number(step.dataset.step));
    // clicking the margins around the paper puts it away
    if (t.closest('[data-close]') || t === focusEl || t === scrim || t === sheet) return closeAll();
    const nextBtn = t.closest('[data-case-next]');
    if (nextBtn) {
      const id = nextBtn.dataset.caseNext;
      sheetScroll.delete(id); // Next always starts the next piece from the top
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
      if (openBtn.closest('.pp-next, .pp-nav')) sheetScroll.delete(target.type === 'case' ? target.case : target.id);
      const tile = openBtn.classList.contains('wk') ? openBtn : undefined;
      if (target.type === 'case') return openCase(target.case, null, tile);
      if (open && open.kind === 'sheet' && !mq.matches) scrollToDate(target.date);
      return requestAnimationFrame(() => openProject(target, tile));
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
    if (viewing) {
      if (e.key === 'Escape') { e.preventDefault(); return closeViewer(); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); return showPic(viewing.i + (e.key === 'ArrowRight' ? 1 : -1), null, e.key === 'ArrowRight' ? 1 : -1); }
    }
    if (e.key === 'Escape' && open) { e.preventDefault(); closeAll(); }
    // − and + zoom out and in, like a calendar app
    const inField = e.target instanceof Element && e.target.closest('input, textarea, select');
    if (!open && !inField && (e.key === '-' || e.key === '=' || e.key === '+')) zoom(e.key === '-' ? -1 : 1);
  });

  addEventListener('resize', () => {
    if (open && open.kind === 'sheet' && open.fly) { flyBack(open.fly, true); open.fly = null; }
    if (!mq.matches) { layoutBars(); buildMinimap(); if (view === 'projects') goSlide(slideIx, false); }
  });
  mq.addEventListener('change', () => { if (mq.matches && view === 'months') view = 'timeline'; render(); });

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
