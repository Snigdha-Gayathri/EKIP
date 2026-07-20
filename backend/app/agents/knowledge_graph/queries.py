"""
Knowledge Graph Agent — Cypher Query Templates

Pre-built Cypher query templates for common enterprise relationship patterns.
The KG Agent uses LLM to select and parameterize the right template, or
generates custom Cypher when no template matches.
"""

# ---- Service Ownership & Dependencies ----

FIND_SERVICE_OWNER = """
MATCH (t:Team)-[:OWNS]->(s:Service)
WHERE toLower(s.name) CONTAINS toLower($entity_name)
OPTIONAL MATCH (e:Employee)-[:MANAGES]->(t)
RETURN s.name AS service, t.name AS team, t.department AS department,
       e.name AS team_lead, e.email AS lead_email
"""

FIND_SERVICE_DEPENDENCIES = """
MATCH (s:Service)-[:DEPENDS_ON]->(dep:Service)
WHERE toLower(s.name) CONTAINS toLower($entity_name)
OPTIONAL MATCH (dep)-[:EXPOSES]->(a:API)
RETURN s.name AS service, dep.name AS dependency,
       collect(DISTINCT a.name) AS exposed_apis
"""

FIND_SERVICE_DEPENDENTS = """
MATCH (dependent:Service)-[:DEPENDS_ON]->(s:Service)
WHERE toLower(s.name) CONTAINS toLower($entity_name)
RETURN s.name AS service, collect(dependent.name) AS dependent_services
"""

FIND_SERVICES_COMMUNICATION = """
MATCH (s1:Service)-[r:DEPENDS_ON|CONSUMED_BY*1..2]-(s2:Service)
WHERE toLower(s1.name) CONTAINS toLower($entity_name)
   OR toLower(s2.name) CONTAINS toLower($entity_name)
RETURN DISTINCT s1.name AS service1, s2.name AS service2,
       [rel in r | type(rel)] AS relationship_chain
"""

# ---- Team & Employee Queries ----

FIND_TEAM_MEMBERS = """
MATCH (e:Employee)-[:WORKS_IN]->(t:Team)
WHERE toLower(t.name) CONTAINS toLower($entity_name)
RETURN t.name AS team, collect({name: e.name, role: e.role, email: e.email}) AS members
"""

FIND_EMPLOYEE_TEAM = """
MATCH (e:Employee)-[:WORKS_IN]->(t:Team)
WHERE toLower(e.name) CONTAINS toLower($entity_name)
OPTIONAL MATCH (t)-[:OWNS]->(s:Service)
RETURN e.name AS employee, e.role AS role, t.name AS team,
       collect(DISTINCT s.name) AS team_services
"""

# ---- Document & Knowledge Queries ----

FIND_DOCUMENTS_FOR_SERVICE = """
MATCH (d:Document)-[:DOCUMENTS|RELATES_TO]->(s:Service)
WHERE toLower(s.name) CONTAINS toLower($entity_name) OR toLower(s.id) CONTAINS toLower($entity_name)
RETURN s.name AS service, collect({title: d.title, type: d.type, id: d.id}) AS documents
"""

FIND_DOCUMENTS_FOR_TOPIC = """
MATCH (d:Document)
WHERE toLower(d.title) CONTAINS toLower($entity_name)
   OR ANY(tag IN d.tags WHERE toLower(tag) CONTAINS toLower($entity_name))
   OR toLower(d.id) CONTAINS toLower($entity_name)
OPTIONAL MATCH (d)-[:DOCUMENTS|RELATES_TO]->(s:Service)
OPTIONAL MATCH (d)-[:REFERENCES]->(ref:Document)
RETURN d.title AS document, d.type AS doc_type,
       collect(DISTINCT s.name) AS related_services,
       collect(DISTINCT ref.title) AS referenced_docs
"""

# ---- Support & Customer Queries ----

