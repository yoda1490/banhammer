-- Upgrade script to optimize existing fail2ban table
START TRANSACTION;

-- 1. Change engine to InnoDB for better concurrency & indexing
ALTER TABLE `fail2ban` ENGINE=InnoDB;

-- 2. Adjust column types (ensure lengths are adequate; IPv6 support, numeric geo)
ALTER TABLE `fail2ban` 
  MODIFY `id` INT NOT NULL AUTO_INCREMENT,
  MODIFY `name` VARCHAR(255) NOT NULL,
  MODIFY `protocol` VARCHAR(8) NOT NULL,
  MODIFY `ports` VARCHAR(64) NOT NULL,
  MODIFY `ip` VARCHAR(45) NOT NULL COMMENT 'Supports IPv4/IPv6',
  MODIFY `longitude` DECIMAL(9,6) NULL,
  MODIFY `latitude` DECIMAL(9,6) NULL,
  MODIFY `code` VARCHAR(4) NOT NULL,
  MODIFY `code3` VARCHAR(3) NOT NULL,
  MODIFY `city` VARCHAR(64) DEFAULT '',
  MODIFY `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  MODIFY `ban` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'is currently ban';

-- 3. Add performance indexes
ALTER TABLE `fail2ban` 
  ADD KEY `idx_ban_ip` (`ban`,`ip`),
  ADD KEY `idx_country` (`country`(100)),
  ADD KEY `idx_code` (`code`),
  ADD KEY `idx_code3` (`code3`),
  ADD KEY `idx_timestamp` (`timestamp`),
  ADD KEY `idx_geo` (`longitude`,`latitude`),
  ADD KEY `idx_name` (`name`(100));


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

-- Note: If large table, run each ALTER separately to reduce lock time.
