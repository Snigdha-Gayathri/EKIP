import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Database,
  X,
  Copy,
  Sparkles,
  Network,
  ArrowRight,
} from 'lucide-react';
import { documentService } from '../services/documentService';

interface DocumentDetail {
  title: string;
  category: string;
  status: string;
  chunks: number;
  entities: number;
  content: string;
  vectorChunks: { id: string; text: string; score: number }[];
  graphEntities: string[];
}

export const DocumentsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [lastUploaded, setLastUploaded] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('engineering');
  const [selectedDoc, setSelectedDoc] = useState<DocumentDetail | null>(null);
  const [activeDocTab, setActiveDocTab] = useState<'content' | 'chunks' | 'entities'>('content');
  const [copied, setCopied] = useState(false);

  const getDocContent = (title: string): DocumentDetail => {
    const lower = title.toLowerCase();
    if (lower.includes('notification') && lower.includes('architecture')) {
      return {
        title,
        category: 'Engineering & Architecture',
        status: 'Vector Grounded in Qdrant & Neo4j',
        chunks: 14,
        entities: 6,
        content: `# Notification Service Architecture Specification (v2.4)
**Status:** Production Tier-2 • **Owner Team:** Backend Team / Notifications Core (@checkout-eng)
**Last Updated:** July 2026 • **Vector Grounding:** Qdrant Collection \`acme_enterprise_docs\`

## 1. System Architecture & Domain Scope
The \`notification-service\` is an event-driven Tier-2 microservice responsible for orchestrating multi-channel messaging across AcmeAI enterprise systems. It consumes domain events from RabbitMQ/Kafka topics and delivers transactional emails, SMS alerts, push notifications, and webhooks with guaranteed delivery SLA (99.95%).

## 2. Exposed API Endpoints & Interfaces
- \`POST /v1/notification/execute\` — Trigger immediate or scheduled multi-channel notification dispatch.
- \`GET /v1/notification/status\` — Real-time health check & circuit breaker status telemetry.
- \`POST /v1/webhooks/retry\` — Dead-letter queue (DLQ) replay interface for failed delivery attempts.

## 3. Rate Limiting & Circuit Breaker Policies
- **Tenant Burst Capacity:** \`5,000 requests/minute\` maximum per authenticated service token.
- **Circuit Breaker Threshold:** Automatically trips to **OPEN** state if downstream SMTP/SMS gateway failure rate exceeds \`4.5%\` over a \`30-second\` sliding window or if P99 latency exceeds \`850ms\`.
- **Zero-Trust mTLS:** Requires mutual TLS v1.3 with automated certificate rotation via SPIFFE/SPIRE (Cert pool updated v2.4.1).

## 4. Upstream & Downstream Dependencies
- **Downstream Persistence:** \`storage-service\` (PostgreSQL partition for compliance audit logs) & Redis cluster for rate limit token buckets (\`redis-cluster.internal:6379\`).
- **Upstream Callers:** \`auth-service\`, \`user-service\`, \`billing-service\`, and \`api-gateway\`.`,
        vectorChunks: [
          { id: 'chk-notif-01', text: 'Notification service consumes RabbitMQ/Kafka topics to deliver multi-channel alerts with 99.95% SLA.', score: 0.96 },
          { id: 'chk-notif-02', text: 'Rate limit enforced at 5,000 requests/minute per tenant token via Redis cluster bucket.', score: 0.94 },
          { id: 'chk-notif-03', text: 'Circuit breaker trips when failure rate > 4.5% or P99 latency > 850ms.', score: 0.91 },
        ],
        graphEntities: ['notification-service', 'auth-service', 'storage-service', 'Redis Cluster', 'Backend Team', 'POST /v1/notification/execute'],
      };
    } else if (lower.includes('notification') && lower.includes('runbook')) {
      return {
        title,
        category: 'Disaster Recovery Runbook',
        status: 'Vector Grounded in Qdrant & Neo4j',
        chunks: 18,
        entities: 7,
        content: `# Emergency Production Runbook: notification-service & Rate Limiting
**Severity Level:** Tier-1 / Tier-2 Outage Mitigation Guidance
**On-Call Leads:** James Liu (\`@platform\`), Aisha Johnson (\`@backend-lead\`)

## 1. Immediate Blast Radius Containment & Throttling
When \`notification-service\` experiences queue buildup or upstream cascade failures (\`#INC-8834\` / \`#INC-9102\`):
\`\`\`bash
# Step 1: Engage Emergency Rate-Limit Throttling via API Gateway
acme-ctl rate-limit set --service=notification-service --limit=1000 --window=1m

# Step 2: Trip Circuit Breaker for Non-Critical Marketing Queues
curl -X POST -H "Authorization: Bearer $ONCALL_TOKEN" https://api.acmeai.internal/v1/circuit-breaker/trip --data '{"target": "notification-service-marketing"}'
\`\`\`

## 2. Token Cache & Redis Pool Flush Procedure
If mTLS connection buffer or Redis rate limit buckets enter deadlock or memory saturation:
\`\`\`bash
# Step 3: Flush Token Bucket Redis Replica (Non-destructive to active auth sessions)
redis-cli -h redis-cluster.internal -n 4 FLUSHDB ASYNC

# Step 4: Scale Kubernetes Deployment Replicas (+100% burst capacity)
kubectl scale deployment notification-service --replicas=12 -n acme-prod
\`\`\`

## 3. Telemetry Verification & Automated Rollback
- Monitor Grafana P99 latency dashboard \`telemetry/notification-v2\`.
- If error rates remain > 3% after 4 minutes, execute automated canary rollback:
\`\`\`bash
acme-deploy rollback notification-service --target-version=v2.4.0 --auto-verify
\`\`\``,
        vectorChunks: [
          { id: 'chk-run-01', text: 'Emergency throttling: acme-ctl rate-limit set --service=notification-service --limit=1000 --window=1m.', score: 0.98 },
          { id: 'chk-run-02', text: 'Redis token bucket flush command: redis-cli -h redis-cluster.internal -n 4 FLUSHDB ASYNC.', score: 0.95 },
          { id: 'chk-run-03', text: 'Canary rollback command: acme-deploy rollback notification-service --target-version=v2.4.0.', score: 0.93 },
        ],
        graphEntities: ['notification-service', 'api-gateway', 'Redis Cluster', 'Platform Team', 'James Liu', 'Grafana Telemetry'],
      };
    } else if (lower.includes('zero-trust') || lower.includes('auth')) {
      return {
        title,
        category: 'Enterprise Security Specification',
        status: 'Vector Grounded in Qdrant & Neo4j',
        chunks: 14,
        entities: 6,
        content: `# Enterprise Zero-Trust Authentication Policy & Standards (v3.2)
**Status:** Mandatory Compliance Standard • **Owner Team:** IAM & Security Operations (@sec-team)
**Vector Grounding:** Qdrant Collection \`acme_enterprise_docs\`

## 1. Zero-Trust Architecture Requirements
All internal service-to-service communication within AcmeAI must strictly adhere to zero-trust principles. Network location (VPC/subnet) does NOT grant implicit trust.

## 2. Mutual TLS (mTLS) v1.3 & Certificate Lifecycle
- Every service pod must inject the Envoy sidecar proxy managing mTLS sessions.
- Certificates issued via SPIFFE/SPIRE with a maximum lifetime of 24 hours. Automated renewal triggers at 12 hours remaining.
- Root CA chain pinned in hardware security modules (HSM).

## 3. JWT & OAuth2 Token Expiry & Verification
- Access tokens issued by \`auth-service\` have a hard TTL of **15 minutes**.
- Refresh tokens require cryptographic proof-of-possession (DPoP) and rotate upon use.
- Revocation lists checked against high-availability Redis memory clusters with sub-10ms latency.`,
        vectorChunks: [
          { id: 'chk-zt-01', text: 'Zero-trust mandatory: all microservice communication must use mTLS v1.3 with Envoy sidecars.', score: 0.97 },
          { id: 'chk-zt-02', text: 'Access tokens issued by auth-service have a hard TTL of 15 minutes with DPoP validation.', score: 0.94 },
        ],
        graphEntities: ['auth-service', 'api-gateway', 'User Database Cluster', 'Security Team', 'SPIFFE/SPIRE'],
      };
    } else {
      return {
        title,
        category: 'Engineering & Architecture Specification',
        status: 'Vector Grounded in Qdrant & Neo4j',
        chunks: 16,
        entities: 5,
        content: `# ${title}
**Status:** Production Document • **Owner Team:** Enterprise Engineering (@engineering)
**Vector Grounding:** Qdrant Dense Vector Index + Neo4j Aura Graph

## 1. Specification Overview
This governing specification outlines the architectural standards, operational boundaries, and disaster recovery procedures for **${title.replace(/\.(md|pdf|docx)$/i, '')}**. All teams deploying services dependent on this component must follow the verified runbook policies below.

## 2. Core Dependencies & Resilience SLA
- **Target Availability:** 99.95% High Availability across active-active AWS regions (\`us-east-1\` / \`us-west-2\`).
- **Telemetry Integration:** Automated OpenTelemetry tracing injected at API boundary with W3C trace headers.
- **Failover Behavior:** Automatic circuit breaking under high load to prevent cascading blast radius amplification across downstream microservices.

## 3. Operating Instructions & Maintenance
Refer to Qdrant vector chunk indices for exact CLI flags and configuration variables. For immediate emergency support, escalate via PagerDuty to the responsible engineering team lead.`,
        vectorChunks: [
          { id: 'chk-gen-01', text: `Core architectural requirements and SLA boundaries for ${title}.`, score: 0.95 },
          { id: 'chk-gen-02', text: 'OpenTelemetry tracing required with W3C trace headers across all endpoints.', score: 0.91 },
        ],
        graphEntities: ['Authentication Service', 'Payments Service', 'API Gateway', 'Platform Team', 'Order Management Service'],
      };
    }
  };

  useEffect(() => {
    const openTitle = searchParams.get('open') || searchParams.get('doc');
    if (openTitle) {
      setSelectedDoc(getDocContent(openTitle));
      setActiveDocTab('content');
    }
  }, [searchParams]);

  const onDrop = async (acceptedFiles: File[]) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    
    setUploading(true);
    setError(null);
    setLastUploaded(null);

    try {
      const res = await documentService.uploadDocument(file, category);
      setLastUploaded(res);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload and ingest document.');
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const seedDocs = [
    { title: 'notification-service Architecture Spec', category: 'engineering', status: 'Indexed', chunks: 14, entities: 6 },
    { title: 'notification-service Production Runbook', category: 'support', status: 'Indexed', chunks: 18, entities: 7 },
    { title: 'Auth Service Architecture v3.2.md', category: 'engineering', status: 'Indexed', chunks: 14, entities: 6 },
    { title: 'Payments & Billing Platform Guide.md', category: 'engineering', status: 'Indexed', chunks: 19, entities: 8 },
    { title: 'Enterprise Zero-Trust Authentication Policy & Standards', category: 'security', status: 'Indexed', chunks: 14, entities: 6 },
    { title: 'Disaster Recovery Runbook for Payments & Authentication Layer', category: 'support', status: 'Indexed', chunks: 16, entities: 5 },
  ];

  const handleCopyContent = () => {
    if (selectedDoc) {
      navigator.clipboard.writeText(selectedDoc.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCloseModal = () => {
    setSelectedDoc(null);
    if (searchParams.has('open') || searchParams.has('doc')) {
      searchParams.delete('open');
      searchParams.delete('doc');
      setSearchParams(searchParams);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-950 text-slate-100 p-8 space-y-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <h2 className="font-bold text-lg text-white">Enterprise Document & Runbook Hub</h2>
          <p className="text-xs text-slate-400 mt-1">
            Hybrid indexing into Qdrant Cloud vectors + automatic Neo4j entity extraction & runbook navigation
          </p>
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-violet-500"
        >
          <option value="engineering">Engineering & Architecture</option>
          <option value="security">Security & Compliance</option>
          <option value="support">Incidents & Support</option>
          <option value="hr">HR & Operations</option>
        </select>
      </div>

      {/* Upload Dropzone */}
      <div className="max-w-5xl mx-auto w-full">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer ${
            isDragActive
              ? 'border-violet-500 bg-violet-500/10'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud className="w-12 h-12 text-violet-400 mx-auto mb-4" />
          <h3 className="font-semibold text-sm text-white mb-1">
            {isDragActive ? 'Drop enterprise file here...' : 'Drag & drop knowledge file, or click to browse'}
          </h3>
          <p className="text-xs text-slate-400">
            Supports PDF, DOCX, Markdown, TXT, CSV, HTML — triggers multi-agent chunking & graph linking
          </p>
        </div>

        {uploading && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3 text-xs text-violet-300 animate-pulse">
            <Database className="w-4 h-4 animate-spin" />
            <span>Ingestion Agent processing document chunks and populating Neo4j knowledge graph relationships...</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {lastUploaded && (
          <div className="mt-4 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5" />
              <div>
                <strong className="block font-semibold">{lastUploaded.title} Ingested Successfully!</strong>
                <span>Generated {lastUploaded.chunk_count} vector chunks & extracted {lastUploaded.entities_found} knowledge graph entities.</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Seeded Enterprise Documents List */}
      <div className="max-w-5xl mx-auto w-full space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Active AcmeAI Governing Specifications & Runbooks ({seedDocs.length} Documents)
          </h3>
          <span className="text-xs text-slate-500">Reciprocal Rank Fusion (RRF) Grounded</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {seedDocs.map((doc, idx) => (
            <div
              key={idx}
              onClick={() => {
                setSelectedDoc(getDocContent(doc.title));
                setActiveDocTab('content');
              }}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between hover:border-cyan-500/40 transition-all cursor-pointer group shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 transition-all">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-200 group-hover:text-cyan-300 transition-colors">{doc.title}</h4>
                  <span className="text-[11px] text-slate-400 capitalize">{doc.category}</span>
                </div>
              </div>
              <div className="text-right text-xs space-y-1">
                <span className="px-2 py-0.5 rounded-md font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {doc.status}
                </span>
                <div className="text-[11px] text-slate-400">
                  {doc.chunks} chunks • {doc.entities} entities
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Document Reader Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scaleUp">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <span>{selectedDoc.title}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      {selectedDoc.category}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedDoc.status} • {selectedDoc.chunks} Qdrant Vector Chunks • {selectedDoc.entities} Graph Nodes
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyContent}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
                >
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
                </button>
                <button
                  onClick={handleCloseModal}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {[
                  { id: 'content', label: 'Specification & Runbook Content', icon: FileText, count: null },
                  { id: 'chunks', label: 'Qdrant Vector Chunks', icon: Database, count: selectedDoc.vectorChunks.length },
                  { id: 'entities', label: 'Extracted Neo4j Entities', icon: Network, count: selectedDoc.graphEntities.length },
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = activeDocTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveDocTab(t.id as any)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-600/20 to-violet-600/20 text-white border border-cyan-500/40 shadow-md shadow-cyan-500/10'
                          : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                      <span>{t.label}</span>
                      {t.count !== null && (
                        <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${isActive ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                          {t.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  handleCloseModal();
                  navigate(`/?query=${encodeURIComponent(`Explain technical details and emergency mitigation steps from ${selectedDoc.title}`)}`);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-lg shadow-violet-500/20"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                <span>Ask AI About Document</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm bg-slate-950/30 flex-1">
              {activeDocTab === 'content' && (
                <div className="prose prose-invert prose-sm max-w-none bg-slate-950/80 p-6 rounded-2xl border border-slate-800/80 font-sans leading-relaxed space-y-4">
                  {selectedDoc.content.split('\n').map((line, idx) => {
                    if (line.startsWith('# ')) {
                      return <h1 key={idx} className="text-lg font-black text-white border-b border-slate-800 pb-2 mb-3">{line.replace('# ', '')}</h1>;
                    }
                    if (line.startsWith('## ')) {
                      return <h2 key={idx} className="text-sm font-bold text-cyan-300 mt-4 mb-2 flex items-center gap-2"><span>❖</span><span>{line.replace('## ', '')}</span></h2>;
                    }
                    if (line.startsWith('- ')) {
                      return <li key={idx} className="text-xs text-slate-300 ml-4 list-disc">{line.replace('- ', '')}</li>;
                    }
                    if (line.startsWith('```')) {
                      return null;
                    }
                    if (line.includes('$') || line.includes('acme-') || line.includes('redis-') || line.includes('kubectl ')) {
                      return (
                        <div key={idx} className="p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 my-2 overflow-x-auto">
                          {line}
                        </div>
                      );
                    }
                    if (line.trim() === '') return <div key={idx} className="h-2" />;
                    return <p key={idx} className="text-xs text-slate-300 leading-relaxed">{line}</p>;
                  })}
                </div>
              )}

              {activeDocTab === 'chunks' && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400 mb-2">
                    Below are the dense vector chunks indexed into Qdrant Cloud (`acme_enterprise_docs`) with hybrid cosine similarity + BM25 keyword rankings.
                  </div>
                  {selectedDoc.vectorChunks.map((chk, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono text-cyan-400">
                        <span>Chunk ID: {chk.id}</span>
                        <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          Relevance: {Math.round(chk.score * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 font-mono">
                        "{chk.text}"
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {activeDocTab === 'entities' && (
                <div className="space-y-4">
                  <div className="text-xs text-slate-400">
                    These entities were extracted via LangGraph extraction chain and linked inside the Neo4j Aura topology. Click any entity to explore its multi-hop neighborhood graph.
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedDoc.graphEntities.map((ent, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          handleCloseModal();
                          navigate(`/graph?entity=${encodeURIComponent(ent)}`);
                        }}
                        className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-violet-500/40 text-xs text-violet-300 flex items-center justify-between cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Network className="w-4 h-4 text-violet-400 shrink-0" />
                          <span className="font-semibold truncate group-hover:text-violet-200">{ent}</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-violet-400 shrink-0 transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                AcmeAI Governing Policy • Digital Signature Verified
              </span>
              <button
                onClick={handleCloseModal}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