FIND_TICKET_BY_ID = """
MATCH (st:SupportTicket)
WHERE st.id = $entity_name OR toLower(st.title) CONTAINS toLower($entity_name)
OPTIONAL MATCH (c:Customer)-[:FILED_BY]-(st)
OPTIONAL MATCH (st)-[:RELATES_TO]->(s:Service)
OPTIONAL MATCH (e:Employee)-[:REPORTED]-(st)
RETURN st.id AS ticket_id, st.title AS title, st.status AS status,
       st.priority AS priority, c.name AS customer,
       collect(DISTINCT s.name) AS related_services,
       collect(DISTINCT e.name) AS assigned_to
"""

FIND_CUSTOMER_TICKETS = """
MATCH (c:Customer)-[:FILED_BY]-(st:SupportTicket)
WHERE toLower(c.name) CONTAINS toLower($entity_name)
RETURN c.name AS customer, c.company AS company,
       collect({id: st.id, title: st.title, status: st.status, priority: st.priority}) AS tickets
"""

# ---- API Queries ----

FIND_SERVICE_APIS = """
MATCH (s:Service)-[:EXPOSES]->(a:API)
WHERE toLower(s.name) CONTAINS toLower($entity_name) OR toLower(s.id) CONTAINS toLower($entity_name)
RETURN s.name AS service,
       collect({name: a.name, method: a.method, path: a.path, version: a.version}) AS apis
"""

# ---- Deployment Queries ----

FIND_SERVICE_DEPLOYMENTS = """
MATCH (s:Service)-[:DEPLOYED_AS|DEPLOYED_VIA]->(d:Deployment)
WHERE toLower(s.name) CONTAINS toLower($entity_name) OR toLower(s.id) CONTAINS toLower($entity_name)
RETURN s.name AS service,
       collect({environment: d.environment, version: d.version, name: d.name, pipeline: d.pipeline,
                deployed_at: d.deployed_at, status: d.status}) AS deployments
"""

# ---- Graph Exploration (for visualization) ----

GET_ENTITY_NEIGHBORHOOD = """
MATCH (n)
WHERE n.id = $entity_id OR toLower(n.name) CONTAINS toLower($entity_name)
OPTIONAL MATCH (n)-[r]-(connected)
RETURN n, r, connected
LIMIT 50
"""

SEARCH_ENTITIES = """
MATCH (n)
WHERE toLower(n.name) CONTAINS toLower($search_term) OR toLower(n.id) CONTAINS toLower($search_term)
RETURN n.id AS id, labels(n)[0] AS type, n.name AS name,
       properties(n) AS properties
LIMIT 20
"""

# ---- Full Graph Overview (filtered) ----

GET_GRAPH_OVERVIEW = """
MATCH (n)-[r]->(m)
WHERE $node_types IS NULL OR labels(n)[0] IN $node_types
RETURN n.id AS source_id, labels(n)[0] AS source_type, n.name AS source_name,
       type(r) AS relationship,
       m.id AS target_id, labels(m)[0] AS target_type, m.name AS target_name
LIMIT 200
"""

# Query template registry for LLM selection
QUERY_TEMPLATES = {
    "service_owner": FIND_SERVICE_OWNER,
    "service_dependencies": FIND_SERVICE_DEPENDENCIES,
    "service_dependents": FIND_SERVICE_DEPENDENTS,
    "service_communication": FIND_SERVICES_COMMUNICATION,
    "team_members": FIND_TEAM_MEMBERS,
    "employee_team": FIND_EMPLOYEE_TEAM,
    "documents_for_service": FIND_DOCUMENTS_FOR_SERVICE,
    "documents_for_topic": FIND_DOCUMENTS_FOR_TOPIC,
    "ticket_by_id": FIND_TICKET_BY_ID,
    "customer_tickets": FIND_CUSTOMER_TICKETS,
    "service_apis": FIND_SERVICE_APIS,
    "service_deployments": FIND_SERVICE_DEPLOYMENTS,
    "entity_neighborhood": GET_ENTITY_NEIGHBORHOOD,
    "search_entities": SEARCH_ENTITIES,
    "graph_overview": GET_GRAPH_OVERVIEW,
}
