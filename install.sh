#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# your-life — One-file VPS installer (Ubuntu 24.04)
# Install Docker + clone repo + tarik .env & DB dari source via API
#
# Usage:
#   chmod +x install.sh
#   sudo ./install.sh --source-url https://yl.infoinfo.web.id --sync-secret <DB_SYNC_SECRET>
#   sudo ./install.sh                          # interaktif prompt
#   sudo ./install.sh --no-pull                # skip tarik DB/env
#   sudo ./install.sh --app-dir /opt/your-life --branch master
# ==============================================================================

REPO_URL="https://github.com/khaliiiila/your-life.git"
BRANCH="master"
APP_DIR="/opt/your-life"
SOURCE_URL=""
SYNC_SECRET=""
NO_PULL="false"

# --- parse args ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-url) SOURCE_URL="$2"; shift 2 ;;
    --sync-secret) SYNC_SECRET="$2"; shift 2 ;;
    --app-dir) APP_DIR="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --no-pull) NO_PULL="true"; shift ;;
    --help|-h)
      echo "Usage: $0 [--source-url URL] [--sync-secret SECRET] [--app-dir DIR] [--branch BRANCH] [--no-pull]"
      exit 0
      ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

# --- guard root ---
if [[ $EUID -ne 0 ]]; then
  echo "[!] Jalankan dengan sudo/root: sudo ./install.sh" >&2
  exit 1
fi

INVOKER_USER="${SUDO_USER:-root}"
echo "==> your-life installer (Ubuntu 24.04) — APP_DIR=$APP_DIR BRANCH=$BRANCH"

# --- prompt interaktif jika tidak --no-pull tapi arg kosong ---
if [[ "$NO_PULL" != "true" && -z "$SOURCE_URL" ]]; then
  read -rp "Source URL (misal https://yl.infoinfo.web.id) [kosongkan untuk skip tarik DB/env]: " SOURCE_URL || true
fi
if [[ -n "$SOURCE_URL" && -z "$SYNC_SECRET" ]]; then
  read -rsp "DB_SYNC_SECRET (Bearer token dari source): " SYNC_SECRET; echo
