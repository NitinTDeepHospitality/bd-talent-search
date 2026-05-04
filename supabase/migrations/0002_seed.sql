-- Seed: 5 target companies, 5 candidates, 1 active brief.
-- Re-runnable: deletes its own rows first.

begin;

-- Wipe seed-managed rows (only what we re-insert).
delete from candidate_signals
  where candidate_id in (select id from candidates where name = any (array[
    'Alessandra Marchetti','James Okonkwo','Ingrid Halvorsen','Rafael Mendes','Sophie Laurent'
  ]));
delete from candidate_experience
  where candidate_id in (select id from candidates where name = any (array[
    'Alessandra Marchetti','James Okonkwo','Ingrid Halvorsen','Rafael Mendes','Sophie Laurent'
  ]));
delete from candidate_tags
  where candidate_id in (select id from candidates where name = any (array[
    'Alessandra Marchetti','James Okonkwo','Ingrid Halvorsen','Rafael Mendes','Sophie Laurent'
  ]));
delete from candidates where name = any (array[
  'Alessandra Marchetti','James Okonkwo','Ingrid Halvorsen','Rafael Mendes','Sophie Laurent'
]);
delete from briefs where hotel_name = 'The Carlyle Reserve';
delete from companies where name = any (array[
  'Aimbridge Hospitality','Faena','Kempinski','Rosewood Hotel Group','Maybourne'
]);

-- ─── Companies (target operators) ───────────────────────────────────────
insert into companies (id, name, type, no_internal_ta, hq_city, notes) values
  (gen_random_uuid(), 'Aimbridge Hospitality', 'third_party_operator', true, 'Plano, TX',  'David Anderson, President. French expansion announced.'),
  (gen_random_uuid(), 'Faena',                 'luxury_collection',    true, 'Buenos Aires','Stefan Sundström running Med expansion.'),
  (gen_random_uuid(), 'Kempinski',             'luxury_collection',    true, 'Geneva',      'Venice GM rumoured to be moving — backfill brief.'),
  (gen_random_uuid(), 'Rosewood Hotel Group',  'luxury_collection',    true, 'Hong Kong',   'Mid-size, no internal recruiter for GM-tier moves.'),
  (gen_random_uuid(), 'Maybourne',             'luxury_collection',    true, 'London',      'Sophie Laurent currently here.');

-- ─── Candidates ─────────────────────────────────────────────────────────
-- Photo URLs match the prototype's Unsplash references.
insert into candidates (
  name, age, current_title, current_hotel, tenure, location, photo_url,
  nationalities, languages, pnl, keys,
  belinda_rating, belinda_tier, quote, availability
) values
  ('Alessandra Marchetti', 47, 'Hotel Manager', 'Soho House Rome', '3 yrs', 'Rome → open to Europe',
   'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&q=80&auto=format&fit=crop',
   array['Italian','Swiss'], array['IT','EN','FR','DE'], '€42M', 184,
   9.4, 'black_book', 'I don''t run a hotel. I host a house.', 'Quietly looking'),

  ('James Okonkwo', 44, 'General Manager', 'The Ned NoMad', '2 yrs', 'New York → EU or MEA',
   'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80&auto=format&fit=crop',
   array['British','Nigerian'], array['EN','FR'], '$68M', 167,
   8.9, 'black_book', 'Hospitality is a thousand small decisions a day. Get them right.', 'Open to the right call'),

  ('Ingrid Halvorsen', 51, 'General Manager', 'Six Senses Svart', '4 yrs', 'Norway → anywhere remote/wellness',
   'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80&auto=format&fit=crop',
   array['Norwegian'], array['NO','EN','DE','ES'], '€31M', 94,
   9.1, 'inner_circle', 'Luxury is the absence of friction, not the presence of gold.', 'Exploring for 2026'),

  ('Rafael Mendes', 42, 'Hotel Manager', 'Rosewood São Paulo', '2 yrs', 'São Paulo → LATAM, EU, ME',
   'https://images.unsplash.com/photo-1600878459138-e1123b37cb30?w=800&q=80&auto=format&fit=crop',
   array['Brazilian','Portuguese'], array['PT','ES','EN','IT'], '$38M', 122,
   8.4, 'watching', 'Every guest should leave with a story they can''t wait to tell.', 'Happy — but curious'),

  ('Sophie Laurent', 49, 'General Manager', 'Claridge''s Suites', '5 yrs', 'London → London only',
   'https://images.unsplash.com/photo-1614644147798-f8c0fc9da7f6?w=800&q=80&auto=format&fit=crop',
   array['French','British'], array['FR','EN'], '£54M', 136,
   9.6, 'black_book', 'Discretion is the first luxury. Everything else follows.', 'Not looking — but she''ll take Belinda''s call');

