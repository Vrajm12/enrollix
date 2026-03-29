# Environment Configuration Guide

## Quick Start

1. **Get Twilio Credentials**
   - Go to https://www.twilio.com/console
   - Sign up or login
   - Copy Account SID and Auth Token
   - Get a Twilio phone number

2. **Update .env file**
   ```env
   TWILIO_ACCOUNT_SID=AC1234567890abcdef
   TWILIO_AUTH_TOKEN=abc123def456ghi789jk
   TWILIO_PHONE_NUMBER=+1234567890
   ```

3. **Test it**
   ```bash
   npm install
   npm run build
   npm start
   curl http://localhost:3001/health
   ```

## Detailed Setup

### Environment Variables

**Required for SMS to work:**
```env
# Twilio Credentials (from https://www.twilio.com/console)
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Database connection
DATABASE_URL=postgresql://user:password@localhost:5432/crm-os

# Server configuration
PORT=3001
NODE_ENV=development

# Authentication
JWT_SECRET=your_jwt_secret_key_here

# CORS (for frontend)
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

**Optional:**
```env
# Enable debug logging
DEBUG=true

# Rate limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_HOUR=100

# SMS Settings
SMS_PROVIDER=twilio
SMS_TIMEOUT=30000
SMS_RETRY_COUNT=3
```

### Finding Your Twilio Credentials

#### Step-by-step:

1. **Get Account SID**
   - Visit https://www.twilio.com/console
   - You'll see it on the dashboard: "Account SID: ACxxxxxxxxxxxxx"
   - Copy it

2. **Get Auth Token**
   - Same dashboard page as Account SID
   - You'll see "Auth Token" field (click eye icon to reveal)
   - Copy it

3. **Get/Configure Phone Number**
   - Go to "Phone Numbers" → "Manage Numbers"
   - If you don't have one, click "Get Started"
   - Buy a number (e.g., $1-2/month)
   - Select the number
   - Verify it supports SMS

#### Example:
```
Account SID:    ACa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d
Auth Token:     a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
Phone Number:   +14155552671
```

### Local Development Setup

#### 1. Backend (.env file)

Create `backend/.env` or `backend/.env.local`:

```env
# === Twilio SMS Configuration ===
TWILIO_ACCOUNT_SID=AC1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6
TWILIO_AUTH_TOKEN=abc123def456ghi789jklmno1234567
TWILIO_PHONE_NUMBER=+1234567890

# === Database ===
DATABASE_URL=postgresql://postgres:password@localhost:5432/crm_os_dev

# === Server ===
PORT=3001
NODE_ENV=development

# === JWT ===
JWT_SECRET=your-super-secret-key-for-jwt-tokens-at-least-32-chars

# === CORS ===
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# === Optional: Debugging ===
DEBUG=*
LOG_LEVEL=debug
```

#### 2. Frontend (.env.local file)

Create `frontend/.env.local`:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Enable detailed logging
NEXT_PUBLIC_DEBUG=true
```

#### 3. Docker Setup

If using Docker Compose:

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: crm_os_dev
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    environment:
      # Twilio (from .env)
      TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID}
      TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN}
      TWILIO_PHONE_NUMBER: ${TWILIO_PHONE_NUMBER}
      # Database
      DATABASE_URL: postgresql://postgres:postgres@db:5432/crm_os_dev
    ports:
      - "3001:3001"
    depends_on:
      - db
```

Then create `.env.docker`:
```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```

Run with:
```bash
docker-compose --env-file .env.docker up -d
```

### Production Setup

#### 1. Environment Variables on Server

**Use environment management service**, not hard-coded values:

**Option A: Vercel/Netlify (for frontend)**
- Go to Settings → Environment Variables
- Add each variable:
  - `NEXT_PUBLIC_API_URL=https://api.yourdomain.com`

**Option B: Heroku/Railway/Render (for backend)**
- Go to Settings → Config Vars
- Add all Twilio variables
- Ensure DATABASE_URL points to production DB

**Option C: AWS Secrets Manager / Google Secret Manager**
```bash
# Store secrets
aws secretsmanager create-secret \
  --name app/sms/twilio-creds \
  --secret-string '{"sid":"AC...","token":"...","phone":"+1..."}'

# Retrieve in app
const credentials = JSON.parse(
  await getSecret('app/sms/twilio-creds')
);
```

#### 2. Webhook URL Configuration

Set your Twilio webhook URL to production:

```
https://api.yourdomain.com/messaging/webhooks/sms-status
```

#### 3. Security Best Practices

✅ **Do this:**
- Use HTTPS for webhook URL
- Implement webhook signature verification
- Rotate JWT secrets regularly
- Use strong database passwords
- Enable firewall rules
- Monitor error logs
- Rate limit API endpoints

❌ **Don't do this:**
- Hardcode credentials in code
- Commit .env files to git
- Use weak JWT secrets
- Allow unverified webhooks
- Disable CORS entirely
- Expose error details to client

#### 4. Environment File Example (.env)

```env
# ===== TWILIO SMS =====
TWILIO_ACCOUNT_SID=ACa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d
TWILIO_AUTH_TOKEN=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
TWILIO_PHONE_NUMBER=+14155552671

# ===== DATABASE =====
DATABASE_URL=postgresql://prod_user:secure_password@db.example.com:5432/crm_production

# ===== SERVER =====
PORT=3001
NODE_ENV=production
HOSTNAME=0.0.0.0

# ===== JWT =====
JWT_SECRET=super-secure-jwt-secret-at-least-32-characters-long

# ===== CORS =====
CORS_ORIGIN=https://app.yourdomain.com,https://www.yourdomain.com

# ===== LOGGING =====
LOG_LEVEL=error
DEBUG=false

# ===== RATE LIMITING =====
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_HOUR=1000
```

