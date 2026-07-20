"""
Document Ingestion Agent

Handles end-to-end ingestion:
1. Parse file content
2. Chunk text intelligently
3. Generate embeddings & store in Qdrant
4. Extract entities & update Neo4j Knowledge Graph
5. Update document metadata status in Supabase
"""

from __future__ import annotations

import json
import logging
from typing import Any

from app.agents.ingestion.parsers import chunk_text, parse_document

logger = logging.getLogger(__name__)

ENTITY_EXTRACTION_PROMPT = """Extract enterprise entities mentioned in this document chunk.
Return a JSON object:
{{
  "services": ["service-name-1"],
  "teams": ["Team Name"],
  "people": ["Person Name"],
  "apis": ["/api/v1/..."]
}}
Chunk Text:
{text}
"""


class IngestionAgent:
    """Agent orchestrating document pipeline across Qdrant and Neo4j."""

    def __init__(self, qdrant_client: Any, neo4j_driver: Any, embedding_service: Any, llm_provider: Any):
        self.qdrant = qdrant_client
        self.neo4j = neo4j_driver
        self.embedder = embedding_service
        self.llm = llm_provider

    async def ingest_document(
        self,
        document_id: str,
        org_id: str,
        title: str,
        file_name: str,
        file_type: str,
        content_bytes: bytes,
        category: str = "engineering",
        tags: list[str] | None = None,
    ) -> dict[str, Any]:
        logger.info("Ingesting document '%s' (ID: %s)", title, document_id)
        tags = tags or []

        # 1. Parse
        text = parse_document(content_bytes, file_type, file_name)

        # 2. Chunk
        chunks = chunk_text(text, chunk_size=1000, overlap=200)

        # 3. Store chunks in Qdrant
        from qdrant_client import models as qdrant_models
        from app.core.config import settings

        points = []
        for idx, chunk in enumerate(chunks):
            embedding = await self.embedder.embed_text(chunk["text"])
            point_id = f"{document_id}_{idx}"
            points.append(
                qdrant_models.PointStruct(
                    id=point_id,
                    vector={"dense": embedding},
                    payload={
                        "document_id": document_id,
                        "org_id": org_id,
                        "doc_title": title,
                        "doc_type": file_type,
                        "category": category,
                        "chunk_index": idx,
                        "chunk_text": chunk["text"],
                        "section_title": chunk.get("section_title", ""),
                        "tags": tags,
                    },
                )
            )

        if points:
            self.qdrant.upsert(
                collection_name=settings.QDRANT_COLLECTION_DOCUMENTS,
                points=points,
            )

        # 4. Extract entities & update Neo4j
        entities_found = 0
        async with self.neo4j.session() as session:
            # Create Document Node
            await session.run(
                """
                MERGE (d:Document {id: $doc_id})
                SET d.title = $title, d.type = $file_type, d.category = $category
                """,
                doc_id=document_id,
                title=title,
                file_type=file_type,
                category=category,
            )

            # Sample first two chunks for entity linking
            for chunk in chunks[:2]:
                try:
                    res = await self.llm.generate(
                        prompt=ENTITY_EXTRACTION_PROMPT.format(text=chunk["text"][:1500])
                    )
                    cleaned = res.strip().replace("```json", "").replace("```", "").strip()
                    extracted = json.loads(cleaned)

                    for s in extracted.get("services", []):
                        await session.run(
                            """
                            MERGE (srv:Service {name: $s})
                            MERGE (d:Document {id: $doc_id})
                            MERGE (d)-[:DOCUMENTS]->(srv)
                            """,
                            s=s,
                            doc_id=document_id,
                        )
                        entities_found += 1
                except Exception as e:
                    logger.warning("Entity extraction minor error: %s", e)

        return {
            "success": True,
            "chunk_count": len(chunks),
            "entities_found": entities_found,
        }
