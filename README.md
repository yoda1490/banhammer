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
The country colors adapt based on actual attack data

### Technical Highlights
- **Auto-Refresh** - Updates every 5 minutes
- **Loader Animation** - Progress indicator during data loading
- **Marker Clustering** - Groups nearby ban events for clarity
- **WHOIS Lookup** - Modal with full WHOIS details
- **Local Libraries** - All deps local (jQuery 3.7.1, Bootstrap 4.6.2, Leaflet 1.9.4)

## 📦 Technology Stack

### Backend
- **PHP 7.x+** - API server
- **MySQL/MariaDB** - InnoDB with optimized indexes
- **fail2sql** - Fail2ban integration script

### Frontend
- **Leaflet 1.9.4** - Interactive mapping
- **Leaflet.MarkerCluster 1.5.3** - Marker clustering
- **Bootstrap 4.6.2** - Responsive UI framework
- **jQuery 3.7.1** - DOM manipulation
- **OpenStreetMap** - Free map tiles

## 🔑 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database host for PHP endpoints | `localhost` |
| `DB_USER` | Database username | `fail2ban` |
| `DB_PASSWORD` | Database password | `fail2ban` |
| `DB_NAME` | Database/schema name | `fail2ban` |
| `DB_TABLE` | Table storing ban records | `fail2ban` |
| `WEB_SERVER` | Allowed origin for CORS headers | `*` |
| `ADMIN_TOKEN_HASH` | SHA-256 hash of the admin portal token | *(empty)* |

Set these via `.env`, Docker Compose, or system environment variables. The admin portal requires `ADMIN_TOKEN_HASH`; generate it using the snippet shown in the installation section.

## 🔧 Requirements

- **Web Server:** Apache with PHP 7.x+
- **Database:** MySQL 5.7+ or MariaDB 10.2+
- **SSL Certificate:** Required for security headers (optional but recommended)
- **GeoIP Database:** Auto-downloaded by fail2sql (optional)
- **Fail2Ban:** Installed and configured on server

## 📥 Installation

### Quick Start with Docker (Recommended)

The easiest way to run BanHammer is with Docker and Docker Compose. **See [DOCKER.md](DOCKER.md) for detailed Docker instructions.**

**One-line startup:**
```bash
docker-compose up -d
```

This starts both the web server and database with all required configurations.

### Traditional Installation

#### 1. Deploy Code
```bash
git clone https://github.com/yoda1490/banhammer.git /var/www/banhammer
cd /var/www/banhammer
```

#### 2. Configure Database

Copy and edit configuration:
```bash
cp dbinfo.php.example dbinfo.php
nano dbinfo.php
```

Optionally configure environment variables (used by Docker Compose and other tooling):
```bash
cp .env.example .env
nano .env
```

When editing `.env`, set `ADMIN_TOKEN_HASH` to the SHA-256 hash of your chosen admin token. Generate one securely with:
```bash
TOKEN=$(openssl rand -hex 32)
echo "Admin token: $TOKEN"
echo -n "$TOKEN" | sha256sum | awk '{print $1}'
```
Store the printed hash (second command) in `.env` and keep the raw token secret—you will use it to log in to the admin portal.

Edit with your MySQL credentials:
```php
$db_host = 'localhost';
$db_user = 'fail2ban';
$db_pwd = 'your_password';
$database = 'fail2ban';
$table = 'fail2ban';
```

#### 3. Initialize Database

Create MySQL database:
```bash
mysql -u root -p
CREATE DATABASE fail2ban;
CREATE USER 'fail2ban'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON fail2ban.* TO 'fail2ban'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Import schema:
```bash
mysql -u fail2ban -p fail2ban < fail2sql/fail2ban.sql
mysql -u fail2ban -p fail2ban < fail2sql/upgrade-stats.sql
```

#### 4. Web Server Configuration

Configure Apache virtual host:
```apache
<VirtualHost *:80>
    ServerName ban.example.com
    DocumentRoot /var/www/banhammer
    
    <Directory /var/www/banhammer>
        AllowOverride All
        Require all granted
    </Directory>
    
    ErrorLog ${APACHE_LOG_DIR}/banhammer-error.log
    CustomLog ${APACHE_LOG_DIR}/banhammer-access.log combined
