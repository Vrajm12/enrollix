# Enrollix CRM - Quick Deployment (30 minutes)

> **Goal**: Get your CRM live on the internet for free

## What You'll Get
- Frontend: https://enrollix-frontend.vercel.app ✅ FREE
- Backend: https://enrollix-backend.onrender.com ✅ FREE  
- Database: PostgreSQL on Render ✅ FREE
- Total: $0/month

## Quick Steps

### Step 1: Push Code to GitHub (2 min)
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Deploy Database + Backend (15 min)

**Go to https://render.com**

1. **Sign up** with GitHub
2. **Click** "New +" → "Blueprint"
3. **Paste** this URL in "Public repository":
   ```
   https://github.com/YOUR-USERNAME/CRM-OS
   ```
4. **Configure**:
   - Service Name: `enrollix-backend`
   - Branch: `main`
   - Root Directory: `backend`
5. **Click** "Create from Blueprint"
6. **Wait** 10-15 minutes for both to deploy
7. **Copy** your backend URL when done

### Step 3: Deploy Frontend (5 min)

**Go to https://vercel.com**

1. **Sign up** with GitHub (if not already)
2. **Click** "Add New" → "Project"
3. **Select** your GitHub repository
4. **Configure**:
   - Framework: Next.js (auto)
   - Root: `frontend`
5. **Add Environment Variable**:
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: `https://enrollix-backend.onrender.com` (from step 2)
6. **Click** "Deploy"
7. **Wait** 2-3 minutes
8. **Get** your frontend URL

### Step 4: Test (2 min)
1. **Open** your Vercel URL in browser
2. **Login** with:
   - Email: `admin@crm.local`
   - Password: `Password@123`
3. **Check** if dashboard loads
4. **Try** creating a lead

**Done! Your CRM is now LIVE!** 🚀

---

## Detailed Steps (If Render Blueprint Doesn't Work)

### Alternative: Manual Render Setup (20 min)

#### Create Database First
1. Render → New + → PostgreSQL
   - Name: `enrollix-db`
   - Version: 16
   - Region: Oregon
   - Plan: Free
2. **Click** "Create Database"
3. **Wait** 5 minutes
4. **Copy** "External Database URL" → Save it!

#### Deploy Backend
1. Render → New + → Web Service
   - GitHub: Connect & select `CRM-OS`
   - Name: `enrollix-backend`
   - Root: `backend`
   - Build: `npm install && npm run prisma:generate && npm run build`
   - Start: `npm start`
   - Plan: Free
2. **Add Environment Variables**:
   - `DATABASE_URL`: (paste URL from database creation)
   - `JWT_SECRET`: run this in terminal:
     ```
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - `CORS_ORIGIN`: `http://localhost:3000` (update later)
   - `NODE_ENV`: `production`
3. **Click** "Create Web Service"
4. **Wait** 10 minutes for build
5. **Copy** your backend URL

#### Update Backend CORS
1. Go back to Render backend service
2. Settings → Environment
3. Update `CORS_ORIGIN` to your **Vercel frontend URL** (after step 5)
4. Save (auto-redeploy)

#### Deploy Frontend to Vercel
1. Vercel → Add New → Project
   - GitHub: Select `CRM-OS`
   - Settings:
     - Framework: Next.js
     - Root: `frontend`
2. **Add Environment Variables**:
   - `NEXT_PUBLIC_API_URL`: `https://enrollix-backend.onrender.com`
3. **Click** "Deploy"
4. **Wait** 3 minutes
5. **Copy** frontend URL

#### Final Step
1. Update backend CORS_ORIGIN to the Vercel URL
2. Test login on frontend

---

## Credentials to Try

**Admin Account:**
- Email: `admin@crm.local`
- Password: `Password@123`

**Counselor Account:**
- Email: `counselor@crm.local`
- Password: `Password@123`

---

## Troubleshooting

### Frontend shows blank page?
- Hard refresh: `Ctrl+Shift+R`
- Check environment variable is set
- Check browser console for errors (F12)

### Can't login?
- Check backend logs on Render
- Verify `CORS_ORIGIN` is set to frontend URL
- Redeploy backend if changed CORS

### Backend won't start?
- Check logs: click service → Logs
- Verify `DATABASE_URL` is correct
- Check all env vars are set

### Database connection error?
- Verify DATABASE_URL is complete
- Check database is created (not just PostgreSQL service)
- Wait 5 minutes for database to fully spin up

---

## What's Deployed?

| Component | Where | Size |
|-----------|-------|------|
| Next.js Frontend | Vercel | ~2MB |
| Express Backend | Render | ~50MB |
| PostgreSQL DB | Render | 1GB free |
| Total | Cloud ☁️ | FREE |

---

## Next: Custom Domain (Optional)

Want: `enrollix.crm` instead of `vercel.app`?

1. **Buy domain** on Namecheap, GoDaddy, etc.
2. **Vercel Settings** → Domains → Add
3. **Follow DNS setup** (takes 5-48 hours)

---

## Monitoring & Logs

**Backend Logs:**
- Render Dashboard → Service → Logs
- Real-time error tracking

**Frontend Logs:**
- Vercel Dashboard → Deployments → Logs
- Browser Console (F12) on website

**Database:**
- Render Dashboard → Database → Insights
- Query performance & storage usage

---

## Questions?

**Common Issues:**
1. CORS errors → Update CORS_ORIGIN
2. Blank page → Hard refresh cache
3. Slow first load → Render free tier, waits 15s
4. Missing features → Check backend logs

---

**You NOW have a production CRM!**
- Shareable URL ✅
- Real database ✅
- Live for users ✅

Next step: Collect user feedback & iterate!
