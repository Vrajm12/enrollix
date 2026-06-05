# Collegedunia Lead Integration API

## Base URL

```text
https://api.guruverse.co.in
```

## Lead Creation Endpoint

Method:

```http
POST
```

Endpoint:

```http
/integrations/partner/collegedunia/leads
```

Full URL:

```text
https://api.guruverse.co.in/integrations/partner/collegedunia/leads
```

Backward-compatible alias:

```http
POST /integrations/collegedunia/leads
```

Content type:

```http
application/json
```

## Authentication

Please pass the following headers with every lead creation request:

```http
X-Tenant-Slug: dvcoe
X-API-Key: YOUR_COLLEGEDUNIA_API_KEY
```

The API key will be shared separately through a secure communication channel.

## Request Body

Required fields:

```text
name
phone
```

Optional fields:

```text
email
state
city
district
locality
pincode
course
source
medium
campaign
externalLeadId
```

## Field Mapping

```text
name = student name
phone = mobile number
email = student email
state = state
city = city
district = district
locality = city/town/village/local area
pincode = postal code
course = selected course
source = Collegedunia constant
medium = dynamic value from Collegedunia
campaign = dynamic campaign name from Collegedunia
externalLeadId = Collegedunia unique lead ID
```

## Source, Medium, And Campaign

The CRM source is automatically set as:

```text
Collegedunia
```

Collegedunia may also send `source` in the request body as:

```json
{
  "source": "Collegedunia"
}
```

The `medium` and `campaign` parameters are dynamic and should be sent when available.

Example:

```json
{
  "source": "Collegedunia",
  "medium": "Website Form",
  "campaign": "DVCOE June Admissions"
}
```

## Sample JSON Request Body

```json
{
  "name": "Aarav Sharma",
  "phone": "+919876543210",
  "email": "aarav@example.com",
  "state": "Maharashtra",
  "city": "Pune",
  "district": "Pune",
  "locality": "Pimpri",
  "pincode": "411018",
  "course": "Computer Engineering",
  "source": "Collegedunia",
  "medium": "Website Form",
  "campaign": "DVCOE June Admissions",
  "externalLeadId": "CD-LEAD-102938"
}
```

## Sample cURL Request

```bash
curl -X POST "https://api.guruverse.co.in/integrations/partner/collegedunia/leads" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: dvcoe" \
  -H "X-API-Key: YOUR_COLLEGEDUNIA_API_KEY" \
  -d '{
    "name": "Aarav Sharma",
    "phone": "+919876543210",
    "email": "aarav@example.com",
    "state": "Maharashtra",
    "city": "Pune",
    "district": "Pune",
    "locality": "Pimpri",
    "pincode": "411018",
    "course": "Computer Engineering",
    "source": "Collegedunia",
    "medium": "Website Form",
    "campaign": "DVCOE June Admissions",
    "externalLeadId": "CD-LEAD-102938"
  }'
```

## Testing Notes

Before sending a lead, verify that the API is reachable:

```bash
curl "https://api.guruverse.co.in/integrations/partner/collegedunia/health"
```

Expected response:

```json
{
  "success": true,
  "status": "OK"
}
```

If Postman shows `Cloud Agent Error: Unable to reach the Cloud Agent`, the request was not sent to Guruverse. Use Postman's Desktop Agent, switch to a different Postman agent, or test from a terminal with `curl`.

On Windows PowerShell, prefer saving the JSON body to a file and sending it with `--data-binary` to avoid quote escaping issues:

```powershell
curl.exe -X POST "https://api.guruverse.co.in/integrations/partner/collegedunia/leads" `
  -H "Content-Type: application/json" `
  -H "X-Tenant-Slug: dvcoe" `
  -H "X-API-Key: YOUR_COLLEGEDUNIA_API_KEY" `
  --data-binary "@lead.json"
```

## Lead Processing Rules

```text
CRM source is auto-set as Collegedunia.
medium is stored if provided.
campaign is stored if provided.
Duplicate check is performed by phone first.
If phone is not duplicate, duplicate check is performed by email.
If duplicate is found, the API returns the existing leadId.
```

## Success Response

HTTP status:

```text
201 Created
```

Response:

```json
{
  "success": true,
  "data": {
    "leadId": 1234,
    "status": "CREATED",
    "source": "Collegedunia"
  }
}
```

## Duplicate Response

HTTP status:

```text
409 Conflict
```

Response:

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

Duplicate by email example:

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_LEAD",
    "message": "Lead already exists",
    "duplicateBy": "email",
    "leadId": 987
  }
}
```

## Validation Error Response

HTTP status:

```text
400 Bad Request
```

Response:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PAYLOAD",
    "message": "Invalid lead payload"
  }
}
```

## Authentication Error Response

HTTP status:

```text
401 Unauthorized
```

Response:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "Invalid API key"
  }
}
```

## Rate Limit Error Response

HTTP status:

```text
429 Too Many Requests
```

Response:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after a minute."
  }
}
```

## Health Check Endpoint

Method:

```http
GET
```

Endpoint:

```http
/integrations/partner/collegedunia/health
```

Full URL:

```text
https://api.guruverse.co.in/integrations/partner/collegedunia/health
```

Backward-compatible alias:

```http
GET /integrations/collegedunia/health
```

Response:

```json
{
  "success": true,
  "status": "OK"
}
```

## Course List For DVCOE

```text
Computer Engineering
AIML
Information Technology
Electronics and Telecommunication Engineering


If Collegedunia uses different course names, they can share their exact course labels and Guruverse team will map them with CRM course values.
```