</VirtualHost>
```

Enable mod_rewrite:
```bash
a2enmod rewrite
systemctl restart apache2
```

#### 5. File Permissions
```bash
chown -R www-data:www-data /var/www/banhammer
chmod -R 755 /var/www/banhammer
```

#### 6. Populate with Fail2Ban Data

Run the fail2sql integration script:
```bash
cd /var/www/banhammer/fail2sql
python3 fail2sql -d fail2ban -u fail2ban -p your_password
```

Or copy from fail2ban's own database:
```bash
mysql -u fail2ban -p fail2ban < /var/log/fail2ban/fail2ban.sql
```

#### 7. Verify Installation

Open in browser:
```
http://ban.example.com
```

Check data is loading:
```bash
curl http://localhost/get.php?action=stats | jq .
curl http://localhost/get.php?action=markers | jq .
```
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

## 🐳 Docker Deployment

BanHammer includes full Docker support for easy containerized deployment.

### Docker Compose (Recommended)

Start with a single command:
```bash
docker-compose up -d
```

This creates:
- **banhammer-web** - PHP/Apache web server
- **banhammer-db** - MariaDB database
- **banhammer-network** - Isolated Docker network

### Environment Variables

Configure via `.env` file or directly:
```bash
DB_USER=fail2ban
DB_PASSWORD=secure_password
DB_NAME=fail2ban
WEB_SERVER=ban.example.com  # Set to your domain for production
WEB_PORT=80
```

### Docker Build Only

```bash
# Build image
docker build -t banhammer:latest .

# Run with existing database
docker run -d \
  -p 80:80 \
  -e DB_HOST=db.example.com \
  -e DB_USER=fail2ban \
  -e DB_PASSWORD=password \
  banhammer:latest
```

**For full Docker documentation, see [DOCKER.md](DOCKER.md).**

## 🚀 Performance Optimization

### Database Schema Upgrade

For existing installations, apply performance indexes:
```bash
mysql -u fail2ban -p fail2ban < fail2sql/upgrade.sql
```

### Stats Caching

Statistics are cached in the `banhammer_stats` table with automatic incremental updates every 5 minutes.

Force a full cache refresh:
```bash
curl http://localhost/get.php?action=stats-full
```



All endpoints return JSON.

### POST `/set.php` (Authenticated)

Used by Fail2Ban sensors to push new ban events without direct database access. Requires a bearer token that maps to a record inside `banhammer_accounts`.

**Headers**

- `Authorization: Bearer <your-long-random-token>`

**Body parameters (form or JSON)**

| Field     | Required | Description |
|-----------|----------|-------------|
| `ip`      | ✅       | IPv4/IPv6 address to log |
| `name`    | ⚙️*      | Jail/service name. Defaults to the account name if omitted |
| `protocol`| ⚙️       | Protocol label (default `tcp`) |
| `ports`   | ⚙️       | Port or comma-separated list (default `0`) |
| `ban`     | ⚙️       | `1` (default) or `0` to flag unbans |

`*` optional but recommended. Default values are derived from the authenticated account record when omitted.

**Example:**

```bash
TOKEN="my-super-secret-token"
curl -sS -X POST https://ban.boller.co/set.php \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "name=sshd" \
  -d "protocol=tcp" \
  -d "ports=22" \
  -d "ip=203.0.113.42"
```

**Response:**

```json
{
  "status": "ok",
  "id": 123456,
  "ip": "203.0.113.42",
  "name": "sshd",
  "account_id": 2
}
```

**Provisioning tokens**

Tokens are stored hashed (SHA-256) inside the `banhammer_accounts` table along with optional latitude/longitude metadata that is used as a fallback if GeoIP data is unavailable.

```sql
INSERT INTO banhammer_accounts (name, token_hash, latitude, longitude)
VALUES ('sensor-paris', SHA2('my-super-secret-token', 256), 48.8566, 2.3522);
```

Update `fail2sql/banhammer.conf` with the matching bearer token so Fail2Ban automatically posts new bans to `set.php`.

### Admin Portal (`admin.php`)

- Navigate to `https://your-domain/admin.php` (served by the same web host as the dashboard).
- Log in using the raw admin token whose hash you stored in `ADMIN_TOKEN_HASH`.
- Create new sensor accounts by providing a label and latitude/longitude. Tokens can be auto-generated (recommended) or manually supplied.
- After creation, the portal shows the newly generated token exactly once—copy it and configure your sensor/Fail2Ban action with it.
- Existing accounts are listed with their coordinates and timestamps (token hashes remain hidden for security).

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

**banhammer_accounts table:**
- `id` - Primary key
- `name` - Friendly sensor/account label
- `token_hash` - SHA-256 hash of the bearer token used by that sensor
- `latitude` / `longitude` - Optional sensor coordinates used as GeoIP fallback
- `created_at`, `updated_at` - Audit columns

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


**No data showing?**
- Verify `dbinfo.php` credentials
- Check fail2sql is configured correctly
- Test: `./fail2sql/fail2sql -l`

## 📝 Credits & History

- **Original:** ByteMe (2014) - Google Maps version
- **rjkreider** - PHP 7.x update, GeoIP updater fix
- **yoda1490** - OpenStreetMap migration, styling, optimizations
- **fail2sql:** Based on v1.0 by Jordan Tomkinson

## 📄 License

See LICENSE file or project repository

## 🤝 Contributing

Issues, PRs welcome! 

---

**Support:** Issues → https://github.com/yoda1490/banhammer/issues
