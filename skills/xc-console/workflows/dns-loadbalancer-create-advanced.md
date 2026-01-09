---
title: Workflow - Create DNS Load Balancer (Advanced Configuration)
description: Create a DNS load balancer with advanced features including weighted routing, TTL tuning, and custom health checks
version: 1.0.0
last_updated: 2026-01-08
category: DNS & Global Routing
complexity: Advanced
estimated_duration: 30-45 minutes
---

# Workflow: Create DNS Load Balancer (Advanced Configuration)

## Overview
Create a DNS load balancer with advanced configuration options including weighted traffic distribution, custom TTL settings, sophisticated health check integration, and multi-pool routing strategies. This workflow covers advanced use cases beyond basic failover and geolocation routing.

## Prerequisites
- ✅ DNS Zone created and delegated (domain nameservers pointing to Volterra)
- ✅ Multiple HTTP load balancers or endpoints deployed
- ✅ Understanding of DNS TTL implications
- ✅ Health check requirements defined
- ✅ Traffic distribution strategy determined

## Input Parameters

```json
{
  "name": "app.example.com",
  "namespace": "production",
  "record_name": "app",
  "domain": "example.com",
  "record_type": "A",
  "routing_strategy": "weighted",
  "ttl_config": {
    "default_ttl": 30,
    "health_check_ttl": 10,
    "failover_ttl": 5
  },
  "pools": [
    {
      "name": "primary-pool",
      "weight": 70,
      "endpoints": ["lb-us-east-1", "lb-us-east-2"],
      "health_check": {
        "protocol": "HTTPS",
        "path": "/health",
        "interval": 10,
        "timeout": 5,
        "healthy_threshold": 2,
        "unhealthy_threshold": 3
      }
    },
    {
      "name": "secondary-pool",
      "weight": 30,
      "endpoints": ["lb-eu-west-1"],
      "health_check": {
        "protocol": "HTTPS",
        "path": "/health",
        "interval": 15,
        "timeout": 5,
        "healthy_threshold": 2,
        "unhealthy_threshold": 3
      }
    }
  ],
  "advanced_settings": {
    "sticky_sessions": false,
    "edns_client_subnet": true,
    "response_policy": "round_robin_within_pool"
  }
}
```

## Step-by-Step Execution

### Step 1: Navigate to DNS Load Balancers Page

**Console Path**: Multi-Cloud Network Connect > DNS > Load Balancers

**Details**:
- Click "Multi-Cloud Network Connect" in left sidebar
- Click "DNS" submenu
- Click "Load Balancers"
- Should see list of existing DNS load balancers

**Verify**: DNS Load Balancers list page displayed

---

### Step 2: Click Add DNS Load Balancer Button

**Details**:
- Click "Add DNS Load Balancer" button
- Should open DNS LB creation form
- Form has metadata, routing, and pool configuration sections

**Verify**: Blank DNS LB creation form displayed

---

### Step 3: Fill Metadata Section

**Details**:

1. **Name**: Enter `app.example.com`
   - Unique identifier for the DNS LB

2. **Namespace**: Select `production`
   - Must match DNS zone namespace

3. **Labels** (optional): Add organizational labels
   - e.g., `env: production`, `team: platform`

4. **Description**: Enter descriptive text
   - e.g., "Primary application DNS with weighted routing"

**Verify**:
- Name field shows `app.example.com`
- Namespace shows `production`

---

### Step 4: Configure DNS Record Settings

**Details**:

1. **Record Name**: Enter `app`
   - Will create `app.example.com`

2. **Domain/Zone**: Select `example.com`
   - From dropdown of available DNS zones

3. **Record Type**: Select `A` (or `AAAA` for IPv6)
   - A for IPv4 addresses
   - AAAA for IPv6 addresses
   - CNAME for alias records

**Verify**:
- Record name: `app`
- Domain: `example.com`
- Full FQDN preview: `app.example.com`

---

### Step 5: Configure Advanced TTL Settings

**Details**:

1. **Default TTL**: Enter `30` seconds
   - Lower TTL = faster failover, more DNS queries
   - Higher TTL = better caching, slower failover
   - Recommended: 30-60 seconds for production

2. **Health Check TTL** (if available): Enter `10` seconds
   - TTL used when health status changes
   - Should be lower than default for faster propagation

3. **Minimum TTL**: Enter `5` seconds
   - Minimum TTL during failover events
   - Allows rapid traffic shift during incidents

**Best Practices**:
- Production: 30-60 seconds (balance between caching and failover)
- High availability: 10-30 seconds (faster failover)
- Development: 60-300 seconds (reduce DNS queries)

**Verify**:
- Default TTL: 30
- Settings align with failover requirements

---

### Step 6: Select Routing Strategy

**Details**:

1. **Routing Policy**: Select `Weighted`
   - Options:
     - **Round Robin**: Equal distribution across pools
     - **Weighted**: Percentage-based distribution
     - **Geolocation**: Route by client location
     - **Latency-Based**: Route to lowest latency endpoint
     - **Failover**: Active-passive configuration

