/*
  37degree calendar — content.

  Every item on the timeline is one entry in EVENTS. Edit freely; the layout is computed.

  Fields
    id        unique, used for visited state + deep links
    date      'YYYY-MM-DD' — the column it lands in
    type      note | milestone | quote | person | case | step | testimonial | video | logos | snippets | slot
    title     card title (HTML allowed for <em> accent on quotes)
    row/span  optional placement in the column grid (rows are 1–7). Leave out to stack automatically.
    highlight true → shows in the "Highlights" zoom level
    tbc       true → date or wording still needs confirming. Open the site with ?draft to see these outlined.
    photos    optional list of images: shown as a stack of prints on the card, and a deck you click through when it opens.
              The current ones in assets/img/placeholder are stand-ins, swap them for real studio photos.
    case      for steps/milestones that belong to a case study: opens that case, scrolled to `section`
*/

const PEOPLE = {
  puru: {
    name: 'Puru Sharma', short: 'Puru', mono: 'P', role: 'Founder & Designer',
    bio: 'Partners with founders and teams to shape brands, products, and experiences from zero to scale. Moves between high-level strategy and fine-grained details.',
    links: [
      { label: 'puru@37degr.ee', href: 'mailto:puru@37degr.ee' },
      { label: '@madebypuru', href: 'https://x.com/madebypuru' },
    ],
  },
  haneef: {
    name: 'Mohamed Haneefa', short: 'Haneef', mono: 'H', role: 'Product Strategist',
    bio: 'Runs product strategy and the studio itself: scoping, sequencing, and making sure the work ships on the day it was promised.',
    links: [{ label: 'haneef@37degr.ee', href: 'mailto:haneef@37degr.ee' }],
  },
  studio: { name: '37degree', short: '37degree', mono: '37', role: 'Studio' },
};

