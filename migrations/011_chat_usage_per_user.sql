-- Migrate chat_usage from per-IP to per-user.
--
-- chat_usage is just a daily counter — there's no value in preserving the
-- old per-IP rows (the cap resets every day anyway). Drop and recreate
-- with a (user_id, date) PK so the rate-limiter can charge against the
-- user instead of the request origin.

DROP TABLE IF EXISTS chat_usage;

CREATE TABLE chat_usage (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

CREATE INDEX idx_chat_usage_date ON chat_usage(date);
