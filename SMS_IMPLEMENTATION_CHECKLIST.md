# SMS Implementation Checklist & Next Steps

## Pre-Deployment Checklist

### Environment Setup
- [ ] Create Twilio account and get credentials
- [ ] Set `TWILIO_ACCOUNT_SID` in `.env`
- [ ] Set `TWILIO_AUTH_TOKEN` in `.env`
- [ ] Set `TWILIO_PHONE_NUMBER` in `.env`
- [ ] Verify server has internet access for Twilio API calls

### Database Setup
- [ ] Run Prisma migration: `npx prisma migrate deploy`
- [ ] Verify `error_code` column added to `sms_messages` table
- [ ] Check database connection works

### Code Deployment
- [ ] Pull latest changes with SMS endpoints
- [ ] Install dependencies: `npm install` (if any new packages)
- [ ] Build project: `npm run build`
- [ ] Start backend server: `npm start`
- [ ] Verify server running and healthy on `/health` endpoint

### Webhook Configuration
- [ ] Get your production server URL (e.g., https://api.yourdomain.com)
- [ ] Log into Twilio console
- [ ] Go to **Messaging > Settings > General**
- [ ] Set **Webhook URL for Status Callbacks**: `https://api.yourdomain.com/messaging/webhooks/sms-status`
- [ ] Choose **HTTP POST**
- [ ] Save settings

### Testing
- [ ] Test SMS send with single lead (basic endpoint test)
- [ ] Monitor Prisma logs for successful message creation
- [ ] Check `/messaging/sms/thread/:leadId` to verify message saved
- [ ] Test phone number validation (valid and invalid formats)
- [ ] Test bulk send endpoint with multiple leads
- [ ] Test statistics endpoint: `/messaging/stats`

### Webhook Testing
- [ ] Use Twilio webhook tester to simulate delivery receipt
- [ ] Monitor server logs for webhook processing
- [ ] Verify message status updated in database
- [ ] Test with DELIVERED status
- [ ] Test with FAILED status + error code

## Implementation Steps

### Step 1: Database Migration
```bash
cd backend
npx prisma migrate deploy
```

This applies the migration that adds the `error_code` column to `sms_messages` table.

### Step 2: Update Environment Variables
```env
# Add to .env or .env.local
TWILIO_ACCOUNT_SID=AC[YOUR-ACCOUNT-SID]
TWILIO_AUTH_TOKEN=[YOUR-AUTH-TOKEN]
TWILIO_PHONE_NUMBER=+1[YOUR-TWILIO-NUMBER]
```

### Step 3: Start Backend Server
```bash
npm install
npm run build
npm start
```

Verify server is running: `curl http://localhost:3001/health`

### Step 4: Test SMS Sending
```bash
# Get an authentication token first (see auth endpoints)
curl -X POST http://localhost:3001/api/messaging/sms/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": 1,
    "message": "Test SMS from CRM"
  }'
```

### Step 5: Verify Message Saved
```bash
curl -X GET http://localhost:3001/api/messaging/sms/thread/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 6: Configure Twilio Webhooks
1. Login to Twilio Console
2. Go to **Messaging > Settings > General**
3. Find "Webhook URLs"
4. Set **Webhook for Status Callbacks** to:
   ```
   https://yourdomain.com/messaging/webhooks/sms-status
   ```
5. Method: **HTTP POST**
6. Save

### Step 7: Test Webhook Processing
1. In Twilio console, go to **Messaging > Send a Test SMS**
2. Send a test message
3. Monitor your backend logs
4. Use Twilio Test tool to simulate status callback
5. Verify message status updates in database

## Webhook Signature Verification (Optional but Recommended)

To verify Twilio webhook requests are genuine, add signature verification:

```typescript
// In routes/messaging.ts - add this middleware
import twilio from 'twilio';

const validateTwilioRequest = (req, res, next) => {
  const { TWILIO_AUTH_TOKEN } = env;
  const requestUrl = `https://${req.hostname}${req.originalUrl}`;
  const signature = req.headers['x-twilio-signature'];
  
  const isValid = twilio.validateRequest(
    TWILIO_AUTH_TOKEN,
    signature,
    requestUrl,
    req.body
  );
  
  if (!isValid) {
    return res.status(403).json({ error: 'Invalid signature' });
  }
  
  next();
};

// Apply to webhook routes:
router.post(
  "/webhooks/sms-status",
  validateTwilioRequest,
  asyncHandler(async (req, res) => {
    // ... existing handler code
  })
);
```

## Frontend Integration (Next.js)

### Example: Send SMS Component

```typescript
// components/SendSMS.tsx
import { useState } from 'react';

export function SendSMS({ leadId }: { leadId: number }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSend = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/messaging/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, message })
      });

      if (!response.ok) throw new Error('Failed to send SMS');

      const data = await response.json();
      setStatus('success');
      setMessage('');
      console.log('SMS sent:', data);
    } catch (error) {
      setStatus('error');
      console.error('Error sending SMS:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your SMS message..."
        maxLength={160}
        className="w-full p-2 border rounded"
      />
      <p className="text-sm text-gray-500">
        {message.length}/160 characters
      </p>
      <button
        onClick={handleSend}
        disabled={loading || !message}
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
      >
        {loading ? 'Sending...' : 'Send SMS'}
      </button>
      {status === 'success' && <p className="text-green-500 mt-2">SMS sent!</p>}
      {status === 'error' && <p className="text-red-500 mt-2">Failed to send</p>}
    </div>
  );
}
```

### Example: Check SMS Status Component

```typescript
// components/SMSStatus.tsx
import { useState, useEffect } from 'react';

