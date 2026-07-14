# Guruverse Multi-Tenant Subdomain Setup (DigitalOcean)

This CRM now supports tenant portals by subdomain:
- `mmpoly.guruverse.com`
- `imert.guruverse.com`
- `dvcoe.guruverse.co.in`

## 1) DNS (GoDaddy)

Create records:
- `A` record: `@` -> your DigitalOcean droplet IP
- `A` record: `*` -> your DigitalOcean droplet IP
- (Optional) `A` record: `api` -> same droplet IP

This enables wildcard tenant subdomains.

## 2) Backend env

Set backend environment:

```env
PORT=4000
ROOT_DOMAIN=guruverse.com,guruverse.co.in
ALLOW_SUBDOMAIN_ORIGINS=true
CORS_ORIGIN=https://guruverse.com,https://app.guruverse.com,https://guruverse.co.in
```

Notes:
- Subdomains like `https://mmpoly.guruverse.com` are auto-allowed when `ALLOW_SUBDOMAIN_ORIGINS=true`.
- Keep specific trusted origins in `CORS_ORIGIN` too.

## 3) Frontend env

Set frontend environment:

```env
NEXT_PUBLIC_API_URL=https://api.guruverse.co.in
NEXT_PUBLIC_ROOT_DOMAIN=guruverse.com,guruverse.co.in
```

## 4) Frontend build and static assets

Build the frontend on the server from the `frontend` directory:

```bash
cd /var/www/CRM-OS/frontend
npm ci
npm run build
pm2 restart guruverse-frontend --update-env
npm run check:deployed-assets -- https://dvcoe.guruverse.co.in/login
```

If the server uses a different process manager, restart the frontend process in place of the `pm2 restart` command.

The deployed app must include the complete `.next/static` tree. Do not copy only `.next/server` or only the root files in `.next/static/chunks`; Next app-router pages also require nested files such as:

```text
.next/static/chunks/app/login/page-*.js
.next/static/chunks/app/layout-*.js
.next/static/css/*.css
```

If any of those requests return `400` or HTML instead of JavaScript/CSS, the browser will throw `ChunkLoadError` and show the generic client-side exception screen.

## 5) Nginx reverse proxy

Use wildcard server name for tenant portals:

```nginx
server {
    listen 80;
    server_name guruverse.com *.guruverse.com guruverse.co.in *.guruverse.co.in;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name guruverse.com *.guruverse.com guruverse.co.in *.guruverse.co.in;

    # SSL config here (Let's Encrypt wildcard cert or per-host cert)

    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name api.guruverse.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

If you serve static files directly with Nginx instead of proxying them to `next start`, use an alias that points at the full `.next/static` directory and preserves nested paths:

```nginx
location /_next/static/ {
    alias /var/www/CRM-OS/frontend/.next/static/;
    try_files $uri =404;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

After changing Nginx, run:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 6) Tenant onboarding flow

In Super Admin:
1. Create tenant with slug (example: `mmpoly`)
2. Create tenant admin user
3. Share URL: `https://mmpoly.guruverse.com/login`

## 7) Behavior now enforced

- Login request reads tenant slug from subdomain/host.
- Non-superadmin login is restricted to matching tenant slug.
- All protected APIs validate portal slug vs user tenant.
- Cross-tenant portal usage is blocked.

## 8) Local development examples

- `mmpoly.localhost:3000`
- `imert.localhost:3000`

Frontend automatically sends `X-Tenant-Slug` from hostname.
