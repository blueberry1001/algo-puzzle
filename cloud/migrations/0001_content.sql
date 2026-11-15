CREATE TABLE content (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL DEFAULT 0, draft TEXT, published TEXT, published_revision INTEGER NOT NULL DEFAULT 0, updated_at TEXT);
INSERT INTO content(id) VALUES(1);
CREATE TABLE history (revision INTEGER PRIMARY KEY, content TEXT NOT NULL, published_at TEXT NOT NULL);
