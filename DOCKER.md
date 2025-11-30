# BanHammer - Docker Setup Guide

## Quick Start with Docker Compose

The fastest way to get BanHammer running is with Docker Compose, which automatically sets up both the web server and database.

### Prerequisites
- Docker & Docker Compose installed
- A fail2ban database with data (or let it initialize with the provided SQL scripts)

### Basic Usage

1. **Clone or download BanHammer**
   ```bash
   git clone https://github.com/yoda1490/banhammer.git
   cd banhammer
   ```

2. **Create `.env` file** (optional, for custom configuration)
   ```bash
   cp .env.example .env
   nano .env
   # Fill in your database credentials, web server domain, and admin token hash
   ```

3. **Start the containers**
   ```bash
   docker-compose up -d
   ```

4. **Access the dashboard**
   - Open `http://localhost` in your browser
   - The web container will automatically connect to MariaDB

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | mariadb | Database hostname |
| `DB_USER` | fail2ban | Database user |
| `DB_PASSWORD` | fail2ban | Database password |
| `DB_NAME` | fail2ban | Database name |
| `DB_TABLE` | fail2ban | fail2ban table name |
| `WEB_SERVER` | * | CORS allowed origins (set to your domain for production) |
| `WEB_PORT` | 80 | Port to expose web server on |
| `MYSQL_ROOT_PASSWORD` | rootpassword | MariaDB root password |

### Docker Compose Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f web
docker-compose logs -f mariadb

# Rebuild image
docker-compose up -d --build

# Remove volumes (WARNING: deletes database)
docker-compose down -v
```

## Docker Build Only (Manual)

If you prefer to build and run containers manually:

### Build the Image

```bash
docker build -t banhammer:latest .
```

### Run the Container

```bash
docker run -d \
  --name banhammer-web \
  -p 80:80 \
  -e DB_HOST=your-database-host \
  -e DB_USER=fail2ban \
  -e DB_PASSWORD=your_password \
  -e DB_NAME=fail2ban \
  -e WEB_SERVER=yourdomain.com \
  -v /path/to/banhammer:/var/www/html \
  banhammer:latest
```

### Run MariaDB Container

```bash
docker run -d \
  --name banhammer-db \
  -e MYSQL_ROOT_PASSWORD=rootpassword \
  -e MYSQL_DATABASE=fail2ban \
  -e MYSQL_USER=fail2ban \
  -e MYSQL_PASSWORD=fail2ban \
  -v mariadb_data:/var/lib/mysql \
  -p 3306:3306 \
  mariadb:latest
```

### Link Containers

```bash
docker network create banhammer-network
docker network connect banhammer-network banhammer-db
docker network connect banhammer-network banhammer-web
```

## Configuration

### Using dbinfo.php.example

The `dbinfo.php.example` has been updated to read environment variables:

- If `DB_HOST` env var is set, it uses that value
- Otherwise, it falls back to the default (localhost)
- Same for all database configuration parameters

This allows you to:
1. Run the container with environment variables
2. Keep your `.env` file out of version control
3. Use different configs per environment (dev, staging, production)

### Production Security

For production deployments:

1. **Set a strong `WEB_SERVER` value** to restrict CORS:
   ```bash
   docker-compose -e WEB_SERVER=ban.example.com up -d
   ```

2. **Use strong database passwords**

3. **Mount SSL certificates** if using HTTPS with a reverse proxy

4. **Use secrets management** instead of `.env` files for passwords

5. **Enable only required database permissions** for the `fail2ban` user

### Database Initialization

The `docker-compose.yml` automatically runs:
- `fail2sql/fail2ban.sql` - Creates tables and indexes
- `fail2sql/upgrade-stats.sql` - Creates the stats cache table

To populate with existing fail2ban data, mount your fail2ban database or import a backup.

## Monitoring

### Check Container Health

```bash
docker-compose ps
```

Both containers have health checks configured:
- **Web**: Checks HTTP connectivity every 30s
- **MariaDB**: Checks database connectivity every 10s

### View Logs

```bash
# Web server logs
docker-compose logs -f web

# Database logs
docker-compose logs -f mariadb

# All logs
docker-compose logs -f
```

### Database Statistics

Access the database directly:

```bash
docker-compose exec mariadb mysql -u fail2ban -p fail2ban -e "SELECT COUNT(*) FROM fail2ban;"
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs web
docker-compose logs mariadb

# Verify database is running
docker-compose ps
```

### Database Connection Failed

```bash
# Verify database is ready
docker-compose exec mariadb healthcheck.sh --connect

# Check MySQL connectivity
docker-compose exec web mysql -h mariadb -u fail2ban -p fail2ban -e "SELECT 1;"
```

### Port Already in Use

```bash
# Change port in .env or command line
docker-compose -e WEB_PORT=8080 up -d
```

### Persistent Database Errors

```bash
# Backup current data if needed
docker-compose exec mariadb mysqldump -u fail2ban -p fail2ban > backup.sql

# Remove and recreate
docker-compose down -v
docker-compose up -d
```

## Production Deployment

For production, consider:

1. **Use Docker Swarm or Kubernetes** for orchestration
2. **Add a reverse proxy** (Nginx/HAProxy) with SSL/TLS
3. **Use managed database services** (AWS RDS, Google Cloud SQL, etc.)
4. **Enable database backups** and replication
5. **Monitor with Prometheus/Grafana**
6. **Use secrets management** (Docker Secrets, Vault, etc.)

## Advanced: Custom Configuration

To use a custom `dbinfo.php`:

1. Create your `dbinfo.php` with specific configuration
2. Modify the Dockerfile to skip the copy step or override it:
   ```dockerfile
   COPY dbinfo.php /var/www/html/dbinfo.php
   ```

3. Rebuild and run

## Support

For issues or questions:
- Check the main [README.md](README.md)
- Review Docker Compose logs: `docker-compose logs`
- Test database connectivity manually

---

Happy banning! 🚀
