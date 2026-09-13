-- Science Coherence Writing Room tables.
-- Run in the same MySQL database that already contains the blog's users table.

CREATE TABLE IF NOT EXISTS `sc_wr_articles` (
  `article_id` VARCHAR(120) NOT NULL,
  `article_json` MEDIUMTEXT NOT NULL,
  `revision` CHAR(64) NOT NULL,
  `published_by` INT UNSIGNED NULL DEFAULT NULL,
  `published_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`article_id`),
  KEY `idx_sc_wr_articles_published_by` (`published_by`),
  CONSTRAINT `fk_sc_wr_articles_user` FOREIGN KEY (`published_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sc_wr_drafts` (
  `article_id` VARCHAR(120) NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `article_json` MEDIUMTEXT NOT NULL,
  `base_revision` CHAR(64) NULL DEFAULT NULL,
  `draft_version` CHAR(32) NOT NULL,
  `saved_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`article_id`, `user_id`),
  KEY `idx_sc_wr_drafts_user` (`user_id`, `saved_at`),
  CONSTRAINT `fk_sc_wr_drafts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sc_wr_revisions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `article_id` VARCHAR(120) NOT NULL,
  `article_json` MEDIUMTEXT NOT NULL,
  `revision` CHAR(64) NOT NULL,
  `saved_by` INT UNSIGNED NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sc_wr_revisions_article` (`article_id`, `created_at`),
  KEY `idx_sc_wr_revisions_user` (`saved_by`),
  CONSTRAINT `fk_sc_wr_revisions_user` FOREIGN KEY (`saved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sc_wr_collections` (
  `collection_id` VARCHAR(80) NOT NULL,
  `collection_json` TEXT NOT NULL,
  `revision` CHAR(64) NOT NULL,
  `updated_by` INT UNSIGNED NULL DEFAULT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`collection_id`),
  KEY `idx_sc_wr_collections_user` (`updated_by`),
  CONSTRAINT `fk_sc_wr_collections_user` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
