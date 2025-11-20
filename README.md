# 🔨 BanHammer - Fail2Ban Geo-IP Security Dashboard

![Screenshot](https://raw.githubusercontent.com/yoda1490/banhammer/master/screenshot.png "Screenshot")

Real-time security monitoring dashboard displaying geo-located fail2ban IP bans on an interactive map with comprehensive statistics.

**Live Demo:** https://ban.boller.co

## 📋 Overview

BanHammer is a web-based dashboard that visualizes fail2ban security events in real-time. It displays banned IPs on an OpenStreetMap with geo-location data, country-level statistics, and attack patterns. The application includes:

- **Interactive Map** - Real-time visualization of banned IPs with OpenStreetMap
- **Country Colorization** - Countries color-coded by attack volume (dynamic scaling)
- **Live Statistics** - Total IPs blocked, currently banned IPs, protocols attacked
- **Attack History** - Last 30 attacks, top 5 attacking countries, latest country blocks
- **WHOIS Integration** - Direct WHOIS lookup for banned IPs
- **Responsive Design** - Mobile-friendly Bootstrap-based UI
- **Performance Optimizations** - 30s stats caching, aggregated queries, local libraries

## 🎯 Features

### Dashboard Panels
- **Left Panel** - Last 30 IP attacks with timestamps and country flags
- **Center Map** - Interactive OpenStreetMap with:
  - Markers for individual ban events (clustered for performance)
  - Country layer with dynamic color scaling
  - Restricted bounds to world extent
  - No world repetition
- **Right Panel** - Real-time statistics:
  - Total distinct IPs blocked
  - Currently banned IPs count
  - Total countries represented
  - Jail/protocol breakdown (SSH, Apache, Postfix, SASL)
  - Top 5 attacking countries
  - Latest country blocks

### Color Scale (Dynamic)
The country colors adapt based on actual attack data:
- **Very Dark Red** - Top 5 countries (highest attack volume)
- **Dark Red** - >1,000 bans
- **Red** - >500 bans
- **Orange-Red** - >200 bans
- **Orange** - >100 bans
- **Light Orange** - >50 bans
- **Yellow** - >20 bans
- **Light Yellow** - ≥1 ban
- **White** - No bans

### Technical Highlights
- **Auto-Refresh** - Updates every 5 minutes
- **Loader Animation** - Progress indicator during data loading
- **Marker Clustering** - Groups nearby ban events for clarity
- **WHOIS Lookup** - Modal with full WHOIS details
- **Local Libraries** - All deps local (jQuery 3.7.1, Bootstrap 4.6.2, Leaflet 1.6.0)

## 📦 Technology Stack

### Backend
- **PHP 7.x+** - API server
- **MySQL/MariaDB** - InnoDB with optimized indexes
- **fail2sql** - Fail2ban integration script

### Frontend
- **Leaflet 1.6.0** - Interactive mapping
- **Leaflet.MarkerCluster 1.5.3** - Marker clustering
- **Bootstrap 4.6.2** - Responsive UI framework
- **jQuery 3.7.1** - DOM manipulation
- **OpenStreetMap** - Free map tiles

## 🔧 Requirements

- **Web Server:** Apache with PHP 7.x+
- **Database:** MySQL 5.7+ or MariaDB 10.2+
- **SSL Certificate:** Required for security headers (optional but recommended)
- **GeoIP Database:** Auto-downloaded by fail2sql (optional)
- **Fail2Ban:** Installed and configured on server

## 📥 Installation

### 1. Deploy Code
```bash
git clone https://github.com/yoda1490/banhammer.git /var/www/banhammer
cd /var/www/banhammer
```

### 2. Configure Database

Copy and edit configuration:
```bash
cp dbinfo.php.example dbinfo.php
nano dbinfo.php
```

Edit with your MySQL credentials:
```php
$db_host = 'localhost';
$db_user = 'fail2ban';
$db_pwd = 'your_password';
$database = 'fail2ban';
$table = 'fail2ban';
```

### 3. Initialize Database

Create MySQL database:
```bash
mysql -u root -p
CREATE DATABASE fail2ban;
CREATE USER 'fail2ban'@'localhost' IDENTIFIED BY 'your_password';
GRANT INSERT, UPDATE, DELETE, SELECT ON fail2ban.* TO 'fail2ban'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Load schema:
```bash
mysql -u fail2ban -p fail2ban < fail2sql/fail2ban.sql
```

### 4. Configure fail2sql

Follow detailed instructions in [fail2sql/README.md](https://github.com/yoda1490/banhammer/tree/master/fail2sql)

Key steps:
- Update `/etc/fail2ban/action.d/iptables.conf` to call fail2sql on ban
- Download GeoIP database: `./fail2sql/fail2sql -u`
- Test with: `./fail2sql/fail2sql -l`

### 5. Web Server Configuration

Set proper permissions:
```bash
chown -R www-data:www-data /var/www/banhammer
chmod 755 /var/www/banhammer
```

Ensure `get.php` is accessible via web server.

## 🚀 Optimization (Optional)

### Database Schema Upgrade

For existing installations, apply performance indexes:
```bash
mysql -u fail2ban -p fail2ban < fail2sql/upgrade.sql
```

Changes applied:
- Engine: MyISAM → InnoDB (better concurrency)
- Optimized column types (IPv6 support, numeric geo)
- Performance indexes on `ban`, `country`, `timestamp`, `code3`, `ip`, `name`, `longitude/latitude`

### API Performance

The dashboard includes optimizations:
- **Stats Caching** - 30s filesystem cache for aggregated stats
- **Single Query** - Aggregated counts in one DB query instead of 4
- **Bulk HTML** - Pre-built HTML instead of jQuery append loops
- **Local Libraries** - No CDN delays

## 📡 API Endpoints

All endpoints return JSON.

### GET `/get.php?action=stats`
Returns aggregated statistics and country-level data.

**Response:**
```json
{
  "totalip": [{"count": "81461"}],
  "ipban": [{"count": "2826"}],
  "totalcountry": [{"count": "184"}],
  "totalpercountry": {
    "CHN": {"code3": "CHN", "country": "China", "code": "CN", "count": "28524"},
    ...
  },
  "protos": [
    {"name": "sshd", "count": "149065"},
    ...
  ],
  "totals": [
    {"code": "CN", "country": "China", "count": "28524"},
    ...
  ],
  "last": [...],
  "lastips": [...]
}
```

### GET `/get.php?action=markers`
Returns individual ban events with coordinates.

**Response:**
```json
[
  {
    "id": "1",
    "name": "sshd",
    "protocol": "tcp",
    "ports": "22",
    "ips": "1:192.168.1.1,2:192.168.1.2",
    "longitude": "106.84",
    "latitude": "10.78",
    "code": "VN",
    "code3": "VNM",
    "country": "Vietnam",
    "city": "HCMC",
    "timestamp": "2025-11-19 22:52:02",
    "ban": "1"
  },
  ...
]
```

### GET `/get.php?action=whois&ip=<id>`
Retrieves WHOIS information for an IP.

**Response:**
```json
{
  "ip": "192.168.1.1",
  "whois": "... WHOIS output ..."
}
```

## 📊 Database Schema

**fail2ban table:**
- `id` - Primary key
- `name` - Jail/service name (ssh, apache, postfix, etc.)
- `protocol` - Protocol (tcp/udp)
- `ports` - Port(s)
- `ip` - IPv4/IPv6 address
- `longitude/latitude` - Geo coordinates
- `code/code3` - Country codes (2/3 letter)
- `city` - City name
- `country` - Country name
- `timestamp` - Ban date/time
- `ban` - Flag (1=banned, 0=released)

**Indexes:**
- `idx_ban_ip` - Composite for quick lookups
- `idx_country`, `idx_code`, `idx_code3`, `idx_timestamp`
- `idx_geo` - For map queries
- `idx_name` - For jail filtering

## 🔐 Security

- SSL/TLS enforced (HSTS headers)
- CORS restricted to configured domain
- CSP headers block mixed content
- X-Frame-Options prevents clickjacking
- No external CDN dependencies

## 🛠️ Troubleshooting

**Map not loading?**
- Ensure Leaflet JS/CSS files are present in `/lib/`
- Check browser console for JS errors
- Verify `countries.geojson.js` is loaded

**Stats taking >5 seconds?**
- Check MySQL performance with `EXPLAIN` on queries
- Verify indexes are applied: `mysql fail2ban -e "SHOW INDEXES FROM fail2ban;"`
- Clear cache: `rm /var/www/banhammer/stats_cache.json`

**No data showing?**
- Verify `dbinfo.php` credentials
- Check fail2sql is configured correctly
- Test: `./fail2sql/fail2sql -l`

## 📝 Credits & History

- **Original:** ByteMe (2014) - Google Maps version
- **rjkreider** - PHP 7.x update, GeoIP updater fix
- **Amaury BOLLER** - OpenStreetMap migration, styling, optimizations
- **fail2sql:** Based on v1.0 by Jordan Tomkinson

## 📄 License

See LICENSE file or project repository

## 🤝 Contributing

Issues, PRs welcome! 

---

**Support:** Issues → https://github.com/yoda1490/banhammer/issues