2. For Weighted routing:
   - Traffic distributed based on pool weights
   - Total weights don't need to equal 100 (relative)
   - Example: 70/30 split between primary and secondary

**Verify**: Weighted routing policy selected

---

### Step 7: Configure Primary Pool

**Details**:

1. Click "Add Pool" or expand pool configuration
2. **Pool Name**: Enter `primary-pool`
3. **Weight**: Enter `70` (receives 70% of traffic)
4. **Pool Type**: Select endpoint type
   - HTTP Load Balancer
   - IP Address
   - Virtual Host

5. **Add Endpoints**:
   - Click "Add Endpoint"
   - Select `lb-us-east-1`
   - Click "Add Endpoint" again
   - Select `lb-us-east-2`

6. **Response Policy within Pool**: Select `Round Robin`
   - How to distribute among endpoints in this pool

**Verify**:
- Pool name: `primary-pool`
- Weight: 70
- Endpoints: `lb-us-east-1`, `lb-us-east-2`

---

### Step 8: Configure Primary Pool Health Check

**Details**:

1. **Enable Health Check**: Toggle ON
2. **Health Check Protocol**: Select `HTTPS`
   - HTTP, HTTPS, or TCP
3. **Health Check Path**: Enter `/health`
   - Endpoint that returns 200 when healthy
4. **Interval**: Enter `10` seconds
   - Time between health checks
5. **Timeout**: Enter `5` seconds
   - Max wait time for response
6. **Healthy Threshold**: Enter `2`
   - Consecutive successes to mark healthy
7. **Unhealthy Threshold**: Enter `3`
   - Consecutive failures to mark unhealthy

**Verify**:
- Health check enabled
- Protocol: HTTPS
- Path: /health
- Interval: 10s, Timeout: 5s

---

### Step 9: Configure Secondary Pool

**Details**:

1. Click "Add Pool" to create secondary pool
2. **Pool Name**: Enter `secondary-pool`
3. **Weight**: Enter `30` (receives 30% of traffic)

4. **Add Endpoints**:
   - Click "Add Endpoint"
   - Select `lb-eu-west-1`

5. **Configure Health Check**:
   - Protocol: HTTPS
   - Path: /health
   - Interval: 15 seconds (can be longer for secondary)
   - Timeout: 5 seconds
   - Healthy/Unhealthy thresholds: 2/3

**Verify**:
- Pool name: `secondary-pool`
- Weight: 30
- Endpoint: `lb-eu-west-1`

---

### Step 10: Configure Advanced Settings

**Details**:

1. **EDNS Client Subnet** (if available):
   - Toggle ON for geolocation-aware responses
   - Passes client subnet info to improve routing accuracy

2. **Sticky Sessions** (if available):
   - Toggle OFF for stateless applications
   - Toggle ON if clients need consistent endpoint

3. **Response Policy**:
   - How to select endpoint within a pool
   - Round Robin, Random, or First Available

4. **DNS SEC** (if required):
   - Enable for additional security
   - Requires zone-level DNSSEC configuration

**Verify**: Advanced settings configured as needed

---

### Step 11: Review and Submit

**Details**:
1. Review all configuration sections
2. Verify:
   - Record name and domain are correct
   - Pool weights sum to desired distribution
   - Health checks are properly configured
   - TTL settings align with requirements

3. Click "Save and Exit" or "Create"

**Expected**: DNS LB creation initiated

---

### Step 12: Verify Creation

**Details**:
1. Wait for DNS LB to appear in list (may take 30-60 seconds)
2. Click on DNS LB name to view details
3. Verify:
   - Status: ACTIVE
   - Pools configured correctly
   - Health checks running

**Verify**:
- DNS LB appears in list ✓
- Status shows ACTIVE ✓
- Pool health shows healthy endpoints ✓

---

## Validation with CLI

**Command**: Verify DNS LB creation

```bash
# List DNS load balancers
xcsh dns list load_balancers -n production

# Get specific DNS LB details
xcsh dns get load_balancer app.example.com -n production

# Check health status
xcsh dns health load_balancer app.example.com -n production

# Expected output includes:
# - Name: app.example.com
# - Routing: weighted
# - Pools: primary-pool (70%), secondary-pool (30%)
# - Health: all endpoints healthy
```

---

## Testing DNS Resolution

### Test 1: Verify DNS Resolution

```bash
# Query DNS record
dig app.example.com +short

# Expected: IP addresses from healthy endpoints
# Note: May return different IPs based on weight distribution
```

### Test 2: Verify Weight Distribution

```bash
# Run multiple queries to verify distribution
for i in {1..100}; do dig app.example.com +short; done | sort | uniq -c

# Expected: ~70% queries return primary pool IPs
# ~30% queries return secondary pool IPs
```

### Test 3: Verify Health Check Failover

```bash
# Temporarily disable primary endpoint
# Then query DNS
dig app.example.com +short

# Expected: Only secondary pool IPs returned
# TTL should be reduced during failover
```

---

## Success Criteria

