-- ============================================================
-- SHOWBEE SEED DATA
-- Member 2 (Movie/Data) Responsibility
-- ============================================================

-- Languages
INSERT INTO languages (name, code) VALUES
  ('Telugu', 'tel'),
  ('Tamil', 'tam'),
  ('Kannada', 'kan'),
  ('Hindi', 'hin'),
  ('English', 'eng')
ON CONFLICT (code) DO NOTHING;

-- Genres
INSERT INTO genres (name, slug) VALUES
  ('Action', 'action'),
  ('Drama', 'drama'),
  ('Comedy', 'comedy'),
  ('Romance', 'romance'),
  ('Thriller', 'thriller'),
  ('Horror', 'horror'),
  ('Sports', 'sports'),
  ('Family', 'family'),
  ('Crime', 'crime'),
  ('Biography', 'biography'),
  ('History', 'history'),
  ('Music', 'music'),
  ('Mystery', 'mystery'),
  ('Musical', 'musical')
ON CONFLICT (slug) DO NOTHING;

-- Seat Types
INSERT INTO seat_types (name, price_multiplier) VALUES
  ('REGULAR', 1.0),
  ('PREMIUM', 1.5),
  ('RECLINER', 2.0),
  ('VIP', 2.5)
ON CONFLICT DO NOTHING;

-- Admin User
INSERT INTO users (name, email, phone, password_hash, role) VALUES
  ('ShowBee Admin', 'admin@showbee.com', '9999999999',
   '$2b$10$I6.985GUw5uDeKMW9A0vcOVoIvnyL.RGkX2E1IfC5u.luAoPGdr6y', -- password: Admin@123
   'ADMIN')
ON CONFLICT (email) DO NOTHING;

-- Test User
INSERT INTO users (name, email, phone, password_hash, role) VALUES
  ('Test User', 'user@showbee.com', '8888888888',
   '$2b$10$I6.985GUw5uDeKMW9A0vcOVoIvnyL.RGkX2E1IfC5u.luAoPGdr6y', -- password: Admin@123
   'USER')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 22 MOVIES (Member 2 Responsibility)
-- ============================================================

-- MOVIE 1: IRUMUDI
INSERT INTO movies (id, title, synopsis, director, writer, duration_mins, release_date, rating, language_id, country, trailer_url, poster_url, banner_url, status, is_published, is_trending)
VALUES (
  'a1000000-0000-0000-0000-000000000001',
  'IRUMUDI',
  'Trinadh, a resident of Polluru and a devoted Ayyappa Swamy follower, owns a banana plantation and shares a deep bond with his daughter, Manemma. She tells her father everything, often drawing him into conflicts with others. When Manemma and the village girls travel to a neighbouring village for high school, a series of unexpected incidents unfolds, forcing Trinadh to step into action and confront the challenges that come their way.',
  'Shiva Nirvana', 'Shiva Nirvana', 142, '2025-09-05', 8.2,
  (SELECT id FROM languages WHERE code='tel'),
  'India', 'https://www.youtube.com/watch?v=CSXhb2zhfLc',
  '/movies/irumudi.jpg', '/movies/irumudi.jpg',
  'NOW_SHOWING', TRUE, TRUE
) ON CONFLICT (id) DO NOTHING;

-- MOVIE 2: HI
INSERT INTO movies (id, title, synopsis, director, writer, duration_mins, release_date, rating, language_id, country, trailer_url, poster_url, banner_url, status, is_published, is_trending)
VALUES (
  'a1000000-0000-0000-0000-000000000002',
  'HI',
  'Subrahmanyam, a gentle and timid young man from Rajahmundry, has faced rejection from girls at every stage of his life. When his parents arrange his marriage, he decides to run away from home. Meanwhile, Devasena, a brave and determined woman from Bhimavaram, escapes from an arranged marriage she never wanted. Their paths cross in Hyderabad, setting the stage for an unexpected journey between two people who were both trying to escape the lives chosen for them.',
  'Vishnu Edavan', 'Vishnu Edavan, C.U. Muthuselvan', 138, '2025-09-05', 8.0,
  (SELECT id FROM languages WHERE code='tel'),
  'India', 'https://www.youtube.com/watch?v=LVmH0rgWZb8',
  '/movies/hi.jpg', '/movies/hi.jpg',
  'NOW_SHOWING', TRUE, TRUE
) ON CONFLICT (id) DO NOTHING;

-- MOVIE 3: PEDDI
INSERT INTO movies (id, title, synopsis, director, writer, duration_mins, release_date, rating, language_id, country, trailer_url, poster_url, banner_url, status, is_published, is_trending)
VALUES (
  'a1000000-0000-0000-0000-000000000003',
  'PEDDI',
  'Set in 2016, the Ministry of Youth Affairs and Sports launches a nationwide initiative to identify exceptional sporting talent following India''s disappointing Olympic performance. As part of this mission, sports official Mr. Paiswal travels to Vizianagaram, where he hears about Peddi, a jaggery worker from a remote, unrecognized village who is renowned for his remarkable skills across multiple sports.',
  'Buchi Babu Sana', 'Buchi Babu Sana', 165, '2025-09-05', 8.6,
  (SELECT id FROM languages WHERE code='tel'),
  'India', 'https://www.youtube.com/watch?v=sF2dj7ycZvA',
  '/movies/peddi.jpg', '/movies/peddi.jpg',
  'NOW_SHOWING', TRUE, TRUE
) ON CONFLICT (id) DO NOTHING;

