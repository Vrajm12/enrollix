# Vercel Frontend Deployment Guide

## Overview
Deploy your Next.js frontend to **Vercel** (by Vercel Inc - creators of Next.js).
Best-in-class performance, automatic optimizations, FREE tier available.

## Prerequisites
- GitHub account with code pushed
- Vercel account (free tier: https://vercel.com)
- Backend URL (from Render deployment)

## Step 1: Create Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub (recommended)
3. Authorize Vercel to access your repositories

## Step 2: Import Project

1. Click "Add New..." → "Project"
2. Select "Import Git Repository"
3. Paste: `https://github.com/YOUR-USERNAME/CRM-OS`
4. Or select from list if already connected

## Step 3: Configure Project
1. **Project Name**: `enrollix-frontend`
2. **Framework**: Should auto-detect "Next.js" ✓
3. **Root Directory**: `./frontend` (important!)
   - Click "Edit" next to root directory selector
   - Set to `frontend/`
4. **Build & Output Settings**: Leave defaults

## Step 4: Add Environment Variables
1. Under "Environment Variables" section:
2. Add these variables:
   ```
   NEXT_PUBLIC_API_URL=https://enrollix-backend.onrender.com
   ```
   
   Alternative if backend is on same domain:
   ```
   NEXT_PUBLIC_API_URL=/api
   ```

3. Click "Add" for each variable
4. These will be available in browser (NEXT_PUBLIC_ prefix)

## Step 5: Deploy
1. Click "Deploy"
2. Wait for build and deployment (2-3 minutes)
3. You'll get URL: `https://enrollix-frontend.vercel.app`
4. Or connect custom domain

## Step 6: Test Frontend
1. Open your Vercel URL
2. Try logging in with demo credentials
3. Check browser console (F12) for any API errors
4. Verify all pages load correctly

## Step 7: Update Backend CORS

The backend needs to allow requests from your frontend domain:

On Render backend settings:
1. Update `CORS_ORIGIN` environment variable to:
   ```
   https://enrollix-frontend.vercel.app
   ```
   
2. Or allow multiple origins:
   ```
   https://enrollix-frontend.vercel.app,http://localhost:3000
   ```

3. Redeploy backend

## Step 8: Custom Domain (Optional)

To use custom domain (e.g., `enrollix.com`):
1. In Vercel dashboard → Settings → Domains
2. Add domain
3. Follow DNS setup instructions
4. Wait for DNS propagation (5-48 hours)

## Costs
- **Frontend on Vercel**: FREE tier (unlimited, serverless functions)
- **Total**: $0/month

Premium tier starts at: $20/month (if you need advanced features)

## Features Included (FREE)
- Automatic deployments on git push
- Route optimization
- Automatic image optimization
- Edge caching
- Serverless functions
- SSL certificate
- Preview deployments on PRs

## Troubleshooting

### Build fails?
1. Check logs in Vercel dashboard
2. Verify `NEXT_PUBLIC_*` environment variables are set
3. Run locally: `cd frontend && npm run build`

### Blank page or styles not loading?
1. Clear cache (Ctrl+Shift+Delete)
2. Check browser console for errors
3. Verify API URL is correct

### API calls failing (CORS)?
1. Check backend `CORS_ORIGIN` matches frontend URL
2. Verify `NEXT_PUBLIC_API_URL` is set correctly
3. Check backend logs for errors

### Performance issues?
- Vercel automatically optimizes
- Use Vercel Analytics to monitor

## Next Steps
→ Set up GitHub Actions for CI/CD (optional)
→ Monitor performance with Vercel Analytics
→ Set up error tracking with Sentry (optional)