- [x] DNS LB appears in console list
- [x] Status shows ACTIVE
- [x] All pools configured with correct weights
- [x] Health checks running and endpoints healthy
- [x] DNS queries return expected IPs
- [x] Weight distribution matches configuration
- [x] TTL values correct in DNS responses

---

## Advanced Configuration Options

### TTL Optimization Strategies

| Use Case | Default TTL | Health TTL | Notes |
|----------|-------------|------------|-------|
| High Availability | 30s | 10s | Fast failover, more queries |
| Standard Production | 60s | 30s | Balanced approach |
| Cost Optimization | 300s | 60s | Fewer queries, slower failover |
| Development/Testing | 300s | 300s | Maximize caching |

### Weight Distribution Examples

| Scenario | Primary | Secondary | Use Case |
|----------|---------|-----------|----------|
| Blue-Green | 100/0 or 0/100 | - | Deployment switching |
| Canary | 95/5 | - | Testing new version |
| Load Balancing | 70/30 | - | Cross-region distribution |
| Active-Active | 50/50 | - | Equal distribution |

### Health Check Tuning

| Setting | Aggressive | Moderate | Conservative |
|---------|------------|----------|--------------|
| Interval | 5s | 10s | 30s |
| Timeout | 2s | 5s | 10s |
| Unhealthy Threshold | 2 | 3 | 5 |
| Healthy Threshold | 1 | 2 | 3 |

---

## Common Issues & Troubleshooting

### Issue: DNS Not Resolving

**Symptoms**:
- dig returns NXDOMAIN or no answer
- Application cannot reach service

**Solutions**:
1. Verify DNS zone is delegated (nameservers updated at registrar)
2. Check DNS LB status is ACTIVE
3. Verify at least one pool has healthy endpoints
4. Check DNS propagation (can take up to 48 hours for zone changes)

```bash
# Check nameserver delegation
dig NS example.com +short

# Should return Volterra nameservers
```

---

### Issue: Incorrect Weight Distribution

**Symptoms**:
- Traffic not distributed according to weights
- One pool receiving all traffic

**Solutions**:
1. Verify all pools have healthy endpoints
2. Unhealthy pools receive 0% traffic
3. Check client-side DNS caching
4. Use lower TTL for testing
5. Run multiple queries to see distribution

---

### Issue: Slow Failover

**Symptoms**:
- Long time to shift traffic during failures
- Users experience downtime during failover

**Solutions**:
1. Lower default TTL (30s or less)
2. Lower health check interval (5-10s)
3. Reduce unhealthy threshold (2)
4. Configure health check TTL if available
5. Test failover behavior regularly

---

### Issue: Health Checks Failing

**Symptoms**:
- Endpoints showing unhealthy
- Traffic not reaching pools

**Solutions**:
1. Verify health check path returns 200
2. Check firewall allows health check traffic
3. Verify protocol matches endpoint (HTTP vs HTTPS)
4. Check health check timeout vs endpoint response time
5. Review health check logs in Security > Events

---

## Best Practices

### 1. TTL Configuration
- Use lower TTLs (30-60s) for production services requiring fast failover
- Use higher TTLs (300s+) for stable services to reduce DNS query costs
- Always configure health check TTL lower than default TTL

### 2. Health Checks
- Use dedicated health check endpoints (e.g., /health)
- Health endpoint should verify backend dependencies
- Set timeout lower than interval
- Use unhealthy threshold of 2-3 for balance

### 3. Weight Distribution
- Start with conservative weights for new endpoints (e.g., 5%)
- Gradually increase weight as confidence grows
- Use 0% weight to drain traffic before maintenance

### 4. Monitoring
- Set up alerts for pool health status changes
- Monitor DNS query patterns
- Track failover events
- Review health check success rates

### 5. Testing
- Test failover behavior before production
- Verify weight distribution with multiple queries
- Document expected behavior for incident response

---

## Next Steps

After creating advanced DNS LB:

1. **Monitor Health**: Use Security > Events to track health check results
2. **Verify Distribution**: Test weight distribution with multiple queries
3. **Test Failover**: Simulate endpoint failure to verify failover behavior
4. **Set Up Alerts**: Configure alerts for pool health status changes
5. **Document**: Record configuration for team reference

---

## Related Documentation

- **DNS Load Balancers**: https://docs.cloud.f5.com/docs-v2/how-to/dns/dns-load-balancer
- **Health Checks**: https://docs.cloud.f5.com/docs-v2/how-to/dns/dns-health-checks
- **TTL Configuration**: https://docs.cloud.f5.com/docs-v2/reference/dns-ttl-settings
- **Weighted Routing**: https://docs.cloud.f5.com/docs-v2/how-to/dns/weighted-routing
- **DNS Troubleshooting**: https://docs.cloud.f5.com/docs-v2/troubleshooting/dns

---

## Rollback

To remove DNS LB:

1. Navigate to DNS Load Balancers list
2. Click on LB name
3. Click "Delete"
4. Confirm deletion
5. DNS record removed (propagation time applies)

**Note**: DNS changes may take time to propagate. Plan for TTL expiry period.

---

**Workflow Version**: 1.0.0
**Status**: Ready for production use
**Last Tested**: 2026-01-08
