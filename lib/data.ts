// Mock data for Belinda's world — candidates, jobs, opportunities

export const RESOURCES = {
  belinda: '/Belinda.jpeg',
  pA: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&q=80&auto=format&fit=crop',
  pB: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80&auto=format&fit=crop',
  pC: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80&auto=format&fit=crop',
  pD: 'https://images.unsplash.com/photo-1600878459138-e1123b37cb30?w=800&q=80&auto=format&fit=crop',
  pE: 'https://images.unsplash.com/photo-1614644147798-f8c0fc9da7f6?w=800&q=80&auto=format&fit=crop',
};

export type CandidateSignals = {
  wordOnStreet: string;
  chemistry: string;
  trajectory: string;
  gutNote: string;
};

export type CandidateExperience = {
  brand: string;
  role: string;
  years: string;
};

export type Candidate = {
  id: number;
  /** DB UUID — present only when sourced from Supabase, undefined on mocks. */
  dbId?: string;
  name: string;
  age: number;
  current: string;
  tenure: string;
  location: string;
  photo: string;
  nationalities: string[];
  languages: string[];
  experience: CandidateExperience[];
  pnl: string;
  keys: number;
  belindaRating: number;
  belindaTier: 'Black Book' | 'Inner circle' | 'Watching';
  tags: string[];
  signals: CandidateSignals;
  quote: string;
  availability: string;
  match: number;
};

