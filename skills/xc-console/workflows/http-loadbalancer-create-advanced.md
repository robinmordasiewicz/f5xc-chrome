---
title: Workflow - Create HTTP Load Balancer (Advanced Configuration)
description: Create an HTTP load balancer with advanced features including custom routes, header manipulation, retries, and timeouts
version: 1.0.0
last_updated: 2026-01-08
category: Load Balancing
complexity: Advanced
estimated_duration: 30-45 minutes
---

# Workflow: Create HTTP Load Balancer (Advanced Configuration)

## Overview
Create an HTTP load balancer with advanced configuration options including custom routing rules, header manipulation, retry policies, timeout settings, and request/response transformations. This workflow covers advanced use cases beyond basic load balancing.

## Prerequisites
- ✅ Namespace exists
- ✅ Origin pool(s) configured with healthy backend servers
- ✅ Understanding of routing requirements (path-based, header-based)
- ✅ Domain name ready to use
- ✅ (Optional) TLS certificate for custom HTTPS configuration

## Input Parameters

```json
{
  "name": "api-gateway-lb",
  "namespace": "production",
  "domain": "api.example.com",
  "listen_port": 443,
  "protocol": "https_auto_cert",
  "routes": [
    {
      "path_prefix": "/v1/users",
      "origin_pool": "users-service-pool",
      "timeout": 30,
      "retries": 3
    },
    {
      "path_prefix": "/v1/orders",
      "origin_pool": "orders-service-pool",
      "timeout": 60,
      "retries": 2
    },
    {
      "path_prefix": "/",
      "origin_pool": "default-pool",
      "timeout": 30,
      "retries": 2
    }
  ],
  "header_manipulation": {
    "request_headers": {
      "add": {"X-Forwarded-Proto": "https"},
      "remove": ["X-Debug-Header"]
    },
    "response_headers": {
      "add": {"X-Content-Type-Options": "nosniff"},
      "remove": []
    }
  },
  "advanced_settings": {
    "connection_timeout": 10,
    "idle_timeout": 120,
    "max_request_body_size": "10MB",
    "enable_http2": true,
    "enable_websockets": true
  }
}
```

## Step-by-Step Execution

### Step 1: Navigate to HTTP Load Balancers Page

**Console Path**: Web App & API Protection > Manage > HTTP Load Balancers

**Details**:
- Click "Web App & API Protection" in left sidebar
- Click "Manage" submenu
- Click "HTTP Load Balancers"
- Should see list of existing HTTP LBs

**Verify**: HTTP Load Balancers list page displayed

---

### Step 2: Click Add HTTP Load Balancer Button

**Details**:
- Click "Add HTTP Load Balancer" button
- Should open HTTP LB creation form
- Form has multiple sections/tabs

**Verify**: Blank HTTP LB creation form displayed

---

### Step 3: Fill Metadata Section

**Details**:

1. **Name**: Enter `api-gateway-lb`
   - Lowercase alphanumeric + dashes only
   - Must be unique in namespace

2. **Namespace**: Select `production`
   - Determines resource isolation

3. **Labels** (optional): Add organizational labels
   - e.g., `team: platform`, `env: production`

4. **Description**: Enter descriptive text
   - e.g., "API Gateway with path-based routing"

**Verify**:
- Name: `api-gateway-lb`
- Namespace: `production`

---

### Step 4: Configure Domain and Protocol

**Details**:

1. **Domain**: Enter `api.example.com`
   - Domain where LB will accept traffic

2. **HTTP Listen Port**: Leave as `80` (default)
   - For HTTP traffic

3. **HTTPS Listen Port**: Enter `443`
   - For HTTPS traffic

4. **Protocol Configuration**:
   - **HTTPS with Auto Certificate**: Automatic Let's Encrypt cert
   - **HTTPS with Custom Certificate**: Upload your own cert
   - **HTTP Only**: No TLS (not recommended for production)

5. **TLS Settings** (if custom cert):
   - Select TLS version (TLS 1.2+)
   - Select cipher suites

**Verify**:
- Domain: `api.example.com`
- Port: 443
- Protocol: HTTPS enabled

---

### Step 5: Configure Custom Routes

**Details**:

1. **Routes Configuration**: Look for "Routes" or "Routing Rules" section
2. Click "Add Route" to create first route

**Route 1: Users Service**

1. **Match Criteria**:
   - Type: Path Prefix
   - Value: `/v1/users`