export function SMSStatus({ messageSid }: { messageSid: string }) {
  const [status, setStatus] = useState<string>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/messaging/sms/status/${messageSid}`);
        if (!response.ok) throw new Error('Failed to fetch status');

        const data = await response.json();
        setStatus(data.message.status);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [messageSid]);

  return (
    <div className="p-4">
      <p>SMS Status: <strong>{status}</strong></p>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
```

## Monitoring & Maintenance

### Logs to Monitor
- SMS send failures
- Webhook processing errors
- Phone number validation errors
- Twilio API errors

### Key Metrics to Track
- Total SMS sent
- Delivery rate
- Cost per message
- Failed deliveries
- Error trends

### Regular Maintenance
- Monitor Twilio account balance weekly
- Review failed deliveries monthly
- Analyze delivery patterns
- Update phone number formats if needed

## Troubleshooting Guide

### Issue: "Twilio credentials not configured"
- **Fix**: Verify `.env` file has all three Twilio env variables
- **Fix**: Restart server after updating `.env`

### Issue: "Invalid phone number format"
- **Fix**: Ensure phone numbers are in E.164 format (+1234567890)
- **Fix**: String should start with +

### Issue: Webhooks not updating status
- **Fix**: Verify webhook URL is publicly accessible
- **Fix**: Check firewall allows Twilio IP ranges
- **Fix**: Enable webhook signature verification (optional)
- **Fix**: Monitor server logs for webhook requests

### Issue: Messages not sending
- **Fix**: Check Twilio account has sufficient credit
- **Fix**: Verify phone number is real and mobile
- **Fix**: Check SMS provider (usually Twilio)
- **Fix**: Monitor Twilio dashboard for errors

### Issue: Database migration fails
- **Fix**: Backup database first
- **Fix**: Check database permissions
- **Fix**: Verify Prisma schema syntax
- **Fix**: Run: `npx prisma migrate deploy`

## Performance Considerations

- **Bulk sends**: Process in batches (50-100 at a time)
- **Webhook processing**: Keep handlers fast (< 1 second)
- **Status polling**: Don't check too frequently (minimum 5 seconds)
- **Database queries**: Use indexes on `lead_id` and `sent_by`

## Security Considerations

- ✅ Webhook signature verification (recommended)
- ✅ All messaging endpoints require authentication
- ✅ Validate phone numbers before sending
- ✅ Store Twilio credentials in environment variables only
- ✅ Rate limit SMS sending per user
- ✅ Audit logging for all SMS sends

## Next Steps

1. **Create database migration**
   ```bash
   npx prisma migrate deploy
   ```

2. **Update environment variables**
   - Add Twilio credentials to `.env`

3. **Start backend server**
   ```bash
   npm install && npm run build && npm start
   ```

4. **Configure Twilio webhooks**
   - Set webhook URL in Twilio console

5. **Test endpoints**
   - Send SMS to test lead
   - Check delivery status
   - Simulate webhook callback

6. **Deploy to production**
   - Update webhook URL to production domain
   - Verify all endpoints working

7. **Frontend integration** (Optional)
   - Add send SMS form to dashboard
   - Show SMS thread view
   - Display delivery status real-time

## Support Resources

- SMS Integration Guide: [SMS_INTEGRATION_GUIDE.md](./SMS_INTEGRATION_GUIDE.md)
- Twilio Documentation: https://www.twilio.com/docs/sms
- Prisma Documentation: https://www.prisma.io/docs/
- Backend Source Code: [backend/src/routes/messaging.ts](backend/src/routes/messaging.ts)

---

**Last Updated**: 2024
**Maintainer**: Development Team
