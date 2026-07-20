# Acme AI Enterprise Architecture Overview

## Executive Summary
This document outlines the high-level architecture and operational guidelines for the **Enterprise Knowledge Intelligence Platform (EKIP)** deployed across Acme AI environments.

## Microservice Tier-1 Components
1. **api-gateway** (`Go`): Main entry point for traffic, handling mTLS termination and rate limiting (`1000 req/min`).
2. **auth-service** (`Go`): Issues zero-trust JWT tokens and manages session expiration.
3. **billing-service** (`Go`): Handles subscription recurring charges and interfaces with Stripe APIs.
4. **ml-inference-service** (`Python`): Executes multi-agent LangGraph workflows and hybrid Qdrant retrieval.

## Disaster Recovery & Circuit Breaking
When high concurrency causes downstream timeouts (`e.g., INC-9102`), on-call engineers must:
- Trip the emergency circuit breaker on the `api-gateway`.
- Flush expired token caches in `auth-service` via Redis cluster commands.
- Scale Kubernetes replicas using `kubectl scale deployment billing-service --replicas=12 -n acme-prod`.

## Compliance
All document uploads (`PDF`, `DOCX`, `PPTX`, `TXT`, `MD`) are indexed into both **Qdrant** vector store and **Neo4j Aura** knowledge graph using single-worker uvicorn instances to optimize memory usage on constrained deployment instances.
