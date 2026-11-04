#!/bin/bash
#
# Workerra - run the site locally on Docker, reachable from other machines on
# the LAN. The counterpart of opsapi's and diy-tax-return-uk's start.sh.
#
#   ./start.sh                 dev mode: next dev with hot reload (default)
#   ./start.sh --mode=prod     the production Dockerfile image
#   ./start.sh --lan-ip=IP     use this address instead of the detected one
#   ./start.sh --port=PORT     host port (default 3020)
#   ./start.sh --logs          follow the logs after starting
#   ./start.sh --no-opsapi     don't start OpsAPI (jobs, applying and recruiter sign-in are off)
#   ./start.sh --down          stop everything (OpsAPI's database is kept)
#   ./start.sh --reset-data    stop everything and delete OpsAPI's database
#
# Alongside the site it starts OpsAPI (Postgres + the bwalia/opsapi image with
# Workerra's plugin, docker-compose.opsapi.yml) on http://localhost:4041: job
# listings, applications and recruiter sign-in all run against it. The first run
# creates the Workerra workspace and a recruiter account, and writes the server's
# API key, the recruiter's password and the other local secrets into .env.local.
# The jobs board starts empty: sign in at /recruiters and post a job.
#
# Settings come from .env.local (created from .env.example on first run). With
# no NEBULA_URL the assistant runs in guided mode.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

cd "$(dirname "$0")"

MODE=dev
LAN_IP_FLAG=""
PORT=3020
FOLLOW_LOGS=false
DOWN=false
RESET_DATA=false
WITH_OPSAPI=true

show_help() {
    sed -n '3,25p' "$0" | sed 's/^# \{0,1\}//'
}

for arg in "$@"; do
    case $arg in
        --mode=*)   MODE="${arg#*=}" ;;
        --lan-ip=*) LAN_IP_FLAG="${arg#*=}" ;;
        --port=*)   PORT="${arg#*=}" ;;
        --logs)     FOLLOW_LOGS=true ;;
        --down)     DOWN=true ;;
        --reset-data) DOWN=true; RESET_DATA=true ;;
        --no-opsapi) WITH_OPSAPI=false ;;
        -h|--help)  show_help; exit 0 ;;
        *)
            echo -e "${RED}Unknown option: $arg${NC}"
            show_help
            exit 1
            ;;
    esac
done

if [ "$MODE" != "dev" ] && [ "$MODE" != "prod" ]; then
    echo -e "${RED}--mode must be dev or prod, got \"$MODE\"${NC}"
    exit 1
fi

# Both profiles, so switching modes never leaves the other one holding the port.
COMPOSE=(docker compose --profile dev --profile prod)
OPSAPI_COMPOSE=(docker compose -f docker-compose.opsapi.yml --profile server)
OPSAPI_PORT=4041

# ─── Preflight ───────────────────────────────────────────────────────────
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}Docker isn't running. Start Docker Desktop (or Colima) and try again.${NC}"
    exit 1
fi

if [ "$DOWN" = true ]; then
    echo -e "${YELLOW}Stopping Workerra...${NC}"
    "${COMPOSE[@]}" down
    if [ "$RESET_DATA" = true ]; then
        "${OPSAPI_COMPOSE[@]}" down -v --remove-orphans
        # The old key and password belong to the deleted database.
        [ -f .env.local ] && sed -i.bak -e 's/^OPSAPI_API_KEY=.*/OPSAPI_API_KEY=/' .env.local && rm -f .env.local.bak
        echo -e "${GREEN}Stopped, and OpsAPI's database deleted.${NC}"
    else
        "${OPSAPI_COMPOSE[@]}" down --remove-orphans
        echo -e "${GREEN}Stopped. OpsAPI's data is kept; --reset-data deletes it.${NC}"
    fi
    exit 0
fi

if [ ! -f .env.local ]; then
    echo -e "${YELLOW}No .env.local yet; creating it from .env.example${NC}"
    cp .env.example .env.local
fi

_read_var() { grep "^$1=" .env.local 2>/dev/null | head -1 | cut -d'=' -f2- || true; }

# Sets KEY=value in .env.local, replacing an existing line or adding one.
_write_var() {
    local key="$1" value="$2"
    if grep -q "^$key=" .env.local; then
        local tmp
        tmp=$(mktemp)
        awk -v k="$key" -v v="$value" 'BEGIN { FS = OFS = "=" } $1 == k { print k "=" v; next } { print }' .env.local > "$tmp"
        cat "$tmp" > .env.local
        rm -f "$tmp"
    else
        printf '%s=%s\n' "$key" "$value" >> .env.local
    fi
}