-- MOVIE 4: LENIN
INSERT INTO movies (id, title, synopsis, director, writer, duration_mins, release_date, rating, language_id, country, trailer_url, poster_url, banner_url, status, is_published, is_trending)
VALUES (
  'a1000000-0000-0000-0000-000000000004',
  'LENIN',
  'Set in 1989 in Sri Ramapuram, Chittoor, Lenin follows an orphan raised by Jayanthi alongside her son, Vasanth, a doctor. During the annual Bharatam Mitta celebrations, Lenin falls in love with Bharathi, who returns his feelings. Just as everything seems to be falling into place, Lenin uncovers shocking truths about the people closest to him.',
  'Murali Kishor Abburu', 'Murali Kishor Abburu, Elena Yatsura', 148, '2025-09-05', 7.9,
  (SELECT id FROM languages WHERE code='tel'),
  'India', 'https://www.youtube.com/watch?v=9m0LD8sS6b4',
  '/movies/lenin.jpg', '/movies/lenin.jpg',
  'NOW_SHOWING', TRUE, TRUE
) ON CONFLICT (id) DO NOTHING;

-- MOVIE 5: BIKER
INSERT INTO movies (id, title, synopsis, director, writer, duration_mins, release_date, rating, language_id, country, trailer_url, poster_url, banner_url, status, is_published, is_trending)
VALUES (
  'a1000000-0000-0000-0000-000000000005',
  'BIKER',
  'Vikas Narayan, also known as Vikky, is a top-class motocross racer. Since childhood, he has been trained rigorously by his father, Sunil Narayan. However, Vikky suddenly leaves the sport, putting his father in a difficult position.',
  'Abhilash Reddy Kankara', 'MVS Bharadwaj, Abhilash Reddy Kankara, Shravan Madala', 145, '2025-09-12', 8.1,
  (SELECT id FROM languages WHERE code='tel'),
  'India', 'https://www.youtube.com/watch?v=IBl_MIY3l88',
  '/movies/biker.jpg', '/movies/biker.jpg',
  'NOW_SHOWING', TRUE, TRUE
) ON CONFLICT (id) DO NOTHING;

-- MOVIE 6: VISHWANATH AND SONS
INSERT INTO movies (id, title, synopsis, director, writer, duration_mins, release_date, rating, language_id, country, trailer_url, poster_url, banner_url, status, is_published, is_trending)
VALUES (
  'a1000000-0000-0000-0000-000000000006',
  'VISHWANATH AND SONS',
  'Sanjay Vishwanath is a prominent industrialist and a professional pistol shooter. His mother wants him to get married, but Sanjay has a negative opinion of marriage. That is when Maddy enters his life and grows closer to him. The rest of the film revolves around family drama and the emotional dynamics between the lead pair.',
  'Venky Atluri', 'Venky Atluri, K N Vijayakumar', 155, '2025-09-05', 8.3,
  (SELECT id FROM languages WHERE code='tam'),
  'India', 'https://www.youtube.com/watch?v=ejX6MHgKAlM',
  '/movies/vishwanath-and-sons.jpg', '/movies/vishwanath-and-sons.jpg',
  'NOW_SHOWING', TRUE, FALSE
) ON CONFLICT (id) DO NOTHING;

-- MOVIE 7: ANANTHAN KAADU
INSERT INTO movies (id, title, synopsis, director, writer, duration_mins, release_date, rating, language_id, country, trailer_url, poster_url, banner_url, status, is_published, is_trending)
VALUES (
  'a1000000-0000-0000-0000-000000000007',
  'ANANTHAN KAADU',
  'Set against the socio-political landscape of the 1980s and 1990s, this gripping drama weaves together themes of ambition, survival, violence, and retribution. As choices made in desperation set powerful forces in motion, the story unfolds into a compelling journey where karma relentlessly pursues those trying to outrun their past.',
  'Jiyen Krishnakumar', 'Murali Gopy', 152, '2025-09-12', 7.8,
  (SELECT id FROM languages WHERE code='tam'),
  'India', 'https://www.youtube.com/watch?v=Eqjkj5uLNv0',
  '/movies/ananthan-kaadu.jpg', '/movies/ananthan-kaadu.jpg',
  'NOW_SHOWING', TRUE, FALSE
) ON CONFLICT (id) DO NOTHING;

-- MOVIE 8: ANGIKAARAM
INSERT INTO movies (id, title, synopsis, director, writer, duration_mins, release_date, rating, language_id, country, trailer_url, poster_url, banner_url, status, is_published, is_trending)
VALUES (
  'a1000000-0000-0000-0000-000000000008',
  'ANGIKAARAM',
  'Inspired by true events, this film follows the journey of a man who has had enough, fights for recognition against a system shaped strictly by politics and power.',
  'Thenpathiyan', 'Thenpathiyan', 128, '2025-09-19', 7.5,
  (SELECT id FROM languages WHERE code='tam'),
  'India', 'https://www.youtube.com/watch?v=xVyMza6j0Nk',
  '/movies/angikaaram.jpg', '/movies/angikaaram.jpg',
  'COMING_SOON', TRUE, FALSE
) ON CONFLICT (id) DO NOTHING;

-- MOVIE 9: PYAAR PREMA KALYANAM
INSERT INTO movies (id, title, synopsis, director, writer, duration_mins, release_date, rating, language_id, country, trailer_url, poster_url, banner_url, status, is_published, is_trending)
VALUES (
  'a1000000-0000-0000-0000-000000000009',
  'PYAAR PREMA KALYANAM',
  'Influencer Pavi refuses to leave her family home after marriage, so husband Elan moves in instead. Culture clashes and family chaos ensue as the newlyweds navigate their unconventional setup and challenge who defines their happiness.',
  'Elan', 'Elan, Nivedita Pohankar', 132, '2025-09-05', 7.6,
  (SELECT id FROM languages WHERE code='tam'),
  'India', 'https://www.youtube.com/watch?v=n65bXlvrHlo',
  '/movies/pyaar-prema-kalyanam.jpg', '/movies/pyaar-prema-kalyanam.jpg',
  'NOW_SHOWING', TRUE, FALSE
) ON CONFLICT (id) DO NOTHING;

