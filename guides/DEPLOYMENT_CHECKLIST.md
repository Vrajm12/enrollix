# Enrollix CRM - Deployment Checklist

**Target**: Deploy full stack to production ☁️  
**Time**: ~45 minutes  
**Cost**: FREE tier ($0/month)

---

## Pre-Deployment ✓

- [ ] Code pushed to GitHub
- [ ] `.env` files added to `.gitignore`
- [ ] All tests passing locally
- [ ] Backend builds locally: `npm run build`
- [ ] Frontend builds locally: `npm run build`
- [ ] Demo data loaded (optional)

**Generated Secrets:**
- [ ] JWT_SECRET created (32-char hex string)
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

---

## Phase 1: Database Setup (5-10 min)

**On Render:**
- [ ] Sign up at https://render.com (GitHub OAuth)
- [ ] Create PostgreSQL database:
  - [ ] Name: `enrollix-db`
  - [ ] Version: 16
  - [ ] Region: Oregon
  - [ ] Plan: Free
  - [ ] Click "Create Database"
- [ ] **WAIT** for database to be ready (~5 min)
- [ ] Copy "External Database URL"
  - [ ] Save it somewhere (you'll need this)
  - [ ] Pattern: `postgresql://user:password@host:5432/database`

---

## Phase 2: Backend Deployment (10-15 min)

**On Render - Create Web Service:**
- [ ] New + → Web Service
- [ ] GitHub: Connect & select `CRM-OS` repo
- [ ] **Configuration:**
  - [ ] Name: `enrollix-backend`
  - [ ] Environment: Node
  - [ ] Region: Oregon (same as DB)
  - [ ] Branch: main
  - [ ] Root Directory: `backend/`
  - [ ] Build Cmd: `npm install && npm run prisma:generate && npm run build`
  - [ ] Start Cmd: `npm start`
  - [ ] Instance: Free

- [ ] **Environment Variables** (click Advanced):
  - [ ] `DATABASE_URL` = (paste from database creation)
  - [ ] `JWT_SECRET` = (from above)
  - [ ] `JWT_EXPIRES_IN` = `7d`
  - [ ] `PORT` = `4000`
  - [ ] `CORS_ORIGIN` = `http://localhost:3000` (temp)
  - [ ] `NODE_ENV` = `production`

- [ ] Click "Create Web Service"
- [ ] Wait for deployment (~10 min)
- [ ] Check "Logs" - should see "Server running on port 4000"
- [ ] **Copy backend URL** (e.g., `https://enrollix-backend.onrender.com`)

---

## Phase 3: Frontend Deployment (5-10 min)

**On Vercel:**
- [ ] Sign up at https://vercel.com (GitHub OAuth)
- [ ] Dashboard → Add New → Project
- [ ] Import Git Repository → Select `CRM-OS`

- [ ] **Configuration:**
  - [ ] Project Name: `enrollix-frontend`
  - [ ] Framework: Next.js (auto-detect)
  - [ ] Root Directory: `frontend/`
  - [ ] Build Settings: Default (Vercel auto-detects)

- [ ] **Environment Variables:**
  - [ ] `NEXT_PUBLIC_API_URL` = `https://enrollix-backend.onrender.com` (from Phase 2)

- [ ] Click "Deploy"
- [ ] Wait for deployment (~3 min)
- [ ] **Copy frontend URL** (e.g., `https://enrollix-frontend.vercel.app`)

---

## Phase 4: Update CORS (2 min)

**Back on Render - Update Backend:**
- [ ] Go to backend service
- [ ] Settings → Environment Variables
- [ ] Update `CORS_ORIGIN`:
  - [ ] Old: `http://localhost:3000`
  - [ ] New: `https://enrollix-frontend.vercel.app` (from Phase 3)
- [ ] Save
- [ ] Wait for auto-redeploy (~2 min)

---

## Phase 5: Testing (5 min)

**Test Frontend:**
- [ ] Open Vercel URL in new browser
- [ ] Page loads (not blank)?
- [ ] Try logging in:
  - [ ] Email: `admin@crm.local`
  - [ ] Password: `Password@123`
- [ ] Dashboard shows?
- [ ] Can you add a lead?
- [ ] Can you view leads list?
- [ ] Check other pages (Login, Dashboard, Leads, Activities)

**If anything fails:**
- [ ] Check browser console (F12)
- [ ] Check logs:
  - [ ] Backend: Render → Service → Logs
  - [ ] Frontend: Vercel → Deployments → View Details

---

## Phase 6: Documentation (3 min)

- [ ] Save all URLs:
  - [ ] Frontend: `https://enrollix-frontend.vercel.app`
  - [ ] Backend: `https://enrollix-backend.onrender.com`
  - [ ] Database: (from Render dashboard)

- [ ] Document credentials:
  - [ ] Admin: `admin@crm.local` / `Password@123`
  - [ ] Counselor: `counselor@crm.local` / `Password@123`

- [ ] Create README deployment section:
  ```markdown
  ## Deployment
  - Frontend: https://enrollix-frontend.vercel.app
  - Backend API: https://enrollix-backend.onrender.com
  - Database: PostgreSQL on Render
  ```

---

## Phase 7: Optional - Custom Domain

- [ ] Buy domain (Namecheap, GoDaddy, etc.)
- [ ] Vercel → Settings → Domains → Add Domain
- [ ] Update DNS records (follow Vercel guide)
- [ ] Wait 5-48 hours for DNS propagation
- [ ] Test custom domain in browser

---

## Phase 8: Optional - Monitoring Setup

- [ ] Enable Vercel Analytics
  - [ ] Vercel → Settings → Analytics
  - [ ] Monitor performance metrics

- [ ] Enable Render error notifications
  - [ ] Render → Logs → Set up alerts

- [ ] Set up error tracking (Sentry, etc.)
  - [ ] Frontend: Add Sentry SDK
  - [ ] Backend: Add error middleware

---

## Post-Deployment ✅

**Daily:**
- [ ] Check backend logs for errors
- [ ] Monitor database size (Render dashboard)
- [ ] Collect user feedback

**Weekly:**
- [ ] Review performance metrics (Vercel Analytics)
- [ ] Check logs for patterns/issues
- [ ] Backup important data

**Monthly:**
- [ ] Review costs (should be $0 on free tier)
- [ ] Plan scaling if needed

---

## Rollback Plan (If Something Wrong)

- [ ] Can revert backend: Render → Deployments → Click previous
- [ ] Can revert frontend: Vercel → Deployments → Click previous
- [ ] Database: Keep backup (monthly export)

---

## Success Criteria ✓

Your deployment is **SUCCESSFUL** when:

- [ ] Frontend loads without errors
- [ ] Login works with demo credentials
- [ ] Can create a new lead
- [ ] Can view leads in dashboard
- [ ] Can perform follow-ups
- [ ] All pages render correctly
- [ ] API calls complete successfully
- [ ] No CORS errors in console
- [ ] No lag or slowness

---

## Cost Verification

Run through each phase and verify:

**Vercel (Frontend):**
- [ ] Free tier selected (says "Free" in settings)
- [ ] No payment method required
- [ ] Cost indicator: $0/month

**Render (Backend):**
- [ ] Free tier selected (50 free compute hours/month)
- [ ] Not upgraded to paid
- [ ] Cost indicator: ~$0/month (limited)

**Render (Database):**
- [ ] Free tier (1 GB, 750 hrs/month)
- [ ] Cost indicator: $0/month

**Total Monthly Cost: $0** ✅

---

## Troubleshooting Reference

| Problem | Solution | Time |
|---------|----------|------|
| Blank frontend page | Hard refresh (Ctrl+Shift+R) | 1 min |
| 403/CORS error | Update backend CORS_ORIGIN | 3 min |
| Login fails | Check backend logs | 5 min |
| DB connection error | Verify DATABASE_URL | 2 min |
| Backend won't start | Check logs for build errors | 5 min |
| Slow loading | Free tier spins down, wait 30s | - |

---

## Final Verification

- [ ] Send frontend URL to a friend
- [ ] They can log in without local setup
- [ ] They can use the system
- [ ] You see their activity in your dashboard

**Deployment Complete!** 🎉

---

**Questions?**
- Check logs on Render/Vercel
- Review DEPLOYMENT_GUIDE.md for details
- Check error console (F12 in browser)

**Next Step:** Collect user feedback & iterate!
