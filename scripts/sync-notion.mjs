#!/usr/bin/env node
/*
  Pulls the Notion "Website calendar" database (inside Studio CRM) and writes js/cms.js for the site.

  It reads that one database and nothing else. Share only that database with the Notion integration:
  the rest of the CRM (invoices, amounts, logins) must never be visible to it.

    NOTION_TOKEN=secret_xxx node scripts/sync-notion.mjs
    node scripts/sync-notion.mjs --fixture scripts/fixtures/calendar.json   # offline, no token

  Only rows with "Publish" ticked are exported. Photos uploaded to Notion are downloaded into
  assets/img/cms (Notion's own file links expire after an hour), so the site never links to Notion.
*/
import { mkdir, writeFile, readFile, readdir, unlink, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'js/cms.js');
const IMG_DIR = 'assets/img/cms';
const API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const DATABASE_ID = process.env.NOTION_DATABASE_ID || '29e19a6ab1de4d3ab365009fb8f4ae35';
const TOKEN = process.env.NOTION_TOKEN;
const argv = process.argv.slice(2);
const FIXTURE = argv.includes('--fixture') ? argv[argv.indexOf('--fixture') + 1] : null;
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const TYPE_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/avif': '.avif' };

/* ── Notion API ─────────────────────────────────────── */
async function notion(method, url, body) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`${API}${url}`, {
      method,
      headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429 || res.status >= 500) {
      const wait = Number(res.headers.get('retry-after') || 2 ** attempt);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`Notion ${method} ${url} → ${res.status}: ${await res.text()}`);
    return res.json();
  }
  throw new Error(`Notion ${method} ${url}: gave up after retries`);
}

