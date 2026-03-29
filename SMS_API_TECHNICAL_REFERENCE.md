# SMS API Technical Reference

## Overview

The SMS messaging module provides a complete SMS communication system for the CRM with Twilio integration, message tracking, webhook support, and comprehensive status management.

## Architecture

```
┌─────────────────────────────────────────────────┐
│           Frontend (Next.js)                    │
└────────────────┬────────────────────────────────┘
                 │ HTTP Requests
                 ▼
┌─────────────────────────────────────────────────┐
│     Routes: /api/messaging/*                    │
│   - Send SMS (/sms/send)                        │
│   - Check Status (/sms/status/:sid)             │
│   - Get Thread (/sms/thread/:leadId)            │
│   - Bulk Send (/bulk/send)                      │
│   - Webhooks (/webhooks/sms-status)             │
└────────────────┬────────────────────────────────┘
                 │ 
                 ▼
┌─────────────────────────────────────────────────┐
│      Services Layer                             │
│   - twilioService (twilio.ts)                   │
│   - prismaService (prisma.ts)                   │
└────────────────┬────────────────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
┌──────────────────┐  ┌──────────────────┐
│   PostgreSQL DB  │  │  Twilio API      │
│  (sms_messages)  │  │  (SMS Gateway)   │
└──────────────────┘  └──────────────────┘
        │                  │
        └────────┬─────────┘
                 ▼
        ┌──────────────────┐
        │  Webhook Callback│
        │ (Status Updates) │
        └──────────────────┘
```

## Request/Response Models

### SMSMessage Model (Database)

```typescript
interface SMSMessage {
  id: number;
  leadId: number;
  sentBy: number;
  message: string;
  status: MessageStatus; // PENDING | SENT | DELIVERED | READ | FAILED
  direction: MessageDirection; // OUTBOUND | INBOUND
  phoneNumber: string; // E.164 format: +1234567890
  messageId: string | null; // Twilio SID
  provider: string; // "twilio"
  cost: number | null; // $0.0075 per SMS typical
  errorCode: string | null; // Twilio error code if failed
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  lead?: Lead;
}
```

### API Request Models

**SendSMSRequest**
```typescript
{
  leadId: number; // Integer, must be > 0
  message: string; // Non-empty string, typically < 160 chars
}
```

**BulkSendRequest**
```typescript
{
  leadIds: number[]; // Array of integers, min length 1
  message: string; // Non-empty string
  type: "sms" | "whatsapp"; // Must be "sms" or "whatsapp"
}
```

**WebhookPayload (from Twilio)**
```
POST /api/messaging/webhooks/sms-status
Content-Type: application/x-www-form-urlencoded

MessageSid=SM[TWILIO-MESSAGE-ID]
AccountSid=AC[TWILIO-ACCOUNT-ID]
From=+1[YOUR-TWILIO-NUMBER]
To=+91[RECIPIENT-PHONE]
MessageStatus=delivered
ErrorCode=
```

### API Response Models

