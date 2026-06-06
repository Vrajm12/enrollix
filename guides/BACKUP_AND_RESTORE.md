# Guruverse CRM Backup And Restore

This guide is for Super Admin and server operators only. Database restore replaces the live PostgreSQL database. It does not touch uploads, app files, PM2 files, or frontend assets.

## Server Setup

Create the backup directory on the DigitalOcean Ubuntu server:

```bash
sudo mkdir -p /var/backups/guruverse
sudo chown -R root:root /var/backups/guruverse
sudo chmod 700 /var/backups/guruverse
```

Ensure PostgreSQL client tools are installed:

```bash
sudo apt-get update
sudo apt-get install -y postgresql-client
```

Add this to the backend environment:

```bash
BACKUP_DIR=/var/backups/guruverse
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```

## Create Backup From UI

1. Login as `SUPER_ADMIN`.
2. Open `/bckup`.
3. Click `Create Backup`.
4. Confirm the new backup appears with status `CREATED`.

Backups are stored as plain SQL files named:

```text
guruverse_backup_YYYY-MM-DD_HH-mm-ss.sql
```

## Download Backup

1. Login as `SUPER_ADMIN`.
2. Open `/bckup`.
3. Click `Download` on the required backup.

The API never returns the server file path. Downloads are resolved server-side by backup ID.

## Restore Backup Safely

1. Login as `SUPER_ADMIN`.
2. Open `/bckup`.
3. Click `Restore` on the required backup.
4. Read the warning.
5. Type exactly:

```text
RESTORE GURUVERSE DATABASE
```

6. Click `Restore Backup`.

Before restore, the backend automatically creates:

```text
pre_restore_backup_YYYY-MM-DD_HH-mm-ss.sql
```

After restore, restart the backend:

```bash
pm2 restart guruverse-backend
```

## Daily 2 AM Cron Backup

Open root cron:

```bash
sudo crontab -e
```

Add this line, adjusting the project path if needed:

```cron
0 2 * * * cd /var/www/guruverse/backend && /usr/bin/npm run backup:db >> /var/log/guruverse-db-backup.log 2>&1
```

The script keeps the latest 180 scheduled daily backups and prunes older `guruverse_backup_*.sql` files.

## Manual Backup From Terminal

From the backend directory:

```bash
cd /var/www/guruverse/backend
npm run backup:db
```

## Emergency Manual Restore

Create a final emergency backup first:

```bash
cd /var/www/guruverse/backend
npm run backup:db
```

Restore a selected SQL backup:

```bash
psql "$DATABASE_URL" --set ON_ERROR_STOP=on --file /var/backups/guruverse/guruverse_backup_YYYY-MM-DD_HH-mm-ss.sql
pm2 restart guruverse-backend
```

## Security Warnings

- Super Admin only. Tenant admins and counsellors must not receive backup access.
- Keep `/var/backups/guruverse` mode `700`.
- Do not put backups in the web root.
- Do not email raw database backups.
- Test restore on a staging database before production whenever possible.
- A restore changes database data only. It does not delete uploads or application files.