-- MOVIE 10: DARK
INSERT INTO movies (id, title, synopsis, director, writer, duration_mins, release_date, rating, language_id, country, trailer_url, poster_url, banner_url, status, is_published, is_trending)
VALUES (
  'a1000000-0000-0000-0000-000000000010',
  'DARK',
  'Follows an atheist whose life descends into terror after relocating to a mysterious home with a troubled past. A startling crime forces him to face the paranormal and reevaluate his beliefs.',
  'Kalyan K. Jegan', 'Ganesh K. Babu, Kalyan K. Jegan', 125, '2025-09-26', 7.4,
  (SELECT id FROM languages WHERE code='tam'),
  'India', 'https://www.youtube.com/watch?v=fKUPkoYkhII',
  '/movies/dark.jpg', '/movies/dark.jpg',
  'COMING_SOON', TRUE, FALSE
) ON CONFLICT (id) DO NOTHING;

-- MOVIE 11: KD: THE DEVIL
INSERT INTO movies (id, title, synopsis, director, writer, duration_mins, release_date, rating, language_id, country, trailer_url, poster_url, banner_url, status, is_published, is_trending)
VALUES (
  'a1000000-0000-0000-0000-000000000011',
  'KD: THE DEVIL',
  'KD-The Devil story revolves around a good natured individual and how his life changes following the missteps and how he handles them. Kaalidasa aka Kaali aka KD due to circumstances starts idolising Dhak Deva, who wields an iron like grip in and around Bengaluru.',
  'Manjunath BS, PremRavi Saranga', 'Vijay Eshwar, Kraanti Kumar, Prem', 168, '2025-09-05', 8.4,
  (SELECT id FROM languages WHERE code='kan'),
  'India', 'https://www.youtube.com/watch?v=dj7BEXmgwuM',
  '/movies/kd-the-devil.jpg', '/movies/kd-the-devil.jpg',
  'NOW_SHOWING', TRUE, TRUE
) ON CONFLICT (id) DO NOTHING;

-- MOVIE 12: SUPER HIT
INSERT INTO movies (id, title, synopsis, director, writer, duration_mins, release_date, rating, language_id, country, trailer_url, poster_url, banner_url, status, is_published, is_trending)
VALUES (
  'a1000000-0000-0000-0000-000000000012',
  'SUPER HIT',
  'When a journalist goes missing, suspicion falls on the elusive Big Brothers. A chance encounter pulls Satya, Madhu, and Munna Bhai into a wild ride—ending in a courtroom where secrets collide.',
  'Vijayanand', 'Vijayanand', 130, '2025-09-12', 7.3,
  (SELECT id FROM languages WHERE code='kan'),
  'India', 'https://www.youtube.com/watch?v=yaKoo0irCiA',
  '/movies/super-hit.jpg', '/movies/super-hit.jpg',
  'NOW_SHOWING', TRUE, FALSE
) ON CONFLICT (id) DO NOTHING;

-- MOVIE 13: ALPHA
INSERT INTO movies (id, title, synopsis, director, writer, duration_mins, release_date, rating, language_id, country, trailer_url, poster_url, banner_url, status, is_published, is_trending)
VALUES (
  'a1000000-0000-0000-0000-000000000013',
  'ALPHA',
  'Arjun is impulsive and restless, a young man who admires his father yet resists the path set for him. His father, Shakthi Prasad, an upright police inspector, hopes to see him become an IPS officer, and that quiet mix of pride and pressure defines their relationship.',
  'Vijay Naagendra', 'Masthi', 140, '2025-09-05', 7.7,
  (SELECT id FROM languages WHERE code='kan'),
  'India', 'https://www.youtube.com/watch?v=lJmd1S5tst8',
  '/movies/alpha.jpg', '/movies/alpha.jpg',
  'NOW_SHOWING', TRUE, FALSE
) ON CONFLICT (id) DO NOTHING;

-- MOVIE 14: AMRUTHAANJAN
INSERT INTO movies (id, title, synopsis, director, writer, duration_mins, release_date, rating, language_id, country, trailer_url, poster_url, banner_url, status, is_published, is_trending)
VALUES (
  'a1000000-0000-0000-0000-000000000014',
  'AMRUTHAANJAN',
  'Friendship breaks rules, love breaks logic, and a father-son bond breaks all expectations, turning an ordinary life into a crazy, hilarious, and heartwarming ride that promises pure family entertainment.',
  'Jothirao Mohit', 'Jothirao Mohit', 122, '2025-09-19', 7.2,
  (SELECT id FROM languages WHERE code='kan'),
  'India', 'https://www.youtube.com/watch?v=CNOvR4jpDXU',
  '/movies/amruthaanjan.jpg', '/movies/amruthaanjan.jpg',
  'COMING_SOON', TRUE, FALSE
) ON CONFLICT (id) DO NOTHING;

