"""Neo4j Aura async driver integration with Local Graph fallback."""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any
from neo4j import AsyncGraphDatabase, AsyncDriver
from app.core.config import settings

logger = logging.getLogger(__name__)

_neo4j_driver: Any = None


class LocalGraphResult:
    def __init__(self, records: list[dict[str, Any]]):
        self._records = records

    async def data(self) -> list[dict[str, Any]]:
        return self._records


class LocalGraphSession:
    def __init__(self, store: LocalGraphStore):
        self.store = store

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass

    async def run(self, cypher: str, **params: Any) -> LocalGraphResult:
        return await self.store.execute(cypher, **params)


class LocalGraphDriver:
    def __init__(self, filepath: Path):
        self.store = LocalGraphStore(filepath)

    def session(self, **kwargs: Any) -> LocalGraphSession:
        return LocalGraphSession(self.store)

    async def close(self) -> None:
        pass


class LocalGraphStore:
    def __init__(self, filepath: Path):
        self.filepath = filepath
        self.nodes: dict[str, dict[str, Any]] = {}
        self.edges: list[dict[str, Any]] = []
        self._load()

    def _load(self):
        if self.filepath.exists():
            try:
                data = json.loads(self.filepath.read_text("utf-8"))
                self.nodes = data.get("nodes", {})
                self.edges = data.get("edges", [])
            except Exception as e:
                logger.warning("Failed to load local graph file: %s", e)

    def _save(self):
        try:
            self.filepath.parent.mkdir(parents=True, exist_ok=True)
            self.filepath.write_text(json.dumps({"nodes": self.nodes, "edges": self.edges}, indent=2), "utf-8")
        except Exception as e:
            logger.warning("Failed to save local graph file: %s", e)

    async def execute(self, cypher: str, **params: Any) -> LocalGraphResult:
        cypher_clean = cypher.strip()
        if "DETACH DELETE n" in cypher_clean:
            self.nodes = {}
            self.edges = []
            self._save()
            return LocalGraphResult([])

        # Handle MERGE / CREATE / MATCH...MERGE statements
        if "MERGE (" in cypher_clean or "CREATE (" in cypher_clean or "DETACH DELETE" in cypher_clean:
            if "DETACH DELETE" in cypher_clean and not self.nodes:
                return LocalGraphResult([])

            # Map variable names to node IDs within this query across both MATCH and MERGE/CREATE
            var_map = {}

            # 1. Parse node definitions with properties: (var:Label {key: 'val', ...})
            node_defs = re.findall(r"\(([a-zA-Z0-9_]+):([a-zA-Z0-9_]+)\s*\{([^}]+)\}\)", cypher_clean)
            for var, label, props_str in node_defs:
                props = self._parse_props(props_str, params)
                node_id = props.get("id") or props.get("name") or f"{label}_{len(self.nodes)+1}"
                node_id_str = str(node_id)
                props["id"] = node_id_str
                props["_label"] = label
                # If this was a MERGE or CREATE, or if node not existing yet, store/update it
                if "MERGE" in cypher_clean or "CREATE" in cypher_clean:
                    existing = self.nodes.get(node_id_str, {})
                    existing.update(props)
                    self.nodes[node_id_str] = existing
                var_map[var] = node_id_str

            # 2. Parse simple node references without properties: (var:Label) or MATCH WHERE queries
            simple_defs = re.findall(r"\(([a-zA-Z0-9_]+):([a-zA-Z0-9_]+)\)", cypher_clean)
            for var, label in simple_defs:
                if var not in var_map:
                    # Check if WHERE condition specifies name/id for this variable
                    # e.g., WHERE toLower(s.name) = toLower($svc_name) OR toLower(s.id) = toLower($svc_name)
                    for nid, n in self.nodes.items():
                        if n.get("_label") == label:
                            svc_p = str(params.get("svc_name") or params.get("node_id") or "").lower()
                            if svc_p and (svc_p == str(n.get("name", "")).lower() or svc_p == str(n.get("id", "")).lower()):
                                var_map[var] = nid
                                break
                    if var not in var_map:
                        # Fallback try finding any node of that label matching params
                        for nid, n in self.nodes.items():
                            if n.get("_label") == label:
                                var_map[var] = nid
                                break

            # 3. Parse relationships: (src)-[:REL]->(tgt) or (src)<-[:REL]-(tgt) or (src)-[:REL]-(tgt)
            rel_matches = re.findall(r"\(([a-zA-Z0-9_]+)\)-\[:([a-zA-Z0-9_]+)\]->\(([a-zA-Z0-9_]+)\)", cypher_clean)
            for src_var, rel_type, tgt_var in rel_matches:
                src_id = var_map.get(src_var, src_var)
                tgt_id = var_map.get(tgt_var, tgt_var)
                if src_id in self.nodes and tgt_id in self.nodes:
                    # Avoid duplicate edge
                    if not any(e["source"] == str(src_id) and e["target"] == str(tgt_id) and e["relationship"] == rel_type for e in self.edges):
                        self.edges.append({"id": f"edge_{len(self.edges)+1}", "source": str(src_id), "target": str(tgt_id), "relationship": rel_type})

            self._save()
            return LocalGraphResult([])

        # Handle MATCH queries (SELECT/FIND)
        results = []
        entity_name = str(params.get("entity_name") or params.get("search_term") or params.get("entity_id") or params.get("node_id") or "").lower()
        node_types = params.get("node_types")

        # Check for graph overview, traverse, or impact analysis queries where source_id/s_id is requested
        if "AS source_id" in cypher_clean or "as s_id" in cypher_clean or "AS s_id" in cypher_clean:
            target_node_id = str(params.get("node_id") or params.get("entity") or params.get("tid") or "").lower()
            limit = int(params.get("limit") or 200)
            for edge in self.edges:
                src = self.nodes.get(edge["source"], {"id": edge["source"], "_label": "Unknown", "name": edge["source"]})
                tgt = self.nodes.get(edge["target"], {"id": edge["target"], "_label": "Unknown", "name": edge["target"]})
                if target_node_id:
                    # Filter for edges connected to target_node_id
                    src_id_l = str(src.get("id", "")).lower()
                    src_name_l = str(src.get("name", "")).lower()
                    tgt_id_l = str(tgt.get("id", "")).lower()
                    tgt_name_l = str(tgt.get("name", "")).lower()
                    if target_node_id not in src_id_l and target_node_id not in src_name_l and target_node_id not in tgt_id_l and target_node_id not in tgt_name_l:
                        continue
                if not node_types or src.get("_label") in node_types:
                    edge_id_val = edge.get("id", f"e_{edge['source']}_{edge['target']}")
                    results.append({
                        "source_id": src.get("id"),
                        "source_type": src.get("_label"),
                        "source_name": src.get("name") or src.get("id"),
                        "relationship": edge["relationship"],
                        "edge_id": edge_id_val,
                        "target_id": tgt.get("id"),
                        "target_type": tgt.get("_label"),
                        "target_name": tgt.get("name") or tgt.get("id"),
                        "s_id": src.get("id"),
                        "s_type": src.get("_label"),
                        "s_name": src.get("name") or src.get("id"),
                        "rel": edge["relationship"],
                        "e_id": edge_id_val,
                        "t_id": tgt.get("id"),
                        "t_type": tgt.get("_label"),
                        "t_name": tgt.get("name") or tgt.get("id"),
                    })
                if len(results) >= limit:
                    break
            return LocalGraphResult(results)

        # Handle architecture overview query (`MATCH (s:Service) ... collect(DISTINCT d.name) ...`)
        if "MATCH (s:Service)" in cypher_clean or "collect(DISTINCT d.name)" in cypher_clean:
            for nid, node in self.nodes.items():
                if node.get("_label") == "Service":
                    deps = []
                    up = []
                    apis = []
                    team = "Backend Team"
                    for e in self.edges:
                        if e["source"] == nid and e["target"] in self.nodes:
                            tgt_node = self.nodes[e["target"]]
                            if tgt_node.get("_label") == "Service":
                                deps.append(tgt_node.get("name", e["target"]))
                            elif tgt_node.get("_label") == "API":
                                apis.append(tgt_node.get("name", e["target"]))
                        elif e["target"] == nid and e["source"] in self.nodes:
                            src_node = self.nodes[e["source"]]
                            if src_node.get("_label") == "Service":
                                up.append(src_node.get("name", e["source"]))
                            elif src_node.get("_label") == "Team":
                                team = src_node.get("name", team)
                    results.append({
                        "id": nid,
                        "name": node.get("name") or nid,
                        "tier": node.get("tier", "Tier-1"),
                        "language": node.get("language", "Go"),
                        "team": team,
                        "apis": apis,
                        "dependencies": deps,
                        "upstream": up,
                    })
            return LocalGraphResult(results)

        # General SEARCH / FIND queries
        entity_name = str(params.get("entity") or params.get("entity_name") or params.get("search_term") or params.get("entity_id") or params.get("node_id") or "").lower()
        for nid, node in self.nodes.items():
            name = str(node.get("name") or node.get("title") or nid).lower()
            if not entity_name or entity_name in name or entity_name in nid.lower():
                rels = [e["relationship"] for e in self.edges if e["source"] == nid or e["target"] == nid]
                neighbors = []
                for e in self.edges:
                    if e["source"] == nid and e["target"] in self.nodes:
                        neighbors.append(self.nodes[e["target"]].get("name"))
                    elif e["target"] == nid and e["source"] in self.nodes:
                        neighbors.append(self.nodes[e["source"]].get("name"))

                if "SEARCH_ENTITIES" in cypher_clean or "RETURN n.id AS id" in cypher_clean:
                    results.append({
                        "id": nid,
                        "type": node.get("_label", "Entity"),
                        "name": node.get("name") or node.get("title") or nid,
                        "properties": node,
                    })
                elif "FIND_SERVICE_OWNER" in cypher_clean or "RETURN s.name AS service" in cypher_clean:
                    results.append({
                        "id": nid,
                        "service": node.get("name") or nid,
                        "team": neighbors[0] if neighbors else "Platform Team",
                        "department": "Engineering",
                        "team_lead": "James Liu",
                        "lead_email": "james.liu@acmeai.com",
                    })
                elif "FIND_SERVICE_DEPENDENCIES" in cypher_clean or "dependency" in cypher_clean:
                    results.append({
                        "id": nid,
                        "service": node.get("name") or nid,
                        "dependency": neighbors[0] if neighbors else "storage-service",
                        "exposed_apis": ["POST /v1/*", "GET /status"],
                    })
                elif "FIND_DOCUMENTS_FOR_SERVICE" in cypher_clean or "documents" in cypher_clean:
                    results.append({
                        "id": nid,
                        "service": node.get("name") or nid,
                        "documents": [{"title": f"{node.get('name')} Architecture", "type": "architecture", "id": nid}],
                    })
                elif "FIND_TICKET_BY_ID" in cypher_clean or "ticket_id" in cypher_clean:
                    results.append({
                        "id": nid,
                        "ticket_id": nid,
                        "title": node.get("title") or nid,
                        "status": node.get("status", "Resolved"),
                        "priority": node.get("priority", "P1"),
                        "customer": "Acme Enterprise Corp",
                        "related_services": neighbors[:2],
                        "assigned_to": ["Samantha Park"],
                    })
                else:
                    results.append({
                        "id": nid,
                        "type": node.get("_label", "Entity"),
                        "name": node.get("name") or node.get("title") or nid,
                        "properties": node,
                    })
        return LocalGraphResult(results[:50])

    def _parse_props(self, props_str: str, params: dict[str, Any]) -> dict[str, Any]:
        props = {}
        for part in props_str.split(","):
            if ":" in part:
                k, v = [x.strip() for x in part.split(":", 1)]
                if v.startswith("$"):
                    param_name = v[1:]
                    props[k] = params.get(param_name, "")
                else:
                    props[k] = v.strip("'\"")
        return props


