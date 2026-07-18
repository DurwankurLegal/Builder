# Builder CRM — Production Deployment Runbook

**Target:** `https://builder.durwankur.com` on `103.14.97.240` (Ubuntu 22.04.5 LTS)
**Constraint:** `cctv.durwankur.com` and `dsa.durwankur.com` must not be affected.

---

## How the existing applications are protected

| Risk | Mitigation |
|---|---|
| Port conflict | Every container binds **127.0.0.1 only**, on uncommon ports (18000/18080/18432/18379). Nothing new is published on the public interface. |
| Container/volume name clash | All objects prefixed `buildercrm_prod_*`, own network `buildercrm_prod_net`. |
| Database interference | Its **own** PostgreSQL + Redis containers. No shared instance, no shared credentials. |
| nginx breakage | A **new** vhost file only. Existing site files are never opened. `nginx -t` gates every change, and we `reload` (not `restart`) — existing connections are not dropped. |
| Certificate disruption | `certbot -d builder.durwankur.com` only. Other certs untouched. |
| Resource starvation | Memory limits on every container (~1.6 GB total ceiling) + log rotation caps. |
| Bad deploy | Full rollback in step 10. |

Run `./preflight.sh` first — it is **read-only** and verifies all of the above.

---

## 0. Prerequisites

- DNS **A record**: `builder.durwankur.com → 103.14.97.240` (must resolve before step 6)
- Docker Engine + Compose v2 installed
- `webadmin` in the `docker` group (`sudo usermod -aG docker webadmin`, then re-login)

---

## 1. Baseline — record current healthy state

```bash
# Capture this output. It is your comparison point after deploying.
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
ls -1 /etc/nginx/sites-enabled/
sudo nginx -t
curl -sS -o /dev/null -w 'cctv: %{http_code}\n' https://cctv.durwankur.com
curl -sS -o /dev/null -w 'dsa:  %{http_code}\n' https://dsa.durwankur.com
```

## 2. Fetch the code

```bash
sudo mkdir -p /opt/buildercrm && sudo chown webadmin:webadmin /opt/buildercrm
git clone https://github.com/DurwankurLegal/Builder.git /opt/buildercrm
cd /opt/buildercrm/deploy
chmod +x preflight.sh backup.sh
```

## 3. Preflight — **do not continue unless this passes**

```bash
./preflight.sh
```

## 4. Generate secrets

```bash
cp .env.example .env
chmod 600 .env

echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
echo "SECRET_KEY=$(openssl rand -hex 48)"
# paste both into .env, replacing the CHANGE_ME values
nano .env
```

> The application ships with an insecure default `SECRET_KEY`. Setting a real
> one here is mandatory — it signs every session token.

## 5. Build and start (nothing public yet)

```bash
cd /opt/buildercrm/deploy
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker compose -f docker-compose.prod.yml ps

# Verify locally before exposing it
curl -sS http://127.0.0.1:18000/health   # {"status":"operational",...}
curl -sSI http://127.0.0.1:18080/ | head -1   # HTTP/1.1 200 OK
```

**Confirm the other apps are still healthy** (compare with step 1):
```bash
docker ps --format 'table {{.Names}}\t{{.Status}}'
curl -sS -o /dev/null -w 'cctv: %{http_code}\ndsa: %{http_code}\n' \
  https://cctv.durwankur.com https://dsa.durwankur.com
```

## 6. Initialise the database

```bash
docker compose -f docker-compose.prod.yml exec backend python -m app.db.seed
```
Creates schemas, tables and the workspace admin accounts. Demo lead data is
**not** seeded (`SEED_DEMO_DATA=0`).

## 7. nginx vhost — additive only

