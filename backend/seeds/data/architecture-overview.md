# AcmeAI Platform Architecture Overview

**Document ID:** ARCH-001  
**Version:** 3.2  
**Last Updated:** 2025-06-01  
**Author:** Marcus Rodriguez (CTO), Priya Patel (VP Engineering)  
**Status:** Approved  
**Review Board:** James Liu, Aisha Johnson, Dr. Wei Zhang, Nikolai Petrov

---

## 1. Executive Summary

AcmeAI Technologies operates a cloud-native microservices platform on AWS, serving three product lines: **AcmeAI Studio** (ML platform), **AcmeAI Gateway** (API gateway), and **AcmeAI Analytics** (data analytics). The platform processes approximately 2.4 billion API requests per month across 150+ enterprise customers.

This document provides the canonical architecture reference for all engineering teams. It is maintained by the Platform Team under James Liu and reviewed quarterly by the Architecture Review Board.

## 2. System Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AcmeAI Platform                               │
│                                                                      │
│  ┌─────────────┐  ┌───────────────┐  ┌──────────────────┐          │
│  │ AcmeAI      │  │ AcmeAI        │  │ AcmeAI           │          │
│  │ Studio      │  │ Gateway       │  │ Analytics        │          │
│  │ (React SPA) │  │ (API Proxy)   │  │ (Dashboard)      │          │
│  └──────┬──────┘  └───────┬───────┘  └────────┬─────────┘          │
│         │                 │                    │                     │
│         └─────────────────┼────────────────────┘                    │
│                           │                                         │
│                    ┌──────▼──────┐                                  │
│                    │ API Gateway │                                  │
│                    │  (Envoy)    │                                  │
│                    └──────┬──────┘                                  │
│                           │                                         │
│  ┌────────────────────────┼─────────────────────────────┐          │
│  │              Service Mesh (Istio)                     │          │
│  │                                                       │          │
│  │  ┌─────────┐ ┌──────────┐ ┌────────────┐ ┌────────┐ │          │
│  │  │ auth    │ │ user     │ │ ml-infer   │ │ billing│ │          │
│  │  │ service │ │ service  │ │ service    │ │ service│ │          │
│  │  └─────────┘ └──────────┘ └────────────┘ └────────┘ │          │
│  │  ┌─────────┐ ┌──────────┐ ┌────────────┐ ┌────────┐ │          │
│  │  │ data    │ │ notific  │ │ analytics  │ │ search │ │          │
│  │  │ pipeline│ │ service  │ │ service    │ │ service│ │          │
│  │  └─────────┘ └──────────┘ └────────────┘ └────────┘ │          │
│  │  ┌─────────┐ ┌──────────┐ ┌────────────┐ ┌────────┐ │          │
│  │  │ config  │ │ audit    │ │ scheduler  │ │storage │ │          │
│  │  │ service │ │ service  │ │ service    │ │service │ │          │
│  │  └─────────┘ └──────────┘ └────────────┘ └────────┘ │          │
│  │  ┌──────────┐ ┌────────────┐                         │          │
│  │  │inventory │ │integration │                         │          │
│  │  │ service  │ │ service    │                         │          │
│  │  └──────────┘ └────────────┘                         │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                      │
│  ┌──────────┐ ┌───────┐ ┌──────┐ ┌───────┐ ┌────────┐             │
│  │PostgreSQL│ │ Redis │ │Kafka │ │  S3   │ │Elastic │             │
│  │  (RDS)   │ │(Cache)│ │(MSK) │ │(Store)│ │ Search │             │
│  └──────────┘ └───────┘ └──────┘ └───────┘ └────────┘             │
└─────────────────────────────────────────────────────────────────────┘
```

## 3. Design Principles

1. **Service Autonomy** — Each microservice owns its data and can be deployed independently.
2. **API-First** — All inter-service communication uses well-defined APIs (REST or gRPC).
3. **Event-Driven** — Asynchronous communication via Kafka for non-critical paths.
4. **Zero-Trust Security** — mTLS between all services; JWT validation at every hop.
5. **Observability by Default** — Structured logging, distributed tracing (Jaeger), metrics (Prometheus).
6. **Infrastructure as Code** — All infra managed via Terraform and Helm charts.
7. **Fail Gracefully** — Circuit breakers, retries with exponential backoff, bulkheads.

## 4. Service Catalog

### 4.1 Core Services

| Service | Language | Team | Purpose | SLA |
|---------|----------|------|---------|-----|
| auth-service | Go | Backend | Authentication, OAuth2, SAML | 99.99% |
| user-service | Go | Backend | User profiles, preferences | 99.95% |
| api-gateway | Go | Platform | Request routing, rate limiting | 99.99% |
| ml-inference-service | Python | ML/AI | Model serving, predictions | 99.95% |
| data-pipeline-service | Python | Data | ETL orchestration | 99.9% |
| notification-service | TypeScript | Backend | Email, SMS, push | 99.9% |
| billing-service | Go | Backend | Payments, subscriptions | 99.99% |
| analytics-service | Python | Data | Event tracking, dashboards | 99.9% |
| storage-service | Go | Platform | File/object storage | 99.99% |
| search-service | Python | Data | Full-text search | 99.95% |
| config-service | Go | Platform | Feature flags, config | 99.99% |
| audit-service | Go | Security | Compliance logging | 99.99% |
| scheduler-service | Python | Backend | Job scheduling | 99.9% |
| inventory-service | Go | Platform | Asset management | 99.9% |
| integration-service | TypeScript | Backend | Third-party connectors | 99.9% |

### 4.2 Service Dependencies

Critical dependency chains (must not have circular dependencies):

```
auth-service → user-service → [PostgreSQL]
auth-service → audit-service → [Kafka] → [Elasticsearch]
api-gateway → auth-service → [Redis]
ml-inference-service → storage-service → [S3]
ml-inference-service → config-service → [PostgreSQL]
data-pipeline-service → storage-service → [S3]
billing-service → notification-service → [SQS/SNS]
analytics-service → data-pipeline-service → [Kafka]
```

See [service-dependency-map.md](./service-dependency-map.md) for the complete dependency graph.

## 5. Infrastructure

### 5.1 AWS Account Structure

| Account | Purpose | Account ID |
|---------|---------|------------|
| acmeai-production | Production workloads | 123456789012 |
| acmeai-staging | Staging/QA | 234567890123 |
| acmeai-development | Development | 345678901234 |
| acmeai-shared | Shared services (DNS, artifacts) | 456789012345 |
| acmeai-security | Security tooling, audit logs | 567890123456 |

### 5.2 Kubernetes Clusters

All services run on **Amazon EKS 1.29** with managed node groups.

| Cluster | Region | Node Type | Min/Max Nodes | Purpose |
|---------|--------|-----------|---------------|---------|
| acmeai-prod-us-west-2 | us-west-2 | m6i.2xlarge | 15/50 | Primary production |
| acmeai-prod-us-east-1 | us-east-1 | m6i.2xlarge | 10/30 | DR / East Coast |
| acmeai-staging | us-west-2 | m6i.xlarge | 5/15 | Staging |
| acmeai-dev | us-west-2 | m5.xlarge | 3/10 | Development |

### 5.3 Data Stores

| Store | Technology | Purpose | Size |
|-------|-----------|---------|------|
| auth_db | PostgreSQL 15 (RDS) | Auth data | 50 GB |
| users_db | PostgreSQL 15 (RDS) | User profiles | 120 GB |
| billing_db | PostgreSQL 15 (RDS) | Billing records | 80 GB |
| analytics_db | PostgreSQL 15 (RDS) | Analytics events | 2 TB |
| ml_metadata | MongoDB 7 (DocumentDB) | Model metadata | 200 GB |
| cache | Redis 7 (ElastiCache) | Session/token cache | 32 GB |
| search_index | Elasticsearch 8.11 | Full-text search | 500 GB |
| event_stream | Kafka 3.6 (MSK) | Event streaming | 5 TB retention |
| object_store | S3 | Files, models, artifacts | 50 TB |

### 5.4 Networking

- **VPC:** `10.0.0.0/16` with public, private, and isolated subnets
- **Service Mesh:** Istio 1.20 with mTLS enforced
- **Ingress:** AWS ALB + Envoy sidecar proxies
- **DNS:** Route 53 with internal zone `acmeai.internal`
- **CDN:** CloudFront for static assets and API caching

## 6. Security Architecture

Security is overseen by the Security Team led by Alexandra Novak (CISO) and Samantha Park (Security Team Lead).

### 6.1 Authentication Flow

1. Client sends credentials to `api-gateway`
2. Gateway forwards to `auth-service`
3. auth-service validates against `auth_db` or SAML IdP
4. JWT issued (RS256, 1-hour expiry)
5. Token cached in Redis for fast validation
6. All subsequent requests include JWT in `Authorization` header
7. Each service validates JWT locally using public key

### 6.2 Secrets Management

- **HashiCorp Vault** (self-hosted on EKS) for all application secrets
- **AWS KMS** for encryption at rest
- **AWS Secrets Manager** for RDS credentials with auto-rotation
- Secret injection via Vault Agent sidecar in Kubernetes pods

See [vault-secrets-management.md](./vault-secrets-management.md) and [security-policies.md](./security-policies.md).

### 6.3 Compliance

- **SOC 2 Type II** — Certified annually (see [soc2-compliance.md](./soc2-compliance.md))
- **GDPR** — Full compliance for EU customers (see [gdpr-compliance-guide.md](./gdpr-compliance-guide.md))
- **HIPAA** — BAA available for HealthFirst Medical and healthcare customers

## 7. CI/CD Pipeline

All repositories use **GitHub Actions** for CI and **ArgoCD** for CD.

```
Developer → GitHub PR → CI Pipeline → Container Build → ECR Push → ArgoCD Sync → K8s Deploy
                          │
                          ├── Unit Tests
                          ├── Integration Tests
                          ├── Linting (golangci-lint / ruff / eslint)
                          ├── SAST (Semgrep)
                          ├── Container Scan (Trivy)
                          └── Coverage Check (>80% required)