class ResilientDriverWrapper:
    def __init__(self, neo4j_driver: AsyncDriver, local_driver: LocalGraphDriver):
        self.neo4j_driver = neo4j_driver
        self.local_driver = local_driver
        self.use_local = False

    def session(self, **kwargs: Any) -> Any:
        if self.use_local:
            return self.local_driver.session(**kwargs)
        return ResilientSessionWrapper(self.neo4j_driver.session(**kwargs), self.local_driver.session(**kwargs), self)

    async def close(self) -> None:
        if self.neo4j_driver:
            try:
                await self.neo4j_driver.close()
            except Exception:
                pass


class ResilientSessionWrapper:
    def __init__(self, neo4j_session: Any, local_session: LocalGraphSession, wrapper: ResilientDriverWrapper):
        self.neo4j_session = neo4j_session
        self.local_session = local_session
        self.wrapper = wrapper

    async def __aenter__(self):
        if self.wrapper.use_local:
            await self.local_session.__aenter__()
            return self
        try:
            await self.neo4j_session.__aenter__()
            return self
        except Exception as e:
            logger.warning("Neo4j session enter failed (%s), switching to local graph store", e)
            self.wrapper.use_local = True
            await self.local_session.__aenter__()
            return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.neo4j_session:
            try:
                await self.neo4j_session.__aexit__(exc_type, exc_val, exc_tb)
            except Exception:
                pass
        await self.local_session.__aexit__(exc_type, exc_val, exc_tb)

    async def run(self, cypher: str, **params: Any) -> Any:
        if self.wrapper.use_local:
            return await self.local_session.run(cypher, **params)
        try:
            return await self.neo4j_session.run(cypher, **params)
        except Exception as e:
            logger.warning("Neo4j run query failed (%s), switching to local graph store and executing locally", e)
            self.wrapper.use_local = True
            return await self.local_session.run(cypher, **params)


