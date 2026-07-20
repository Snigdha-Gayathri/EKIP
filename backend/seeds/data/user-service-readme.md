# user-service

> User Management Service for AcmeAI Platform

[![Build Status](https://github.com/acmeai/user-service/actions/workflows/ci.yml/badge.svg)](https://github.com/acmeai/user-service)
[![Version](https://img.shields.io/badge/version-1.8.2-blue)]()

## Overview

The `user-service` manages user profiles, preferences, team memberships, and organization hierarchies for all AcmeAI products. It serves as the canonical source of truth for user identity data after authentication is handled by [auth-service](./auth-service-readme.md).

**Owner:** Backend Team (Lead: Aisha Johnson)  
**On-call:** [PagerDuty Schedule](https://acmeai.pagerduty.com/schedules/user-oncall)  
**Slack:** #user-service

## Tech Stack

- **Language:** Go 1.22
- **Database:** PostgreSQL 15 (RDS) — `users_db`
- **Cache:** Redis 7 (ElastiCache) — user profile cache (TTL: 5 minutes)
- **Search:** Elasticsearch 8.11 — user search index
- **Protocol:** gRPC (internal) + REST (external)

## API Reference

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/users/{id}` | Get user by ID |
| GET | `/v1/users/me` | Get current user |
| PUT | `/v1/users/{id}` | Update user profile |
| GET | `/v1/users/search` | Search users |
| POST | `/v1/organizations` | Create organization |
| GET | `/v1/organizations/{id}/members` | List org members |
| POST | `/v1/teams` | Create team |
| PUT | `/v1/teams/{id}/members` | Update team membership |
| GET | `/v1/users/{id}/preferences` | Get user preferences |
| PUT | `/v1/users/{id}/preferences` | Update preferences |

### gRPC Services

```protobuf
service UserService {
  rpc GetUser(GetUserRequest) returns (UserResponse);
  rpc GetUsersByIds(GetUsersByIdsRequest) returns (UsersResponse);
  rpc UpdateUser(UpdateUserRequest) returns (UserResponse);
  rpc SearchUsers(SearchUsersRequest) returns (UsersResponse);
}
```

## Database Schema

Primary tables in `users_db`:

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    avatar_url TEXT,
    organization_id UUID REFERENCES organizations(id),
    role VARCHAR(50) DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(50) DEFAULT 'free',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE team_memberships (
    user_id UUID REFERENCES users(id),
    team_id UUID REFERENCES teams(id),
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, team_id)
);
```

See [database-schema-user-service.md](./database-schema-user-service.md) for full schema.

## Deployment

Deployed via ArgoCD in the `acmeai-platform` namespace.

| Environment | Replicas | Resources |
|-------------|----------|-----------|
| Production | 4 | 500m CPU / 1Gi RAM |
| Staging | 2 | 250m CPU / 512Mi RAM |
| Development | 1 | 100m CPU / 256Mi RAM |

## Dependencies

- **auth-service** (upstream) — validates tokens, provides user IDs
- **search-service** — syncs user data to Elasticsearch index
- **notification-service** — sends profile update confirmations
- **audit-service** — logs profile changes for compliance

## Monitoring

- Datadog dashboard: [User Service Metrics](https://app.datadoghq.com/dashboard/acmeai-user)
- Key metrics: `user_profile_requests_total`, `user_search_latency_seconds`, `user_cache_hit_ratio`
- Alert: Cache hit ratio below 70% triggers PagerDuty alert

## Recent Changes

- **v1.8.2** (2025-06-10) — Fixed pagination bug in org member listing (BUG-4612)
- **v1.8.0** (2025-05-01) — Added team hierarchy support
- **v1.7.0** (2025-03-15) — GDPR data export endpoint
- **v1.6.0** (2025-01-20) — Organization-level settings

## Contacts

| Role | Person |
|------|--------|
| Service Owner | Aisha Johnson |
| Backend Lead | Aisha Johnson |
| DevOps | Nikolai Petrov |
| Security | Samantha Park |

## Related Documents

- [Auth Service README](./auth-service-readme.md)
- [Architecture Overview](./architecture-overview.md)
- [User Service Database Schema](./database-schema-user-service.md)
- [GDPR Compliance Guide](./gdpr-compliance-guide.md)
