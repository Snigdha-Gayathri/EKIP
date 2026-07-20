# api-gateway

> API Gateway Service — Request Routing, Rate Limiting, and Traffic Management

[![Version](https://img.shields.io/badge/version-4.0.2-blue)]()

## Overview

The `api-gateway` is the single entry point for all external API traffic to the AcmeAI platform. Built on Envoy proxy with custom Go middleware, it handles request routing, authentication delegation, rate limiting, request/response transformation, and API versioning.

**Owner:** Platform Team (Lead: James Liu)  
**Slack:** #api-gateway  
**Runbook:** [api-gateway-runbook.md](./api-gateway-runbook.md)

## Architecture

The gateway operates as a reverse proxy sitting behind AWS Application Load Balancers. It delegates authentication to [auth-service](./auth-service-readme.md) via gRPC and routes requests to downstream services based on path-based routing rules.

### Request Flow

1. Client → ALB → api-gateway (Envoy + Go sidecar)
2. Gateway extracts JWT, calls auth-service.ValidateToken()
3. Rate limiter checks request against configured limits
4. Request routed to target microservice via Istio service mesh
5. Response transformed and returned to client

### Rate Limiting

Rate limits are configured per-customer tier:

| Tier | Requests/min | Burst | Concurrent |
|------|-------------|-------|------------|
| Free | 60 | 10 | 5 |
| Professional | 600 | 100 | 50 |
| Enterprise | 6,000 | 1,000 | 500 |
| Internal | Unlimited | — | — |

Rate limit state is stored in Redis (shared cluster with auth-service).

## Configuration

Routing rules are defined in a YAML configuration managed by config-service:

```yaml
routes:
  - path: /v1/predict/*
    service: ml-inference-service
    timeout: 30s
    retry: 2
    circuit_breaker:
      threshold: 5
      timeout: 30s

  - path: /v1/users/*
    service: user-service
    timeout: 10s
    retry: 1

  - path: /v1/analytics/*
    service: analytics-service
    timeout: 15s
    retry: 1

  - path: /v2/auth/*
    service: auth-service
    timeout: 10s
    retry: 0
    skip_auth: true
```

## Deployment

| Environment | Replicas | Resources |
|-------------|----------|-----------|
| Production | 6 | 2000m CPU / 4Gi RAM |
| Staging | 3 | 1000m CPU / 2Gi RAM |
| Development | 2 | 500m CPU / 1Gi RAM |

The gateway is deployed as a Kubernetes Deployment with PodDisruptionBudget (minAvailable: 4 in production).

## Monitoring

- **Datadog Dashboard:** [API Gateway Overview](https://app.datadoghq.com/dashboard/acmeai-gateway)
- **Key Metrics:** `gateway_requests_total`, `gateway_latency_seconds`, `gateway_rate_limit_hits_total`
- **SLO:** 99.99% availability, p99 latency < 50ms (excluding downstream)

## Dependencies

| Service | Purpose |
|---------|---------|
| auth-service | Token validation |
| config-service | Routing configuration, feature flags |
| analytics-service | Request analytics/tracking |
| audit-service | API access logging |

## Recent Changes

- **v4.0.2** (2025-06-18) — Fixed WebSocket upgrade handling (BUG-4701)
- **v4.0.0** (2025-05-01) — Envoy upgrade to 1.29, new routing DSL
- **v3.9.0** (2025-03-01) — Added GraphQL support
- **v3.8.0** (2025-01-15) — Custom response transformation rules

## Contacts

| Role | Person |
|------|--------|
| Service Owner | James Liu |
| Platform Lead | James Liu |
| Security Review | Samantha Park |
| DevOps | Nikolai Petrov |

## Related Documents

- [Architecture Overview](./architecture-overview.md)
- [Auth Service README](./auth-service-readme.md)
- [AcmeAI Gateway User Guide](./acmeai-gateway-user-guide.md)
- [Rate Limiting Configuration](./rate-limiting-configuration.md)
- [API Versioning Strategy](./api-versioning-strategy.md)
