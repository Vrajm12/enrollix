# Enrollix CRM - Complete Deployment Guide

## Quick Summary

**Recommended Stack:**
- ✅ **Frontend**: Vercel (Next.js) - FREE, best-in-class
- ✅ **Backend**: Render (Node.js/Express) - FREE tier available  
- ✅ **Database**: Render PostgreSQL - FREE tier available
- **Total Cost**: $0/month (can scale up later)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Vercel (Frontend)                     │
│            enrollix-frontend.vercel.app                 │
│         Next.js 15 + React 19 + TailwindCSS            │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS API Calls
                     │ CORS Enabled
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   Render (Backend)                      │
│            enrollix-backend.onrender.com                │
│         Express.js + TypeScript + Prisma ORM           │
└────────────────────┬────────────────────────────────────┘
                     │ Database Connection
                     ▼
┌─────────────────────────────────────────────────────────┐
│           Render PostgreSQL (Database)                  │
│           production_db.onrender.com                    │
│              PostgreSQL 16 - 1GB Free                   │
└─────────────────────────────────────────────────────────┘
```

## Deployment Checklist

### Phase 1: Prepare Code (5 minutes)
- [ ] Push code to GitHub
- [ ] Create `.gitignore` entries for `.env` files
- [ ] Verify `package.json` build scripts are correct
- [ ] Review environment variable names in config files

### Phase 2: Deploy Database (5-10 minutes)
- [ ] Create Render account & sign in
- [ ] Create PostgreSQL instance
  - Region: Choose one (Oregon = US)
  - Version: PostgreSQL 16
  - Name: `enrollix-db`
- [ ] Copy connection string (External Database URL)
- [ ] Update backend DATABASE_URL environment variable

### Phase 3: Deploy Backend (10-15 minutes)
- [ ] Create Render Web Service
  - Connect GitHub repo
  - Set root directory to `backend/`
  - Set build command: `npm install && npm run prisma:generate && npm run build`
  - Set start command: `npm start`
- [ ] Add environment variables
  - DATABASE_URL (from Step 2)
  - JWT_SECRET (generate a strong one)
  - CORS_ORIGIN (will update after frontend deployment)
  - NODE_ENV=production
- [ ] Wait for deployment complete
- [ ] Copy backend URL

### Phase 4: Deploy Frontend (5-10 minutes)
- [ ] Create Vercel account & authorize GitHub
- [ ] Import your repository
  - Framework: Next.js (auto-detected)
  - Root: `frontend/`
- [ ] Add environment variables
  - NEXT_PUBLIC_API_URL (use backend URL from Step 3)
- [ ] Deploy
- [ ] Copy frontend URL

### Phase 5: Final Configuration (5 minutes)
- [ ] Go back to Render backend settings
- [ ] Update CORS_ORIGIN to your Vercel frontend URL
- [ ] Trigger backend redeploy
- [ ] Test login on frontend
- [ ] Verify all features work

### Phase 6: Post-Deployment (Optional)
- [ ] Set up custom domain
- [ ] Configure monitoring/alerts
- [ ] Set up backups for database
- [ ] Enable HTTPS (automatic on both)

**Total Time: ~45 minutes**

## Detailed Steps

### 1. GitHub Setup

Before deploying, ensure:

```bash
# In project root
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

Make sure `.gitignore` includes:
```
.env
.env.local
.env*.local
node_modules/
dist/
.next/
```

### 2. Generate Strong JWT Secret

```bash
# On Windows PowerShell:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Output: a1b2c3d4e5f6... (use this value)
```

### 3. Render Setup

#### Create PostgreSQL Database
1. Go to https://render.com
2. Dashboard → New + → PostgreSQL
3. **Database**: `enrollix-db`
4. **PostgreSQL Version**: 16
5. **Region**: Oregon (or closest to users)
6. **Instance**: Free
7. Click "Create Database"
8. **WAIT** for creation (takes 2-5 minutes)
9. Copy "External Database URL" - this is your DATABASE_URL

#### Deploy Backend
1. Dashboard → New + → Web Service
2. **Connect**: GitHub repository
3. **Repository**: Select your CRM-OS repo
4. **Name**: `enrollix-backend`
5. **Environment**: Node
6. **Region**: Same as database (Oregon)
7. **Branch**: main
8. **Build Command**:
   ```bash
   npm install && npm run prisma:generate && npm run build
   ```
9. **Start Command**:
   ```bash
   npm start
   ```
10. **Publish Directory**: `dist/` (or leave blank)
11. Click "Advanced" or "Environment"
12. **Add Environment Variables**:
    - `DATABASE_URL`: (from PostgreSQL creation)
    - `JWT_SECRET`: (generated above)
    - `JWT_EXPIRES_IN`: `7d`
    - `PORT`: `4000`
    - `CORS_ORIGIN`: `http://localhost:3000` (temporarily, update later)
    - `NODE_ENV`: `production`
