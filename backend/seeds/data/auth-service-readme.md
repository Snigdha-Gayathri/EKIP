# auth-service

> Authentication & Authorization Service for AcmeAI Platform

[![Build Status](https://github.com/acmeai/auth-service/actions/workflows/ci.yml/badge.svg)](https://github.com/acmeai/auth-service)
[![Coverage](https://img.shields.io/badge/coverage-94%25-brightgreen)]()
[![Version](https://img.shields.io/badge/version-2.3.1-blue)]()

## Overview

The `auth-service` is the central authentication and authorization microservice for all AcmeAI products (Studio, Gateway, Analytics). It handles OAuth2 flows, SAML SSO integration, JWT token management, API key provisioning, and role-based access control (RBAC).

**Owner:** Backend Team (Lead: Aisha Johnson)  
**On-call rotation:** [PagerDuty Schedule](https://acmeai.pagerduty.com/schedules/auth-oncall)  
**Slack:** #auth-service  
**Runbook:** [auth-service-runbook.md](./auth-service-runbook.md)

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  API Gateway │────▶│ auth-service │────▶│  PostgreSQL 15  │
│  (Envoy)     │     │  (Go 1.22)   │     │  (auth_db)      │
└─────────────┘     └──────┬───────┘     └─────────────────┘
                           │
                    ┌──────┴───────┐
                    │   Redis 7    │
                    │ (session     │
                    │  cache)      │
                    └──────────────┘
```

The service is written in **Go 1.22** and runs as a Kubernetes deployment in the `acmeai-platform` namespace. It exposes both gRPC (port 9090) and REST (port 8080) interfaces.

### Dependencies

| Service | Purpose | Protocol |
|---------|---------|----------|
| [user-service](./user-service-readme.md) | User profile resolution | gRPC |
| [audit-service](./audit-service-readme.md) | Login event logging | Kafka |
| [notification-service](./notification-service-readme.md) | 2FA codes, password reset emails | gRPC |
| [config-service](./config-service-readme.md) | Feature flags (SSO toggle, MFA enforcement) | REST |

### Database Schema

Primary database: `auth_db` on PostgreSQL 15 (AWS RDS).

Key tables:
- `users_credentials` — hashed passwords, salt, last rotation
- `oauth_clients` — registered OAuth2 client applications
- `oauth_tokens` — access/refresh token records
- `api_keys` — API key hashes and scopes
- `sessions` — active sessions (also cached in Redis)
- `saml_providers` — SSO IdP configurations
- `rbac_roles` — role definitions
- `rbac_permissions` — permission grants

See [database-schema-auth-service.md](./database-schema-auth-service.md) for the full schema with column definitions.

## API Reference

### REST Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/v2/auth/login` | Username/password login | None |
| POST | `/v2/auth/oauth/authorize` | OAuth2 authorization | None |
| POST | `/v2/auth/oauth/token` | Exchange code for token | Client Credentials |
| POST | `/v2/auth/token/refresh` | Refresh access token | Refresh Token |
| DELETE | `/v2/auth/logout` | Invalidate session | Bearer Token |
| GET | `/v2/auth/me` | Current user info | Bearer Token |
| POST | `/v2/auth/api-keys` | Create API key | Bearer Token + Admin |
| DELETE | `/v2/auth/api-keys/{id}` | Revoke API key | Bearer Token + Admin |
| GET | `/v2/auth/saml/metadata` | SAML SP metadata | None |
| POST | `/v2/auth/saml/acs` | SAML ACS endpoint | SAML Assertion |
| POST | `/v2/auth/mfa/setup` | Initialize MFA | Bearer Token |
| POST | `/v2/auth/mfa/verify` | Verify MFA code | Bearer Token |

Full API documentation: [api-docs-auth-service.md](./api-docs-auth-service.md)

### gRPC Services

```protobuf
service AuthService {
  rpc ValidateToken(ValidateTokenRequest) returns (ValidateTokenResponse);
  rpc GetUserPermissions(GetPermissionsRequest) returns (PermissionsResponse);
  rpc CreateServiceToken(ServiceTokenRequest) returns (ServiceTokenResponse);
  rpc RevokeToken(RevokeTokenRequest) returns (RevokeTokenResponse);
}
```

## Configuration

Environment variables:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AUTH_DB_HOST` | PostgreSQL host | `localhost` | Yes |
| `AUTH_DB_PORT` | PostgreSQL port | `5432` | No |
| `AUTH_DB_NAME` | Database name | `auth_db` | Yes |
| `AUTH_DB_USER` | Database user | — | Yes |
| `AUTH_DB_PASSWORD` | Database password (use Vault) | — | Yes |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` | Yes |
| `JWT_SECRET_KEY` | JWT signing key (from Vault) | — | Yes |
| `JWT_EXPIRY_MINUTES` | Token TTL | `60` | No |
| `REFRESH_TOKEN_EXPIRY_DAYS` | Refresh token TTL | `30` | No |
| `SAML_CERT_PATH` | Path to SAML certificate | `/etc/certs/saml.pem` | No |
| `MFA_ISSUER` | MFA TOTP issuer name | `AcmeAI` | No |
| `KAFKA_BROKERS` | Kafka broker list | — | Yes |
| `USER_SERVICE_URL` | user-service gRPC endpoint | — | Yes |

Secrets are managed via **HashiCorp Vault** (path: `secret/acmeai/auth-service`). See [vault-secrets-management.md](./vault-secrets-management.md).

## Local Development

### Prerequisites

- Go 1.22+
- Docker & Docker Compose
- PostgreSQL 15 (or use Docker)
- Redis 7 (or use Docker)

### Setup

```bash
# Clone the repository
git clone git@github.com:acmeai/auth-service.git
cd auth-service

# Start dependencies
docker-compose up -d postgres redis

# Run database migrations
make migrate-up

# Run the service
make run

# Run tests
make test

# Run linter
make lint
```

### Docker Compose

```yaml
version: '3.8'
services:
  auth-service:
    build: .
    ports:
      - "8080:8080"
      - "9090:9090"
    environment:
      - AUTH_DB_HOST=postgres
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: auth_db
      POSTGRES_USER: auth_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

## Deployment

The service is deployed via **ArgoCD** to three environments:

| Environment | Namespace | Replicas | CPU/Mem |
|-------------|-----------|----------|---------|
| Development | `acmeai-dev` | 2 | 250m / 512Mi |
| Staging | `acmeai-staging` | 3 | 500m / 1Gi |
| Production | `acmeai-prod` | 5 | 1000m / 2Gi |

Helm chart: `charts/auth-service` (see [kubernetes-deployment-guide.md](./kubernetes-deployment-guide.md))

### Health Checks

- Liveness: `GET /healthz` (checks process is alive)
- Readiness: `GET /readyz` (checks DB + Redis connectivity)

## Monitoring

- **Datadog Dashboard:** [Auth Service Overview](https://app.datadoghq.com/dashboard/acmeai-auth)
- **Grafana:** [Auth Metrics](https://grafana.acmeai.internal/d/auth-service)
- **PagerDuty:** Alerts for p99 latency > 200ms, error rate > 1%, failed login spike

Key metrics (exposed via `/metrics` Prometheus endpoint):
- `auth_login_total` — login attempts (success/failure)
- `auth_token_issued_total` — tokens issued
- `auth_token_validation_duration_seconds` — token validation latency
- `auth_active_sessions` — gauge of active sessions
- `auth_mfa_verification_total` — MFA verification attempts

## Troubleshooting

Common issues and resolutions:

1. **Token validation failures after deployment** — Redis cache may be stale. Flush the `auth:tokens:*` keys.
2. **SAML SSO login loop** — Check certificate expiry. Certs auto-rotate but notify the Security Team (Samantha Park) if expired.
3. **High latency on `/v2/auth/login`** — Check PostgreSQL connection pool. Default is 25 connections; increase if needed.
4. **Rate limiting triggered** — Default: 10 login attempts per minute per IP. Configurable via config-service.

See [auth-service-runbook.md](./auth-service-runbook.md) for detailed incident procedures.

## Team

| Role | Person | Contact |
|------|--------|---------|
| Service Owner | Aisha Johnson | aisha.johnson@acmeai.com |
| Tech Lead | Aisha Johnson | #auth-service |
| Security Review | Samantha Park | samantha.park@acmeai.com |
| DevOps Contact | Nikolai Petrov | nikolai.petrov@acmeai.com |
| Product Owner | David Kim | david.kim@acmeai.com |

## Recent Changes

- **v2.3.1** (2025-06-15) — Fixed token refresh race condition (BUG-4521)
- **v2.3.0** (2025-05-20) — Added SAML group mapping for enterprise SSO
- **v2.2.0** (2025-03-10) — MFA enforcement for admin roles (SEC-1204)
- **v2.1.0** (2025-01-15) — API key scoping and rotation policies
- **v2.0.0** (2024-11-01) — Major rewrite from Python to Go for performance

## Related Documents

- [Architecture Overview](./architecture-overview.md)
- [API Gateway Service README](./api-gateway-readme.md)
- [Security Policies](./security-policies.md)
- [Auth Service Database Schema](./database-schema-auth-service.md)
- [Auth Service API Documentation](./api-docs-auth-service.md)
- [Kubernetes Deployment Guide](./kubernetes-deployment-guide.md)
