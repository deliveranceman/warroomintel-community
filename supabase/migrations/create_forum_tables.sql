-- War Room Board — forum tables
CREATE TABLE IF NOT EXISTS forum_posts (
  id                   uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              text        NOT NULL,
  author_name          text        NOT NULL,
  author_tier          text        NOT NULL DEFAULT 'free',
  title                text        NOT NULL,
  body                 text,
  post_type            text        NOT NULL DEFAULT 'discussion',
  tags                 text[]      NOT NULL DEFAULT '{}',
  resource_url         text,
  resource_title       text,
  resource_thumbnail   text,
  resource_description text,
  upvotes              int         NOT NULL DEFAULT 0,
  comment_count        int         NOT NULL DEFAULT 0,
  pinned               bool        NOT NULL DEFAULT false,
  flagged              bool        NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forum_votes (
  user_id    text NOT NULL,
  post_id    uuid NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS forum_comments (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     uuid        NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id     text        NOT NULL,
  author_name text        NOT NULL,
  author_tier text        NOT NULL DEFAULT 'free',
  body        text        NOT NULL,
  upvotes     int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forum_comment_votes (
  user_id    text NOT NULL,
  comment_id uuid NOT NULL REFERENCES forum_comments(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, comment_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS forum_posts_created_idx  ON forum_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS forum_posts_upvotes_idx  ON forum_posts (upvotes DESC);
CREATE INDEX IF NOT EXISTS forum_posts_pinned_idx   ON forum_posts (pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS forum_posts_type_idx     ON forum_posts (post_type, created_at DESC);
CREATE INDEX IF NOT EXISTS forum_posts_flagged_idx  ON forum_posts (flagged) WHERE flagged = true;
CREATE INDEX IF NOT EXISTS forum_votes_post_idx     ON forum_votes (post_id);
CREATE INDEX IF NOT EXISTS forum_comments_post_idx  ON forum_comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS forum_cv_comment_idx     ON forum_comment_votes (comment_id);

-- RLS
ALTER TABLE forum_posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_votes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comment_votes  ENABLE ROW LEVEL SECURITY;

-- Service role bypass (Netlify functions use service key)
CREATE POLICY "service_all_forum_posts"         ON forum_posts         FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_forum_votes"         ON forum_votes         FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_forum_comments"      ON forum_comments      FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_forum_comment_votes" ON forum_comment_votes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public read
CREATE POLICY "public_read_forum_posts"    ON forum_posts    FOR SELECT TO anon USING (true);
CREATE POLICY "public_read_forum_comments" ON forum_comments FOR SELECT TO anon USING (true);

-- Seed starter posts
INSERT INTO forum_posts (user_id, author_name, author_tier, title, body, post_type, tags, pinned) VALUES
(
  'seed',
  'Pastor Justin',
  'minister',
  'Welcome to The War Room Board',
  'This is the place to ask questions, share what God is showing you, post field reports from ministry, and share resources you are finding valuable. Keep it sharp, keep it focused on the mission. Iron sharpens iron. Post freely.',
  'discussion',
  ARRAY['welcome', 'community'],
  true
),
(
  'seed',
  'Pastor Justin',
  'minister',
  'Leviathan operates differently than most think',
  'After years of sessions I have noticed Leviathan rarely presents the way people expect. He is not loud. He is subtle — a twisting of truth, a pride that looks like confidence, a resistance to correction that feels righteous. The entry points are almost always intellectual pride or marine kingdom exposure. Watch for the ones who can not receive correction without explaining why they are actually right.',
  'revelation',
  ARRAY['leviathan', 'marine-kingdom', 'discernment'],
  false
),
(
  'seed',
  'Pastor Justin',
  'minister',
  'Isaiah Saldivar on Deliverance Basics — Good Foundation',
  'Good starting point for people new to deliverance ministry. Does not cover everything but solid on the fundamentals.',
  'resource',
  ARRAY['resources', 'youtube', 'training', 'deliverance-basics'],
  false
)
ON CONFLICT DO NOTHING;

UPDATE forum_posts
SET resource_url = 'https://www.youtube.com/@IsaiahSaldivar',
    resource_title = 'Isaiah Saldivar — YouTube',
    resource_description = 'Deliverance ministry teaching and training content',
    resource_thumbnail = 'https://img.youtube.com/vi/6Vx7EsR3-Ao/hqdefault.jpg'
WHERE title = 'Isaiah Saldivar on Deliverance Basics — Good Foundation' AND user_id = 'seed';
