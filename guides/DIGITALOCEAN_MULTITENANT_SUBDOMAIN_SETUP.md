# Guruverse Multi-Tenant Subdomain Setup (DigitalOcean)

This CRM now supports tenant portals by subdomain:
- `mmpoly.guruverse.com`
- `imert.guruverse.com`

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
ROOT_DOMAIN=guruverse.com
ALLOW_SUBDOMAIN_ORIGINS=true
CORS_ORIGIN=https://guruverse.com,https://app.guruverse.com
```

Notes:
- Subdomains like `https://mmpoly.guruverse.com` are auto-allowed when `ALLOW_SUBDOMAIN_ORIGINS=true`.
- Keep specific trusted origins in `CORS_ORIGIN` too.

## 3) Frontend env

Set frontend environment:

```env
NEXT_PUBLIC_API_URL=https://api.guruverse.com
NEXT_PUBLIC_ROOT_DOMAIN=guruverse.com
```

## 4) Nginx reverse proxy

Use wildcard server name for tenant portals:

```nginx
server {
    listen 80;
    server_name guruverse.com *.guruverse.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name guruverse.com *.guruverse.com;

    # SSL config here (Let's Encrypt wildcard cert or per-host cert)

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
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
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 5) Tenant onboarding flow

In Super Admin:
1. Create tenant with slug (example: `mmpoly`)
2. Create tenant admin user
3. Share URL: `https://mmpoly.guruverse.com/login`

## 6) Behavior now enforced

- Login request reads tenant slug from subdomain/host.
- Non-superadmin login is restricted to matching tenant slug.
- All protected APIs validate portal slug vs user tenant.
- Cross-tenant portal usage is blocked.

## 7) Local development examples

- `mmpoly.localhost:3000`
- `imert.localhost:3000`

Frontend automatically sends `X-Tenant-Slug` from hostname.

