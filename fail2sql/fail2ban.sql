SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `fail2ban`
--

-- --------------------------------------------------------

--
-- Structure de la table `fail2ban`
--

CREATE TABLE `fail2ban` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `protocol` VARCHAR(8) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ports` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip` VARCHAR(45) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Supports IPv4/IPv6',
  `longitude` DECIMAL(9,6) DEFAULT NULL,
  `latitude` DECIMAL(9,6) DEFAULT NULL,
  `code` VARCHAR(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code3` VARCHAR(3) COLLATE utf8mb4_unicode_ci NOT NULL,
  `city` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `country` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `ban` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'is currently ban',
  PRIMARY KEY (`id`),
  KEY `idx_ban_ip` (`ban`,`ip`),
  KEY `idx_country` (`country`(100)),
  KEY `idx_code` (`code`),
  KEY `idx_code3` (`code3`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_geo` (`longitude`,`latitude`),
  KEY `idx_name` (`name`(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `fail2ban`
--

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `fail2ban`
--
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

