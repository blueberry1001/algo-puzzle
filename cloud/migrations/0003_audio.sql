CREATE TABLE audio_files (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  size INTEGER NOT NULL CHECK(size > 0 AND size <= 10000000),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE audio_chunks (
  file_id TEXT NOT NULL REFERENCES audio_files(id) ON DELETE CASCADE,
  part INTEGER NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY(file_id, part)
);