```bash
sudo cp /opt/buildercrm/deploy/nginx/builder.durwankur.com.conf \
        /etc/nginx/sites-available/builder.durwankur.com

# TLS lines reference certs that don't exist yet; comment them out for now
sudo sed -i 's|^\(\s*ssl_certificate\)|#\1|; s|^\(\s*include /etc/letsencrypt\)|#\1|; s|^\(\s*ssl_dhparam\)|#\1|' \
        /etc/nginx/sites-available/builder.durwankur.com

sudo ln -s /etc/nginx/sites-available/builder.durwankur.com \
           /etc/nginx/sites-enabled/builder.durwankur.com

sudo nginx -t          # MUST pass — if it fails, remove the symlink and stop
sudo systemctl reload nginx     # reload, not restart: zero downtime
```

## 8. TLS certificate

```bash
sudo certbot --nginx -d builder.durwankur.com
```
Certbot edits **only** this vhost and re-enables the TLS directives. Verify the
other sites still serve correctly afterwards:
```bash
curl -sS -o /dev/null -w 'cctv: %{http_code}\ndsa: %{http_code}\nbuilder: %{http_code}\n' \
  https://cctv.durwankur.com https://dsa.durwankur.com https://builder.durwankur.com
sudo certbot renew --dry-run
```

## 9. Post-deploy — **change the default credentials immediately**

The seed creates `admin` / `admin` in every workspace. This is an internet-facing
system now.

1. Log in at `https://builder.durwankur.com` as `admin` / `admin`
2. **User Management → Reset Password** for every seeded account
   (`admin`, `priya`, `amit` in each workspace), ticking *require change at next login*
3. Delete any account you do not need

Then enable backups:
```bash
sudo mkdir -p /var/backups/buildercrm
( sudo crontab -l 2>/dev/null; echo "30 2 * * * /opt/buildercrm/deploy/backup.sh >> /var/log/buildercrm-backup.log 2>&1" ) | sudo crontab -
/opt/buildercrm/deploy/backup.sh    # verify it works now
```

## 10. Rollback

Removes Builder completely; the other applications are untouched throughout.

```bash
sudo rm -f /etc/nginx/sites-enabled/builder.durwankur.com
sudo nginx -t && sudo systemctl reload nginx

cd /opt/buildercrm/deploy
docker compose -f docker-compose.prod.yml down          # keeps data volumes
# docker compose -f docker-compose.prod.yml down -v      # also deletes data
```

---

## Updating (zero downtime for the other apps)

```bash
cd /opt/buildercrm
./deploy/backup.sh                 # always back up first
git pull origin main
cd deploy
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker compose -f docker-compose.prod.yml exec backend python -m app.db.seed   # idempotent migrations
```

The frontend and backend are replaced sequentially; nginx keeps serving and the
other two sites are never involved.

---

## Operations

```bash
# Logs
docker compose -f docker-compose.prod.yml logs -f backend
tail -f /var/log/nginx/builder.durwankur.com.error.log

# Health
curl -sS https://builder.durwankur.com/health
docker stats --no-stream

# Restart just this stack
docker compose -f docker-compose.prod.yml restart backend
```

### Scaling the backend
The AI calling loop **must run in exactly one process**. If you raise
`--workers` above 1 in `backend.prod.Dockerfile`, set `RUN_AI_AGENT=0` for that
service and run one additional single-worker instance with `RUN_AI_AGENT=1`.
Otherwise every worker dials the same leads.

---

## Server hardening (recommended, independent of this app)

The SSH password was shared in plaintext — rotate it and move to keys:

```bash
# From your workstation
ssh-copy-id -p 2222 webadmin@103.14.97.240

# On the server, after confirming key login works in a SECOND session
sudo nano /etc/ssh/sshd_config
#   PasswordAuthentication no
#   PermitRootLogin no
sudo sshd -t && sudo systemctl reload sshd

sudo ufw allow 2222/tcp && sudo ufw allow 80,443/tcp && sudo ufw enable
sudo apt install -y fail2ban && sudo systemctl enable --now fail2ban
```

Keep a second SSH session open while changing sshd config so you cannot lock
yourself out.