# A value from .env.local, or a new random one saved there.
_ensure_secret() {
    local key="$1" bytes="$2" value
    value=$(_read_var "$key")
    if [ -z "$value" ]; then
        value=$(openssl rand -hex "$bytes")
        _write_var "$key" "$value"
    fi
    echo "$value"
}

# ─── OpsAPI: jobs, applications, recruiter sign-in ───────────────────────
if [ "$WITH_OPSAPI" = true ]; then
    SESSION_SECRET=$(_ensure_secret SESSION_SECRET 32)
    WORKERRA_RECRUITER_EMAIL=$(_read_var WORKERRA_RECRUITER_EMAIL)
    if [ -z "$WORKERRA_RECRUITER_EMAIL" ]; then
        WORKERRA_RECRUITER_EMAIL=recruiter@workerra.local
        _write_var WORKERRA_RECRUITER_EMAIL "$WORKERRA_RECRUITER_EMAIL"
    fi
    WORKERRA_RECRUITER_PASSWORD=$(_ensure_secret WORKERRA_RECRUITER_PASSWORD 12)
    # No email server locally, so OpsAPI accepts this as the sign-in code.
    OPSAPI_TEST_OTP_CODE=$(_ensure_secret OPSAPI_TEST_OTP_CODE 4)
    export WORKERRA_RECRUITER_EMAIL WORKERRA_RECRUITER_PASSWORD OPSAPI_TEST_OTP_CODE OPSAPI_PORT

    echo -e "${BLUE}Starting OpsAPI (the first run pulls the image and runs every migration; it takes a few minutes)...${NC}"
    if ! "${OPSAPI_COMPOSE[@]}" up -d --build opsapi; then
        echo -e "${RED}OpsAPI didn't start. See: docker compose -f docker-compose.opsapi.yml logs${NC}"
        exit 1
    fi
    for _ in $(seq 1 120); do
        curl -fsS -o /dev/null "http://localhost:$OPSAPI_PORT/health" 2>/dev/null && break
        sleep 2
    done
    if ! curl -fsS -o /dev/null "http://localhost:$OPSAPI_PORT/health" 2>/dev/null; then
        echo -e "${RED}OpsAPI isn't answering on port $OPSAPI_PORT. Last log lines:${NC}"
        "${OPSAPI_COMPOSE[@]}" logs --tail 40 opsapi
        exit 1
    fi

    # The server's API key: keep the one in .env.local while OpsAPI still accepts it.
    OPSAPI_API_KEY=$(_read_var OPSAPI_API_KEY)
    key_ok=false
    if [ -n "$OPSAPI_API_KEY" ] && curl -fsS -o /dev/null \
        -H "Authorization: Bearer $OPSAPI_API_KEY" -H "X-Namespace-Slug: workerra" \
        "http://localhost:$OPSAPI_PORT/api/v2/workerra/jobs?per_page=1" 2>/dev/null; then
        key_ok=true
    fi
    if [ "$key_ok" != true ]; then
        echo -e "${YELLOW}Setting up the Workerra workspace and recruiter account in OpsAPI...${NC}"
        bootstrap_out=$("${OPSAPI_COMPOSE[@]}" run --rm bootstrap 2>&1) || {
            echo "$bootstrap_out" | tail -20
            echo -e "${RED}OpsAPI bootstrap failed.${NC}"
            exit 1
        }
        OPSAPI_API_KEY=$(echo "$bootstrap_out" | sed -n 's/^OPSAPI_API_KEY=//p' | tail -1 | tr -d '\r')
        if [ -z "$OPSAPI_API_KEY" ]; then
            echo "$bootstrap_out" | tail -20
            echo -e "${RED}The bootstrap didn't print an API key.${NC}"
            exit 1
        fi
        _write_var OPSAPI_API_KEY "$OPSAPI_API_KEY"
    fi
    _write_var OPSAPI_URL "http://localhost:$OPSAPI_PORT"
    _write_var OPSAPI_NAMESPACE workerra
    # Inside the app container, OpsAPI is on the host.
    OPSAPI_URL="http://host.docker.internal:$OPSAPI_PORT"
    export OPSAPI_URL OPSAPI_API_KEY SESSION_SECRET
    export OPSAPI_NAMESPACE=workerra
else
    # Empty values override .env.local's, so the site really runs without OpsAPI.
    export OPSAPI_URL="" OPSAPI_API_KEY="" OPSAPI_NAMESPACE=""
fi