const CASES = {
  kampanion: {
    id: 'kampanion',
    client: 'DemandFarm',
    logo: null,
    title: 'Building an Enterprise <em>AI</em> Product in 6 Months',
    short: 'KAMpanion',
    lede: 'How we built and validated an AI-native account-intelligence product for enterprise account managers, starting inside the tool they already used every day.',
    tags: ['Product Management', 'Product Design', 'Strategy'],
    start: '2025-01-13', end: '2025-07-14',
    duration: '6 months',
    results: [['6 mo', 'From concept to a product in daily use'], ['2 mo', 'To a working alpha inside Teams'], ['4', 'Data sources answered from one chat']],
    cover: 'assets/img/kam-cover.png',
    stack: ['assets/img/kam-cover.png', 'assets/img/kam-03.png', 'assets/img/kam-07.png'],
    meta: [
      ['Company', 'DemandFarm'],
      ['Industry', 'AI · CRM · Enterprise SaaS'],
      ['Product', 'KAMpanion'],
      ['Timeline', '6 months · alpha in 2'],
    ],
    blocks: [
      { id: 'problem', h: 'Insight scattered across <em>four</em> systems',
        p: ['Account managers were spending hours hunting for answers that should have been instant: which accounts have white space, what the risk is on the top three deals, who they haven’t spoken to in 60 days.',
            'CRM reporting couldn’t answer those questions in context, and static dashboards needed too much digging. The opportunity: an AI-native interface that understands plain-language questions and returns account intelligence in seconds.'] },
      { id: 'challenges', h: 'Six tools, zero <em>trust</em> in AI',
        list: [
          ['Adoption friction', 'Sales teams already switch between 6+ tools a day. Another app would be a burden.'],
          ['Trust gap', 'Enterprise users need to know why an insight exists and where it came from.'],
          ['Data complexity', 'Intelligence lives across Salesforce, engagement tools, email and meeting notes.'],
          ['Dense answers in a chat UI', 'Responses need tables, relationship maps and context, not just text.'],
        ] },
      { id: 'teams', h: 'Start where users <em>already</em> are',
        p: ['We built the MVP inside Microsoft Teams instead of as a standalone app. Account managers already lived there, and it let us test the core value (AI account insights via chat) without building auth, navigation or a full UI.',
            'That decision shipped an alpha in 2 months instead of 4+. Users asked questions with @Kampanion and got answers without leaving their workspace.'],
        img: ['assets/img/kam-03.png', 'assets/img/kam-05.png'] },
      { id: 'trust', h: 'Design for <em>trust</em>, not just speed',
        list: [
          ['Show the sources', 'Every insight links back to the CRM record, email thread or meeting note it came from.'],
          ['A persistent account selector', 'Better accuracy, faster queries, and the user stays in control of context.'],
          ['Templates that teach', '“Which stakeholders haven’t I engaged in 60 days?” — product education disguised as convenience.'],
        ],
        img: ['assets/img/kam-07.png', 'assets/img/kam-10.png'] },
      { id: 'density', h: 'Conversational UX with <em>data</em> density',
        p: ['Hybrid responses pair a text summary with embedded tables, heatmaps or relationship graphs. Answers start high-level and let users drill in, and can trigger actions like “schedule a follow-up”. KAMpanion became a command centre, not a Q&A bot.'],
        img: ['assets/img/kam-12.png', 'assets/img/kam-14.png'] },
      { id: 'impact', h: '<em>Impact</em>',
        p: ['No public metrics, but early internal adoption showed a clear drop in time spent searching for account insights, higher engagement than the CRM dashboards it replaced, and better alignment across sales, customer success and account teams.'],
        metrics: [['6 mo', 'Concept to product'], ['2 mo', 'To alpha'], ['4', 'Systems unified']] },
    ],
  },

  sidecar: {
    id: 'sidecar',
    client: 'Sidecar',
    logo: 'assets/img/logos/sidecar.png',
    title: '7-Digit <em>Pipeline</em> in 3 Days',
    short: 'Sidecar × IICS 2025',
    lede: 'How we launched Sidecar’s entire brand at South Asia’s biggest logistics show in under two weeks: landing page, booth, collaterals and explainer video, end to end.',
    tags: ['Brand Launch', 'Website', 'Motion Design'],
    start: '2025-09-08', end: '2025-09-20',
    duration: '10 days',
    results: [['$1M+', 'Pipeline from three days on the floor'], ['10 days', 'From no brand to a live booth'], ['5', 'Deliverables, designed and shipped']],
    cover: 'assets/img/side-cover.png',
    stack: ['assets/img/side-cover.png', 'assets/img/side-05.png', 'assets/img/side-07.png'],
    video: 'assets/video/sidecar-explainer.mp4',
    meta: [
      ['Company', 'Sidecar — the AI teammate for logistics'],
      ['Event', 'IICS 2025, Jio World Convention Centre, Mumbai'],
      ['Scope', 'Brand, landing page, booth, collaterals, video'],
      ['Result', '$1M+ pipeline from one show'],
    ],
    blocks: [
      { id: 'room', h: 'The right room. <em>One week</em> to get ready.',
        p: ['Sidecar’s first big public moment was IICS 2025: 200+ exhibitors and 25,000 trade visitors across three days — freight forwarders, airlines, shipping lines, manufacturers.',
            'They weren’t rebranding, they were launching. No collateral, no event presence, nothing to start from — and everything needed to hold its own in a room of established players.'] },
      { id: 'schedule', h: 'Ten days, <em>day by day</em>',
        days: { total: 10, items: [
          { label: 'Brand foundation', from: 1, to: 2 },
          { label: 'Collaterals & print', from: 4, to: 6 },
          { label: 'Explainer video', from: 6, to: 8 },
          { label: 'Landing page', from: 8, to: 10 },
        ] } },
      { id: 'print', h: 'Stop people <em>mid-walk</em>',
        p: ['Booth banners, posters and handouts, all on one visual system and production-ready for print. With 200+ exhibitors competing for the same visitors, everything had to read from ten feet away.'],
        img: ['assets/img/side-05.png', 'assets/img/side-07.png', 'assets/img/side-06.png'] },
      { id: 'video', h: 'A video that does the <em>talking</em>',
        p: ['60–90 seconds to introduce Sidecar, explain the product and land the value. Scripted, designed and produced end to end — built to loop at the booth and live on the landing page.'],
        video: 'assets/video/sidecar-explainer.mp4' },
      { id: 'landing', h: 'One page, <em>two</em> jobs',
        p: ['Explain the product to a cold visitor, and capture leads from warm prospects who had just walked away from the booth. Tight hierarchy: what it is, why it matters, what to do next.'],
        img: ['assets/img/side-09.png', 'assets/img/side-10.png'] },
      { id: 'result', h: '$1M+ pipeline. <em>Three</em> days. One show.',
        p: ['Sidecar launched on time, on-brand, and without cutting corners — and turned three days on the floor into more than $1M in pipeline.'],
        quote: { text: 'In 10 days, 37degree gave us a full brand launch: landing page, booth, video, everything. The quality was there and we felt super confident and ready.', who: 'Sudhanshu', role: 'CEO, Sidecar' },
        scorecard: [['Brand visual system', '1 day'], ['Landing page (design + build)', '2 days'], ['Booth banners + posters', '2 days'], ['Event collaterals', '2 days'], ['Brand explainer video', '3 days']] },
    ],
  },

  deccan: {
    id: 'deccan',
    client: 'Deccan AI',
    logo: 'assets/img/logos/deccan.png',
    title: 'Launching AI-Native Product in <em>4 Days</em>',
    short: 'Deccan AI · EnterpriseOS',
    lede: 'A landing page that sells a deeply technical enterprise platform to CXOs, operations leaders and compliance heads — designed in four days.',
    tags: ['Product Launch', 'Website Design'],
    start: '2026-02-09', end: '2026-02-12',
    duration: '4 days',
    results: [['4 days', 'From brief to a page ready to ship'], ['4', 'Buyer personas served by one page'], ['5', 'Buyer questions, each with its own section']],
    live: 'https://deccan.ai/enterprise-os',
    cover: 'assets/img/dec-cover.png',
    stack: ['assets/img/dec-cover.png', 'assets/img/dec-02.png', 'assets/img/dec-05.png'],
    meta: [
      ['Company', 'Deccan AI'],
      ['Industry', 'AI · Data infrastructure · Enterprise SaaS'],
      ['Product', 'EnterpriseOS'],
      ['Turnaround', '4 days'],
    ],
    blocks: [
      { id: 'brief', h: 'Make a complex platform feel <em>simple</em>',
        p: ['EnterpriseOS redesigns enterprise operations around AI-native workflows: agents handle execution at scale while domain experts sharpen their accuracy. The product was ready. It needed a page that felt credible, structured and sharp to buyers allergic to vague AI promises.'] },
      { id: 'pain', h: 'Open with <em>pain</em>, not product',
        p: ['The hero anchors on a stat every enterprise buyer already feels: 68% of enterprises are stuck in AI pilot mode. It isn’t a feature pitch, it’s a mirror. From there the page builds an argument: why pilots fail → what AI-native operations look like → how EnterpriseOS gets you there → why you can trust it.'],
        img: ['assets/img/dec-01.png', 'assets/img/dec-02.png'] },
      { id: 'questions', h: 'Every section answers one buyer <em>question</em>',
        list: [
          ['What is this?', 'Platform overview with the two-layer model: agents + experts.'],
          ['How does it work?', 'A five-step implementation, visually sequenced.'],
          ['Can I trust the outputs?', 'The Helix reliability layer in three capability cards.'],
          ['Does it apply to my domain?', 'A use-case grid: compliance, HR, support, GCC operations.'],
          ['Who else uses this?', 'Named logos, a real testimonial, SOC2 / ISO 27001 / HIPAA / GDPR.'],
        ],
        img: ['assets/img/dec-05.png', 'assets/img/dec-06.png'] },
      { id: 'compound', h: 'Prove → Scale → <em>Compound</em>',
        p: ['An objection handler disguised as a product section. Enterprise buyers don’t want a platform overhaul on day one, so the adoption path says: start small, prove value on one workflow, then expand.'],
        img: ['assets/img/dec-07.png'],
        metrics: [['4', 'Days to design'], ['4', 'Buyer personas'], ['1', 'Page']] },
    ],
  },
};

