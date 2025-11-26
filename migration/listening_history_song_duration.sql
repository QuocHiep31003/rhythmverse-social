ALTER TABLE listening_history
    ADD COLUMN IF NOT EXISTS song_duration INT DEFAULT 0 AFTER listened_duration;

