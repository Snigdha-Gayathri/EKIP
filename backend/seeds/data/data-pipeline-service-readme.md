# data-pipeline-service

> ETL Orchestration and Data Pipeline Service

[![Version](https://img.shields.io/badge/version-2.5.0-blue)]()

## Overview

The `data-pipeline-service` manages all ETL (Extract, Transform, Load) workflows for the AcmeAI platform. Built on Apache Airflow 2.8, it orchestrates data movement between source systems, the data warehouse, and downstream analytics services. The Data Team, led by Fatima Al-Rashidi, owns this service.

**Owner:** Data Team (Lead: Fatima Al-Rashidi)  
**Slack:** #data-pipelines  
**On-call:** [PagerDuty](https://acmeai.pagerduty.com/schedules/data-oncall)

## Tech Stack

- **Language:** Python 3.11
- **Orchestration:** Apache Airflow 2.8
- **Data Processing:** Apache Spark 3.5 (EMR), pandas, dbt
- **Message Queue:** Apache Kafka (for streaming pipelines)
- **Data Warehouse:** PostgreSQL (analytics_db) + Redshift
- **Object Storage:** S3 (raw data lake)

## Key Pipelines

### Batch Pipelines (Airflow DAGs)

| DAG | Schedule | Description | SLA |
|-----|----------|-------------|-----|
| `customer_usage_etl` | Hourly | Aggregates API usage per customer | 30 min |
| `billing_reconciliation` | Daily 2AM UTC | Reconciles billing with usage | 2 hours |
| `model_performance_etl` | Every 6 hours | Aggregates model prediction metrics | 1 hour |
| `user_activity_rollup` | Daily 1AM UTC | Rolls up user activity for analytics | 3 hours |
| `data_warehouse_sync` | Every 4 hours | Syncs OLTP to Redshift | 2 hours |
| `compliance_audit_export` | Weekly Sunday | Exports audit logs for compliance | 6 hours |
| `search_index_rebuild` | Daily 3AM UTC | Rebuilds Elasticsearch indices | 4 hours |

### Streaming Pipelines (Kafka)

| Topic | Consumer Group | Description |
|-------|---------------|-------------|
| `prediction-events` | `analytics-consumer` | Real-time prediction tracking |
| `user-events` | `activity-consumer` | User activity stream |
| `billing-events` | `billing-consumer` | Payment and subscription events |
| `audit-events` | `compliance-consumer` | Security audit trail |

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `AIRFLOW_DB_URI` | Airflow metadata DB | — |
| `REDSHIFT_HOST` | Data warehouse host | — |
| `S3_DATA_LAKE_BUCKET` | Raw data lake bucket | `acmeai-data-lake` |
| `KAFKA_BROKERS` | Kafka broker list | — |
| `SPARK_MASTER` | Spark cluster endpoint | — |
| `DBT_PROFILES_DIR` | dbt configuration | `/etc/dbt` |

## Deployment

Airflow runs as a KubernetesExecutor deployment:

| Component | Replicas | Resources |
|-----------|----------|-----------|
| Scheduler | 2 (HA) | 1000m CPU / 2Gi |
| Webserver | 2 | 500m CPU / 1Gi |
| Worker Pods | Dynamic (0-50) | 500m-4000m CPU / 1-8Gi |
| Flower (monitoring) | 1 | 250m CPU / 512Mi |

## Dependencies

- **storage-service** — For raw data file access
- **billing-service** — Usage data source
- **analytics-service** — Downstream consumer
- **search-service** — Index data provider
- **audit-service** — Compliance data

## Monitoring

- **Airflow UI:** [https://airflow.acmeai.internal](https://airflow.acmeai.internal)
- **Datadog:** [Data Pipeline Dashboard](https://app.datadoghq.com/dashboard/acmeai-pipelines)
- **Alerts:** DAG failure, SLA miss, task retry > 3

## Data Quality

Data quality checks run as part of each pipeline using Great Expectations:

- Schema validation
- Null check assertions
- Row count anomaly detection
- Value range validations
- Cross-table referential integrity

Raj Krishnamurthy (Head of Data) reviews data quality reports weekly.

## Recent Changes

- **v2.5.0** (2025-05-25) — Added dbt for data transformation layer
- **v2.4.0** (2025-04-01) — Kafka streaming pipeline for real-time analytics
- **v2.3.0** (2025-02-15) — Great Expectations integration
- **v2.2.0** (2024-12-01) — Redshift migration from BigQuery

## Contacts

| Role | Person |
|------|--------|
| Service Owner | Fatima Al-Rashidi |
| Data Engineering Lead | Fatima Al-Rashidi |
| Head of Data | Raj Krishnamurthy |
| DevOps | Nikolai Petrov |

## Related Documents

- [Architecture Overview](./architecture-overview.md)
- [Data Warehouse Schema](./data-warehouse-schema.md)
- [Analytics Service README](./analytics-service-readme.md)
- [ETL Best Practices](./etl-best-practices.md)
- [Kafka Topic Management](./kafka-topic-management.md)