const TESTIMONIALS = {
  omar: { name: 'Omar Alsafadi', role: 'Founder, Aria Music', img: 'assets/img/t-omar.jpg', quote: 'The best work I have ever gotten!' },
  prado: { name: 'Prado', role: 'Founder, Goatfish', img: 'assets/img/t-prado.jpg', quote: 'Puru, you’ve made it so smooth that none of us have any idea, yet the work is getting done.' },
  shreya: { name: 'Shreya Kukreja', role: 'Head of Product', img: 'assets/img/t-shreya.jpg', quote: 'Brings modern, thoughtful, and enduring designs at a fast pace while bringing creativity and strategic insight to every project. Moves effortlessly between high-level strategy and fine-grained details.' },
  shai: { name: 'Shai Krishna', role: 'Staff Product Designer @Sense', img: 'assets/img/t-shai.jpg', quote: 'I’ve had the chance to check out their design work, and it’s seriously impressive. He has a knack for understanding what users want and translating it into beautiful, functional designs. His attention to detail is remarkable.' },
};

// one-colour marks (black on transparent, trimmed). `ar` is width ÷ height, used to size them evenly;
// `mk` is how wide the symbol at the start of the wordmark is (÷ height), so a folder's avatar can show just that.
const LOGOS = [
  { name: 'Deccan AI', src: 'assets/img/logos/deccan.png', ar: 4.288, mk: 0.8 },
  { name: 'Sidecar', src: 'assets/img/logos/sidecar.png', ar: 3.697, mk: 1 },
  { name: 'Valley', src: 'assets/img/logos/valley.png', ar: 3.552 },
  { name: 'Induced', src: 'assets/img/logos/induced.png', ar: 6.076 },
  { name: 'Superteam', src: 'assets/img/logos/superteam.png', ar: 8.457, mk: 1.3 },
  { name: 'Goatfish', src: 'assets/img/logos/goatfish.png', ar: 0.891, mk: 0.891 },
];