-- MOVIE 15: THE RISE OF ASHOKA
INSERT INTO movies (id, title, synopsis, director, writer, duration_mins, release_date, rating, language_id, country, trailer_url, poster_url, banner_url, status, is_published, is_trending)
VALUES (
  'a1000000-0000-0000-0000-000000000015',
  'THE RISE OF ASHOKA',
  'An educated young man abandons his dream of becoming a government officer to protect his village from a ruthless "hair mafia." He takes up arms to fight deep-rooted caste exploitation and secure justice for his community.',
  'Vinod Dhondale, Manu Shedgar', 'T.K. Dayanand', 155, '2025-09-26', 7.6,
  (SELECT id FROM languages WHERE code='kan'),
  'India', 'https://www.youtube.com/watch?v=k4X8z0hWQ4I',
  '/movies/the-rise-of-ashoka.jpg', '/movies/the-rise-of-ashoka.jpg',
  'COMING_SOON', TRUE, FALSE
) ON CONFLICT (id) DO NOTHING;

-- MOVIE 16: EVIL DEAD BURN
INSERT INTO movies (id, title, synopsis, director, writer, duration_mins, release_date, rating, language_id, country, trailer_url, poster_url, banner_url, status, is_published, is_trending)
VALUES (
  'a1000000-0000-0000-0000-000000000016',
  'EVIL DEAD BURN',
  'A grieving young widow seeks solace with her in-laws at a secluded winter home, only to find herself trapped in a nightmarish battle against demonic forces. As terrifying possessions and relentless horrors unfold, she must fight to survive a deadly ordeal where evil lurks around every corner.',
  'Sébastien Vanicek', 'Sébastien Vanicek, Florent Bernard', 110, '2025-09-12', 7.8,
  (SELECT id FROM languages WHERE code='eng'),
  'USA', 'https://www.youtube.com/watch?v=TnHby2cxJzs',
  '/movies/evil-dead-burn.jpg', '/movies/evil-dead-burn.jpg',
  'NOW_SHOWING', TRUE, FALSE
) ON CONFLICT (id) DO NOTHING;

-- MOVIE 17: THE FURIOUS
INSERT INTO movies (id, title, synopsis, director, writer, duration_mins, release_date, rating, language_id, country, trailer_url, poster_url, banner_url, status, is_published, is_trending)
VALUES (
  'a1000000-0000-0000-0000-000000000017',
  'THE FURIOUS',
  'A father fights fiercely against ruthless kidnappers to save his abducted daughter.',
  'Kenji Tanigaki', 'Tin Shu Mak, Zhilong Lei, Kwan-Sin Shum', 108, '2025-09-05', 7.5,
  (SELECT id FROM languages WHERE code='eng'),
  'China', 'https://www.youtube.com/watch?v=Avky8dVaqAI',
  '/movies/the-furious.jpg', '/movies/the-furious.jpg',
  'NOW_SHOWING', TRUE, FALSE
) ON CONFLICT (id) DO NOTHING;

-- MOVIE 18: OBSESSION
INSERT INTO movies (id, title, synopsis, director, writer, duration_mins, release_date, rating, language_id, country, trailer_url, poster_url, banner_url, status, is_published, is_trending)
VALUES (
  'a1000000-0000-0000-0000-000000000018',
  'OBSESSION',
  'After breaking the mysterious One Wish Willow to win his crush''s heart, a hopeless romantic gets exactly what he wished for. But as strange and sinister events begin to unfold, he realizes that some desires come with a terrifying price.',
  'Curry Barker', 'Curry Barker', 98, '2025-09-19', 7.1,
  (SELECT id FROM languages WHERE code='eng'),
  'USA', 'https://www.youtube.com/watch?v=gMC8kkwbIQQ',
  '/movies/obsession.jpg', '/movies/obsession.jpg',
  'COMING_SOON', TRUE, FALSE
) ON CONFLICT (id) DO NOTHING;

-- MOVIE 19: NORMAL
INSERT INTO movies (id, title, synopsis, director, writer, duration_mins, release_date, rating, language_id, country, trailer_url, poster_url, banner_url, status, is_published, is_trending)
VALUES (
  'a1000000-0000-0000-0000-000000000019',
  'NORMAL',
  'Normal is a neo-Western thriller that stars Bob Odenkirk as Ulysses, an unassuming substitute sheriff assigned to the quiet Midwestern town of Normal. Seeking a temporary escape from personal and professional turmoil, Ulysses instead finds himself drawn into a crisis when a botched bank robbery exposes a dangerous secret beneath the town''s calm exterior.',
  'Ben Wheatley', 'Derek Kolstad, Bob Odenkirk', 118, '2025-09-05', 7.9,
  (SELECT id FROM languages WHERE code='eng'),
  'USA', 'https://www.youtube.com/watch?v=5OndK0w1lYY',
  '/movies/normal.jpg', '/movies/normal.jpg',
  'NOW_SHOWING', TRUE, FALSE
) ON CONFLICT (id) DO NOTHING;

-- MOVIE 20: MICHAEL
INSERT INTO movies (id, title, synopsis, director, writer, duration_mins, release_date, rating, language_id, country, trailer_url, poster_url, banner_url, status, is_published, is_trending)
VALUES (
  'a1000000-0000-0000-0000-000000000020',
  'MICHAEL',
  'Michael chronicles the life of Michael Jackson, tracing his rise from a gifted young performer to one of the most celebrated entertainers in history. The film explores the defining moments of his career, the challenges he faced behind the spotlight, and the creative drive that fueled his groundbreaking music and performances.',
  'Antoine Fuqua', 'John Logan', 148, '2025-10-03', 8.5,
  (SELECT id FROM languages WHERE code='eng'),
  'USA', 'https://www.youtube.com/watch?v=3zOLzsbOleM',
  '/movies/michael.jpg', '/movies/michael.jpg',
  'COMING_SOON', TRUE, FALSE
) ON CONFLICT (id) DO NOTHING;