export const CANDIDATES: Candidate[] = [
  {
    id: 1,
    name: 'Alessandra Marchetti',
    age: 47,
    current: 'Hotel Manager, Soho House Rome',
    tenure: '3 yrs',
    location: 'Rome → open to Europe',
    photo: RESOURCES.pA,
    nationalities: ['Italian', 'Swiss'],
    languages: ['IT', 'EN', 'FR', 'DE'],
    experience: [
      { brand: 'Soho House', role: 'Hotel Manager', years: '2023 —' },
      { brand: 'Aman', role: 'EAM', years: '2019 — 2023' },
      { brand: 'Rocco Forte', role: 'Director of Rooms', years: '2014 — 2019' },
      { brand: 'Four Seasons', role: 'Front Office Mgr', years: '2009 — 2014' },
    ],
    pnl: '€42M',
    keys: 184,
    belindaRating: 9.4,
    belindaTier: 'Black Book',
    tags: ['Rising star', 'Lifestyle fluent', 'Ops strength'],
    signals: {
      wordOnStreet: 'Staff adore her. Two of her F&B leads followed her from Aman.',
      chemistry: 'Warm, unflappable. Reads a room in three seconds.',
      trajectory: 'GM-ready. Has turned down two offers waiting for the right house.',
      gutNote: "If I were opening a hotel tomorrow, I'd call Alessandra first.",
    },
    quote: '"I don\'t run a hotel. I host a house."',
    availability: 'Quietly looking',
    match: 94,
  },
  {
    id: 2,
    name: 'James Okonkwo',
    age: 44,
    current: 'General Manager, The Ned NoMad',
    tenure: '2 yrs',
    location: 'New York → EU or MEA',
    photo: RESOURCES.pB,
    nationalities: ['British', 'Nigerian'],
    languages: ['EN', 'FR'],
    experience: [
      { brand: 'The Ned', role: 'General Manager', years: '2024 —' },
      { brand: 'Edition', role: 'Hotel Manager', years: '2020 — 2024' },
      { brand: 'Mandarin Oriental', role: 'Director of Operations', years: '2015 — 2020' },
    ],
    pnl: '$68M',
    keys: 167,
    belindaRating: 8.9,
    belindaTier: 'Black Book',
    tags: ['Pre-opening', 'Commercial', 'Media savvy'],
    signals: {
      wordOnStreet: 'Owners love him. Investors love him. The team works hard for him.',
      chemistry: 'Measured. Asks better questions than he answers.',
      trajectory: 'Ready for a flagship. Would thrive in London or Dubai.',
      gutNote: 'James is the GM you want when the owner is a handful.',
    },
    quote: '"Hospitality is a thousand small decisions a day. Get them right."',
    availability: 'Open to the right call',
    match: 91,
  },
  {
    id: 3,
    name: 'Ingrid Halvorsen',
    age: 51,
    current: 'General Manager, Six Senses Svart',
    tenure: '4 yrs',
    location: 'Norway → anywhere remote/wellness',
    photo: RESOURCES.pC,
    nationalities: ['Norwegian'],
    languages: ['NO', 'EN', 'DE', 'ES'],
    experience: [
      { brand: 'Six Senses', role: 'General Manager', years: '2022 —' },
      { brand: 'Aman', role: 'Hotel Manager', years: '2017 — 2022' },
      { brand: 'COMO', role: 'EAM', years: '2012 — 2017' },
    ],
    pnl: '€31M',
    keys: 94,
    belindaRating: 9.1,
    belindaTier: 'Inner circle',
    tags: ['Wellness DNA', 'Remote ops', 'Sustainability'],
    signals: {
      wordOnStreet: 'Built Svart from a hole in the ground. Delivered on time. In Norway.',
      chemistry: 'Quiet authority. The kind of person staff confide in.',
      trajectory: 'Ready for her second opening. Wants harder not bigger.',
      gutNote: 'Ingrid is who you put on a project everyone else said was impossible.',
    },
    quote: '"Luxury is the absence of friction, not the presence of gold."',
    availability: 'Exploring for 2026',
    match: 87,
  },
  {
    id: 4,
    name: 'Rafael Mendes',
    age: 42,
    current: 'Hotel Manager, Rosewood São Paulo',
    tenure: '2 yrs',
    location: 'São Paulo → LATAM, EU, ME',
    photo: RESOURCES.pD,
    nationalities: ['Brazilian', 'Portuguese'],
    languages: ['PT', 'ES', 'EN', 'IT'],
    experience: [
      { brand: 'Rosewood', role: 'Hotel Manager', years: '2024 —' },
      { brand: 'Fasano', role: 'Director of F&B', years: '2019 — 2024' },
      { brand: 'Belmond', role: 'F&B Manager', years: '2014 — 2019' },
    ],
    pnl: '$38M',
    keys: 122,
    belindaRating: 8.4,
    belindaTier: 'Watching',
    tags: ['F&B heavyweight', 'Charisma', 'Needs polish'],
    signals: {
      wordOnStreet: "The restaurant at Rosewood is booked six weeks out. That's him.",
      chemistry: "Electric in a room. Needs a CFO who'll tell him no.",
      trajectory: 'A year away from a first GM role. Rising fast.',
      gutNote: 'Not ready today. Call me about him in twelve months.',
    },
    quote: "\"Every guest should leave with a story they can't wait to tell.\"",
    availability: 'Happy — but curious',
    match: 78,
  },
  {
    id: 5,
    name: 'Sophie Laurent',
    age: 49,
    current: "General Manager, Claridge's Suites",
    tenure: '5 yrs',
    location: 'London → London only',
    photo: RESOURCES.pE,
    nationalities: ['French', 'British'],
    languages: ['FR', 'EN'],
    experience: [
      { brand: 'Maybourne', role: 'General Manager', years: '2021 —' },
      { brand: 'The Connaught', role: 'Hotel Manager', years: '2016 — 2021' },
      { brand: 'Le Bristol Paris', role: 'Director of Rooms', years: '2010 — 2016' },
    ],
    pnl: '£54M',
    keys: 136,
    belindaRating: 9.6,
    belindaTier: 'Black Book',
    tags: ['Old-world luxury', 'Royal clientele', 'Legend'],
    signals: {
      wordOnStreet: "The Queen's private secretary has her number. That's not a rumour.",
      chemistry: 'Impeccable. Never raises her voice. Never needs to.',
      trajectory: "Not moving. Unless it's Paris, and unless it's perfect.",
      gutNote: 'Sophie is a once-in-a-decade call. Do not waste it.',
    },
    quote: '"Discretion is the first luxury. Everything else follows."',
    availability: "Not looking — but she'll take Belinda's call",
    match: 96,
  },
];

export type Job = {
  id: string;
  hotel: string;
  city: string;
  brand: string;
  role: string;
  keys: number;
  opening: string;
  comp: string;
};

export const JOBS: Job[] = [
  {
    id: 'j1',
    hotel: 'The Carlyle Reserve',
    city: 'Lisbon',
    brand: 'Independent Luxury',
    role: 'General Manager',
    keys: 148,
    opening: 'Pre-opening · Q3 2026',
    comp: '€280k + bonus + housing',
  },
];

export const BELINDA_INTRO = {
  name: 'Belinda Doevenspeck',
  title: 'Managing Director, BD Talent Search',
  blurb: '40 years in hospitality recruitment. Amsterdam · London · Dubai.',
};

export type ChatMessage = { role: 'belinda' | 'me'; text: string };

export const BELINDA_CHAT_SEED: ChatMessage[] = [
  {
    role: 'belinda',
    text: 'Good morning. Tell me about the brief — what sort of house, what sort of owner, and when do you need someone in the chair?',
  },
];