# ─── LAN address ─────────────────────────────────────────────────────────
detect_lan_ip() {
    local ip=""
    if command -v ipconfig >/dev/null 2>&1; then
        # macOS: Wi-Fi is usually en0, Ethernet en1 or higher.
        for iface in en0 en1 en2 en3 en4 en5 en6 en7 en8; do
            ip=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
            [ -n "$ip" ] && break
        done
    fi
    if [ -z "$ip" ] && command -v hostname >/dev/null 2>&1; then
        ip=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
    fi
    echo "$ip"
}

LAN_IP="${LAN_IP_FLAG:-$(detect_lan_ip)}"
if [ -z "$LAN_IP" ]; then
    echo -e "${YELLOW}Couldn't detect a LAN address; the site will only be on localhost.${NC}"
    echo -e "${YELLOW}Pass --lan-ip=x.x.x.x to set it.${NC}"
    SITE_URL="http://localhost:$PORT"
else
    SITE_URL="http://$LAN_IP:$PORT"
fi

# ─── Assistant ───────────────────────────────────────────────────────────
# In the container "localhost" means the container itself, so a NebulaDB on
# this machine is reached through host.docker.internal instead.
NEBULA_URL=$(_read_var NEBULA_URL)
NEBULA_URL="${NEBULA_URL//localhost/host.docker.internal}"
NEBULA_URL="${NEBULA_URL//127.0.0.1/host.docker.internal}"

export SITE_URL NEBULA_URL
export WORKERRA_PORT="$PORT"

# ─── Start ───────────────────────────────────────────────────────────────
echo -e "${BLUE}Starting Workerra ($MODE mode)...${NC}"
"${COMPOSE[@]}" down --remove-orphans >/dev/null 2>&1 || true
if [ "$MODE" = prod ]; then
    docker compose --profile prod up -d --build prod
else
    docker compose --profile dev up -d dev
fi

echo -e "${YELLOW}Waiting for the site to answer (the first dev start installs packages)...${NC}"
ready=false
for _ in $(seq 1 180); do
    if curl -fsS -o /dev/null "http://localhost:$PORT/api/health" 2>/dev/null; then
        ready=true
        break
    fi
    state=$(docker compose --profile "$MODE" ps --format '{{.State}}' "$MODE" 2>/dev/null || true)
    if [ "$state" = "exited" ] || [ "$state" = "dead" ]; then
        break
    fi
    sleep 2
done

if [ "$ready" != true ]; then
    echo -e "${RED}Workerra didn't come up. Last log lines:${NC}"
    docker compose --profile "$MODE" logs --tail 40 "$MODE"
    exit 1
fi

echo ""
echo -e "${GREEN}Workerra is running ($MODE mode).${NC}"
echo -e "  ${BLUE}This machine:${NC}  ${GREEN}http://localhost:$PORT${NC}"
if [ -n "$LAN_IP" ]; then
    echo -e "  ${BLUE}On your LAN:${NC}   ${GREEN}http://$LAN_IP:$PORT${NC}  (other machines on the same network)"
fi
if [ "$WITH_OPSAPI" = true ]; then
    echo -e "  ${BLUE}OpsAPI:${NC}        http://localhost:$OPSAPI_PORT (jobs, applications, recruiter sign-in)"
    echo -e "  ${BLUE}Recruiter:${NC}     sign in at http://localhost:$PORT/recruiters/sign-in"
    echo -e "                 email ${GREEN}$WORKERRA_RECRUITER_EMAIL${NC}, password and sign-in code in .env.local"
    echo -e "                 (WORKERRA_RECRUITER_PASSWORD, OPSAPI_TEST_OTP_CODE)"
else
    echo -e "  ${BLUE}OpsAPI:${NC}        off (--no-opsapi): jobs, applying and recruiter sign-in are unavailable"
fi
if [ -n "$NEBULA_URL" ]; then
    echo -e "  ${BLUE}Assistant:${NC}     AI answers via $NEBULA_URL"
else
    echo -e "  ${BLUE}Assistant:${NC}     guided mode (no NEBULA_URL in .env.local)"
fi
echo ""
if [ "$MODE" = dev ]; then
    echo -e "${YELLOW}Edits to the code reload automatically.${NC}"
fi
echo -e "  Logs: ${GREEN}docker compose --profile $MODE logs -f $MODE${NC}"
echo -e "  Stop: ${GREEN}./start.sh --down${NC}"
echo -e "  If other machines can't connect, allow incoming connections for Docker in"
echo -e "  System Settings → Network → Firewall."

if [ "$FOLLOW_LOGS" = true ]; then
    docker compose --profile "$MODE" logs -f "$MODE"
fi