-- MOVIE 21: SHELTER
INSERT INTO movies (id, title, synopsis, director, writer, duration_mins, release_date, rating, language_id, country, trailer_url, poster_url, banner_url, status, is_published, is_trending)
VALUES (
  'a1000000-0000-0000-0000-000000000021',
  'SHELTER',
  'Michael Mason is a recluse on a remote Scottish island who rescues a girl from the sea, unleashing a perilous sequence of events that culminate in an attack on his home, compelling him to face his turbulent history.',
  'Ric Roman Waugh', 'Ward Parry', 112, '2025-09-19', 7.7,
  (SELECT id FROM languages WHERE code='eng'),
  'USA', 'https://www.youtube.com/watch?v=PPMawzJxKF4',
  '/movies/shelter.jpg', '/movies/shelter.jpg',
  'COMING_SOON', TRUE, FALSE
) ON CONFLICT (id) DO NOTHING;

-- MOVIE 22: BANDAR
INSERT INTO movies (id, title, synopsis, director, writer, duration_mins, release_date, rating, language_id, country, trailer_url, poster_url, banner_url, status, is_published, is_trending)
VALUES (
  'a1000000-0000-0000-0000-000000000022',
  'BANDAR',
  'TV actor Samar Mehra is accused of rape by a woman named Gayatri but he claims himself to be innocent. The court declines his bail and Samar is lodged in prison with many other convicts where he has to face abuses and live in unhygienic conditions.',
  'Anurag Kashyap, Sakshi Mehta', 'Abhishek Banerjee, Sudip Sharma', 145, '2025-09-12', 8.0,
  (SELECT id FROM languages WHERE code='hin'),
  'India', 'https://www.youtube.com/watch?v=YTxjK08YVEc',
  '/movies/bandar.jpg', '/movies/bandar.jpg',
  'NOW_SHOWING', TRUE, FALSE
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- MOVIE GENRES (Member 2)
-- ============================================================
DO $$
DECLARE
  action_id INTEGER; drama_id INTEGER; comedy_id INTEGER;
  romance_id INTEGER; thriller_id INTEGER; horror_id INTEGER;
  sports_id INTEGER; family_id INTEGER; crime_id INTEGER;
  biography_id INTEGER; history_id INTEGER; music_id INTEGER;
  mystery_id INTEGER; musical_id INTEGER;
BEGIN
  SELECT id INTO action_id FROM genres WHERE slug='action';
  SELECT id INTO drama_id FROM genres WHERE slug='drama';
  SELECT id INTO comedy_id FROM genres WHERE slug='comedy';
  SELECT id INTO romance_id FROM genres WHERE slug='romance';
  SELECT id INTO thriller_id FROM genres WHERE slug='thriller';
  SELECT id INTO horror_id FROM genres WHERE slug='horror';
  SELECT id INTO sports_id FROM genres WHERE slug='sports';
  SELECT id INTO family_id FROM genres WHERE slug='family';
  SELECT id INTO crime_id FROM genres WHERE slug='crime';
  SELECT id INTO biography_id FROM genres WHERE slug='biography';
  SELECT id INTO history_id FROM genres WHERE slug='history';
  SELECT id INTO music_id FROM genres WHERE slug='music';
  SELECT id INTO mystery_id FROM genres WHERE slug='mystery';
  SELECT id INTO musical_id FROM genres WHERE slug='musical';

  -- IRUMUDI: Action, Drama, Family
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000001', action_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000001', drama_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000001', family_id) ON CONFLICT DO NOTHING;
  -- HI: Comedy, Drama, Family, Romance
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000002', comedy_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000002', drama_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000002', family_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000002', romance_id) ON CONFLICT DO NOTHING;
  -- PEDDI: Action, Drama, Sports
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000003', action_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000003', drama_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000003', sports_id) ON CONFLICT DO NOTHING;
  -- LENIN: Action, Drama, Romance
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000004', action_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000004', drama_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000004', romance_id) ON CONFLICT DO NOTHING;
  -- BIKER: Action, Drama, Romance, Sports
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000005', action_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000005', drama_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000005', romance_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000005', sports_id) ON CONFLICT DO NOTHING;
  -- VISHWANATH AND SONS: Drama, Family, Romance
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000006', drama_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000006', family_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000006', romance_id) ON CONFLICT DO NOTHING;
  -- ANANTHAN KAADU: Action, Drama, Thriller
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000007', action_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000007', drama_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000007', thriller_id) ON CONFLICT DO NOTHING;
  -- ANGIKAARAM: Action, Drama, Sports
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000008', action_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000008', drama_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000008', sports_id) ON CONFLICT DO NOTHING;
  -- PYAAR PREMA KALYANAM: Comedy, Drama, Romance
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000009', comedy_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000009', drama_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000009', romance_id) ON CONFLICT DO NOTHING;
  -- DARK: Horror, Thriller
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000010', horror_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000010', thriller_id) ON CONFLICT DO NOTHING;
  -- KD THE DEVIL: Action, Crime, Drama, Thriller
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000011', action_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000011', crime_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000011', drama_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000011', thriller_id) ON CONFLICT DO NOTHING;
  -- SUPER HIT: Comedy, Thriller
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000012', comedy_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000012', thriller_id) ON CONFLICT DO NOTHING;
  -- ALPHA: Action, Drama
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000013', action_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000013', drama_id) ON CONFLICT DO NOTHING;
  -- AMRUTHAANJAN: Drama
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000014', drama_id) ON CONFLICT DO NOTHING;
  -- THE RISE OF ASHOKA: Action, Drama
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000015', action_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000015', drama_id) ON CONFLICT DO NOTHING;
  -- EVIL DEAD BURN: Horror
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000016', horror_id) ON CONFLICT DO NOTHING;
  -- THE FURIOUS: Action, Crime, Thriller
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000017', action_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000017', crime_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000017', thriller_id) ON CONFLICT DO NOTHING;
  -- OBSESSION: Horror, Romance, Thriller
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000018', horror_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000018', romance_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000018', thriller_id) ON CONFLICT DO NOTHING;
  -- NORMAL: Action, Crime, Thriller
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000019', action_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000019', crime_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000019', thriller_id) ON CONFLICT DO NOTHING;
  -- MICHAEL: Biography, Drama, History, Music
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000020', biography_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000020', drama_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000020', history_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000020', music_id) ON CONFLICT DO NOTHING;
  -- SHELTER: Action, Thriller
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000021', action_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000021', thriller_id) ON CONFLICT DO NOTHING;
  -- BANDAR: Crime, Drama, Musical, Mystery, Thriller
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000022', crime_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000022', drama_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000022', musical_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000022', mystery_id) ON CONFLICT DO NOTHING;
  INSERT INTO movie_genres VALUES ('a1000000-0000-0000-0000-000000000022', thriller_id) ON CONFLICT DO NOTHING;
