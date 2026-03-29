# SMS Quick Start Guide

Get SMS messaging running in 5 minutes.

## Prerequisites
- Node.js 16+ and npm
- PostgreSQL database
- Twilio account (free to start)

## 1. Get Twilio Credentials (2 minutes)

1. Go to https://www.twilio.com/console
2. Copy your **Account SID** and **Auth Token**
3. Go to **Phone Numbers** and get an SMS-enabled number
4. You now have: `Account SID`, `Auth Token`, `Phone Number`

## 2. Update Environment (1 minute)

Create or update `backend/.env`:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=abc123def456ghi789
TWILIO_PHONE_NUMBER=+14155552671
```

Replace with your actual values from step 1.

## 3. Run Migration (1 minute)

```bash
cd backend
npx prisma migrate deploy
```

## 4. Start Server (1 minute)

```bash
npm install  # If first time
npm run build
npm start
```

You should see: `API running on http://localhost:3001`

## 5. Test It (1 minute)

Get an auth token first, then send test SMS:

```bash
# First, get token through login endpoint
TOKEN="your-jwt-token-here"

# Send SMS to lead with ID 1
curl -X POST http://localhost:3001/api/messaging/sms/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": 1,
    "message": "Hello from CRM!"
  }'
```

Expected response:
```json
{
  "id": 1,
  "leadId": 1,
  "status": "SENT",
  "messageId": "SM1234567890abcdef",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

## Done! ✅

You now have SMS messaging working. 

## Common Endpoints

| Action | Endpoint |
|--------|----------|
| Send SMS | `POST /api/messaging/sms/send` |
| Check Status | `GET /api/messaging/sms/status/:sid` |
| Get Thread | `GET /api/messaging/sms/thread/:leadId` |
| Bulk Send | `POST /api/messaging/bulk/send` |
| Stats | `GET /api/messaging/stats` |

## Request Examples

### Send Single SMS
```bash
curl -X POST http://localhost:3001/api/messaging/sms/send \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": 1,
    "message": "Your message here"
  }'
```

### Send Bulk SMS
```bash
curl -X POST http://localhost:3001/api/messaging/bulk/send \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leadIds": [1, 2, 3],
    "message": "Message to all",
    "type": "sms"
  }'
```

### Check Message Status
```bash
curl -X GET http://localhost:3001/api/messaging/sms/status/SM1234567890abcdef \
  -H "Authorization: Bearer TOKEN"
```

### Get Conversation Thread
```bash
curl -X GET http://localhost:3001/api/messaging/sms/thread/1 \
  -H "Authorization: Bearer TOKEN"
```

### Get Statistics
```bash
curl -X GET http://localhost:3001/api/messaging/stats \
  -H "Authorization: Bearer TOKEN"
```

## Phone Number Formats Accepted

All of these work:
- `+14155552671` (E.164 international)
- `+919876543210` (International with code)
- `09876543210` (Indian without code - auto-converts to +91)
- `9876543210` (Indian without leading 0)

## Status Meanings

- `PENDING` - Message queued, waiting to send
- `SENT` - Message sent to carrier
- `DELIVERED` - Message reached recipient
- `READ` - Message read by recipient
- `FAILED` - Delivery failed (see errorCode)

## Troubleshooting

### "Twilio credentials not configured"
- Check `.env` file exists with all 3 variables
- Check spelling: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Restart server after changing `.env`

### "Lead not found"
- Make sure lead with that ID exists in database
- Try: `SELECT * FROM leads WHERE id = 1;`

### "Invalid phone number"
- Must start with `+` in E.164 format: `+14155552671`
- For India: `+919876543210`

### "Webhook not updating status"
1. Verify webhook URL: `https://yourdomain.com/api/messaging/webhooks/sms-status`
2. Set in Twilio console: **Messaging > Settings > Webhooks**
3. Method should be: **HTTP POST**

## Next Steps

1. **For Frontend**: See SMS components in docs
2. **For Webhooks**: Configure in Twilio console
3. **For Production**: See `ENV_CONFIGURATION_GUIDE.md`
4. **For Full API Docs**: See `SMS_INTEGRATION_GUIDE.md`

## Need Help?

- Check `SMS_INTEGRATION_GUIDE.md` for full documentation
- See `SMS_API_TECHNICAL_REFERENCE.md` for technical details
- Check server logs for errors: `npm start` output

---

**That's it!** You have SMS messaging ready to use. 🎉