2. **Origin Pool**: Select `users-service-pool`

3. **Route Priority**: Enter `10`
   - Lower numbers = higher priority
   - Specific routes should have higher priority

4. **Route Name** (optional): `users-route`

---

**Route 2: Orders Service**

1. Click "Add Route"

2. **Match Criteria**:
   - Type: Path Prefix
   - Value: `/v1/orders`

3. **Origin Pool**: Select `orders-service-pool`

4. **Route Priority**: Enter `20`

5. **Route Name**: `orders-route`

---

**Route 3: Default Route**

1. Click "Add Route"

2. **Match Criteria**:
   - Type: Path Prefix
   - Value: `/`

3. **Origin Pool**: Select `default-pool`

4. **Route Priority**: Enter `100`
   - Lowest priority (catch-all)

5. **Route Name**: `default-route`

**Verify**:
- 3 routes configured
- Priority order: users (10) > orders (20) > default (100)

---

### Step 6: Configure Header-Based Routing (Optional)

**Details**:

If routing based on headers (e.g., API versioning):

1. Click "Add Route" or edit existing route
2. **Match Criteria**: Click "Add Condition"
3. **Condition Type**: Header
4. **Header Name**: Enter `X-API-Version`
5. **Match Type**: Exact Match
6. **Value**: Enter `v2`
7. **Origin Pool**: Select appropriate pool

**Example**: Route requests with `X-API-Version: v2` header to v2 backend

**Verify**: Header-based routing configured if needed

---

### Step 7: Configure Timeouts Per Route

**Details**:

For each route, configure timeouts:

1. Expand route configuration or click "Advanced Settings"

2. **Request Timeout**:
   - Users route: `30` seconds
   - Orders route: `60` seconds (longer for complex operations)
   - Default: `30` seconds

3. **Idle Timeout**:
   - Time to wait for subsequent requests on keep-alive connection
   - Default: `120` seconds

**Best Practices**:
- Set higher timeouts for long-running operations
- Set lower timeouts for quick API calls
- Always set timeout < infrastructure timeout

**Verify**: Timeouts configured per route

---

### Step 8: Configure Retry Policy

**Details**:

1. Expand route or find "Retry Policy" section

2. **Enable Retries**: Toggle ON

3. **Retry Count**:
   - Users route: `3`
   - Orders route: `2`
   - Default: `2`

