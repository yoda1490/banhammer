-- Upgrade script to add DB cache table for stats
START TRANSACTION;

-- Create banhammer_stats table for caching aggregated statistics
CREATE TABLE IF NOT EXISTS `banhammer_stats` (
  `id` INT PRIMARY KEY,
  `stats_json` LONGTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_id_processed` INT NOT NULL DEFAULT 0 COMMENT 'Last fail2ban ID included in stats',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize with empty cache (will be populated on first stats request)
INSERT IGNORE INTO `banhammer_stats` (id, stats_json, last_id_processed) VALUES (1, '{}', 0);

COMMIT;

-- Note: Stats will be cached in DB and auto-update on each API call to action=stats
-- This is much faster than aggregating queries from scratch every time