13. **Instance**: Free
14. Click "Create Web Service"
15. **WAIT** for deployment (5-10 minutes)
16. Check logs - should say "Server running on port 4000"
17. Copy the URL (e.g., `https://enrollix-backend.onrender.com`)

### 4. Vercel Setup

#### Deploy Frontend
1. Go to https://vercel.com
2. Dashboard → Add New → Project
3. Import → Select your GitHub repository
4. **Project Name**: `enrollix-frontend`
5. **Framework**: Next.js (auto-detected)
6. **Root Directory**: 
   - Click "Edit"
   - Set to `frontend/` 
7. **Build Settings**: Leave defaults (auto-detected)
8. Click "Advanced" → Environment Variables
9. **Add**:
   - `NEXT_PUBLIC_API_URL`: `https://enrollix-backend.onrender.com`
10. Click "Deploy"
11. **WAIT** for deployment (2-3 minutes)
12. Get your Vercel URL (e.g., `https://enrollix-frontend.vercel.app`)

### 5. Update Backend CORS

1. Go back to Render dashboard
2. Click **Backend service** (enrollix-backend)
3. **Settings** → **Environment**
4. Update `CORS_ORIGIN`:
   - From: `http://localhost:3000`
   - To: `https://enrollix-frontend.vercel.app`
5. Save
6. Service auto-redeploys (2-3 minutes)

### 6. Test Deployment

1. Open your Vercel frontend URL in browser
2. Try logging in with credentials:
   - Email: `admin@crm.local`
   - Password: `Password@123`
3. If login works → Everything connected! ✅
4. Try creating a lead, view dashboard
5. Check browser console (F12) for errors
6. Check backend logs on Render for errors

## Environment Variables Reference

### Backend (.env on Render)
```
DATABASE_URL=postgresql://user:password@host/database
JWT_SECRET=generated-32-char-hex-string
JWT_EXPIRES_IN=7d
PORT=4000
CORS_ORIGIN=https://enrollix-frontend.vercel.app
NODE_ENV=production
WHATSAPP_BUSINESS_ACCOUNT_ID=optional
TWILIO_ACCOUNT_SID=optional
```

### Frontend (.env.local on Vercel)
```
NEXT_PUBLIC_API_URL=https://enrollix-backend.onrender.com
```

## Costs Breakdown

| Service | Free Tier | Paid Option |
|---------|-----------|------------|
| **Vercel Frontend** | Unlimited | $20-$150/mo |
| **Render Backend** | 750 hrs/month | $7+/mo |
| **Render PostgreSQL** | 1 GB storage | $15+/mo |
| **Total** | **FREE** | **~$22+/mo** |

**Free tier limitations:**
- Render services spin down after 15 min inactivity (auto-wake on request)
- 750 free compute hours/month per service
- For production: upgrade to paid tier

## Monitoring & Maintenance

### View Logs
- **Backend**: Render Dashboard → Service → Logs
- **Frontend**: Vercel Dashboard → Deployments → Details

### Monitor Errors
- Backend API: Check Render logs for errors
- Frontend: Check Vercel deployment logs
- Database: Render provides query logs

### Database Backups
- Render automatically backs up daily (paid plan)
- For free tier: manually export data monthly

## Scale Plan

As you grow:
1. Upgrade Render backend to Paid ($7/mo)
2. Upgrade database to Paid ($15/mo) - 10 GB
3. Enable CDN on Vercel (premium) for faster global loading
4. Add monitoring with Sentry or Datadog

## Useful Commands

During development before deployment:
```bash
# Build everything locally
cd backend && npm run build
cd ../frontend && npm run build

# Test production build locally
cd backend && npm start
cd ../frontend && npm run start

# Check environment variables
echo $DATABASE_URL
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Backend won't start | Check logs; verify DATABASE_URL is correct |
| Frontend blank page | Check NEXT_PUBLIC_API_URL; refresh hard (Ctrl+Shift+R) |
| API 403/CORS error | Update CORS_ORIGIN on backend to frontend URL |
| Database connection refused | Verify DATABASE_URL is complete; check IP whitelist |
| Login fails | Check JWT_SECRET is set; check backend logs |
| Pages slow to load | Render free tier spins down; wait 30s on first request |

## Next Steps

1. ✅ Complete deployment checklist above
2. ✅ Test all features on production
3. ✅ Collect user feedback
4. ✅ Set up error tracking (optional)
5. ✅ Plan scalability (if growing)

---

**Ready? Start with Phase 1 above!**
