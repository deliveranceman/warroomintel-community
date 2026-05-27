-- Community Posts, Votes, and Comments
CREATE TABLE IF NOT EXISTS posts (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    text        NOT NULL,
  clerk_name text        NOT NULL,
  tier       text        NOT NULL DEFAULT 'free',
  title      text        NOT NULL,
  body       text        NOT NULL,
  type       text        NOT NULL DEFAULT 'discussion',  -- discussion | question | intel | testimony
  tags       text[]      NOT NULL DEFAULT '{}',
  upvotes    int         NOT NULL DEFAULT 0,
  pinned     bool        NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_votes (
  user_id    text  NOT NULL,
  post_id    uuid  NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    uuid        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    text        NOT NULL,
  clerk_name text        NOT NULL,
  tier       text        NOT NULL DEFAULT 'free',
  body       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS posts_created_at_idx      ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS posts_pinned_created_idx  ON posts (pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_type_idx            ON posts (type, created_at DESC);
CREATE INDEX IF NOT EXISTS post_votes_post_id_idx    ON post_votes (post_id);
CREATE INDEX IF NOT EXISTS post_comments_post_idx    ON post_comments (post_id, created_at);
