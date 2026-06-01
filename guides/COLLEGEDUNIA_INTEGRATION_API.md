# Collegedunia Lead Integration API (Guruverse CRM)

## Base URL

```text
https://api.guruverse.co.in
```

---

# Lead Creation Endpoint

## Endpoint

**Method:** POST

```http
POST /integrations/partner/collegedunia/leads
```

**Content-Type:** `application/json`

Backward-compatible alias:

```http
POST /integrations/collegedunia/leads
```

---

## Authentication

Provide both headers:

```http
X-Tenant-Slug: dvcoe
X-API-Key: YOUR_COLLEGEDUNIA_API_KEY
```

Alternative:

```http
Authorization: Bearer YOUR_COLLEGEDUNIA_API_KEY
```

---

## Sample Request

```bash
curl -X POST "https://api.guruverse.co.in/integrations/partner/collegedunia/leads" \
-H "Content-Type: application/json" \
-H "X-Tenant-Slug: dvcoe" \
-H "X-API-Key: YOUR_COLLEGEDUNIA_API_KEY" \
-d '{
  "name": "Aarav Sharma",
  "phone": "+919876543210",
  "email": "aarav@example.com",
  "course": "MBA",
  "city": "Pune",
  "state": "Maharashtra",
  "campaign": "June MBA Push",
  "source": "CD Search Form",
  "externalLeadId": "CD-LEAD-102938"
}'
```

---

## Supported Payload Fields

### Required

| Field | Type   |
| ----- | ------ |
| name  | string |
| phone | string |

### Optional

| Field          | Type   |
| -------------- | ------ |
| email          | string |
| address        | string |
| state          | string |
| district       | string |
| locality       | string |
| city           | string |
| region         | string |
| pincode        | string |
| course         | string |
| campaign       | string |
| source         | string |
| externalLeadId | string |

---

## Supported Alias Fields

The following aliases are also accepted:

```text
full_name
student_name
mobile_number
phone_number
email_id
campaign_name
lead_source
utm_source
```

---

# Lead Processing Rules

### Source Assignment

All leads received through this endpoint are automatically tagged as:

```text
Source = Collegedunia
Partner = Collegedunia
```

---

### Campaign Tracking

If provided:

```text
campaign → campaign
source → partnerSource
externalLeadId → externalLeadId
```

These values are stored for reporting and attribution.

---

### Duplicate Detection

Guruverse CRM checks duplicates in the following order:

1. Phone Number
2. Email Address

If duplicate lead exists:

* Existing lead remains unchanged
* Existing Lead ID is returned
* Duplicate activity is logged
* Latest enquiry timestamp is updated

---

# Success Response

### Lead Created

**HTTP 201**

```json
{
  "success": true,
  "data": {
    "leadId": 1234,
    "externalLeadId": "CD-LEAD-102938",
    "status": "CREATED",
    "source": "Collegedunia"
  }
}
```

---

# Duplicate Lead Response

**HTTP 409**

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_LEAD",
    "message": "Lead already exists",
    "duplicateBy": "phone",
    "leadId": 987
  }
}
```

---

# Validation Error

**HTTP 400**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PAYLOAD",
    "message": "Invalid lead payload"
  }
}
```

---

# Authentication Error

**HTTP 401**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "Invalid API key"
  }
}
```

---

# Rate Limit Error

**HTTP 429**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry later."
  }
}
```

---

# Health Check Endpoint

For connectivity testing:

```http
GET /integrations/partner/collegedunia/health
```

Backward-compatible alias:

```http
GET /integrations/collegedunia/health
```

### Response

```json
{
  "success": true,
  "status": "OK"
}
```

---

# Rate Limiting

Default policy:

```text
60 requests per minute
Per API Key
Per Tenant
```

Can be adjusted on request.

---

# Audit & Tracking

Every API submission is logged with:

```text
Tenant
Partner
IP Address
User Agent
Timestamp
Status
Duplicate Reason (if any)
```

Audit Action:

```text
INTEGRATION_LEAD_RECEIVED
```

---

# Security

Guruverse CRM supports:

* API Key Authentication
* Tenant Isolation
* Audit Logging
* Rate Limiting
* Duplicate Detection
* HTTPS Encryption

Additional IP whitelisting can be enabled upon request.

---

# Future Partner Compatibility

The integration framework is designed to support all the program partners,

without requiring separate integration architecture.

---

# Support

For technical support or integration assistance:

```text
Guruverse CRM
API Team
Email:gurubrandingservices@gmail.com
Website: https://guruverse.co.in
```