-- ─── Career history ─────────────────────────────────────────────────────
insert into candidate_experience (candidate_id, brand, role, years, ord)
select id, v.brand, v.role, v.years, v.ord
from candidates,
     lateral (
       select * from (values
         ('Alessandra Marchetti', 'Soho House',     'Hotel Manager',         '2023 —',     0),
         ('Alessandra Marchetti', 'Aman',           'EAM',                   '2019 — 2023',1),
         ('Alessandra Marchetti', 'Rocco Forte',    'Director of Rooms',     '2014 — 2019',2),
         ('Alessandra Marchetti', 'Four Seasons',   'Front Office Mgr',      '2009 — 2014',3),
         ('James Okonkwo',        'The Ned',        'General Manager',       '2024 —',     0),
         ('James Okonkwo',        'Edition',        'Hotel Manager',         '2020 — 2024',1),
         ('James Okonkwo',        'Mandarin Oriental','Director of Operations','2015 — 2020',2),
         ('Ingrid Halvorsen',     'Six Senses',     'General Manager',       '2022 —',     0),
         ('Ingrid Halvorsen',     'Aman',           'Hotel Manager',         '2017 — 2022',1),
         ('Ingrid Halvorsen',     'COMO',           'EAM',                   '2012 — 2017',2),
         ('Rafael Mendes',        'Rosewood',       'Hotel Manager',         '2024 —',     0),
         ('Rafael Mendes',        'Fasano',         'Director of F&B',       '2019 — 2024',1),
         ('Rafael Mendes',        'Belmond',        'F&B Manager',           '2014 — 2019',2),
         ('Sophie Laurent',       'Maybourne',      'General Manager',       '2021 —',     0),
         ('Sophie Laurent',       'The Connaught',  'Hotel Manager',         '2016 — 2021',1),
         ('Sophie Laurent',       'Le Bristol Paris','Director of Rooms',    '2010 — 2016',2)
       ) as v(name, brand, role, years, ord)
       where v.name = candidates.name
     ) v;

-- ─── Tags ───────────────────────────────────────────────────────────────
insert into candidate_tags (candidate_id, axis, value, source)
select c.id, v.axis, v.value, 'imported'
from candidates c,
     lateral (
       select * from (values
         ('Alessandra Marchetti', 'expertise', 'Rising star'),
         ('Alessandra Marchetti', 'expertise', 'Lifestyle fluent'),
         ('Alessandra Marchetti', 'expertise', 'Ops strength'),
         ('James Okonkwo',        'expertise', 'Pre-opening'),
         ('James Okonkwo',        'expertise', 'Commercial'),
         ('James Okonkwo',        'expertise', 'Media savvy'),
         ('Ingrid Halvorsen',     'expertise', 'Wellness DNA'),
         ('Ingrid Halvorsen',     'expertise', 'Remote ops'),
         ('Ingrid Halvorsen',     'expertise', 'Sustainability'),
         ('Rafael Mendes',        'expertise', 'F&B heavyweight'),
         ('Rafael Mendes',        'expertise', 'Charisma'),
         ('Rafael Mendes',        'expertise', 'Needs polish'),
         ('Sophie Laurent',       'expertise', 'Old-world luxury'),
         ('Sophie Laurent',       'expertise', 'Royal clientele'),
         ('Sophie Laurent',       'expertise', 'Legend')
       ) as v(name, axis, value)
       where v.name = c.name
     ) v;

-- ─── Signals (Belinda's notes) ──────────────────────────────────────────
insert into candidate_signals (candidate_id, type, note, source)
select c.id, v.type::signal_type, v.note, 'note'
from candidates c,
     lateral (
       select * from (values
         ('Alessandra Marchetti', 'word_on_street', 'Staff adore her. Two of her F&B leads followed her from Aman.'),
         ('Alessandra Marchetti', 'chemistry',      'Warm, unflappable. Reads a room in three seconds.'),
         ('Alessandra Marchetti', 'trajectory',     'GM-ready. Has turned down two offers waiting for the right house.'),
         ('Alessandra Marchetti', 'gut_note',       'If I were opening a hotel tomorrow, I''d call Alessandra first.'),
         ('James Okonkwo',        'word_on_street', 'Owners love him. Investors love him. The team works hard for him.'),
         ('James Okonkwo',        'chemistry',      'Measured. Asks better questions than he answers.'),
         ('James Okonkwo',        'trajectory',     'Ready for a flagship. Would thrive in London or Dubai.'),
         ('James Okonkwo',        'gut_note',       'James is the GM you want when the owner is a handful.'),
         ('Ingrid Halvorsen',     'word_on_street', 'Built Svart from a hole in the ground. Delivered on time. In Norway.'),
         ('Ingrid Halvorsen',     'chemistry',      'Quiet authority. The kind of person staff confide in.'),
         ('Ingrid Halvorsen',     'trajectory',     'Ready for her second opening. Wants harder not bigger.'),
         ('Ingrid Halvorsen',     'gut_note',       'Ingrid is who you put on a project everyone else said was impossible.'),
         ('Rafael Mendes',        'word_on_street', 'The restaurant at Rosewood is booked six weeks out. That''s him.'),
         ('Rafael Mendes',        'chemistry',      'Electric in a room. Needs a CFO who''ll tell him no.'),
         ('Rafael Mendes',        'trajectory',     'A year away from a first GM role. Rising fast.'),
         ('Rafael Mendes',        'gut_note',       'Not ready today. Call me about him in twelve months.'),
         ('Sophie Laurent',       'word_on_street', 'The Queen''s private secretary has her number. That''s not a rumour.'),
         ('Sophie Laurent',       'chemistry',      'Impeccable. Never raises her voice. Never needs to.'),
         ('Sophie Laurent',       'trajectory',     'Not moving. Unless it''s Paris, and unless it''s perfect.'),
         ('Sophie Laurent',       'gut_note',       'Sophie is a once-in-a-decade call. Do not waste it.')
       ) as v(name, type, note)
       where v.name = c.name
     ) v;

-- ─── Active brief ───────────────────────────────────────────────────────
insert into briefs (hotel_name, role, city, opening_date, comp, status, requirements_text)
values (
  'The Carlyle Reserve',
  'General Manager',
  'Lisbon',
  'Pre-opening · Q3 2026',
  '€280k + bonus + housing',
  'open',
  '148 keys, independent luxury, pre-opening.'
);

commit;