END $$;

-- ============================================================
-- CAST MEMBERS (Member 2)
-- ============================================================
INSERT INTO cast_members (id, name) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Ravi Teja'),
  ('b1000000-0000-0000-0000-000000000002', 'Priya Bhavani Shankar'),
  ('b1000000-0000-0000-0000-000000000003', 'Swasika Vijay'),
  ('b1000000-0000-0000-0000-000000000004', 'Sai Kumar'),
  ('b1000000-0000-0000-0000-000000000005', 'Ajay Ghosh'),
  ('b1000000-0000-0000-0000-000000000006', 'Nayanthara'),
  ('b1000000-0000-0000-0000-000000000007', 'Kavin Raj'),
  ('b1000000-0000-0000-0000-000000000008', 'K Bhagyaraj'),
  ('b1000000-0000-0000-0000-000000000009', 'Prabhu'),
  ('b1000000-0000-0000-0000-000000000010', 'Ram Charan'),
  ('b1000000-0000-0000-0000-000000000011', 'Janhvi Kapoor'),
  ('b1000000-0000-0000-0000-000000000012', 'Shiva Rajkumar'),
  ('b1000000-0000-0000-0000-000000000013', 'Jagapathi Babu'),
  ('b1000000-0000-0000-0000-000000000014', 'Akhil Akkineni'),
  ('b1000000-0000-0000-0000-000000000015', 'Bhagyashri Borse'),
  ('b1000000-0000-0000-0000-000000000016', 'Sunil'),
  ('b1000000-0000-0000-0000-000000000017', 'Sharwanand'),
  ('b1000000-0000-0000-0000-000000000018', 'Malvika Nair'),
  ('b1000000-0000-0000-0000-000000000019', 'Suriya'),
  ('b1000000-0000-0000-0000-000000000020', 'Mamitha Baiju'),
  ('b1000000-0000-0000-0000-000000000021', 'Arya'),
  ('b1000000-0000-0000-0000-000000000022', 'Dhruva Sarja'),
  ('b1000000-0000-0000-0000-000000000023', 'Sudeep'),
  ('b1000000-0000-0000-0000-000000000024', 'Sanjay Dutt'),
  ('b1000000-0000-0000-0000-000000000025', 'Shilpa Shetty Kundra'),
  ('b1000000-0000-0000-0000-000000000026', 'Bob Odenkirk'),
  ('b1000000-0000-0000-0000-000000000027', 'Jaafar Jackson'),
  ('b1000000-0000-0000-0000-000000000028', 'Jason Statham'),
  ('b1000000-0000-0000-0000-000000000029', 'Bobby Deol'),
  ('b1000000-0000-0000-0000-000000000030', 'Sanya Malhotra')
ON CONFLICT (id) DO NOTHING;

-- Movie Cast assignments
INSERT INTO movie_cast (movie_id, cast_member_id, role_type) VALUES
  ('a1000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','ACTOR'),
  ('a1000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000002','ACTOR'),
  ('a1000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000003','ACTOR'),
  ('a1000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000006','ACTOR'),
  ('a1000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000007','ACTOR'),
  ('a1000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000009','ACTOR'),
  ('a1000000-0000-0000-0000-000000000003','b1000000-0000-0000-0000-000000000010','ACTOR'),
  ('a1000000-0000-0000-0000-000000000003','b1000000-0000-0000-0000-000000000011','ACTOR'),
  ('a1000000-0000-0000-0000-000000000003','b1000000-0000-0000-0000-000000000012','ACTOR'),
  ('a1000000-0000-0000-0000-000000000003','b1000000-0000-0000-0000-000000000013','ACTOR'),
  ('a1000000-0000-0000-0000-000000000004','b1000000-0000-0000-0000-000000000014','ACTOR'),
  ('a1000000-0000-0000-0000-000000000004','b1000000-0000-0000-0000-000000000015','ACTOR'),
  ('a1000000-0000-0000-0000-000000000004','b1000000-0000-0000-0000-000000000016','ACTOR'),
  ('a1000000-0000-0000-0000-000000000005','b1000000-0000-0000-0000-000000000017','ACTOR'),
  ('a1000000-0000-0000-0000-000000000005','b1000000-0000-0000-0000-000000000018','ACTOR'),
  ('a1000000-0000-0000-0000-000000000006','b1000000-0000-0000-0000-000000000019','ACTOR'),
  ('a1000000-0000-0000-0000-000000000006','b1000000-0000-0000-0000-000000000020','ACTOR'),
  ('a1000000-0000-0000-0000-000000000007','b1000000-0000-0000-0000-000000000021','ACTOR'),
  ('a1000000-0000-0000-0000-000000000011','b1000000-0000-0000-0000-000000000022','ACTOR'),
  ('a1000000-0000-0000-0000-000000000011','b1000000-0000-0000-0000-000000000023','ACTOR'),
  ('a1000000-0000-0000-0000-000000000011','b1000000-0000-0000-0000-000000000024','ACTOR'),
  ('a1000000-0000-0000-0000-000000000011','b1000000-0000-0000-0000-000000000025','ACTOR'),
  ('a1000000-0000-0000-0000-000000000019','b1000000-0000-0000-0000-000000000026','ACTOR'),
  ('a1000000-0000-0000-0000-000000000020','b1000000-0000-0000-0000-000000000027','ACTOR'),
  ('a1000000-0000-0000-0000-000000000021','b1000000-0000-0000-0000-000000000028','ACTOR'),
  ('a1000000-0000-0000-0000-000000000022','b1000000-0000-0000-0000-000000000029','ACTOR'),
  ('a1000000-0000-0000-0000-000000000022','b1000000-0000-0000-0000-000000000030','ACTOR')
