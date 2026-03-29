# Render Backend Deployment Guide

## Overview
Deploy your Express.js backend to **Render** with automated deployments from GitHub.

## Prerequisites
- GitHub account with your code pushed
- Render.com account (free tier available)
- PostgreSQL database connection string

## Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub (recommended)
3. Click "New +"

## Step 2: Deploy Backend Service

### Option A: Deploy from GitHub (Recommended)
1. Click "New +" → "Web Service"
2. Select "GitHub" → authorize
3. Search and select `CRM-OS` repository
4. Configure:
   - **Name**: `enrollix-backend`
   - **Environment**: `Node`
   - **Region**: `Oregon` (us-west) or closest to you
   - **Branch**: `main` (or your branch)
   - **Build Command**: `npm install && npm run prisma:generate && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

5. Add Environment Variables (click "Advanced"):
   ```
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   JWT_SECRET=use-a-strong-random-secret-key
   JWT_EXPIRES_IN=7d
   PORT=4000
   CORS_ORIGIN=https://your-frontend-domain.com
   NODE_ENV=production
   ```
   
   Generate strong JWT secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

6. Click "Create Web Service"
7. Wait for deployment (5-10 minutes)
8. You'll get a URL like: `https://enrollix-backend.onrender.com`

## Step 3: Create PostgreSQL Database on Render
1. Click "New +" → "PostgreSQL"
2. Configure:
   - **Name**: `enrollix-db`
   - **PostgreSQL Version**: `16`
   - **Region**: Same as backend (Oregon)
   - **Instance Type**: `Free`
3. Click "Create Database"
4. Wait for creation (2-5 minutes)
5. Copy the connection string (External Database URL)
6. Update backend's `DATABASE_URL` environment variable with this connection string

## Step 4: Run Database Migrations
After your backend is deployed and database is created:

1. Connect to Render via SSH (or use a database client):
   ```bash
   psql "connection-string-from-render"
   ```

2. Or trigger migration via backend API (recommended):
   - Add a migration endpoint to your backend, or
   - Use Prisma's managed migrations

3. Ensure `prisma migrate deploy` runs on startup (already in build command)

## Step 5: Monitor Deployment
- Go to Render Dashboard
- Click your service name
- View logs in "Logs" tab
- Check "Events" tab for deployment status

## Costs
- **Backend Service**: Free tier (512 MB RAM, limited hours)
- **Database**: Free tier (1 GB storage)
- **Total**: $0/month (with limitations)

To scale:
- Upgrade to **Paid Plan**: ~$7/month per service
- Upgrade DB: ~$15/month for 10 GB

## Troubleshooting

### Backend not starting?
1. Check logs for errors
2. Verify environment variables are set
3. Check `npm run build` output

### Database connection refused?
1. Check `DATABASE_URL` is correct
2. Ensure database is in same region
3. Check IP whitelist settings

### Frontend can't reach backend?
1. Update frontend's `NEXT_PUBLIC_API_URL` to backend URL
2. Check CORS_ORIGIN in backend env
3. Verify both are HTTPS

## Next Steps
→ Deploy Frontend to Vercel (see VERCEL_DEPLOYMENT.md)