export const BELINDA_RESPONSES: Record<string, string[]> = {
  alessandra: [
    "Alessandra is a yes from me. I've watched her since Four Seasons.",
    "She's the rare Italian operator who can run a lifestyle house without losing the soul of it. Soho House Rome was a mess before her.",
    "One caveat — she won't move for money. Tell me about the project and the owner.",
  ],
  james: [
    "James. Yes. He's on a shortlist I keep in my head for opening flagships.",
    "Owners like him because he talks numbers. Staff like him because he remembers their kids' names.",
    "He'll want a flagship, not a sleepy house. What's the deck on this one?",
  ],
  sophie: [
    "Sophie is my most protected contact. I don't send her briefs lightly.",
    'If you want me to call her, the property has to be extraordinary — Paris, Geneva, perhaps a private palazzo.',
    "Give me the one-pager and let me decide if it's worth her morning.",
  ],
  default: [
    'Let me think about who fits. A few names come to mind.',
    "I'd shortlist three: Alessandra Marchetti, Sophie Laurent, and — if the owner has patience — Ingrid Halvorsen.",
    "The real question isn't who's available. It's who's right for this house, this owner, this moment. Tell me more.",
  ],
  fit: [
    'Fit is the whole game. A CV tells you competence — fit tells you tenure.',
    "I look at three things: does the owner's temperament match the candidate's tolerance, does the house's soul match the candidate's instinct, and does the team they'll inherit want them there.",
    'The rest is logistics.',
  ],
  gut: [
    "Gut is pattern-matching on forty years of bad hires. Mine and other people's.",
    'I watch how a candidate treats the waiter at lunch. I read what isn\'t on the CV. I call two people who worked for them, not with them.',
    'And then — honestly — I sleep on it.',
  ],
};

export type VoiceQuery = {
  spoken: string;
  tags: string[];
  matchIds: number[];
  reasoning: string;
};

export const VOICE_QUERIES: VoiceQuery[] = [
  {
    spoken:
      "I'm looking for a GM with strong commercial acumen, German-speaking, lifestyle background, open to Europe.",
    tags: ['Commercial', 'DE-speaking', 'Lifestyle', 'EU mobile'],
    matchIds: [1, 2, 3],
    reasoning:
      '3 of 41 commercial-strong GMs in your network speak German fluently and have lifestyle credentials. Sorted by recency of contact.',
  },
];

export type Opportunity = {
  id: string;
  source: string;
  headline: string;
  when: string;
  why: string;
  /**
   * Mock rows use numeric Candidate.id; DB rows carry UUIDs that match
   * Candidate.dbId. OpportunityScreen tries both.
   */
  candidates: Array<number | string>;
  draft: string | null;
  cta: string;
  sourceUrl?: string;
};

export const OPPORTUNITIES: Opportunity[] = [
  {
    id: 'o1',
    source: 'Hotelier ME',
    headline: 'Aimbridge announces French portfolio expansion — 3 hotels by 2027',
    when: '2 hours ago',
    why: 'David Anderson mentioned this on your call. They use external search.',
    candidates: [1, 5],
    draft:
      'David — lovely to see you yesterday. I read the announcement on the French expansion. Two names you should meet before anyone else does — Alessandra Marchetti and Sophie Laurent. Both Europe-mobile, both in my Black Book. Coffee next week? — B',
    cta: 'Send to David Anderson',
  },
  {
    id: 'o2',
    source: 'Skift',
    headline: 'Faena Group exploring expansion to Mediterranean',
    when: 'Yesterday',
    why: 'Stefan Sundström mentioned a Faena project in conversation. You worked on a similar brief for St Regis.',
    candidates: [2, 4],
    draft:
      'Stefan — picking up on Faena. James Okonkwo is the obvious fit, and Rafael Mendes is the rising star you should meet. Drinks Thursday? — B',
    cta: 'Draft outreach to Stefan',
  },
  {
    id: 'o3',
    source: 'Industry whisper',
    headline: 'Kempinski Venice — current GM rumoured to be moving',
    when: '3 days ago',
    why: 'Backfill opportunity. Venice needs commercial + financial acumen — CEO is financially sharp.',
    candidates: [2, 5],
    draft: null,
    cta: 'Open brief',
  },
];

export type ExtractedItem = { type: string; label: string };

export const QUICK_CAPTURE_SAMPLE = {
  raw: "Just had coffee with Stefan Sundström. He's running point on the new Faena project in the Med. Wants someone with Latin sensibility, F&B-led, must speak Italian or Spanish. Mentioned the budget is healthy. Also — heads up — David Anderson at Aimbridge dropped that France thing again on the way out. Need to move on that this week.",
  extracted: [
    { type: 'brief', label: 'New brief: Faena Med — F&B-led GM, Latin background, IT/ES' },
    { type: 'contact', label: 'Stefan Sundström — Faena Group · Active' },
    { type: 'opportunity', label: 'Aimbridge France — David Anderson · Move this week' },
    { type: 'tag', label: '+ tag "Latin sensibility" added to candidate taxonomy' },
  ] as ExtractedItem[],
};