ON CONFLICT DO NOTHING;

-- ============================================================
-- THEATRES (Member 3)
-- ============================================================
INSERT INTO theatres (id, name, city, address, location, amenities, is_active) VALUES
  ('c1000000-0000-0000-0000-000000000001','PVR Orion Mall','Bengaluru','Orion Mall, Rajajinagar','12.9930°N 77.5549°E',ARRAY['Parking','Food Court','Wheelchair Access','4DX'],TRUE),
  ('c1000000-0000-0000-0000-000000000002','INOX Garuda Mall','Bengaluru','Garuda Mall, Magrath Road','12.9719°N 77.6130°E',ARRAY['Parking','Food Court','Dolby Atmos'],TRUE),
  ('c1000000-0000-0000-0000-000000000003','Cinepolis Forum Mall','Bengaluru','Forum Mall, Koramangala','12.9359°N 77.6252°E',ARRAY['Parking','IMAX','Food Court'],TRUE),
  ('c1000000-0000-0000-0000-000000000004','PVR IMAX Hyderabad','Hyderabad','GVK One Mall, Banjara Hills','17.4126°N 78.4484°E',ARRAY['Parking','IMAX','VIP Lounge'],TRUE),
  ('c1000000-0000-0000-0000-000000000005','AGS Cinemas Chennai','Chennai','VR Chennai Mall, Virugambakkam','13.0569°N 80.1955°E',ARRAY['Parking','Dolby Atmos','Food Court'],TRUE)
ON CONFLICT (id) DO NOTHING;

-- SCREENS
INSERT INTO screens (id, theatre_id, name, capacity, screen_type) VALUES
  ('d1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','Screen 1',150,'2D'),
  ('d1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000001','Screen 2',120,'3D'),
  ('d1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000001','Screen 3 - 4DX',80,'4DX'),
  ('d1000000-0000-0000-0000-000000000004','c1000000-0000-0000-0000-000000000002','Screen 1',140,'2D'),
  ('d1000000-0000-0000-0000-000000000005','c1000000-0000-0000-0000-000000000002','Screen 2 - Dolby',100,'2D'),
  ('d1000000-0000-0000-0000-000000000006','c1000000-0000-0000-0000-000000000003','Screen 1 - IMAX',200,'IMAX'),
  ('d1000000-0000-0000-0000-000000000007','c1000000-0000-0000-0000-000000000004','Screen 1 - IMAX',180,'IMAX'),
  ('d1000000-0000-0000-0000-000000000008','c1000000-0000-0000-0000-000000000005','Screen 1',130,'2D')
ON CONFLICT (id) DO NOTHING;

-- OFFERS
INSERT INTO offers (code, description, discount_type, discount_value, min_amount, max_discount, expiry_date, is_active) VALUES
  ('WELCOME50','Welcome offer - 50% off on first booking','PERCENTAGE',50,200,150,'2026-12-31',TRUE),
  ('MOVIE20','20% off on all movies','PERCENTAGE',20,300,100,'2026-12-31',TRUE),
  ('WEEKEND10','Flat Rs.10 off on weekends','FLAT',10,100,NULL,'2026-12-31',TRUE),
  ('SHOWBEE100','Flat Rs.100 off on orders above Rs.500','FLAT',100,500,NULL,'2026-12-31',TRUE)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- GENERATE SEATS FOR SCREENS (Member 3)
-- ============================================================
DO $$
DECLARE
  screen_rec RECORD;
  row_labels TEXT[] := ARRAY['A','B','C','D','E','F','G','H','I','J'];
  seats_per_row INTEGER := 10;
  seat_type_regular INTEGER;
  seat_type_premium INTEGER;
  v_row_label TEXT;
  seat_num INTEGER;
  s_type INTEGER;
BEGIN
  SELECT id INTO seat_type_regular FROM seat_types WHERE name='REGULAR';
  SELECT id INTO seat_type_premium FROM seat_types WHERE name='PREMIUM';

  FOR screen_rec IN SELECT id FROM screens LOOP
    FOREACH v_row_label IN ARRAY row_labels LOOP
      FOR seat_num IN 1..seats_per_row LOOP
        -- Rows A-D are Premium, E-J are Regular
        IF v_row_label IN ('A','B','C','D') THEN
          s_type := seat_type_premium;
        ELSE
          s_type := seat_type_regular;
        END IF;
        INSERT INTO seats (screen_id, seat_type_id, row_label, seat_number)
        VALUES (screen_rec.id, s_type, v_row_label, seat_num)
        ON CONFLICT (screen_id, row_label, seat_number) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- SHOWS (Member 3) - Shows for NOW_SHOWING movies in Bengaluru
