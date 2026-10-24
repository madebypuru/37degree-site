# 37degree — Studio Calendar

The 37degree site, told as a calendar: how the studio started, then every project delivered, on the day it happened.

Static site, no build step:

```
python3 -m http.server 4370
```

then open http://localhost:4370 (v3, the main site), http://localhost:4370/v2/ (white work cards) or http://localhost:4370/v1/ (the first take). Live at https://madebypuru.github.io/37degree-site/.

v2 is the cleaner take: no toolbar, a three-line intro, and two kinds of item. **Notes** are pastel sticky notes: how the studio got here. They open centred with the page blurred, in their own colour. **Work** is white cards: what's been shipped. It opens the case-study side panel. Note colours follow the kind of note (story yellow, people blue, testimonials pink, milestones green, logos purple, snippets orange). Any event can override its colour with `color: 'pink'` etc. in `js/data.js`.

The bottom bar holds the "Work with us" CTA, the zoom switch, and a minimap you can drag (ticks: notes in their colour, projects in ink, today in orange). The sun/moon button top-right switches light and dark; it follows the system setting until someone picks one.

Events with `photos` show a stack of prints on the card. When opened, the note shows a deck you click (or press Enter) to flip through. **The photos in `assets/img/placeholder/` are Pinterest mood placeholders** owned by their creators (sources in `SOURCE.txt`). Replace them with real studio photos before the site goes live. Both versions read the same `js/data.js`.

## Managing content: Notion (Studio CRM)

Everything on the calendar comes from the **Website calendar** database on the Studio CRM page in Notion.
Add a row, tick **Publish**, and the site updates within the hour (or straight away: GitHub → Actions → *Sync from Notion* → Run workflow).

| Field | What it does |
|---|---|
| Name | The card title. Make one word italic (or wrap it in `*asterisks*`) for the Gentium accent. |
| Date | Start date. Add an end date and it draws a bar across the calendar. |
| Kind | **Work** (white cards, open the side panel) or **Note** (pastel sticky notes, open centred). |
| Card | Project, Moment, Milestone, Note, Person, Testimonial, Quote, Logos, Snippets. |
| Client | Shown on work cards. For a Person or Testimonial, their name and role (`Puru Sharma · Founder & Designer`). |
| Summary | The line shown when it opens. For a Testimonial, the quote. |
| Services, Metric, Color, Highlight, Live link | Tags, the big number on a milestone, a note colour override, whether it shows in Highlights, and a link. |
| Photos | Drag images in. The first one is the cover, and all of them make the photo deck. |
| Page body | For a Project or Moment, whatever you write inside the Notion page (headings, text, lists, images) becomes its write-up in the side panel. |
| Part of | Puts a Moment under its Project (it borrows the client name). |
| Case study / Case section | Links to the three long-form case studies that live in `js/data.js`. |
| Date source | Placeholder dates show outlined at `/?draft`. |
| CRM project | Internal link back to the CRM row. The website never reads it. |

How it works: `scripts/sync-notion.mjs` reads only that database through a Notion integration, writes `js/cms.js`, and downloads photos into `assets/img/cms`. The GitHub Action in `.github/workflows/sync-notion.yml` runs it hourly, commits any change, and redeploys Pages. If `js/cms.js` is empty, the site falls back to the events in `js/data.js`.

**The integration must only be connected to the Website calendar database**, never to Studio CRM as a whole. The rest of the CRM holds amounts, invoices and logins.

## Files

- `index.html`, `css/site.css`, `js/app.js`: v3, the main site. Work shows as glass folders tinted in the note pastels; add `?cards` to see the white work cards instead
- `v2/`: the previous main site (white work cards), a frozen copy of its page, styles and script that reads the same content
- `js/data.js`: **all content** (events, case studies, people, testimonials, logos), shared by both versions
- `v1/`: the first take, kept for comparison
- `assets/img`, `assets/video` — pulled from the current 37degr.ee case studies

## Editing content

Add an event to `EVENTS` in `js/data.js`. Columns, all-day project bars, the minimap and the mobile agenda are all computed from it.
A new case study goes in `CASES` and gets one `{ type: 'case' }` event; its steps are `{ type: 'step', case, section }` events, where `section` is a block `id` the click scrolls to.

## Before going live: confirm these

Open `/?draft` to see every event marked `tbc: true` outlined in orange.

- Every inception date (the first idea, Puru starting the studio, 37degr.ee going live, Haneef joining) is a placeholder.
- The case study dates are placeholders too. Only their durations (6 months / 10 days / 4 days) come from the live case studies.
- Testimonial dates are placeholders.
- Sidecar's result is written as "$1M+ pipeline". The live page says "7 Digit Pipeline", "$1M+" and "6 digit ($)" in different places, so pick one.
- The "Team trusted by the likes of" logos: two small logos on the live site couldn't be identified, so they were left out. The animal-head mark is assumed to be Goatfish.