async function queryPublished() {
  const pages = [];
  let cursor;
  do {
    const res = await notion('POST', `/databases/${DATABASE_ID}/query`, {
      filter: { property: 'Publish', checkbox: { equals: true } },
      sorts: [{ property: 'Date', direction: 'ascending' }],
      page_size: 100,
      start_cursor: cursor,
    });
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return pages;
}

async function childBlocks(id) {
  const blocks = [];
  let cursor;
  do {
    const q = new URLSearchParams({ page_size: '100', ...(cursor ? { start_cursor: cursor } : {}) });
    const res = await notion('GET', `/blocks/${id}/children?${q}`);
    blocks.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

/* ── Text ───────────────────────────────────────────── */
const plain = (rt = []) => rt.map((t) => t.plain_text).join('');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const safeHref = (h) => (h && /^(https?:|mailto:)/i.test(h) ? h : null);
// Notion italics (or *word* typed by hand) become the Gentium italic accent on the site
function richHTML(rt = [], { links = true } = {}) {
  return rt.map((t) => {
    let s = esc(t.plain_text).replace(/\*([^*]+)\*/g, '<em>$1</em>');
    if (t.annotations?.italic) s = `<em>${s}</em>`;
    if (t.annotations?.bold) s = `<b>${s}</b>`;
    const href = links && safeHref(t.href || t.text?.link?.url);
    if (href) s = `<a href="${esc(href)}" target="_blank" rel="noopener">${s}</a>`;
    return s;
  }).join('').trim();
}
const slug = (s) => s.normalize('NFKD').toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 36).replace(/-$/, '');

/* ── Images ─────────────────────────────────────────── */
const wanted = new Set();
async function exists(p) { try { await access(p); return true; } catch { return false; } }

// key must stay the same while the image is unchanged, so repeat syncs make no new files or commits
async function saveImage(url, key) {
  const urlExt = path.extname(new URL(url).pathname).toLowerCase();
  const base = createHash('sha1').update(key).digest('hex').slice(0, 16);
  const known = IMAGE_EXT.has(urlExt) ? `${base}${urlExt === '.jpeg' ? '.jpg' : urlExt}` : null;
  if (known && (await exists(path.join(ROOT, IMG_DIR, known)))) { wanted.add(known); return `${IMG_DIR}/${known}`; }
  if (FIXTURE) return null;
  const res = await fetch(url);
  const type = (res.headers.get('content-type') || '').split(';')[0];
  if (!res.ok || !type.startsWith('image/')) { console.warn(`  skipped image (${res.status} ${type}): ${key}`); return null; }
  const name = known || `${base}${TYPE_EXT[type] || '.jpg'}`;
  await mkdir(path.join(ROOT, IMG_DIR), { recursive: true });
  await writeFile(path.join(ROOT, IMG_DIR, name), Buffer.from(await res.arrayBuffer()));
  wanted.add(name);
  return `${IMG_DIR}/${name}`;
}
const fileUrl = (f) => (f.type === 'external' ? f.external?.url : f.file?.url);

async function photosOf(row) {
  const out = [];
  for (const [i, f] of row.files.entries()) {
    const url = fileUrl(f);
    if (!url) continue;
    const key = f.type === 'external' ? url : `${row.pid}|${i}|${f.name}|${row.edited}`;
    const saved = await saveImage(url, key);
    if (saved) out.push(saved);
  }
  return out.length ? out : row.repo;
}

/* ── Page body → HTML (for projects and moments) ─────── */
async function bodyHTML(row, fixtureBlocks) {
  const blocks = FIXTURE ? fixtureBlocks[row.pid] || [] : await childBlocks(row.pid);
  const html = [];
  let list = null;
  const closeList = () => { if (list) { html.push(`</${list}>`); list = null; } };
  for (const b of blocks) {
    const t = b.type, v = b[t] || {};
    const listTag = t === 'bulleted_list_item' ? 'ul' : t === 'numbered_list_item' ? 'ol' : null;
    if (listTag !== list) { closeList(); if (listTag) { html.push(`<${listTag}>`); list = listTag; } }
    const text = richHTML(v.rich_text);
    switch (t) {
      case 'paragraph': if (text) html.push(`<p>${text}</p>`); break;
      case 'heading_1': case 'heading_2': html.push(`<h2>${text}</h2>`); break;
      case 'heading_3': html.push(`<h3>${text}</h3>`); break;
      case 'bulleted_list_item': case 'numbered_list_item': html.push(`<li>${text}</li>`); break;
      case 'quote': html.push(`<blockquote><p>${text}</p></blockquote>`); break;
      case 'callout': html.push(`<p class="callout">${text}</p>`); break;
      case 'divider': html.push('<hr>'); break;
      case 'image': {
        const url = fileUrl(v);
        const src = url && (await saveImage(url, v.type === 'external' ? url : `${b.id}|${b.last_edited_time}`));
        const cap = richHTML(v.caption);
        if (src) html.push(`<figure><img src="${src}" alt="${esc(plain(v.caption))}" loading="lazy">${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`);
        break;
      }
      case 'video': case 'embed': case 'bookmark': case 'link_preview': {
        const href = safeHref(v.url || v.external?.url);
        if (href) html.push(`<p><a class="ext" href="${esc(href)}" target="_blank" rel="noopener">${t === 'video' ? 'Watch the film' : esc(new URL(href).hostname)} ↗</a></p>`);
        break;
      }
    }
  }
  closeList();
  return html.join('\n') || undefined;
}

/* ── Rows → calendar events ─────────────────────────── */
function readRow(page) {
  const p = page.properties;
  const sel = (n) => p[n]?.select?.name || null;
  const rt = (n) => p[n]?.rich_text || [];
  return {
    pid: page.id.replace(/-/g, ''),
    edited: page.last_edited_time,
    titleRT: p.Name?.title || [],
    start: p.Date?.date?.start?.slice(0, 10) || null,
    end: p.Date?.date?.end?.slice(0, 10) || null,
    kind: sel('Kind'),
    card: sel('Card'),
    highlight: !!p.Highlight?.checkbox,
    client: plain(rt('Client')).trim(),
    summaryRT: rt('Summary'),
    services: (p.Services?.multi_select || []).map((o) => o.name),
    metric: plain(rt('Metric')).trim(),
    color: sel('Color'),
    files: p.Photos?.files || [],
    // only plain image paths inside assets/, nothing that could point elsewhere
    repo: plain(rt('Photos (repo)')).split(',').map((s) => s.trim())
      .filter((s) => /^assets\/[\w\-./]+\.(jpe?g|png|webp|gif|avif)$/i.test(s) && !s.includes('..')),
    caseStudy: sel('Case study'),
    section: plain(rt('Case section')).trim(),
    live: safeHref(p['Live link']?.url),
    dateSource: sel('Date source'),
    parent: (p['Part of']?.relation || [])[0]?.id?.replace(/-/g, '') || null,
  };
}

const idOf = (r) => (r.card === 'Project' && r.caseStudy ? `case-${r.caseStudy}` : `${slug(plain(r.titleRT)) || 'item'}-${r.pid.slice(-4)}`);

async function toEvent(r, rows, fixtureBlocks) {
  if (!r.start || !r.card) { console.warn(`  skipped "${plain(r.titleRT)}": needs a Date and a Card`); return null; }
  const title = richHTML(r.titleRT, { links: false });
  const summary = richHTML(r.summaryRT) || undefined;
  const photos = await photosOf(r);
  const parent = r.parent && rows.find((x) => x.pid === r.parent);
  const base = {
    id: idOf(r),
    date: r.start,
    highlight: r.highlight || undefined,
    tbc: r.dateSource === 'Placeholder' || undefined,
    color: r.color ? r.color.toLowerCase() : undefined,
  };
  const pics = photos.length ? photos : undefined;
  switch (r.card) {
    case 'Quote': return { ...base, type: 'quote', title };
    case 'Note': return { ...base, type: 'note', title, detail: summary, photos: pics };
    case 'Logos': return { ...base, type: 'logos', title };
    case 'Snippets': return { ...base, type: 'snippets', title };
    case 'Person': {
      const [name, role = ''] = r.client.split(/\s+·\s+/);
      const links = r.live ? [{ label: r.live.replace(/^https?:\/\/(www\.)?/, ''), href: r.live }] : [];
      return { ...base, type: 'person', title, photos: pics, who: { name, role, short: name.split(' ')[0], mono: (name[0] || '?').toUpperCase(), bio: summary, links } };
    }
    case 'Testimonial':
      return { ...base, type: 'testimonial', who: { name: plain(r.titleRT), role: r.client, img: photos[0], quote: plain(r.summaryRT) } };
    case 'Milestone':
      return r.kind === 'Work'
        ? { ...base, type: 'milestone', title, metric: r.metric || undefined, sub: plain(r.summaryRT) || undefined, case: r.caseStudy || undefined, section: r.section || undefined, client: r.client || parent?.client || undefined }
        : { ...base, type: 'milestone', title, metric: r.metric || undefined, detail: summary };
    case 'Project':
      if (r.caseStudy) return { ...base, type: 'case', case: r.caseStudy, end: r.end || undefined };
      return { ...base, type: 'project', title, client: r.client, summary, services: r.services, photos: pics, live: r.live || undefined, end: r.end || undefined, body: await bodyHTML(r, fixtureBlocks) };
    case 'Moment':
      if (r.caseStudy) return { ...base, type: 'step', case: r.caseStudy, section: r.section || undefined, title, img: photos[0] };
      return { ...base, type: 'moment', title, client: r.client || parent?.client, summary, services: r.services, photos: pics, live: r.live || undefined, parent: parent ? idOf(parent) : undefined, body: await bodyHTML(r, fixtureBlocks) };
  }
  return null;
}

/* ── Run ────────────────────────────────────────────── */
async function main() {
  let pages, fixtureBlocks = {};
  if (FIXTURE) {
    const fx = JSON.parse(await readFile(path.resolve(FIXTURE), 'utf8'));
    pages = fx.pages.filter((p) => p.properties.Publish?.checkbox);
    fixtureBlocks = fx.blocks || {};
  } else {
    if (!TOKEN) { console.log('NOTION_TOKEN is not set, so there is nothing to sync. Skipping.'); return; }
    pages = await queryPublished();
  }
  const rows = pages.map(readRow);
  const events = (await Promise.all(rows.map((r) => toEvent(r, rows, fixtureBlocks)))).filter(Boolean)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const out = '// Generated by scripts/sync-notion.mjs from the Notion "Website calendar" database (Studio CRM).\n'
    + '// Edit the content in Notion, not here: the next sync overwrites this file.\n'
    + `window.CMS = ${JSON.stringify({ events }, null, 1)};\n`;
  const before = await readFile(OUT, 'utf8').catch(() => '');
  if (before !== out) await writeFile(OUT, out);

  // drop images that no published row uses any more
  if (!FIXTURE) {
    const dir = path.join(ROOT, IMG_DIR);
    for (const f of await readdir(dir).catch(() => [])) if (/^[0-9a-f]{16}\.\w+$/.test(f) && !wanted.has(f)) await unlink(path.join(dir, f));
  }
  console.log(`${events.length} events from ${pages.length} published rows${before === out ? ' (no change)' : ' → js/cms.js updated'}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
