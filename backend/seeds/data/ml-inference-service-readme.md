# ml-inference-service

> Model Serving and Inference Engine for AcmeAI Studio

[![Build Status](https://github.com/acmeai/ml-inference-service/actions/workflows/ci.yml/badge.svg)](https://github.com/acmeai/ml-inference-service)
[![Version](https://img.shields.io/badge/version-3.1.0-blue)]()

## Overview

The `ml-inference-service` is the core model serving infrastructure for AcmeAI Studio. It supports TensorFlow Serving, ONNX Runtime, and custom Python model serving with auto-scaling based on inference load. The service handles ~50 million inference requests per day across all customer deployments.

**Owner:** ML/AI Team (Lead: Dr. Wei Zhang)  
**Slack:** #ml-inference  
**Runbook:** [ml-inference-runbook.md](./ml-inference-runbook.md)

## Architecture

```
                    ┌───────────────┐
                    │  API Gateway  │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │ ml-inference  │
                    │   service     │
                    │  (Python)     │
                    └───┬───┬───┬───┘
                        │   │   │
              ┌─────────┘   │   └──────────┐
              ▼             ▼              ▼
        ┌──────────┐ ┌──────────┐ ┌───────────┐
        │TensorFlow│ │  ONNX    │ │  Custom   │
        │ Serving  │ │ Runtime  │ │  Python   │
        │ (gRPC)   │ │ (gRPC)   │ │  Models   │
        └──────────┘ └──────────┘ └───────────┘
              │             │              │
              └─────────────┼──────────────┘
                            │
                    ┌───────▼───────┐
                    │ Model Registry│
                    │  (S3 + Mongo) │
                    └───────────────┘
```

## Tech Stack

- **Language:** Python 3.11
- **Framework:** FastAPI + Uvicorn
- **ML Runtimes:** TensorFlow Serving 2.15, ONNX Runtime 1.17, PyTorch 2.2
- **Model Registry:** MongoDB (DocumentDB) + S3
- **Cache:** Redis (model metadata cache)
- **GPU Support:** NVIDIA A100/T4 via EKS GPU node groups

## Key Features

### Model Serving
- Hot-reload of model versions without downtime
- A/B testing with traffic splitting (configurable via config-service)
- Shadow mode for validating new model versions
- Automatic model warmup on deployment
- Request batching for throughput optimization

### Auto-scaling
- Custom HPA based on inference queue depth
- KEDA integration for event-driven scaling
- GPU-aware scheduling with node affinity rules
- Scale-to-zero for infrequently used models

### Monitoring
- Per-model latency tracking (p50, p95, p99)
- Prediction drift detection (data quality monitoring)
- Model accuracy monitoring via shadow predictions
- GPU utilization and memory tracking

## API Reference

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/predict` | Run inference on a model |
| POST | `/v1/predict/batch` | Batch inference |
| GET | `/v1/models` | List available models |
| GET | `/v1/models/{id}/versions` | List model versions |
| POST | `/v1/models/{id}/deploy` | Deploy a model version |
| DELETE | `/v1/models/{id}/versions/{v}` | Undeploy a version |
| GET | `/v1/models/{id}/metrics` | Model performance metrics |
| POST | `/v1/models/{id}/ab-test` | Configure A/B test |

### Prediction Request

```json
{
  "model_id": "sentiment-classifier-v2",
  "version": "latest",
  "inputs": {
    "text": "This product is amazing!"
  },
  "parameters": {
    "temperature": 0.7,
    "max_tokens": 100
  }
}
```

### Prediction Response

```json
{
  "model_id": "sentiment-classifier-v2",
  "version": "2.1.0",
  "prediction": {
    "label": "positive",
    "confidence": 0.94,
    "scores": {
      "positive": 0.94,
      "neutral": 0.04,
      "negative": 0.02
    }
  },
  "latency_ms": 45,
  "request_id": "req-abc123"
}
```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `MODEL_REGISTRY_MONGO_URI` | MongoDB connection | — |
| `MODEL_STORAGE_S3_BUCKET` | S3 bucket for models | `acmeai-models` |
| `MAX_BATCH_SIZE` | Max batch inference size | `32` |
| `BATCH_TIMEOUT_MS` | Batch collection timeout | `100` |
| `GPU_MEMORY_FRACTION` | GPU memory per model | `0.25` |
| `DEFAULT_MODEL_TTL` | Unused model eviction | `3600` |
| `REDIS_URL` | Redis for metadata cache | — |
| `KAFKA_BROKERS` | For prediction logging | — |

## Deployment

| Environment | Replicas | GPU | CPU/Mem |
|-------------|----------|-----|---------|
| Production | 8-20 (HPA) | 4x A100 | 4000m / 16Gi |
| Staging | 2-5 | 1x T4 | 2000m / 8Gi |
| Development | 1 | None (CPU only) | 1000m / 4Gi |

GPU nodes use the `acmeai-gpu` node group with taints to prevent non-GPU workloads.

## Performance

Latest benchmarks (2025-05-15, production):

| Model Type | p50 Latency | p99 Latency | Throughput |
|------------|------------|-------------|------------|
| Text Classification | 12ms | 45ms | 2,500 req/s |
| Image Classification | 35ms | 120ms | 800 req/s |
| NLP Embeddings | 8ms | 30ms | 4,000 req/s |
| Custom LLM (7B) | 450ms | 1,200ms | 50 req/s |

See [performance-benchmarks.md](./performance-benchmarks.md) for full results.

## Contacts

| Role | Person |
|------|--------|
| Service Owner | Dr. Wei Zhang |
| ML Platform Lead | Dr. Wei Zhang |
| DevOps | Nikolai Petrov |
| Platform Support | James Liu |

## Recent Changes

- **v3.1.0** (2025-06-01) — Added LLM serving with vLLM backend
- **v3.0.0** (2025-04-15) — ONNX Runtime upgrade, breaking API changes
- **v2.9.0** (2025-02-20) — A/B testing framework
- **v2.8.0** (2025-01-10) — Prediction drift detection

## Related Documents

- [Architecture Overview](./architecture-overview.md)
- [ML Model Training Guide](./ml-model-training-guide.md)
- [Performance Benchmarks](./performance-benchmarks.md)
- [AcmeAI Studio User Guide](./acmeai-studio-user-guide.md)
- [GPU Infrastructure Guide](./gpu-infrastructure-guide.md)