```

See [ci-cd-pipeline-documentation.md](./ci-cd-pipeline-documentation.md) for details.

## 8. Monitoring & Observability

| Tool | Purpose | Owner |
|------|---------|-------|
| Datadog | APM, metrics, logs | DevOps (Nikolai Petrov) |
| Grafana | Dashboards, visualization | DevOps |
| PagerDuty | On-call alerting | DevOps |
| Jaeger | Distributed tracing | Platform (James Liu) |
| Sentry | Error tracking | Frontend (Carlos Mendez) |

### SLO Targets

| Service | Availability | p99 Latency | Error Rate |
|---------|-------------|-------------|------------|
| api-gateway | 99.99% | < 50ms | < 0.01% |
| auth-service | 99.99% | < 200ms | < 0.1% |
| ml-inference-service | 99.95% | < 500ms | < 0.5% |
| billing-service | 99.99% | < 300ms | < 0.01% |

See [monitoring-alerting-setup.md](./monitoring-alerting-setup.md) for configuration details.

## 9. Disaster Recovery

- **RPO (Recovery Point Objective):** 1 hour for all databases
- **RTO (Recovery Time Objective):** 4 hours for full platform recovery
- **Strategy:** Active-passive with automated failover to us-east-1
- **Backup Schedule:** Continuous replication + daily snapshots

See [disaster-recovery-plan.md](./disaster-recovery-plan.md) for runbooks and procedures.

## 10. Document References

| Document | Description |
|----------|-------------|
| [Service Dependency Map](./service-dependency-map.md) | Visual dependency graph |
| [Kubernetes Deployment Guide](./kubernetes-deployment-guide.md) | K8s deployment procedures |
| [CI/CD Pipeline Docs](./ci-cd-pipeline-documentation.md) | Build and deploy pipeline |
| [Security Policies](./security-policies.md) | Security standards and policies |
| [Monitoring & Alerting](./monitoring-alerting-setup.md) | Monitoring configuration |
| [Disaster Recovery Plan](./disaster-recovery-plan.md) | DR procedures |
| [Database Schema Docs](./database-schema-auth-service.md) | Auth database schema |
| [API Documentation](./api-docs-auth-service.md) | Auth service API reference |
| [Performance Benchmarks](./performance-benchmarks.md) | Load test results |
| [Code Review Guidelines](./code-review-guidelines.md) | Review standards |

---

*This document is reviewed quarterly by the Architecture Review Board. Next review: 2025-09-01.*  
*Contact: Marcus Rodriguez (marcus.rodriguez@acmeai.com) or Priya Patel (priya.patel@acmeai.com)*
