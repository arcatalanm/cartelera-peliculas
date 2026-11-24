#!/bin/bash
# User data para una instancia nueva de Amazon Linux 2023.
# Completar los valores REEMPLAZAR antes de crear la plantilla de lanzamiento.
# El repositorio debe incluir frontend/package-lock.json y ser accesible por HTTPS.
# Las tablas de sql/schema.sql se crean una sola vez en RDS, antes del lanzamiento.
set -Eeuo pipefail
exec > >(tee -a /var/log/cinego-install.log) 2>&1
trap 'echo "Error en la linea $LINENO. Revisar /var/log/cinego-install.log"' ERR

REPO_URL='REEMPLAZAR_URL_HTTPS_DEL_REPOSITORIO'
REPO_REF='main'
APP_DIR=/opt/cartelera-peliculas

if [[ "$REPO_URL" == REEMPLAZAR* ]]; then
    echo 'Completar REPO_URL y las variables de RDS de este script.'
    exit 1
fi

dnf update -y
dnf install -y git python3.11 python3.11-pip nginx nodejs22 nodejs22-npm

id cinego >/dev/null 2>&1 || useradd --system --home-dir "$APP_DIR" --shell /sbin/nologin cinego
git clone --depth 1 --branch "$REPO_REF" "$REPO_URL" "$APP_DIR"
python3.11 -m venv "$APP_DIR/.venv"
"$APP_DIR/.venv/bin/python" -m pip install --upgrade pip
"$APP_DIR/.venv/bin/python" -m pip install -r "$APP_DIR/backend/requirements.txt"

# El delimitador entre comillas conserva literalmente los caracteres de la clave.
install -o root -g cinego -m 640 /dev/null "$APP_DIR/backend/.env"
cat <<'ENV' > "$APP_DIR/backend/.env"
DB_HOST=REEMPLAZAR_ENDPOINT_RDS
DB_PORT=3306
DB_USER=admin
DB_PASS="REEMPLAZAR_PASSWORD_RDS"
DB_NAME=cartelera_db
CORS_ORIGINS=
ENV

if grep -q 'REEMPLAZAR_' "$APP_DIR/backend/.env"; then
    echo 'Completar las variables de RDS en el script antes de lanzarlo.'
    exit 1
fi

cd "$APP_DIR/frontend"
# /api se resuelve en Nginx, dentro del mismo origen del frontend.
VITE_API_URL=/api npm-22 ci --include=dev
VITE_API_URL=/api npm-22 run build
install -d -m 755 /usr/share/nginx/html/cinego
cp -R dist/. /usr/share/nginx/html/cinego/
chmod -R a+rX /usr/share/nginx/html/cinego

cat <<'SERVICE' > /etc/systemd/system/cinego.service
[Unit]
Description=CineGO FastAPI
Wants=network-online.target
After=network-online.target

[Service]
User=cinego
Group=cinego
WorkingDirectory=/opt/cartelera-peliculas
ExecStart=/opt/cartelera-peliculas/.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --proxy-headers --forwarded-allow-ips=127.0.0.1
Restart=on-failure
RestartSec=5
Environment=PYTHONDONTWRITEBYTECODE=1
Environment=PYTHONUNBUFFERED=1
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
SERVICE

# Se reemplaza la configuracion inicial para evitar dos servidores predeterminados.
cat <<'NGINX' > /etc/nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;
include /usr/share/nginx/modules/*.conf;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    access_log /var/log/nginx/access.log;
    sendfile on;

    server {
        listen 80 default_server;
        server_name _;
        root /usr/share/nginx/html/cinego;
        index index.html;
        client_max_body_size 1m;

        location / {
            try_files $uri $uri/ /index.html;
        }

        location = /api {
            return 308 /api/;
        }

        location /api/ {
            proxy_pass http://127.0.0.1:8000/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
NGINX

nginx -t
systemctl daemon-reload
systemctl enable --now cinego
systemctl enable nginx
systemctl restart nginx

# Espera al proceso y comprueba tambien la consulta a RDS mediante la API.
for intento in {1..30}; do
    if curl --fail --silent http://127.0.0.1/api/health >/dev/null; then
        curl --fail --silent --show-error http://127.0.0.1/api/generos >/dev/null
        curl --fail --silent --show-error http://127.0.0.1/api/peliculas >/dev/null
        echo 'CineGO listo: frontend, API y consultas a RDS verificados.'
        exit 0
    fi
    sleep 2
done

echo 'FastAPI no respondio. Revisar journalctl -u cinego y /var/log/nginx/error.log.'
exit 1
