-- One row per arena round. Sides are shuffled so voters can't tell which model is which.
CREATE TABLE battles (
  id          TEXT PRIMARY KEY,
  created_at  INTEGER NOT NULL,
  ip_hash     TEXT NOT NULL,
  category    TEXT NOT NULL,
  prompt      TEXT NOT NULL,
  model_a     TEXT NOT NULL,
  model_b     TEXT NOT NULL,
  answer_a    TEXT,
  answer_b    TEXT,
  -- metrics per side: time to first token, total time (ms), tokens, cost (USD)
  ttft_a INTEGER, ttft_b INTEGER,
  total_a INTEGER, total_b INTEGER,
  tokens_a INTEGER, tokens_b INTEGER,
  cost_a REAL, cost_b REAL,
  error_a TEXT, error_b TEXT,
  winner      TEXT CHECK (winner IN ('a', 'b', 'tie', 'both_bad')),
  judge       TEXT CHECK (judge IN ('a', 'b', 'tie', 'both_bad')),
  judge_reason TEXT,
  voted_at    INTEGER
);
CREATE INDEX idx_battles_ip_time ON battles (ip_hash, created_at);
CREATE INDEX idx_battles_category ON battles (category, winner);

-- Elo rating per model per category ('all' holds the overall rating).
CREATE TABLE ratings (
  category TEXT NOT NULL,
  model    TEXT NOT NULL,
  rating   REAL NOT NULL DEFAULT 1000,
  wins     INTEGER NOT NULL DEFAULT 0,
  losses   INTEGER NOT NULL DEFAULT 0,
  ties     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (category, model)
);