fi
# normalize SOURCE_URL (hapus trailing slash)
SOURCE_URL="${SOURCE_URL%/}"
if [[ -n "$SOURCE_URL" && "$SOURCE_URL" != https://* && "$SOURCE_URL" != http://localhost* && "$SOURCE_URL" != http://127.0.0.1* ]]; then
  echo "[!] SOURCE_URL harus https:// (atau http://localhost untuk test). Diberi: $SOURCE_URL" >&2
  exit 1
fi

# --- 1. base deps ---
echo "==> [1/6] Update apt & install base deps..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y git curl wget ca-certificates gnupg lsb-release openssl ufw 2>&1 | tail -5

# --- 2. docker ---
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  echo "==> [2/6] Docker sudah terinstall: $(docker --version) | $(docker compose version)"
else
  echo "==> [2/6] Install Docker (official repo)..."
  install -m 0755 -d /etc/apt/keyrings
  if [[ ! -f /etc/apt/keyrings/docker.gpg ]]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
  fi
  ARCH="$(dpkg --print-architecture)"
  CODENAME="$(. /etc/os-release && echo "$VERSION_CODENAME")"
  echo "deb [arch=$ARCH signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $CODENAME stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
  echo "==> Docker terinstall: $(docker --version)"
fi

# --- 3. clone / pull ---
echo "==> [3/6] Clone/pull repo $REPO_URL -> $APP_DIR (branch $BRANCH)..."
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" fetch origin "$BRANCH"
  # stash local changes if any (installer idempotent)
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull --ff-only origin "$BRANCH" || git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  # if dir exists but not git, backup
  if [[ -d "$APP_DIR" && -n "$(ls -A "$APP_DIR" 2>/dev/null)" ]]; then
    BK="/tmp/your-life-bak-$(date +%Y%m%d-%H%M%S)"
    echo "    APP_DIR tidak kosong & bukan git repo, backup ke $BK"
    mv "$APP_DIR" "$BK"
  fi
  git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
fi
# chown
if [[ "$INVOKER_USER" != "root" ]]; then
  chown -R "$INVOKER_USER:$INVOKER_USER" "$APP_DIR" || true
fi
cd "$APP_DIR"

# --- 4. .env ---
echo "==> [4/6] Setup .env..."
if [[ -n "$SOURCE_URL" && -n "$SYNC_SECRET" && "$NO_PULL" != "true" ]]; then
  echo "    Menarik .env dari $SOURCE_URL/api/admin/env-export ..."
  if curl -fsSL --retry 3 --max-time 30 -H "Authorization: Bearer $SYNC_SECRET" "$SOURCE_URL/api/admin/env-export" -o "$APP_DIR/.env.tmp"; then
    if grep -q "DATABASE_URL" "$APP_DIR/.env.tmp" 2>/dev/null; then
      mv "$APP_DIR/.env.tmp" "$APP_DIR/.env"
      chmod 600 "$APP_DIR/.env"
      echo "    .env berhasil ditarik ($(wc -l < "$APP_DIR/.env") baris)"
    else
      echo "[!] Response env-export tidak valid (tidak ada DATABASE_URL). Isi:" >&2
      head -20 "$APP_DIR/.env.tmp" >&2 || true
      rm -f "$APP_DIR/.env.tmp"
      exit 1
    fi
  else
    echo "[!] Gagal tarik .env — cek SOURCE_URL & DB_SYNC_SECRET (401?)" >&2
    rm -f "$APP_DIR/.env.tmp"
    exit 1
  fi
else
  if [[ -f "$APP_DIR/.env" ]]; then
    echo "    .env sudah ada, skip (gunakan --source-url untuk overwrite)"
  else
    echo "    Buat .env dari .env.example + generate secrets..."
    cp "$APP_DIR/.env.example" "$APP_DIR/.env"
    # generate random secrets jika masih placeholder
    RAND_DB=$(openssl rand -base64 24 | tr -d '\n' | tr -dc 'A-Za-z0-9' | head -c 32)
    RAND_SYNC=$(openssl rand -base64 36 | tr -d '\n')
    RAND_WHALE=$(openssl rand -base64 36 | tr -d '\n')
    # replace placeholder values (only if default)
    sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${RAND_DB}|" "$APP_DIR/.env" || true
    # ensure DB_SYNC_SECRET & WHALE_INGEST_SECRET diisi jika masih placeholder
    if grep -q "rahasia-acak" "$APP_DIR/.env"; then
      sed -i "s|rahasia-acak-64-karakter|${RAND_SYNC}|g" "$APP_DIR/.env" || true
    fi
    chmod 600 "$APP_DIR/.env"
    echo "    [!] Edit manual: nano $APP_DIR/.env  (isi AI_API_KEY, TELEGRAM_*, BIDBOT_*)"
  fi
fi

# ensure .env has DATABASE_URL etc (docker-compose butuh)
if [[ ! -f "$APP_DIR/.env" ]]; then
  echo "[!] .env tidak ditemukan setelah setup" >&2; exit 1
fi

# --- 5. docker compose up ---
echo "==> [5/6] Build & start docker compose (dev mode)..."
# load env for psql fallback
set -a; source "$APP_DIR/.env"; set +a
POSTGRES_USER="${POSTGRES_USER:-your_life}"
POSTGRES_DB="${POSTGRES_DB:-your_life}"

docker compose -f "$APP_DIR/docker-compose.yml" up -d --build

echo "    Menunggu db healthy..."
for i in $(seq 1 60); do
  STATUS="$(docker inspect --format='{{.State.Health.Status}}' your-life-db-1 2>/dev/null || echo "starting")"
  if [[ "$STATUS" == "healthy" ]]; then echo "    db healthy ($i s)"; break; fi
  if [[ $i -eq 60 ]]; then echo "[!] db tidak healthy setelah 60s (status=$STATUS)" >&2; docker compose -f "$APP_DIR/docker-compose.yml" ps; docker compose -f "$APP_DIR/docker-compose.yml" logs db --tail 50 || true; exit 1; fi
  sleep 1
done

echo "    Menunggu app healthy..."
for i in $(seq 1 90); do
  ASTATUS="$(docker inspect --format='{{.State.Health.Status}}' your-life-app-1 2>/dev/null || echo "starting")"
  # fallback: check http
  if [[ "$ASTATUS" == "healthy" ]]; then echo "    app healthy ($i s)"; break; fi
  if curl -fsS "http://127.0.0.1:${APP_PORT:-3000}/api/health" >/dev/null 2>&1; then echo "    app responding ($i s)"; break; fi
  if [[ $i -eq 90 ]]; then echo "[!] app belum healthy setelah 90s" >&2; docker compose -f "$APP_DIR/docker-compose.yml" logs app --tail 80 || true; break; fi
  sleep 1
done

# --- 6. tarik & restore DB ---
if [[ -n "$SOURCE_URL" && -n "$SYNC_SECRET" && "$NO_PULL" != "true" ]]; then
  echo "==> [6/6] Tarik DB dump dari $SOURCE_URL/api/admin/db-export ..."
  if curl -fsSL --retry 3 --max-time 60 -H "Authorization: Bearer $SYNC_SECRET" "$SOURCE_URL/api/admin/db-export" -o /tmp/prod.sql; then
    if grep -q "BEGIN;" /tmp/prod.sql && grep -q "COMMIT;" /tmp/prod.sql; then
      echo "    Dump OK ($(du -h /tmp/prod.sql | cut -f1)), restore ke postgres..."
      # try psql via db container first (paling andal)
      if docker exec -i your-life-db-1 psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < /tmp/prod.sql; then
        echo "    Restore sukses via psql"
      else
        echo "    psql gagal, coba via Node pg (fallback)..."
        # fallback via app container node
        docker compose -f "$APP_DIR/docker-compose.yml" exec -T app sh -c "node -e \"const fs=require('fs');const{Pool}=require('pg');(async()=>{const sql=fs.readFileSync('/tmp/prod.sql' in require('fs') ? '/tmp/prod.sql' : '/dev/stdin','utf8'); const p=new Pool({connectionString:process.env.DATABASE_URL}); await p.query(sql); await p.end(); console.log('restore via pg done')})()\"" 2>&1 || {
          echo "[!] Restore fallback gagal — coba manual: docker exec -i your-life-db-1 psql -U $POSTGRES_USER -d $POSTGRES_DB < /tmp/prod.sql" >&2
        }
      fi
      shred -u /tmp/prod.sql 2>/dev/null || rm -f /tmp/prod.sql
    else
      echo "[!] Dump tidak valid (tidak ada BEGIN/COMMIT)" >&2
      head -20 /tmp/prod.sql >&2 || true
      rm -f /tmp/prod.sql
      exit 1
    fi
  else
    echo "[!] Gagal tarik db-export — cek secret & URL" >&2
    rm -f /tmp/prod.sql
    exit 1
  fi
else
  echo "==> [6/6] Skip tarik DB (no --source-url atau --no-pull)"
fi

# --- done ---
echo ""
echo "=========================================================="
echo "  Selesai!  APP_DIR=$APP_DIR"
echo "  docker compose ps:"
docker compose -f "$APP_DIR/docker-compose.yml" ps || true
echo ""
echo "  Logs (tail 30 app):"
docker compose -f "$APP_DIR/docker-compose.yml" logs app --tail 30 || true
echo ""
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  echo "  UFW aktif — buka port ${APP_PORT:-3000} jika perlu:"
  echo "    sudo ufw allow ${APP_PORT:-3000}/tcp"
fi
echo "  Akses: http://\$(curl -s ifconfig.me 2>/dev/null || echo '<VPS_IP>'):${APP_PORT:-3000}"
echo "  Edit env: nano $APP_DIR/.env && docker compose -f $APP_DIR/docker-compose.yml restart"
echo "  Update kode: git -C $APP_DIR pull && docker compose -f $APP_DIR/docker-compose.yml up -d --build"
echo "=========================================================="
