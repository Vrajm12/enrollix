# SMS Messaging Integration Guide

This guide explains how to use the SMS messaging features in the CRM system, including sending SMS messages, checking delivery status, and handling delivery receipts via webhooks.

## Overview

The SMS messaging system is built on **Twilio** for reliable SMS delivery. It supports:
- Sending SMS messages to leads
- Bulk SMS messaging to multiple leads
- Real-time delivery status tracking via webhooks
- Manual status polling
- Cost tracking and statistics

## Setup Requirements

### 1. Twilio Account Setup

1. Create a Twilio account at https://www.twilio.com
2. Verify your phone number
3. Get your credentials:
   - Account SID
   - Auth Token
   - Twilio Phone Number (SMS-enabled)

### 2. Environment Configuration

Set these environment variables in your `.env` file:

```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### 3. Webhook URL Configuration

1. In your Twilio console, navigate to **Messaging > Settings > General**
2. Set the **Webhook URL for Incoming Messages** (optional, for inbound SMS):
   ```
   https://yourdomain.com/messaging/webhooks/sms-status
   ```
3. Set the **Webhook URL for Status Callbacks**:
   ```
   https://yourdomain.com/messaging/webhooks/sms-status
   ```
4. Choose **HTTP POST** as the method

## API Endpoints

### Send SMS to a Lead
**POST** `/api/messaging/sms/send`

Sends an SMS message to a specific lead.

**Request:**
```json
{
  "leadId": 1,
  "message": "Hello! This is a test message from our CRM."
}
```

**Response:**
```json
{
  "id": 1,
  "leadId": 1,
  "sentBy": 5,
  "message": "Hello! This is a test message from our CRM.",
  "status": "SENT",
  "direction": "OUTBOUND",
  "phoneNumber": "+919876543210",
  "messageId": "SM1234567890abcdef1234567890abcdef",
  "provider": "twilio",
  "cost": 0.0075,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Status Codes:**
- `201 Created` - Message sent successfully
- `400 Bad Request` - Invalid payload
- `404 Not Found` - Lead not found
- `500 Internal Server Error` - Failed to send SMS

### Bulk Send SMS
**POST** `/api/messaging/bulk/send`

Sends SMS to multiple leads at once.

**Request:**
```json
{
  "leadIds": [1, 2, 3],
  "message": "Bulk message to multiple leads",
  "type": "sms"
}
```

**Response:**
```json
{
  "type": "sms",
  "totalMessages": 3,
  "messages": [
    { /* message object 1 */ },
    { /* message object 2 */ },
    { /* message object 3 */ }
  ]
}
```

### Get SMS Thread for a Lead
**GET** `/api/messaging/sms/thread/:leadId`

Retrieves all SMS messages for a specific lead (conversation thread).

**Response:**
```json
{
  "lead": {
    "id": 1,
    "name": "John Doe",
    "phone": "+919876543210",
    "email": "john@example.com"
  },
  "messages": [
    {
      "id": 1,
      "message": "Hello!",
      "status": "DELIVERED",
      "direction": "OUTBOUND",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Check SMS Delivery Status
**GET** `/api/messaging/sms/status/:messageSid`

Checks the current delivery status of an SMS message using its Twilio SID.

**Response:**
```json
{
  "message": {
    "id": 1,
    "status": "DELIVERED",
    "messageId": "SM1234567890abcdef1234567890abcdef",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "twilioStatus": "delivered",
  "updatedFromTwilio": true
}
```

### Get Messaging Statistics
**GET** `/api/messaging/stats`

Returns overall statistics for all SMS and WhatsApp messages.

**Response:**
```json
{
  "whatsapp": {
    "total": 100,
    "delivered": 95,
    "failed": 5,
    "deliveryRate": 95
  },
  "sms": {
    "total": 250,
    "delivered": 245,
    "failed": 5,
    "deliveryRate": 98
  }
}
```

### SMS Status Webhook
**POST** `/api/messaging/webhooks/sms-status`

⚠️ **This endpoint is called by Twilio**. Do not call it manually.

Twilio sends delivery status updates via this webhook. The system automatically processes these updates and stores them in the database.

**Webhook Payload from Twilio:**
```
MessageSid=SM[TWILIO-MESSAGE-ID]
AccountSid=AC[TWILIO-ACCOUNT-ID]
From=+1[YOUR-TWILIO-NUMBER]
To=+91[RECIPIENT-PHONE]
MessageStatus=delivered
ErrorCode=
```

**Response:**
```json
{
  "acknowledged": true,
  "messageSid": "SM1234567890abcdef1234567890abcdef",
  "status": "DELIVERED"
}
```

## Message Status Flow

Messages go through the following status lifecycle:

```
PENDING → SENT → DELIVERED → READ
           ↓
         FAILED
```

**Status Meanings:**
- **PENDING**: Message is queued and waiting to be sent
- **SENT**: Message has been successfully sent to carrier
- **DELIVERED**: Message has been delivered to recipient's phone
- **READ**: Message has been read by recipient (if supported)
- **FAILED**: Message delivery failed

## Error Handling

### Common Errors

**Invalid Phone Number**
- Format phone numbers in E.164 format: `+[country code][number]`
- Support for Indian numbers: `+919876543210` or `09876543210`

**Twilio Credentials Not Configured**
- Check `.env` file has correct `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER`
- If not configured, messages will be created with `PENDING` status but won't be sent

**Message Not Found**
- Ensure the Message SID (messageSid) is correct
- The message must exist in the database

## Implementation Examples

### Send SMS via cURL
```bash
curl -X POST http://localhost:3001/api/messaging/sms/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"leadId": 1, "message": "Hello!"}'
```

### Check Delivery Status via JavaScript
```javascript
const messageSid = "SM1234567890abcdef1234567890abcdef";
const response = await fetch(
  `/api/messaging/sms/status/${messageSid}`,
  {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  }
);
const data = await response.json();
console.log(data.message.status);
```

### Get SMS Statistics via Python
```python
import requests

headers = {"Authorization": f"Bearer {token}"}
response = requests.get("http://localhost:3001/api/messaging/stats", headers=headers)
stats = response.json()
print(f"SMS Delivery Rate: {stats['sms']['deliveryRate']}%")
```

## Best Practices

1. **Phone Number Validation**
   - Always validate phone numbers before sending
   - Support multiple formats and auto-convert to E.164

2. **Webhook Configuration**
   - Keep webhook URL accessible from the internet
   - Use HTTPS for secure communication
   - Implement request signature verification (Twilio provides this)

3. **Error Handling**
   - Check error codes when messages fail
   - Implement retry logic for failed messages
   - Log all delivery events for debugging

4. **Cost Tracking**
   - Monitor SMS costs
   - Set up alerts for high usage
   - Review statistics regularly

5. **Rate Limiting**
   - Don't send too many messages at once
   - Implement delays between bulk sends
   - Consider Twilio rate limits

## Database Schema

The SMS messages are stored in the `sms_messages` table:

```sql
CREATE TABLE sms_messages (
  id SERIAL PRIMARY KEY,
  lead_id INT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  sent_by INT NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  status message_status NOT NULL DEFAULT 'PENDING',
  direction message_direction NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  message_id VARCHAR(255),
  provider VARCHAR(50) DEFAULT 'twilio',
  cost FLOAT DEFAULT 0,
  error_code VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sms_messages_lead_id ON sms_messages(lead_id);
CREATE INDEX idx_sms_messages_sent_by ON sms_messages(sent_by);
```

## Troubleshooting

### Messages Not Being Delivered

1. **Check Twilio credentials** - Verify in `.env`
2. **Check phone number format** - Must be valid and in E.164 format
3. **Check account balance** - Ensure Twilio account has credit
4. **Check Twilio logs** - Review in Twilio console

### Webhooks Not Updating Status

1. **Verify webhook URL** - Should be publicly accessible
2. **Check server logs** - Look for webhook requests
3. **Test webhook** - Use Twilio console webhook tester
4. **Check firewall** - Ensure Twilio IP ranges are allowed

### Database Errors

1. **Run migrations** - `npx prisma migrate deploy`
2. **Check schema** - Verify `sms_messages` table exists
3. **Check connections** - Ensure database is accessible

## Related Resources

- [Twilio SMS Documentation](https://www.twilio.com/docs/sms)
- [Twilio Webhook Documentation](https://www.twilio.com/docs/sms/webhooks)
- [E.164 Phone Number Format](https://en.wikipedia.org/wiki/E.164)
- [Prisma ORM Documentation](https://www.prisma.io/docs/)