const SNIPPETS = ['assets/img/snip-1.jpg', 'assets/img/snip-2.jpg', 'assets/img/snip-3.jpg', 'assets/img/snip-4.jpg'];

const EVENTS = [
  /* ── Inception ───────────────────────────────── */
  { id: 'what-could-37-be', date: '2024-08-05', type: 'note', row: 1, span: 2, highlight: true, tbc: true,
    title: 'figure out what 37degree could be',
    photos: ['assets/img/placeholder/start-1.jpg', 'assets/img/placeholder/start-2.jpg', 'assets/img/placeholder/start-3.jpg'],
    detail: 'A studio for founders who need design to move the business, not just decorate it. Small team, senior hands, shipped in days — not quarters.' },
  { id: 'q-design-led', date: '2024-08-05', type: 'quote', row: 4, span: 2,
    title: 'Design-led <em>growth</em> for Tech &amp; AI companies.' },
  { id: 'puru', date: '2024-08-19', type: 'person', person: 'puru', row: 2, span: 3, highlight: true, tbc: true,
    photos: ['assets/img/placeholder/puru-1.jpg', 'assets/img/placeholder/puru-2.jpg', 'assets/img/placeholder/puru-3.jpg'],
    title: 'Puru starts the studio' },
  { id: 'domain', date: '2024-09-02', type: 'milestone', row: 1, span: 2, highlight: true, tbc: true,
    title: '37degr.ee goes live' },
  { id: 'haneef', date: '2024-09-16', type: 'person', person: 'haneef', row: 3, span: 3, highlight: true, tbc: true,
    photos: ['assets/img/placeholder/haneef-1.jpg', 'assets/img/placeholder/haneef-2.jpg', 'assets/img/placeholder/haneef-3.jpg'],
    title: 'Haneef joins 37degree' },
  { id: 'trusted', date: '2024-10-07', type: 'logos', row: 1, span: 2, tbc: true,
    title: 'team trusted by the likes of' },
  { id: 'q-story', date: '2024-10-07', type: 'quote', row: 4, span: 2,
    title: 'we love a good <em>story</em>. what’s yours?' },
  { id: 't-shai', date: '2024-11-11', type: 'testimonial', who: 'shai', row: 2, span: 3, tbc: true },
  { id: 't-shreya', date: '2024-12-09', type: 'testimonial', who: 'shreya', row: 1, span: 3, tbc: true },

  /* ── KAMpanion · DemandFarm ──────────────────── */
  { id: 'case-kampanion', date: '2025-01-13', type: 'case', case: 'kampanion', row: 1, span: 4, highlight: true, tbc: true },
  { id: 'kam-teams', date: '2025-02-03', type: 'step', case: 'kampanion', section: 'teams', row: 2, span: 2, tbc: true,
    title: 'decision: ship the MVP inside Microsoft Teams' },
  { id: 'q-destination', date: '2025-02-03', type: 'quote', row: 5, span: 2,
    title: 'Don’t build a new <em>destination</em>.' },
  { id: 'kam-alpha', date: '2025-03-17', type: 'milestone', case: 'kampanion', section: 'teams', row: 1, span: 2, tbc: true,
    title: 'alpha ships', metric: '2 mo', sub: 'not 4+' },
  { id: 'kam-trust', date: '2025-04-21', type: 'step', case: 'kampanion', section: 'trust', row: 3, span: 2, tbc: true,
    title: 'every answer shows its sources' },
  { id: 't-omar', date: '2025-05-19', type: 'testimonial', who: 'omar', row: 1, span: 3, tbc: true },
  { id: 'snippets', date: '2025-06-02', type: 'snippets', row: 2, span: 4, tbc: true,
    title: 'motion snippets' },
  { id: 'kam-live', date: '2025-07-14', type: 'milestone', case: 'kampanion', section: 'impact', row: 1, span: 2, highlight: true, tbc: true,
    title: 'KAMpanion in the hands of enterprise account managers' },
  { id: 't-prado', date: '2025-08-11', type: 'testimonial', who: 'prado', row: 3, span: 3, tbc: true },

  /* ── Sidecar × IICS 2025 ─────────────────────── */
  { id: 'case-sidecar', date: '2025-09-08', type: 'case', case: 'sidecar', row: 1, span: 4, highlight: true, tbc: true },
  { id: 'side-call', date: '2025-09-08', type: 'note', row: 5, span: 2, tbc: true,
    title: 'Sidecar: “we launch at IICS. can you do everything?”',
    detail: 'No brand, no collateral, no landing page, no booth. Ten days on the clock.' },
  { id: 'side-brand', date: '2025-09-09', type: 'step', case: 'sidecar', section: 'schedule', row: 2, span: 2, tbc: true,
    title: 'day 1–2 · brand foundation' },
  { id: 'side-print', date: '2025-09-12', type: 'step', case: 'sidecar', section: 'print', row: 1, span: 3, img: 'assets/img/side-07.png', tbc: true,
    title: 'day 4–6 · booth, posters, print' },
  { id: 'side-video', date: '2025-09-14', type: 'video', src: 'assets/video/sidecar-explainer.mp4', poster: 'assets/img/side-cover.png', by: 'studio', row: 3, span: 2, tbc: true,
    title: 'sidecar-explainer.mp4' },
  { id: 'side-landing', date: '2025-09-17', type: 'step', case: 'sidecar', section: 'landing', row: 2, span: 2, tbc: true,
    title: 'day 8–10 · landing page, design + build' },
  { id: 'side-show', date: '2025-09-18', type: 'note', row: 1, span: 2, tbc: true,
    title: 'IICS 2025 · booth live in Mumbai',
    photos: ['assets/img/placeholder/iics-1.jpg', 'assets/img/placeholder/iics-2.jpg', 'assets/img/placeholder/iics-3.jpg'],
    detail: '200+ exhibitors. 25,000 trade visitors. Three days on the floor.' },
  { id: 'side-result', date: '2025-09-20', type: 'milestone', case: 'sidecar', section: 'result', row: 2, span: 2, highlight: true, tbc: true,
    title: 'pipeline from one show', metric: '$1M+' },

  { id: 'fifty', date: '2025-12-15', type: 'milestone', row: 2, span: 2, highlight: true, tbc: true,
    title: 'projects completed', metric: '50+', sub: '4.85 average rating',
    detail: 'Brand, product and launch work for founders across AI, SaaS and crypto, rated 4.85 on average by the people we built it with.' },

  /* ── Deccan AI · EnterpriseOS ────────────────── */
  { id: 'case-deccan', date: '2026-02-09', type: 'case', case: 'deccan', row: 1, span: 4, highlight: true, tbc: true },
  { id: 'dec-pain', date: '2026-02-10', type: 'step', case: 'deccan', section: 'pain', row: 2, span: 2, tbc: true,
    title: 'hero opens with pain: 68% stuck in AI pilot mode' },
  { id: 'q-question', date: '2026-02-11', type: 'quote', row: 1, span: 2,
    title: 'Every section answers one buyer <em>question</em>.' },
  { id: 'dec-live', date: '2026-02-12', type: 'milestone', case: 'deccan', section: 'compound', row: 3, span: 2, highlight: true, tbc: true,
    title: 'EnterpriseOS page live', sub: 'deccan.ai/enterprise-os' },
];