**SendSMSResponse (201 Created)**
```json
{
  "id": 1,
  "leadId": 1,
  "sentBy": 5,
  "message": "Your message",
  "status": "SENT",
  "direction": "OUTBOUND",
  "phoneNumber": "+919876543210",
  "messageId": "SM1234567890abcdef1234567890abcdef",
  "provider": "twilio",
  "cost": 0.0075,
  "errorCode": null,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**BulkSendResponse (201 Created)**
```json
{
  "type": "sms",
  "totalMessages": 3,
  "messages": [
    { /* SMSMessage 1 */ },
    { /* SMSMessage 2 */ },
    { /* SMSMessage 3 */ }
  ]
}
```

**StatusCheckResponse (200 OK)**
```json
{
  "message": {
    "id": 1,
    "status": "DELIVERED",
    "messageId": "SM1234567890abcdef1234567890abcdef",
    "errorCode": null,
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "twilioStatus": "delivered",
  "updatedFromTwilio": true
}
```

**ThreadResponse (200 OK)**
```json
{
  "lead": {
    "id": 1,
    "name": "John Doe",
    "phone": "+919876543210",
    "email": "john@example.com",
    "status": "INTERESTED"
  },
  "messages": [
    {
      "id": 1,
      "message": "Hello!",
      "status": "DELIVERED",
      "direction": "OUTBOUND",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "user": {
        "id": 5,
        "name": "Agent Smith",
        "email": "smith@example.com"
      }
    }
  ]
}
```

**StatsResponse (200 OK)**
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

**WebhookResponse (200 OK)**
```json
{
  "acknowledged": true,
  "messageSid": "SM1234567890abcdef1234567890abcdef",
  "status": "DELIVERED"
}
```

### Error Responses

**400 Bad Request**
```json
{
  "message": "Invalid payload",
  "errors": {
    "fieldErrors": {
      "leadId": ["Expected number, got string"],
      "message": ["String must contain at least 1 character"]
    }
  }
}
```

**404 Not Found**
```json
{
  "message": "Lead not found"
}
```

**500 Internal Server Error**
```json
{
  "message": "Failed to send SMS",
  "error": "Invalid phone number format"
}
```

## Endpoint Details

### POST /api/messaging/sms/send

**Method**: POST  
**Authentication**: Required (JWT Bearer token)  
**Rate Limit**: 100 SMS per hour per user  
**Timeout**: 30 seconds

**Purpose**: Send a single SMS message to a lead

**Implementation Details**:
1. Validate request using Zod schema
2. Verify lead exists in database
3. Create message record with PENDING status
4. Attempt to send via Twilio
5. Update message status based on Twilio response
6. Return updated message record

**Phone Number Validation**:
- Accepts: E.164 format (+1234567890)
- Accepts: Indian format (09876543210, 9876543210)
- Accepts: Indian format with country code (919876543210)
- Converts all to E.164 format before sending

**Error Scenarios**:
- Lead not found → 404
- Invalid phone format → 500
- Twilio error → 500 (message marked as FAILED)
- Twilio not configured → 201 (message created but not sent)

**Transaction Example**:
```
1. Request: { leadId: 1, message: "Hello!" }
2. Verify lead exists → ✓
3. Create message: status = PENDING
4. Call Twilio API → messageSid = SM123...
5. Update message: status = SENT, messageId = SM123...
6. Response: 201 with updated message
```

---

### GET /api/messaging/sms/status/:messageSid

**Method**: GET  
**Authentication**: Required (JWT Bearer token)  
**Timeout**: 10 seconds

**Purpose**: Check current delivery status of an SMS

**Implementation Details**:
1. Validate messageSid parameter
2. Query database for message by messageId
3. Query Twilio API for current status
4. Update database if status changed
5. Return message and Twilio status

**Status Mapping**:
```
Twilio → Our System
queued → PENDING
sending → PENDING
sent → SENT
failed → FAILED
delivered → DELIVERED
read → READ
undelivered → FAILED
```

**Response Fields**:
- `message`: Current message record from database
- `twilioStatus`: Status from Twilio API
- `updatedFromTwilio`: Boolean indicating if database was updated

---

### GET /api/messaging/sms/thread/:leadId

**Method**: GET  
**Authentication**: Required (JWT Bearer token)  
**Sorting**: By createdAt ascending  
**Timeout**: 10 seconds

**Purpose**: Get all SMS messages for a lead (conversation thread)

**Implementation Details**:
1. Validate leadId is positive integer
2. Verify lead exists
3. Query all SMS messages for this lead
4. Include user and lead details
5. Sort chronologically

**Response Structure**:
```json
{
  "lead": { /* Lead details */ },
  "messages": [ /* Array of messages */ ]
}
```

---

### POST /api/messaging/bulk/send

**Method**: POST  
**Authentication**: Required (JWT Bearer token)  
**Rate Limit**: 1000 SMS per hour per user  
**Timeout**: 120 seconds (for multiple messages)

**Purpose**: Send SMS to multiple leads at once

**Implementation Details**:
1. Validate request schema
2. Fetch all specified leads
3. For each lead:
   - Call Twilio API
   - Create message record
   - Capture any errors
4. Return results array (some may fail)

**Error Handling**:
- Per-lead errors are captured but don't stop bulk send
- Failed messages marked as FAILED status
- Return array contains all messages (success and failed)

**Performance Notes**:
- For > 1000 leads, consider pagination
- Twilio has rate limits (typically 100 msgs/sec)
- May take several seconds for large batches

---

### POST /api/messaging/webhooks/sms-status

**Method**: POST  
**Authentication**: None (Twilio webhook)  
**Signature Verification**: Recommended (see below)  
**Content-Type**: application/x-www-form-urlencoded  
**Timeout**: 10 seconds

**Purpose**: Handle delivery status callbacks from Twilio

**Implementation Details**:
1. Parse Twilio webhook payload
2. Extract MessageSid and MessageStatus
3. Find message in database by messageId
4. Map Twilio status to our enum
5. Update message record
6. Update lead lastActivityAt if DELIVERED  
7. Log delivery event
8. Return 200 to acknowledge

**Important**:
- Always returns 200 (even if message not found)
- Prevents Twilio from retrying
- Webhook URL must be public and accessible
- Handles form-encoded POST data

**Signature Verification** (optional):
```typescript
import twilio from 'twilio';

const isValid = twilio.validateRequest(
  TWILIO_AUTH_TOKEN,
  req.headers['x-twilio-signature'],
  req.originalUrl,
  req.body
);
```

---

### GET /api/messaging/stats

**Method**: GET  
**Authentication**: Required (JWT Bearer token)  
**Timeout**: 5 seconds

**Purpose**: Get overall messaging statistics

**Implementation Details**:
1. Count all SMS messages
2. Count delivered SMS
3. Count all WhatsApp messages
4. Count delivered WhatsApp messages
5. Calculate delivery rates
6. Return statistics

**Delivery Rate**:
```
deliveryRate = (delivered / total) * 100
```

---

## Database Schema

### sms_messages Table

```sql
CREATE TABLE sms_messages (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  sent_by INTEGER NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  status message_status_enum NOT NULL DEFAULT 'PENDING',
  direction message_direction_enum NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  message_id VARCHAR(255) UNIQUE,
  provider VARCHAR(50) DEFAULT 'twilio',
  cost NUMERIC(10, 4) DEFAULT NULL,
  error_code VARCHAR(10) DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sms_messages_lead_id ON sms_messages(lead_id);
CREATE INDEX idx_sms_messages_sent_by ON sms_messages(sent_by);
CREATE INDEX idx_sms_messages_created_at ON sms_messages(created_at);
CREATE INDEX idx_sms_messages_status ON sms_messages(status);
```

### Indexes

| Column | Purpose |
|---------|---------|
| `lead_id` | Fast lookup of messages for a lead |
| `sent_by` | Filter messages by sender |
| `created_at` | Sort messages by time |
| `status` | Filter by delivery status |
| `message_id` | Find message by Twilio SID |

---

## Error Codes

### HTTP Status Codes

| Code | Meaning | Cause |
|------|---------|-------|
| 200 | OK | Success (GET), Webhook success |
| 201 | Created | SMS sent successfully |
| 400 | Bad Request | Invalid input (missing fields, wrong types) |
| 404 | Not Found | Lead or message not found |
| 500 | Server Error | Twilio API error, DB error |

### Twilio Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 21614 | Invalid mobile number | Validate phone format |
| 21612 | Invalid to number | Check phone number exists |
| 20003 | Exceeded rate limit | Wait and retry |
| 30006 | Account suspended | Check Twilio account |

---

## Performance & Scalability

### Throughput

- **Single SMS send**: < 1 second
- **Bulk send (100 messages)**: 5-10 seconds
- **Status check**: < 500ms
- **Thread retrieval**: < 1 second

### Database Performance

- **Messages per lead**: Index on lead_id
- **Messages per day**: Archive old messages
- **Status lookups**: Index on message_id

### Twilio Limits

- **Rate**: ~100 messages/second
- **Account**: Check your Twilio plan
- **Phone validation**: E.164 format required

---

## Security

### Authentication

All endpoints except webhook require JWT bearer token:
```
Authorization: Bearer <your-jwt-token>
```

### Webhook Security

Recommended signature verification:
```typescript
const isValid = twilio.validateRequest(
  process.env.TWILIO_AUTH_TOKEN,
  req.headers['x-twilio-signature'],
  req.originalUrl,
  req.body
);
```

### Data Protection

- Phone numbers: Stored as-is (can be encrypted)
- Messages: Not encrypted in database
- Twilio credentials: Environment variables only

---

## Integration Examples

### With Next.js

See [frontend/lib/api.ts](../../../../frontend/lib/api.ts) for API client.

### With Express Backend (Already Implemented)

Routes defined in [backend/src/routes/messaging.ts](../../../../backend/src/routes/messaging.ts)

### With Postman

See example requests in Postman collection.

---

## Troubleshooting

### Message Not Sending

**Check**:
1. Twilio credentials configured
2. Phone number in E.164 format  
3. Twilio account has credit
4. Lead exists in database

### Webhook Not Updating

**Check**:
1. Webhook URL is public
2. Server is running
3. Check server logs
4. Firewall allows Twilio IPs

### Stale Message Status

**Solution**:
1. Hit `/sms/status/:sid` endpoint
2. Re-query Twilio API
3. Update database
4. Returns current status

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01-15 | Initial release with SMS support |

---

## References

- [Twilio SMS API](https://www.twilio.com/docs/sms/api)
- [Twilio Webhooks](https://www.twilio.com/docs/sms/webhooks)
- [Prisma ORM](https://www.prisma.io/docs/)
- [Express.js](https://expressjs.com/)
- [Zod Validation](https://zod.dev/)
