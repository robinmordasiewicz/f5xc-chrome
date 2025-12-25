# Workflows

Pre-built automation workflows for common F5 XC tasks.

## Available Workflows

{{ workflow_list() }}

## Workflow Categories

### Load Balancers

- **HTTP Load Balancer Create** - Basic HTTP LB setup
- **HTTP Load Balancer + WAF** - LB with WAF policy
- **HTTP Load Balancer + Bot Defense** - LB with bot protection
- **HTTP Load Balancer + API Protection** - LB with API security
- **HTTP Load Balancer + Rate Limiting** - LB with rate limits

### Origin Pools

- **Origin Pool Create Basic** - Simple origin pool
- **Origin Pool Failover** - Multi-origin with failover
- **Origin Pool Ring Hash** - Consistent hashing

### Security Policies

- **WAF Policy Create** - Basic WAF configuration
- **WAF Policy Exclusion** - WAF with exclusion rules
- **WAF Policy Monitor Tuning** - WAF tuning mode
- **Service Policy Create** - Service-level policies

### Cloud Sites

- **AWS Site Deploy** - AWS VPC site
- **Azure Site Deploy** - Azure VNET site
- **GCP Site Deploy** - GCP VPC site

### DNS

- **DNS Zone Create** - Primary DNS zone
- **DNS Load Balancer Failover** - DNS-based failover
- **DNS Load Balancer Geolocation** - Geo-aware DNS

### Administration

- **Admin Create Users** - User provisioning
- **Admin Manage API Tokens** - Token management
- **Admin Manage Credentials** - Credential management
- **Admin Manage Quotas** - Quota configuration

## Using Workflows

### Via Command

```bash
/xc:console create http-lb
```

### Via Natural Language

```bash
claude --chrome

"Create an HTTP load balancer named demo-lb with:
- Namespace: production
- Domain: demo.example.com
- Origin pool: backend-pool
- WAF: enabled"
```

## Creating New Workflows

1. Create workflow file in `skills/xc-console/workflows/`
2. Follow existing patterns (see `http-loadbalancer-create-basic.md`)
3. Test with `/xc:console create <type>`

See the [Workflow Patterns](../reference/api.md) documentation for details.
