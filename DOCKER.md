# Docker Deployment Guide

## Quick Start

### Using Docker Compose (Recommended)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/k-j-kim/script-runner.git
   cd script-runner
   ```

2. **Start the container:**
   ```bash
   docker-compose up -d
   ```

3. **Access the application:**
   Open http://localhost:3000

4. **View logs:**
   ```bash
   docker-compose logs -f
   ```

5. **Stop the container:**
   ```bash
   docker-compose down
   ```

### Using Docker CLI

1. **Build the image:**
   ```bash
   docker build -t script-runner .
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     --name script-runner \
     -p 3000:3000 \
     -v $(pwd)/data/scripts.sqlite:/app/scripts.sqlite \
     -v $(pwd)/data/scripts:/app/scripts \
     -v $(pwd)/data/logs:/app/logs \
     script-runner
   ```

3. **View logs:**
   ```bash
   docker logs -f script-runner
   ```

4. **Stop the container:**
   ```bash
   docker stop script-runner
   docker rm script-runner
   ```

## Data Persistence

All data is stored in the `./data` directory:

- `data/scripts.sqlite` - SQLite database
- `data/scripts/` - Uploaded script files
- `data/logs/` - Execution log files

This directory is automatically created when using docker-compose.

## Port Configuration

Default port is 3000. To use a different port:

**Docker Compose:**
```yaml
ports:
  - "8080:3000"  # Host:Container
```

**Docker CLI:**
```bash
docker run -p 8080:3000 script-runner
```

## Health Check

The container includes a health check that pings the API every 30 seconds:

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' script-runner
```

Possible statuses:
- `starting` - Container is starting up
- `healthy` - Container is running properly
- `unhealthy` - Health check is failing

## Updating

1. **Stop the current container:**
   ```bash
   docker-compose down
   ```

2. **Pull latest changes:**
   ```bash
   git pull
   ```

3. **Rebuild and start:**
   ```bash
   docker-compose up -d --build
   ```

Your data will be preserved in the `./data` directory.

## Backup and Restore

### Backup

```bash
# Backup all data
tar -czf script-runner-backup-$(date +%Y%m%d).tar.gz data/

# Backup just the database
cp data/scripts.sqlite backups/scripts-$(date +%Y%m%d).sqlite
```

### Restore

```bash
# Stop the container
docker-compose down

# Restore data
tar -xzf script-runner-backup-20260405.tar.gz

# Start the container
docker-compose up -d
```

## Troubleshooting

### Container won't start

**Check logs:**
```bash
docker-compose logs
```

**Common issues:**
- Port 3000 already in use
- Insufficient disk space
- Corrupted database file

### Permission issues

If you encounter permission errors with mounted volumes:

```bash
# Fix ownership (Linux/Mac)
sudo chown -R $(id -u):$(id -g) data/
```

### Database corruption

Reset the database:

```bash
# Stop container
docker-compose down

# Remove database
rm data/scripts.sqlite

# Start container (fresh database will be created)
docker-compose up -d
```

### Out of disk space

Check Docker disk usage:
```bash
docker system df
```

Clean up unused data:
```bash
docker system prune -a
```

## Environment Variables

Available environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node environment |
| `PORT` | `3000` | Server port |

Set in `docker-compose.yml`:

```yaml
environment:
  - PORT=8080
  - NODE_ENV=production
```

## Multi-Platform Build

Build for multiple architectures:

```bash
# Create builder
docker buildx create --name multiarch --use

# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t your-registry/script-runner:latest \
  --push \
  .
```

## Production Deployment

### With Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name scripts.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### With SSL (Let's Encrypt)

```bash
# Install certbot
sudo apt-get install certbot

# Get certificate
sudo certbot --nginx -d scripts.yourdomain.com
```

### Resource Limits

Limit container resources:

```yaml
services:
  script-runner:
    # ... other config ...
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

## Monitoring

### Container Stats

```bash
# Real-time stats
docker stats script-runner

# Resource usage
docker inspect script-runner | jq '.[0].State'
```

### Application Logs

```bash
# Follow logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Logs from specific time
docker-compose logs --since 30m
```

## Security

### Best Practices

1. **Run as non-root user** (already configured in Dockerfile)
2. **Keep base image updated:**
   ```bash
   docker pull node:18-alpine
   docker-compose build --no-cache
   ```
3. **Scan for vulnerabilities:**
   ```bash
   docker scan script-runner
   ```
4. **Use secrets for sensitive data** (if adding authentication)

## Development

Build and run locally with live reload:

```bash
# Build development image
docker build -t script-runner:dev \
  --target frontend-builder \
  .

# Run with source mounted
docker run -it --rm \
  -p 3000:3000 \
  -v $(pwd):/app \
  script-runner:dev \
  npm run dev
```

## FAQ

**Q: Can I use an external database?**
A: Currently only SQLite is supported. PostgreSQL/MySQL support could be added in the future.

**Q: How do I add npm packages for my scripts?**
A: Rebuild the container after adding packages to `package.json`:
```bash
docker-compose down
docker-compose up -d --build
```

**Q: Can I run multiple instances?**
A: Yes, but they should have separate data directories and ports. SQLite doesn't support concurrent writes well, so consider using different databases.

**Q: What about Windows?**
A: Works on Windows with Docker Desktop. Use PowerShell for commands and adjust paths as needed.

## Support

For issues and questions:
- GitHub Issues: https://github.com/k-j-kim/script-runner/issues
- Documentation: See README.md for application usage