### Verification Checklist

After setting up environment:

```bash
# ✓ Check 1: Backend starts
npm run build
npm start
# Should see: "API running on http://localhost:3001"

# ✓ Check 2: Health endpoint works
curl http://localhost:3001/health
# Should return: {"status":"ok"}

# ✓ Check 3: Environment variables loaded
# In Node: console.log(process.env.TWILIO_ACCOUNT_SID)
# Should show your Account SID

# ✓ Check 4: Database connected
# Check for DB connection messages in logs

# ✓ Check 5: SMS endpoint accessible
curl -X POST http://localhost:3001/api/messaging/sms/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"leadId":1,"message":"Test"}'
```

### Troubleshooting Setup Issues

**Issue: "Cannot find module"**
- Run: `npm install`
- Clear node_modules: `rm -rf node_modules && npm install`

**Issue: "Prisma schema not found"**
- Check: `backend/prisma/schema.prisma` exists
- Run: `npx prisma generate`

**Issue: "Environment variable not defined"**
- Check: `.env` file exists in right location
- Verify: Variable name matches exactly (case-sensitive)
- Restart: Server after changing `.env`

**Issue: "Connection refused"**
- Database: Check PostgreSQL is running on 5432
- Port: Check port 3001 not in use: `lsof -i :3001`

**Issue: "Invalid phone number"**
- Format: Must be E.164: `+[country code][number]`
- Example: `+1234567890` or `+919876543210`

**Issue: "Twilio error: Invalid credentials"**
- Copy: Account SID correctly (no spaces)
- Copy: Auth Token correctly (no typos)
- Verify: Not using Auth Token for phone in console

### .env vs .env.local vs .env.production

**Priority order** (highest to lowest):
1. `.env.production` (when NODE_ENV=production)
2. `.env.local` (always, overrides .env)
3. `.env` (default)
4. System environment variables

**File purposes:**
- `.env` - Default values for all environments
- `.env.local` - Local development overrides (git-ignored)
- `.env.production` - Production-specific values (git-ignored)
- `.env.example` - Template for team (git-tracked)

**Setup for team:**
1. Create `.env.example` with all variables (no values)
2. Each dev creates `.env.local` from example
3. Add `.env.local` and `.env.production` to `.gitignore`
4. Document in README what variables are needed

### Example .env Files

#### Development (.env)
```env
TWILIO_ACCOUNT_SID=test_account_sid_123
TWILIO_AUTH_TOKEN=test_auth_token_123
TWILIO_PHONE_NUMBER=+1234567890
DATABASE_URL=postgresql://postgres:password@localhost:5432/crm_dev
PORT=3001
NODE_ENV=development
JWT_SECRET=dev-secret-key
CORS_ORIGIN=http://localhost:3000
```

#### Staging (.env.staging)
```env
TWILIO_ACCOUNT_SID=stage_acxxxxx
TWILIO_AUTH_TOKEN=stage_token_xxxxx
TWILIO_PHONE_NUMBER=+12125551234
DATABASE_URL=postgresql://stage_user:pass@stage-db.internal:5432/crm_staging
PORT=3001
NODE_ENV=staging
JWT_SECRET=staging-secret-key-must-be-secure
CORS_ORIGIN=https://staging.yourdomain.com
```

#### Production (.env.production)
```env
TWILIO_ACCOUNT_SID=prod_acxxxxx
TWILIO_AUTH_TOKEN=prod_token_xxxxx
TWILIO_PHONE_NUMBER=+14155552671
DATABASE_URL=postgresql://prod_user:secure_pass@prod-db.yourdomain.com:5432/crm_prod
PORT=3001
NODE_ENV=production
JWT_SECRET=super-secure-random-32-char-key
CORS_ORIGIN=https://app.yourdomain.com,https://www.yourdomain.com
RATE_LIMIT_ENABLED=true
LOG_LEVEL=error
```

### Updating Twilio Credentials

**If credentials change:**

1. Update in Twilio Console settings
2. Update `.env` files
3. Restart backend server
4. Test with dummy SMS

**If phone number changes:**

1. Add new number to Twilio account
2. Update `TWILIO_PHONE_NUMBER` in `.env`
3. Old messages still show old number (read-only)
4. New messages use new number

---

## Next Steps

1. ✅ Get Twilio credentials
2. ✅ Create `.env` files (backend and frontend)
3. ✅ Merge SMS branch into main
4. ✅ Run database migration: `npx prisma migrate deploy`
5. ✅ Start backend: `npm start`
6. ✅ Test sending SMS: `curl...`
7. ✅ Configure Twilio webhook
8. ✅ Deploy to production

---

**For detailed API usage**, see [SMS_INTEGRATION_GUIDE.md](./SMS_INTEGRATION_GUIDE.md)  
**For implementation steps**, see [SMS_IMPLEMENTATION_CHECKLIST.md](./SMS_IMPLEMENTATION_CHECKLIST.md)  
**For technical details**, see [SMS_API_TECHNICAL_REFERENCE.md](./SMS_API_TECHNICAL_REFERENCE.md)
