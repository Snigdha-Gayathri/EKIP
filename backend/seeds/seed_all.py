"""
Seed Script — Populates Qdrant Vector Collection and Neo4j Knowledge Graph
with rich AcmeAI enterprise documents (manifest + seeds/data/*.md) and entities.
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from pathlib import Path
from typing import Any

from app.agents.ingestion.parsers import chunk_text
from app.db.neo4j import get_neo4j_driver_sync
from app.db.qdrant import get_qdrant_client_sync, init_qdrant_collections
from app.llm.embeddings import get_embedding_service
from qdrant_client import models as qdrant_models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ekip.seeder")


async def seed_all():
    logger.info("Starting EKIP Enterprise Seeding (Qdrant + Neo4j)...")

    # 1. Load manifest.json
    manifest_path = Path(__file__).parent / "manifest.json"
    data = json.loads(manifest_path.read_text("utf-8"))
    documents: list[dict[str, Any]] = data.get("documents", [])

    # 2. Load all markdown files from seeds/data/*.md
    data_dir = Path(__file__).parent / "data"
    file_metadata_map = {
        "api-gateway-readme.md": {
            "id": "doc_api_gateway_001",
            "title": "API Gateway Service Architecture & Rate Limiting",
            "doc_type": "architecture",
            "category": "engineering",
            "author": "James Liu",
            "tags": ["api-gateway", "envoy", "rate-limiting", "routing", "jwt", "istio", "alb"],
            "service_name": "api-gateway",
        },
        "architecture-overview.md": {
            "id": "doc_arch_overview_001",
            "title": "AcmeAI Canonical Platform Architecture v3.2",
            "doc_type": "architecture",
            "category": "engineering",
            "author": "Marcus Rodriguez (CTO), Priya Patel (VP Engineering)",
            "tags": ["architecture", "microservices", "istio", "envoy", "aws", "eks", "kafka", "postgres", "redis"],
            "service_name": "AcmeAI Platform",
        },
        "auth-service-readme.md": {
            "id": "doc_auth_service_001",
            "title": "Authentication & Authorization Service (auth-service) v2.3.1",
            "doc_type": "architecture",
            "category": "security",
            "author": "Aisha Johnson",
            "tags": ["auth-service", "oauth2", "saml", "sso", "jwt", "rbac", "mfa", "redis", "postgresql", "security"],
            "service_name": "auth-service",
        },
        "data-pipeline-service-readme.md": {
            "id": "doc_data_pipeline_001",
            "title": "ETL Orchestration and Data Pipeline Service v2.5.0",
            "doc_type": "architecture",
            "category": "data",
            "author": "Fatima Al-Rashidi",
            "tags": ["data-pipeline", "airflow", "spark", "kafka", "redshift", "etl", "dbt", "great-expectations"],
            "service_name": "data-pipeline-service",
        },
        "ml-inference-service-readme.md": {
            "id": "doc_ml_inference_001",
            "title": "Model Serving and Inference Engine for AcmeAI Studio v3.1.0",
            "doc_type": "architecture",
            "category": "ml",
            "author": "Dr. Wei Zhang",
            "tags": ["ml-inference", "tensorflow", "onnx", "fastapi", "gpu", "a100", "vllm", "auto-scaling", "serving"],
            "service_name": "ml-inference-service",
        },
        "user-service-readme.md": {
            "id": "doc_user_service_001",
            "title": "User Management Service for AcmeAI Platform v1.8.2",
            "doc_type": "architecture",
            "category": "engineering",
            "author": "Aisha Johnson",
            "tags": ["user-service", "profiles", "teams", "organizations", "postgresql", "redis", "elasticsearch", "rbac"],
            "service_name": "user-service",
        },
    }

    if data_dir.exists():
        for file_path in data_dir.glob("*.md"):
            meta = file_metadata_map.get(file_path.name, {
                "id": f"doc_file_{file_path.stem}",
                "title": file_path.stem.replace("-", " ").title(),
                "doc_type": "documentation",
                "category": "engineering",
                "author": "Enterprise Engineering Lead",
                "tags": [file_path.stem],
                "service_name": file_path.stem,
            })
            content = file_path.read_text("utf-8")
            documents.append({
                "id": meta["id"],
                "title": meta["title"],
                "doc_type": meta["doc_type"],
                "category": meta["category"],
                "content": content,
                "author": meta["author"],
                "tags": meta["tags"],
                "service_name": meta.get("service_name", ""),
            })
        logger.info("Loaded %d documents from seeds/data/ and manifest.json", len(documents))

    embedder = get_embedding_service()
    sample_vec = await embedder.embed_text("sample embedding check")
    vector_dim = len(sample_vec)
    logger.info("Detected embedding vector dimension: %d", vector_dim)
    init_qdrant_collections(vector_size=vector_dim, force_recreate=True)

    # Check sparse embedding model availability
    sparse_model = None
    try:
        from fastembed import SparseTextEmbedding
        sparse_model = SparseTextEmbedding("Qdrant/bm25")
        logger.info("SparseTextEmbedding initialized successfully for hybrid BM25 vectors.")
    except Exception as e:
        logger.warning("Sparse embedding not available (%s). Seeding dense vectors only.", e)

    qdrant = get_qdrant_client_sync()
    driver = get_neo4j_driver_sync()

    # 3. Chunk Documents & Seed Qdrant Vectors
    points = []
    for doc in documents:
        chunks = chunk_text(doc["content"], chunk_size=1000, overlap=200)
        for c_idx, chunk in enumerate(chunks):
            chunk_str = chunk["text"]
            section_title = chunk.get("section_title", "Overview")
            dense_vec = await embedder.embed_text(chunk_str)

            vector_dict: dict[str, Any] = {"dense": dense_vec}
            if sparse_model:
                try:
                    sparse_res = list(sparse_model.embed([chunk_str]))
                    if sparse_res:
                        vector_dict["sparse"] = qdrant_models.SparseVector(
                            indices=sparse_res[0].indices.tolist(),
                            values=sparse_res[0].values.tolist(),
                        )
                except Exception as sp_err:
                    logger.debug("Sparse generation error on chunk: %s", sp_err)

            point_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{doc['id']}_chunk_{c_idx}"))
            points.append(
                qdrant_models.PointStruct(
                    id=point_uuid,
                    vector=vector_dict,
                    payload={
                        "document_id": doc["id"],
                        "org_id": "acme_ai",
                        "doc_title": doc["title"],
                        "section_title": section_title,
                        "doc_type": doc["doc_type"],
                        "category": doc["category"],
                        "chunk_text": chunk_str,
                        "author": doc["author"],
                        "tags": doc["tags"],
                        "service_name": doc.get("service_name", ""),
                    },
                )
            )

    if points:
        # Upsert in batches of 100 to avoid large payload limits
        batch_size = 100
        for i in range(0, len(points), batch_size):
            qdrant.upsert(collection_name="ekip_documents", points=points[i:i + batch_size])
        logger.info("Successfully indexed %d chunks across %d enterprise documents into Qdrant.", len(points), len(documents))

    # 4. Seed Comprehensive Neo4j Knowledge Graph
    async with driver.session() as session:
        # Clear existing graph to ensure clean, deterministic enterprise seeding
        await session.run("MATCH (n) DETACH DELETE n")

        # Create Teams & Employees
        await session.run(
            """
            MERGE (t_plat:Team {name: 'Platform Team', department: 'Engineering'})
            MERGE (t_back:Team {name: 'Backend Team', department: 'Engineering'})
            MERGE (t_data:Team {name: 'Data Team', department: 'Engineering & Analytics'})
            MERGE (t_ml:Team {name: 'ML/AI Team', department: 'Engineering & AI'})
            MERGE (t_sec:Team {name: 'Cloud Infrastructure & Security Team', department: 'Security & DevOps'})
            MERGE (t_pay:Team {name: 'Payments Engineering Team', department: 'Engineering'})
            MERGE (t_iam:Team {name: 'Identity & Access Management Team', department: 'Engineering'})

            MERGE (e1:Employee {name: 'James Liu', email: 'james.liu@acmeai.com', role: 'Platform Lead'})
            MERGE (e1)-[:WORKS_IN]->(t_plat)
            MERGE (e1)-[:MANAGES]->(t_plat)

            MERGE (e2:Employee {name: 'Aisha Johnson', email: 'aisha.johnson@acmeai.com', role: 'Backend Team Lead'})
            MERGE (e2)-[:WORKS_IN]->(t_back)
            MERGE (e2)-[:MANAGES]->(t_back)

            MERGE (e3:Employee {name: 'Fatima Al-Rashidi', email: 'fatima.al-rashidi@acmeai.com', role: 'Data Engineering Lead'})
            MERGE (e3)-[:WORKS_IN]->(t_data)
            MERGE (e3)-[:MANAGES]->(t_data)

            MERGE (e4:Employee {name: 'Dr. Wei Zhang', email: 'wei.zhang@acmeai.com', role: 'ML Platform Lead'})
            MERGE (e4)-[:WORKS_IN]->(t_ml)
            MERGE (e4)-[:MANAGES]->(t_ml)

            MERGE (e5:Employee {name: 'Samantha Park', email: 'samantha.park@acmeai.com', role: 'Security Team Lead'})
            MERGE (e5)-[:WORKS_IN]->(t_sec)
            MERGE (e5)-[:MANAGES]->(t_sec)

            MERGE (e6:Employee {name: 'Nikolai Petrov', email: 'nikolai.petrov@acmeai.com', role: 'DevOps Lead'})
            MERGE (e6)-[:WORKS_IN]->(t_sec)

            MERGE (e7:Employee {name: 'Elena Vance', email: 'elena.vance@acmeai.com', role: 'Principal Identity Architect'})
            MERGE (e7)-[:WORKS_IN]->(t_iam)

            MERGE (e8:Employee {name: 'Marcus Chen', email: 'marcus.chen@acmeai.com', role: 'Staff Payments Engineer'})
            MERGE (e8)-[:WORKS_IN]->(t_pay)
            """
        )

        # Create Services & Ownership
        await session.run(
            """
            MATCH (t_plat:Team {name: 'Platform Team'})
            MATCH (t_back:Team {name: 'Backend Team'})
            MATCH (t_data:Team {name: 'Data Team'})
            MATCH (t_ml:Team {name: 'ML/AI Team'})
            MATCH (t_iam:Team {name: 'Identity & Access Management Team'})
            MATCH (t_pay:Team {name: 'Payments Engineering Team'})

            MERGE (s_gw:Service {name: 'api-gateway', id: 'api-gateway', tier: 'Tier-1', language: 'Go'})
            MERGE (t_plat)-[:OWNS]->(s_gw)

            MERGE (s_auth:Service {name: 'auth-service', id: 'auth-svc', tier: 'Tier-1', language: 'Go'})
            MERGE (t_back)-[:OWNS]->(s_auth)
            MERGE (t_iam)-[:OWNS]->(s_auth)

            MERGE (s_user:Service {name: 'user-service', id: 'user-svc', tier: 'Tier-1', language: 'Go'})
            MERGE (t_back)-[:OWNS]->(s_user)

            MERGE (s_ml:Service {name: 'ml-inference-service', id: 'ml-inference-service', tier: 'Tier-1', language: 'Python'})
            MERGE (t_ml)-[:OWNS]->(s_ml)

            MERGE (s_data:Service {name: 'data-pipeline-service', id: 'data-pipeline-service', tier: 'Tier-2', language: 'Python'})
            MERGE (t_data)-[:OWNS]->(s_data)

            MERGE (s_pay:Service {name: 'Payments Service', id: 'payments-svc', tier: 'Tier-1', language: 'Go'})
            MERGE (t_pay)-[:OWNS]->(s_pay)

            MERGE (s_cfg:Service {name: 'config-service', id: 'config-service', tier: 'Tier-1', language: 'Go'})
            MERGE (t_plat)-[:OWNS]->(s_cfg)

            MERGE (s_aud:Service {name: 'audit-service', id: 'audit-service', tier: 'Tier-1', language: 'Go'})
            MERGE (t_back)-[:OWNS]->(s_aud)

            MERGE (s_notif:Service {name: 'notification-service', id: 'notification-service', tier: 'Tier-2', language: 'TypeScript'})
            MERGE (t_back)-[:OWNS]->(s_notif)

            MERGE (s_store:Service {name: 'storage-service', id: 'storage-service', tier: 'Tier-1', language: 'Go'})
            MERGE (t_plat)-[:OWNS]->(s_store)

            MERGE (s_search:Service {name: 'search-service', id: 'search-service', tier: 'Tier-1', language: 'Python'})
            MERGE (t_data)-[:OWNS]->(s_search)

            MERGE (s_bill:Service {name: 'billing-service', id: 'billing-service', tier: 'Tier-1', language: 'Go'})
            MERGE (t_back)-[:OWNS]->(s_bill)

            MERGE (s_ana:Service {name: 'analytics-service', id: 'analytics-service', tier: 'Tier-2', language: 'Python'})
            MERGE (t_data)-[:OWNS]->(s_ana)
            """
        )

        # Create Dependencies between Services
        await session.run(
            """
            MATCH (s_gw:Service {name: 'api-gateway'})
            MATCH (s_auth:Service {name: 'auth-service'})
            MATCH (s_user:Service {name: 'user-service'})
            MATCH (s_ml:Service {name: 'ml-inference-service'})
            MATCH (s_data:Service {name: 'data-pipeline-service'})
            MATCH (s_pay:Service {name: 'Payments Service'})
            MATCH (s_cfg:Service {name: 'config-service'})
            MATCH (s_aud:Service {name: 'audit-service'})
            MATCH (s_notif:Service {name: 'notification-service'})
            MATCH (s_store:Service {name: 'storage-service'})
            MATCH (s_search:Service {name: 'search-service'})
            MATCH (s_bill:Service {name: 'billing-service'})
            MATCH (s_ana:Service {name: 'analytics-service'})

            MERGE (s_gw)-[:DEPENDS_ON]->(s_auth)
            MERGE (s_gw)-[:DEPENDS_ON]->(s_cfg)
            MERGE (s_gw)-[:DEPENDS_ON]->(s_ana)
            MERGE (s_gw)-[:DEPENDS_ON]->(s_aud)

            MERGE (s_auth)-[:DEPENDS_ON]->(s_user)
            MERGE (s_auth)-[:DEPENDS_ON]->(s_aud)
            MERGE (s_auth)-[:DEPENDS_ON]->(s_notif)
            MERGE (s_auth)-[:DEPENDS_ON]->(s_cfg)

            MERGE (s_user)-[:DEPENDS_ON]->(s_auth)
            MERGE (s_user)-[:DEPENDS_ON]->(s_search)
            MERGE (s_user)-[:DEPENDS_ON]->(s_notif)
            MERGE (s_user)-[:DEPENDS_ON]->(s_aud)

            MERGE (s_ml)-[:DEPENDS_ON]->(s_store)
            MERGE (s_ml)-[:DEPENDS_ON]->(s_cfg)

            MERGE (s_data)-[:DEPENDS_ON]->(s_store)
            MERGE (s_data)-[:DEPENDS_ON]->(s_bill)
            MERGE (s_data)-[:DEPENDS_ON]->(s_ana)
            MERGE (s_data)-[:DEPENDS_ON]->(s_search)
            MERGE (s_data)-[:DEPENDS_ON]->(s_aud)

            MERGE (s_pay)-[:DEPENDS_ON]->(s_auth)
            MERGE (s_pay)-[:DEPENDS_ON]->(s_bill)
            MERGE (s_bill)-[:DEPENDS_ON]->(s_notif)
            """
        )

        # Create Exposed APIs
        await session.run(
            """
            MATCH (s_auth:Service {name: 'auth-service'})
            MATCH (s_user:Service {name: 'user-service'})
            MATCH (s_ml:Service {name: 'ml-inference-service'})
            MATCH (s_pay:Service {name: 'Payments Service'})
            MATCH (s_gw:Service {name: 'api-gateway'})

            MERGE (a1:API {name: 'POST /v2/auth/login', method: 'POST', path: '/v2/auth/login', version: 'v2'})
            MERGE (a2:API {name: 'POST /v2/auth/oauth/token', method: 'POST', path: '/v2/auth/oauth/token', version: 'v2'})
            MERGE (a3:API {name: 'GET /v2/auth/me', method: 'GET', path: '/v2/auth/me', version: 'v2'})
            MERGE (s_auth)-[:EXPOSES]->(a1)
            MERGE (s_auth)-[:EXPOSES]->(a2)
            MERGE (s_auth)-[:EXPOSES]->(a3)

            MERGE (u1:API {name: 'GET /v1/users/{id}', method: 'GET', path: '/v1/users/{id}', version: 'v1'})
            MERGE (u2:API {name: 'GET /v1/users/search', method: 'GET', path: '/v1/users/search', version: 'v1'})
            MERGE (u3:API {name: 'POST /v1/organizations', method: 'POST', path: '/v1/organizations', version: 'v1'})
            MERGE (s_user)-[:EXPOSES]->(u1)
            MERGE (s_user)-[:EXPOSES]->(u2)
            MERGE (s_user)-[:EXPOSES]->(u3)

            MERGE (m1:API {name: 'POST /v1/predict', method: 'POST', path: '/v1/predict', version: 'v1'})
            MERGE (m2:API {name: 'POST /v1/predict/batch', method: 'POST', path: '/v1/predict/batch', version: 'v1'})
            MERGE (s_ml)-[:EXPOSES]->(m1)
            MERGE (s_ml)-[:EXPOSES]->(m2)

            MERGE (p1:API {name: 'POST /api/v1/payments/charge', method: 'POST', path: '/api/v1/payments/charge', version: 'v1'})
            MERGE (s_pay)-[:EXPOSES]->(p1)

            MERGE (g1:API {name: 'ALL /v1/*', method: 'ALL', path: '/v1/*', version: 'v1'})
            MERGE (s_gw)-[:EXPOSES]->(g1)
            """
        )

        # Create Deployments
        await session.run(
            """
            MATCH (s_auth:Service {name: 'auth-service'})
            MATCH (s_user:Service {name: 'user-service'})
            MATCH (s_ml:Service {name: 'ml-inference-service'})
            MATCH (s_pay:Service {name: 'Payments Service'})
            MATCH (s_gw:Service {name: 'api-gateway'})

            MERGE (dep1:Deployment {name: 'auth-service-prod-deploy', environment: 'Production', version: 'v2.3.1', deployed_at: '2025-06-15', status: 'Healthy', pipeline: 'deploy-auth-svc'})
            MERGE (s_auth)-[:DEPLOYED_AS]->(dep1)
            MERGE (s_auth)-[:DEPLOYED_VIA]->(dep1)

            MERGE (dep2:Deployment {name: 'user-service-prod-deploy', environment: 'Production', version: 'v1.8.2', deployed_at: '2025-06-10', status: 'Healthy', pipeline: 'deploy-user-svc'})
            MERGE (s_user)-[:DEPLOYED_AS]->(dep2)
            MERGE (s_user)-[:DEPLOYED_VIA]->(dep2)

            MERGE (dep3:Deployment {name: 'ml-inference-prod-gpu', environment: 'Production', version: 'v3.1.0', deployed_at: '2025-06-01', status: 'Healthy', pipeline: 'deploy-ml-inference'})
            MERGE (s_ml)-[:DEPLOYED_AS]->(dep3)
            MERGE (s_ml)-[:DEPLOYED_VIA]->(dep3)

            MERGE (dep4:Deployment {name: 'api-gateway-envoy-v4', environment: 'Production', version: 'v4.0.2', deployed_at: '2025-06-18', status: 'Healthy', pipeline: 'deploy-api-gateway'})
            MERGE (s_gw)-[:DEPLOYED_AS]->(dep4)
            MERGE (s_gw)-[:DEPLOYED_VIA]->(dep4)

            MERGE (dep5:Deployment {name: 'Stripe Ledger Pipeline', environment: 'Production', version: 'v1.4.0', deployed_at: '2025-05-12', status: 'Healthy', pipeline: 'deploy-payment-pipeline'})
            MERGE (s_pay)-[:DEPLOYED_AS]->(dep5)
            MERGE (s_pay)-[:DEPLOYED_VIA]->(dep5)
            """
        )

        # Create Policies & Support Tickets
        await session.run(
            """
            MATCH (t_sec:Team {name: 'Cloud Infrastructure & Security Team'})
            MATCH (s_auth:Service {name: 'auth-service'})
            MATCH (s_pay:Service {name: 'Payments Service'})
            MATCH (s_gw:Service {name: 'api-gateway'})

            MERGE (sec1:Policy {name: 'Enterprise Zero-Trust Security & mTLS Standard', id: 'POL-ZT-001'})
            MERGE (t_sec)-[:MAINTAINS]->(sec1)
            MERGE (s_auth)-[:COMPLIES_WITH]->(sec1)
            MERGE (s_pay)-[:COMPLIES_WITH]->(sec1)
            MERGE (s_gw)-[:COMPLIES_WITH]->(sec1)

            MERGE (c1:Customer {name: 'Acme Enterprise Corp', company: 'Acme Enterprise Corp'})
            MERGE (inc1:SupportTicket {id: 'INC-8834', title: 'Authentication Failures During Flash Sale', priority: 'P1', status: 'Resolved'})
            MERGE (inc1_alias:Incident {id: 'INC-8834', title: 'Authentication Failures During Flash Sale', priority: 'P1', status: 'Resolved'})
            MERGE (inc1)-[:RELATES_TO]->(s_auth)
            MERGE (inc1_alias)-[:RELATES_TO]->(s_auth)
            MERGE (c1)-[:FILED_BY]->(inc1)

            MERGE (inc2:SupportTicket {id: 'INC-9102', title: 'Stripe webhook timeout on high concurrency', priority: 'P2', status: 'Investigating'})
            MERGE (inc2_alias:Incident {id: 'INC-9102', title: 'Stripe webhook timeout on high concurrency', priority: 'P2', status: 'Investigating'})
            MERGE (inc2)-[:RELATES_TO]->(s_pay)
            MERGE (inc2_alias)-[:RELATES_TO]->(s_pay)
            MERGE (c1)-[:FILED_BY]->(inc2)
            """
        )

        # Create Databases, Repositories, Infrastructure, SecurityPolicy, and Person entities
        await session.run(
            """
            MATCH (s_auth:Service {name: 'auth-service'})
            MATCH (s_user:Service {name: 'user-service'})
            MATCH (s_data:Service {name: 'data-pipeline-service'})
            MATCH (s_search:Service {name: 'search-service'})
            MATCH (s_pay:Service {name: 'Payments Service'})
            MATCH (s_gw:Service {name: 'api-gateway'})
            MATCH (t_sec:Team {name: 'Cloud Infrastructure & Security Team'})

            MERGE (db1:Database {name: 'postgres-main', id: 'postgres-main', engine: 'PostgreSQL 16', tier: 'Tier-1'})
            MERGE (db2:Database {name: 'qdrant-vector-cluster', id: 'qdrant-vector-cluster', engine: 'Qdrant Cloud', tier: 'Tier-1'})
            MERGE (db3:Database {name: 'neo4j-aura-cluster', id: 'neo4j-aura-cluster', engine: 'Neo4j AuraDB Enterprise', tier: 'Tier-1'})
            MERGE (db4:Database {name: 'redis-cache', id: 'redis-cache', engine: 'Redis 7.2', tier: 'Tier-1'})

            MERGE (s_auth)-[:USES]->(db4)
            MERGE (s_user)-[:USES]->(db1)
            MERGE (s_user)-[:USES]->(db4)
            MERGE (s_data)-[:USES]->(db1)
            MERGE (s_search)-[:USES]->(db2)
            MERGE (s_search)-[:USES]->(db3)
            MERGE (s_pay)-[:USES]->(db1)

            MERGE (repo1:Repository {name: 'acme-auth-service-repo', id: 'acme-auth-service-repo', url: 'github.com/acme-ai/auth-service', branch: 'main'})
            MERGE (repo2:Repository {name: 'acme-payments-repo', id: 'acme-payments-repo', url: 'github.com/acme-ai/payments-service', branch: 'main'})
            MERGE (repo3:Repository {name: 'acme-api-gateway-repo', id: 'acme-api-gateway-repo', url: 'github.com/acme-ai/api-gateway', branch: 'main'})
            MERGE (repo4:Repository {name: 'acme-frontend-repo', id: 'acme-frontend-repo', url: 'github.com/acme-ai/ekip-frontend', branch: 'main'})

            MERGE (s_auth)-[:PART_OF]->(repo1)
            MERGE (s_pay)-[:PART_OF]->(repo2)
            MERGE (s_gw)-[:PART_OF]->(repo3)

            MERGE (inf1:Infrastructure {name: 'aws-eks-us-east-1', id: 'aws-eks-us-east-1', provider: 'AWS EKS', region: 'us-east-1'})
            MERGE (inf2:Infrastructure {name: 'k8s-platform-cluster', id: 'k8s-platform-cluster', provider: 'Kubernetes', tier: 'Production'})
            MERGE (inf3:Infrastructure {name: 'cloudflare-cdn', id: 'cloudflare-cdn', provider: 'Cloudflare Enterprise', type: 'Edge Gateway'})

            MERGE (s_gw)-[:CONNECTS_TO]->(inf3)
            MERGE (s_auth)-[:DEPLOYED_AS]->(inf1)
            MERGE (s_pay)-[:DEPLOYED_AS]->(inf1)
            MERGE (s_data)-[:DEPLOYED_AS]->(inf2)

            MERGE (sec_alias:SecurityPolicy {name: 'Enterprise Zero-Trust Security & mTLS Standard', id: 'POL-ZT-001'})
            MERGE (t_sec)-[:MAINTAINS]->(sec_alias)
            MERGE (s_auth)-[:COMPLIES_WITH]->(sec_alias)
            MERGE (s_pay)-[:COMPLIES_WITH]->(sec_alias)
            MERGE (s_gw)-[:COMPLIES_WITH]->(sec_alias)

            MERGE (p1:Person {name: 'James Liu', email: 'james.liu@acmeai.com', role: 'Platform Lead'})
            MERGE (p2:Person {name: 'Aisha Johnson', email: 'aisha.johnson@acmeai.com', role: 'Backend Team Lead'})
            MERGE (p3:Person {name: 'Samantha Park', email: 'samantha.park@acmeai.com', role: 'Security Team Lead'})
            MERGE (p1)-[:OWNED_BY]->(s_gw)
            MERGE (p2)-[:OWNED_BY]->(s_auth)
            MERGE (p3)-[:OWNED_BY]->(sec_alias)
            """
        )

        # Create Document nodes and link to Services
        for doc in documents:
            doc_id = doc["id"]
            doc_title = doc["title"]
            doc_type = doc["doc_type"]
            svc_name = doc.get("service_name", "")

            await session.run(
                """
                MERGE (d:Document {id: $doc_id, title: $doc_title, type: $doc_type})
                """,
                doc_id=doc_id, doc_title=doc_title, doc_type=doc_type
            )

            if svc_name:
                await session.run(
                    """
                    MATCH (d:Document {id: $doc_id})
                    MATCH (s:Service)
                    WHERE toLower(s.name) = toLower($svc_name) OR toLower(s.id) = toLower($svc_name)
                    MERGE (d)-[:DOCUMENTS]->(s)
                    MERGE (d)-[:RELATES_TO]->(s)
                    """,
                    doc_id=doc_id, svc_name=svc_name
                )

        logger.info("Successfully populated Neo4j Knowledge Graph entities and relationships across all enterprise documents.")

    await driver.close()
    logger.info("EKIP Seeding Complete!")


if __name__ == "__main__":
    asyncio.run(seed_all())