-- ============================================================
DO $$
DECLARE
  today DATE := CURRENT_DATE;
  p250 DECIMAL := 250.00;
  p200 DECIMAL := 200.00;
  p350 DECIMAL := 350.00;
BEGIN
  -- PEDDI at PVR Screen 1
  INSERT INTO shows (id, movie_id, screen_id, start_time, end_time, base_price, language_id) VALUES
    ('e1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000001',
     today + INTERVAL '10 hours', today + INTERVAL '12 hours 45 minutes', p250,
     (SELECT id FROM languages WHERE code='tel'))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO shows (id, movie_id, screen_id, start_time, end_time, base_price, language_id) VALUES
    ('e1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000001',
     today + INTERVAL '13 hours 30 minutes', today + INTERVAL '16 hours 15 minutes', p250,
     (SELECT id FROM languages WHERE code='tel'))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO shows (id, movie_id, screen_id, start_time, end_time, base_price, language_id) VALUES
    ('e1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000001',
     today + INTERVAL '19 hours 30 minutes', today + INTERVAL '22 hours 15 minutes', p250,
     (SELECT id FROM languages WHERE code='tel'))
  ON CONFLICT (id) DO NOTHING;

  -- IRUMUDI at INOX Screen 1
  INSERT INTO shows (id, movie_id, screen_id, start_time, end_time, base_price, language_id) VALUES
    ('e1000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000004',
     today + INTERVAL '11 hours', today + INTERVAL '13 hours 22 minutes', p200,
     (SELECT id FROM languages WHERE code='tel'))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO shows (id, movie_id, screen_id, start_time, end_time, base_price, language_id) VALUES
    ('e1000000-0000-0000-0000-000000000005','a1000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000004',
     today + INTERVAL '16 hours', today + INTERVAL '18 hours 22 minutes', p200,
     (SELECT id FROM languages WHERE code='tel'))
  ON CONFLICT (id) DO NOTHING;

  -- KD THE DEVIL at Cinepolis IMAX
  INSERT INTO shows (id, movie_id, screen_id, start_time, end_time, base_price, language_id) VALUES
    ('e1000000-0000-0000-0000-000000000006','a1000000-0000-0000-0000-000000000011','d1000000-0000-0000-0000-000000000006',
     today + INTERVAL '10 hours 30 minutes', today + INTERVAL '13 hours 18 minutes', p350,
     (SELECT id FROM languages WHERE code='kan'))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO shows (id, movie_id, screen_id, start_time, end_time, base_price, language_id) VALUES
    ('e1000000-0000-0000-0000-000000000007','a1000000-0000-0000-0000-000000000011','d1000000-0000-0000-0000-000000000006',
     today + INTERVAL '19 hours', today + INTERVAL '21 hours 48 minutes', p350,
     (SELECT id FROM languages WHERE code='kan'))
  ON CONFLICT (id) DO NOTHING;

  -- HI at PVR Screen 2
  INSERT INTO shows (id, movie_id, screen_id, start_time, end_time, base_price, language_id) VALUES
    ('e1000000-0000-0000-0000-000000000008','a1000000-0000-0000-0000-000000000002','d1000000-0000-0000-0000-000000000002',
     today + INTERVAL '12 hours', today + INTERVAL '14 hours 18 minutes', p200,
     (SELECT id FROM languages WHERE code='tel'))
  ON CONFLICT (id) DO NOTHING;

  -- PEDDI tomorrow
  INSERT INTO shows (id, movie_id, screen_id, start_time, end_time, base_price, language_id) VALUES
    ('e1000000-0000-0000-0000-000000000009','a1000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000001',
     today + INTERVAL '1 day 10 hours', today + INTERVAL '1 day 12 hours 45 minutes', p250,
     (SELECT id FROM languages WHERE code='tel'))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO shows (id, movie_id, screen_id, start_time, end_time, base_price, language_id) VALUES
    ('e1000000-0000-0000-0000-000000000010','a1000000-0000-0000-0000-000000000003','d1000000-0000-0000-0000-000000000001',
     today + INTERVAL '1 day 19 hours 30 minutes', today + INTERVAL '1 day 22 hours 15 minutes', p250,
     (SELECT id FROM languages WHERE code='tel'))
  ON CONFLICT (id) DO NOTHING;
END $$;

-- ============================================================
-- GENERATE SHOW_SEATS for all shows (Member 3)
-- ============================================================
DO $$
DECLARE
  show_rec RECORD;
  seat_rec RECORD;
  screen_id_val UUID;
  base_p DECIMAL;
  seat_price DECIMAL;
  type_mult DECIMAL;
BEGIN
  FOR show_rec IN SELECT s.id, s.screen_id, s.base_price FROM shows s LOOP
    FOR seat_rec IN
      SELECT se.id AS seat_id, st.price_multiplier
      FROM seats se
      JOIN seat_types st ON se.seat_type_id = st.id
      WHERE se.screen_id = show_rec.screen_id
    LOOP
      seat_price := show_rec.base_price * seat_rec.price_multiplier;
      INSERT INTO show_seats (show_id, seat_id, status, price)
      VALUES (show_rec.id, seat_rec.seat_id, 'AVAILABLE', seat_price)
      ON CONFLICT (show_id, seat_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