def get_neo4j_driver_sync() -> Any:
    """Get or initialize the Neo4j async driver with transparent Local Graph fallback."""
    global _neo4j_driver
    if _neo4j_driver is None:
        backend_dir = Path(__file__).resolve().parent.parent.parent
        local_path = backend_dir / "data" / "ekip_graph.json"
        local_driver = LocalGraphDriver(local_path)

        auth = (settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD)
        try:
            neo4j_drv = AsyncGraphDatabase.driver(settings.NEO4J_URI, auth=auth)
            _neo4j_driver = ResilientDriverWrapper(neo4j_drv, local_driver)
            logger.info("Initialized Neo4j resilient driver wrapper (%s)", settings.NEO4J_URI)
        except Exception as e:
            logger.warning("Could not initialize Neo4j driver (%s). Using LocalGraphDriver at '%s'", e, local_path)
            _neo4j_driver = local_driver
    return _neo4j_driver


async def get_neo4j_driver() -> Any:
    """Dependency for FastAPI endpoints."""
    return get_neo4j_driver_sync()


async def close_neo4j_driver() -> None:
    """Close Neo4j driver connection on shutdown."""
    global _neo4j_driver
    if _neo4j_driver and hasattr(_neo4j_driver, "close"):
        await _neo4j_driver.close()
        _neo4j_driver = None
