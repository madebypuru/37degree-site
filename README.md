# 37degree — Studio Calendar

The 37degree site, told as a calendar: how the studio started, then every project delivered, on the day it happened.

Static site, no build step:

```
python3 -m http.server 4370
```

then open http://localhost:4370 (v2, the main site) or http://localhost:4370/v1/ (the first take). Live at https://madebypuru.github.io/37degree-site/.

v2 is the cleaner take: no toolbar, a three-line intro, and two kinds of item. **Notes** are pastel sticky notes: how the studio got here. They open centred with the page blurred, in their own colour. **Work** is white cards: what's been shipped. It opens the case-study side panel. Note colours follow the kind of note (story yellow, people blue, testimonials pink, milestones green, logos purple, snippets orange). Any event can override its colour with `color: 'pink'` etc. in `js/data.js`.

The bottom bar holds the "Work with us" CTA, the zoom switch, and a minimap you can drag (ticks: notes in their colour, projects in ink, today in orange). The sun/moon button top-right switches light and dark; it follows the system setting until someone picks one.

Events with `photos` show a stack of prints on the card. When opened, the note shows a deck you click (or press Enter) to flip through. **The photos in `assets/img/placeholder/` are Pinterest mood placeholders** owned by their creators (sources in `SOURCE.txt`). Replace them with real studio photos before the site goes live. Both versions read the same `js/data.js`.

## Files

- `index.html`, `css/site.css`, `js/app.js`: v2, the main site
- `js/data.js`: **all content** (events, case studies, people, testimonials, logos), shared by both versions
- `v1/`: the first take, kept for comparison (`/v2/` redirects to the root)
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