4. **Retry Conditions** (what triggers retry):
   - 5xx errors
   - Connection errors
   - Reset connections
   - (NOT 4xx - client errors shouldn't retry)

5. **Retry Timeout**: Time to wait between retries
   - e.g., `1000` ms

6. **Idempotent Retries Only** (recommended):
   - Only retry GET, HEAD, OPTIONS
   - Avoid retrying POST/PUT that might duplicate actions

**Verify**: Retry policy configured per route

---

### Step 9: Configure Request Header Manipulation

**Details**:

1. Find "Request Headers" or "Header Manipulation" section

2. **Add Headers** (to requests going to origin):
   - Click "Add Header"
   - Name: `X-Forwarded-Proto`
   - Value: `https`
   - Purpose: Tell backend the original protocol

   - Add another:
   - Name: `X-Request-ID`
   - Value: `${request_id}` (if variable substitution supported)

3. **Remove Headers** (from requests to origin):
   - Click "Remove Header"
   - Name: `X-Debug-Header`
   - Purpose: Remove debug headers before reaching backend

4. **Overwrite Headers** (if exists, replace):
   - Name: `Host`
   - Value: `backend.internal`

**Verify**: Request header manipulation configured

---

### Step 10: Configure Response Header Manipulation

**Details**:

1. Find "Response Headers" section

2. **Add Headers** (to responses going to client):
   - Name: `X-Content-Type-Options`
   - Value: `nosniff`

   - Name: `X-Frame-Options`
   - Value: `DENY`

   - Name: `Strict-Transport-Security`
   - Value: `max-age=31536000; includeSubDomains`

3. **Remove Headers** (from responses):
   - Name: `Server` (hide backend server info)
   - Name: `X-Powered-By`

**Verify**: Response header manipulation configured

---

### Step 11: Configure Advanced Connection Settings

**Details**:

1. Find "Advanced Settings" or "Connection" section

2. **Connection Timeout**: `10` seconds
   - Time to establish connection to origin

3. **Idle Timeout**: `120` seconds
   - Keep-alive connection idle time

4. **Max Request Body Size**: `10MB`
   - Limit on request body size
   - Important for file uploads

5. **HTTP/2**: Enable
   - Better performance for multiple requests
   - Requires HTTPS

6. **WebSocket Support**: Enable (if needed)
   - For real-time applications

7. **Buffer Request/Response**: Configure based on needs
   - Buffer for transformation
   - Stream for large responses

**Verify**: Advanced connection settings configured

---

### Step 12: Configure CORS (If Needed)

**Details**:

1. Find "CORS" or "Cross-Origin" section

2. **Enable CORS**: Toggle ON

3. **Allowed Origins**:
   - `https://app.example.com`
   - `https://admin.example.com`
   - Use `*` for all (not recommended for production)

4. **Allowed Methods**:
   - GET, POST, PUT, DELETE, OPTIONS

5. **Allowed Headers**:
   - `Content-Type`
   - `Authorization`
   - `X-Requested-With`

6. **Expose Headers**:
   - `X-Request-ID`

7. **Max Age**: `86400` (preflight cache time)

8. **Allow Credentials**: Enable if needed

**Verify**: CORS configured if needed

---

### Step 13: Review and Submit

**Details**:
1. Review all configuration sections
2. Verify:
   - Domain and ports correct
   - Routes prioritized correctly
   - Timeouts appropriate for each service
   - Header manipulation configured
   - Security headers added

3. Click "Save and Exit" or "Create"

**Expected**: HTTP LB creation initiated

---

### Step 14: Verify Creation

**Details**:
1. Wait for HTTP LB to appear in list
2. Click on LB name to view details
3. Verify:
   - Status: ACTIVE
   - Routes configured correctly
   - Origin pools connected
   - Health checks passing

**Verify**:
- HTTP LB appears in list ✓
- Status shows ACTIVE ✓
- All routes visible ✓

---

## Validation with CLI

**Command**: Verify HTTP LB creation

```bash
# List HTTP load balancers
xcsh load_balancer list http_loadbalancer -n production

# Get specific HTTP LB details
xcsh load_balancer get http_loadbalancer api-gateway-lb -n production

# Check route configuration
xcsh load_balancer routes api-gateway-lb -n production

# Expected output includes:
# - Name: api-gateway-lb
# - Domain: api.example.com
# - Routes: users-route, orders-route, default-route
# - Status: ACTIVE
```

---

## Testing the Configuration

### Test 1: Route-Based Routing

```bash
# Test users route
curl -v https://api.example.com/v1/users

# Expected: Routed to users-service-pool

# Test orders route
curl -v https://api.example.com/v1/orders

# Expected: Routed to orders-service-pool

# Test default route
curl -v https://api.example.com/other

# Expected: Routed to default-pool
```

### Test 2: Header Manipulation

```bash
# Check response headers
curl -I https://api.example.com/v1/users

# Expected headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Strict-Transport-Security: max-age=31536000...

# Server and X-Powered-By should be absent
```

### Test 3: Timeout Behavior

```bash
# Test with slow endpoint (if available)
time curl https://api.example.com/v1/orders/slow-operation

# Should timeout after configured timeout (60s for orders route)
```

### Test 4: Retry Behavior

```bash
# If origin has intermittent failures, verify retries
# Check origin access logs for multiple requests per client request
```

---

## Success Criteria

- [x] HTTP LB appears in console list
- [x] Status shows ACTIVE
- [x] All routes configured with correct priority
- [x] Requests route to correct origin pools
- [x] Timeouts and retries working as configured
- [x] Header manipulation applied correctly
- [x] Security headers present in responses
- [x] CORS working (if configured)

---

## Advanced Configuration Reference

### Route Matching Order

Routes are evaluated in order:
1. Exact path match (highest priority)
2. Path prefix match (by length, longest first)
3. Regex match (by priority number)
4. Default route (lowest priority)

### Timeout Recommendations

| Service Type | Request Timeout | Idle Timeout |
|--------------|-----------------|--------------|
| API Calls | 10-30s | 60-120s |
| File Upload | 120-300s | 300s |
| WebSocket | N/A | 3600s+ |
| Streaming | 0 (disable) | Based on stream |

### Retry Best Practices

| Method | Should Retry | Reason |
|--------|--------------|--------|
| GET | Yes | Idempotent |
| HEAD | Yes | Idempotent |
| OPTIONS | Yes | Idempotent |
| PUT | Conditional | Idempotent if properly implemented |
| POST | No | Not idempotent (duplicates) |
| DELETE | Conditional | Check if idempotent |

### Security Header Reference

| Header | Value | Purpose |
|--------|-------|---------|
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-Frame-Options | DENY | Prevent clickjacking |
| X-XSS-Protection | 1; mode=block | XSS protection |
| Strict-Transport-Security | max-age=31536000 | Force HTTPS |
| Content-Security-Policy | default-src 'self' | XSS protection |

---

## Common Issues & Troubleshooting

### Issue: Routes Not Matching Correctly

**Symptoms**:
- Requests going to wrong origin pool
- Default route catching everything

**Solutions**:
1. Check route priorities (lower = higher priority)
2. Verify path prefix matches exactly
3. Ensure specific routes have higher priority than general ones
4. Check for trailing slashes (may affect matching)
5. Review route configuration in LB details

---

### Issue: Timeout Errors

**Symptoms**:
- 504 Gateway Timeout errors
- Requests timing out before completion

**Solutions**:
1. Increase request timeout for affected routes
2. Check origin server response times
3. Verify connection timeout is not too low
4. Check backend health and capacity
5. Monitor origin pool health status

---

### Issue: Headers Not Applied

**Symptoms**:
- Expected headers missing in requests/responses
- Security headers not present

**Solutions**:
1. Verify header manipulation configuration saved
2. Check header name spelling (case-sensitive)
3. Ensure headers not being stripped by other middleware
4. Test with curl -v to see all headers
5. Check if headers are being overwritten

---

### Issue: Retries Causing Duplicates

**Symptoms**:
- POST requests creating duplicate records
- Multiple charges for single payment

**Solutions**:
1. Disable retries for non-idempotent methods (POST)
2. Configure retry only on 5xx errors
3. Implement idempotency keys in application
4. Use idempotent-only retry policy

---

### Issue: CORS Errors

**Symptoms**:
- "Access-Control-Allow-Origin" errors in browser
- Preflight requests failing

**Solutions**:
1. Verify allowed origins include requesting domain
2. Check allowed methods include required methods
3. Ensure OPTIONS method is allowed
4. Verify allowed headers include custom headers
5. Check max-age for preflight caching

---

## Best Practices

### 1. Route Design
- Put most specific routes first (highest priority)
- Use path prefixes over regex when possible
- Always have a default catch-all route
- Document route structure for team

### 2. Timeout Configuration
- Match timeouts to expected operation duration
- Set connection timeout lower than request timeout
- Account for network latency in timeouts
- Monitor timeout errors and adjust

### 3. Retry Strategy
- Only retry idempotent operations
- Set reasonable retry counts (2-3)
- Use exponential backoff if available
- Monitor retry rates for origin issues

### 4. Security Headers
- Always add security headers for production
- Use HSTS for HTTPS enforcement
- Remove server identification headers
- Configure CSP for XSS protection

### 5. Monitoring
- Monitor route latencies separately
- Track error rates by route
- Alert on increased timeout rates
- Review retry rates for backend issues

---

## Next Steps

After creating advanced HTTP LB:

1. **Test Routes**: Verify each route reaches correct backend
2. **Validate Headers**: Check headers in requests/responses
3. **Monitor Performance**: Watch latencies and error rates
4. **Add Security**: Attach WAF policy for protection
5. **Configure Alerts**: Set up alerts for errors and latency

---

## Related Documentation

- **HTTP Load Balancers**: https://docs.cloud.f5.com/docs-v2/how-to/load-balancer/http-load-balancer
- **Route Configuration**: https://docs.cloud.f5.com/docs-v2/how-to/load-balancer/routes
- **Header Manipulation**: https://docs.cloud.f5.com/docs-v2/how-to/load-balancer/header-manipulation
- **Retry Policies**: https://docs.cloud.f5.com/docs-v2/reference/retry-policies
- **Timeout Configuration**: https://docs.cloud.f5.com/docs-v2/reference/timeout-settings

---

## Rollback

To remove HTTP LB:

1. Navigate to HTTP Load Balancers list
2. Click on LB name
3. Click "Delete"
4. Confirm deletion
5. DNS records need separate removal

**Note**: Ensure DNS records are updated before deletion to avoid service disruption.

---

**Workflow Version**: 1.0.0
**Status**: Ready for production use
**Last Tested**: 2026-01-08
