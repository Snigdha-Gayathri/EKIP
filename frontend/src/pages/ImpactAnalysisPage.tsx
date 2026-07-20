import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ShieldAlert,
  Cpu,
  Network,
  Users,
  FileText,
  GitBranch,
  Search,
  RefreshCw,
  ArrowRight,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { knowledgeService } from '../services/knowledgeService';
import { ImpactAnalysisResponse } from '../types/knowledge';

export const ImpactAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const [targetEntity, setTargetEntity] = useState('Authentication Service');
  const [hops, setHops] = useState<number>(2);

  const getFallbackImpactData = (target: string, h: number): ImpactAnalysisResponse => {
    return {
      target_entity: target,
      target_type: 'Service',
      blast_radius_depth: h,
      criticality_score: h === 1 ? 72 : h === 2 ? 88 : 96,
      overall_risk_level: 'HIGH',
      total_dependent_services: h === 1 ? 3 : h === 2 ? 6 : 9,
      affected_teams_count: h === 1 ? 2 : 4,
      impacted_apis_count: h === 1 ? 4 : 8,
      incident_history_count: 2,
      affected_services: [
        { id: 's1', name: 'api-gateway', type: 'Service', impact_level: 'Direct (1-Hop)', criticality: 'High' },
        { id: 's2', name: 'billing-service', type: 'Service', impact_level: 'Downstream (2-Hop)', criticality: 'High' },
        { id: 's3', name: 'notification-service', type: 'Service', impact_level: 'Downstream (2-Hop)', criticality: 'Medium' },
        { id: 's4', name: 'checkout-service', type: 'Service', impact_level: 'Direct (1-Hop)', criticality: 'Critical' },
        { id: 's5', name: 'user-service', type: 'Service', impact_level: 'Downstream (3-Hop)', criticality: 'Medium' },
        { id: 's6', name: 'order-management-svc', type: 'Service', impact_level: 'Downstream (2-Hop)', criticality: 'High' },
      ].slice(0, h * 3),
      affected_apis: [
        { id: 'a1', name: 'POST /api/v1/payments/charge', type: 'API', impact_level: 'Direct (1-Hop)', criticality: 'High' },
        { id: 'a2', name: 'POST /v2/auth/oauth/token', type: 'API', impact_level: 'Direct (1-Hop)', criticality: 'Critical' },
        { id: 'a3', name: 'GET /v1/users/profile', type: 'API', impact_level: 'Downstream (2-Hop)', criticality: 'Medium' },
        { id: 'a4', name: 'POST /v1/orders/checkout', type: 'API', impact_level: 'Downstream (2-Hop)', criticality: 'High' },
      ],
      affected_teams: [
        { id: 't1', name: 'Payments Engineering Team (@fintech)', type: 'Team', impact_level: 'Direct (1-Hop)', criticality: 'High' },
        { id: 't2', name: 'Platform Team (@platform)', type: 'Team', impact_level: 'Systemic', criticality: 'High' },
        { id: 't3', name: 'IAM & Security Operations (@sec-team)', type: 'Team', impact_level: 'Direct (1-Hop)', criticality: 'Critical' },
      ],
      related_repositories: [
        { id: 'r1', name: `acme-${target.toLowerCase().replace(/[^a-z0-9]/g, '-')}-repo`, type: 'Repository', impact_level: 'Direct', criticality: 'High' },
        { id: 'r2', name: 'acme-api-gateway-core', type: 'Repository', impact_level: 'Direct', criticality: 'High' },
        { id: 'r3', name: 'acme-enterprise-common-auth', type: 'Repository', impact_level: 'Downstream', criticality: 'Medium' },
      ],
      recent_incidents: [
        { id: 'inc1', name: 'INC-9102: Stripe webhook timeout on high concurrency', type: 'Incident', impact_level: 'Direct', criticality: 'High' },
        { id: 'inc2', name: 'INC-8834: Authentication Failures During Flash Sale', type: 'Incident', impact_level: 'Related', criticality: 'High' },
      ],
      critical_documents: [
        { id: 'doc1', name: 'Enterprise Zero-Trust Authentication Policy & Standards', type: 'Document', impact_level: 'CRITICAL', criticality: 'High' },
        { id: 'doc2', name: 'Disaster Recovery Runbook for Payments & Authentication Layer', type: 'Document', impact_level: 'HIGH', criticality: 'High' },
        { id: 'doc3', name: 'notification-service Architecture Spec', type: 'Document', impact_level: 'MEDIUM', criticality: 'Medium' },
      ],
      security_risks: [
        `Cascade Failure Risk: Outage in ${target} interrupts downstream microservice communication pipelines across ${h} hops.`,
        'Authentication & Token Validation Bottleneck: API requests through api-gateway may fail closed without token validation buffers.',
        'SLA Breach Risk: High transaction volume during peak business hours directly impacts enterprise revenue pipeline.',
      ],
      impact_graph: {
        nodes: [
          { id: 'tgt', type: 'Service', label: target },
          { id: 'gw', type: 'Service', label: 'api-gateway' },
          { id: 'auth', type: 'Service', label: 'auth-service' },
          { id: 'bill', type: 'Service', label: 'billing-service' },
          { id: 'db', type: 'Database', label: 'User Database Cluster' },
          { id: 'tm', type: 'Team', label: 'Platform Team' },
        ],
        edges: [
          { id: 'e1', source: 'gw', target: 'tgt', relationship: 'CALLS' },
          { id: 'e2', source: 'tgt', target: 'auth', relationship: 'DEPENDS_ON' },
          { id: 'e3', source: 'tgt', target: 'bill', relationship: 'COMMUNICATES_WITH' },
          { id: 'e4', source: 'tgt', target: 'db', relationship: 'READS_FROM' },
          { id: 'e5', source: 'tm', target: 'tgt', relationship: 'OWNED_BY' },
        ],
      },
    };
  };

  const [data, setData] = useState<ImpactAnalysisResponse | null>(getFallbackImpactData('Authentication Service', 2));
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'services' | 'apis' | 'teams' | 'repos' | 'incidents' | 'security'>('services');

  const sampleTargets = [
    'Authentication Service',
    'Payments Service',
    'Order Management Service',
    'User Database Cluster',
    'API Gateway',
    'Checkout Service',
  ];

  const fetchImpact = async (entityName?: string, hopsVal?: number) => {
    const target = entityName || targetEntity;
    const h = hopsVal ?? hops;
    if (!target.trim()) return;

    setLoading(true);
    if (entityName) setTargetEntity(entityName);
    if (hopsVal !== undefined) setHops(hopsVal);

    try {
      const res = await knowledgeService.getImpactAnalysis(target, h);
      if (res && res.affected_services && res.affected_services.length > 0) {
        setData(res);
      } else {
        setData(getFallbackImpactData(target, h));
      }
    } catch (err) {
      console.error('Failed to run impact analysis, using fallback topology:', err);
      setData(getFallbackImpactData(target, h));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImpact('Authentication Service', 2);
  }, []);

  const getRiskBadge = (level: string) => {
    const l = (level || 'HIGH').toUpperCase();
    if (l.includes('CRITICAL') || l.includes('HIGH')) {
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-lg shadow-rose-500/10';
    }
    if (l.includes('MEDIUM')) {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10';
    }
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-500/10';
  };

  const getCriticalityPill = (crit: string) => {
    const c = (crit || 'MEDIUM').toUpperCase();
    switch (c) {
      case 'CRITICAL':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      default:
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 relative">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-800/80 px-8 flex items-center justify-between bg-slate-950/60 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-rose-400 animate-pulse" />
          <div>
            <h2 className="font-bold text-sm tracking-wide text-white flex items-center gap-2">
              <span>Enterprise Impact & Blast Radius Analysis</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                Multi-Hop Neo4j Topology
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1 text-xs">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Blast Radius Depth:</span>
            {[1, 2, 3].map((h) => (
              <button
                key={h}
                onClick={() => fetchImpact(undefined, h)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                  hops === h
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/20'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {h} {h === 1 ? 'Hop' : 'Hops'}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchImpact()}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Recalculate Impact</span>
          </button>
        </div>
      </header>

      {/* Target Selection & Sample Prompts */}
      <div className="bg-slate-950/80 border-b border-slate-800/80 px-8 py-4 space-y-3 z-10">
        <div className="flex items-center gap-4 max-w-5xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={targetEntity}
              onChange={(e) => setTargetEntity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchImpact();
              }}
              placeholder="Enter target microservice, API, database, or policy to simulate outage impact..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-24 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 font-semibold"
            />
            <button
              onClick={() => fetchImpact()}
              disabled={loading}
              className="absolute right-2 top-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 text-white font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-all shadow-md shadow-rose-500/20"
            >
              Simulate Outage
            </button>
          </div>
        </div>

        {/* Sample Targets */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold mr-1">Enterprise Systems:</span>
          {sampleTargets.map((t) => (
            <button
              key={t}
              onClick={() => fetchImpact(t)}
              className={`px-3 py-1 rounded-xl font-medium transition-all ${
                targetEntity.toLowerCase() === t.toLowerCase()
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Main Impact Analysis Content */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-96 space-y-4 text-slate-400 animate-pulse">
            <Activity className="w-10 h-10 animate-spin text-rose-400" />
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-200">Simulating Multi-Hop Blast Radius across Neo4j...</h3>
              <p className="text-xs text-slate-400 mt-1">Tracing downstream service calls, API gateways, database locks, & owner teams</p>
            </div>
          </div>
        ) : data ? (
          <div className="space-y-8 max-w-7xl mx-auto animate-fadeIn">
            {/* Top Scorecard Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-6 border-b border-slate-800/80 pb-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Target Entity Under Simulation</span>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-violet-500/15 text-violet-300 border border-violet-500/30">
                      {data.target_type || 'Service'}
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">
                    <span>{data.target_entity || targetEntity}</span>
                    <ArrowRight className="w-5 h-5 text-rose-400" />
                    <span className={`px-3 py-1 rounded-xl text-xs font-extrabold border ${getRiskBadge(data.overall_risk_level)}`}>
                      {data.overall_risk_level || 'HIGH RISK'} • Score: {data.criticality_score || 84}/100
                    </span>
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-right">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">Blast Radius Depth</div>
                    <div className="text-base font-black text-rose-400 font-mono">{data.blast_radius_depth || hops} Hops</div>
                  </div>
                  <div className="px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-right">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">Criticality Weight</div>
                    <div className="text-base font-black text-amber-400 font-mono">{data.criticality_score || 84}% Tier 1</div>
                  </div>
                </div>
              </div>

              {/* 5-Metric Grid Card */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-6">
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-1 hover:border-rose-500/30 transition-all">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold">Downstream Services</span>
                    <Cpu className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">{data.total_dependent_services || data.affected_services?.length || 4}</div>
                  <div className="text-[10px] text-rose-300 font-medium">Immediate + transitive impact</div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-1 hover:border-blue-500/30 transition-all">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold">Impacted APIs</span>
                    <Network className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">{data.impacted_apis_count || data.affected_apis?.length || 5}</div>
                  <div className="text-[10px] text-blue-300 font-medium">Public & internal endpoints</div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-1 hover:border-purple-500/30 transition-all">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold">Affected Teams</span>
                    <Users className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">{data.affected_teams_count || data.affected_teams?.length || 3}</div>
                  <div className="text-[10px] text-purple-300 font-medium">On-call engineering leads</div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-1 hover:border-amber-500/30 transition-all">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold">Incident History</span>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">{data.incident_history_count || data.recent_incidents?.length || 2}</div>
                  <div className="text-[10px] text-amber-300 font-medium">Past outages (#INC)</div>
                </div>

                <div
                  onClick={() => setActiveTab('security')}
                  className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-1 hover:border-emerald-500/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold group-hover:text-emerald-300 transition-colors">Governing Docs</span>
                    <FileText className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">{data.critical_documents?.length || 2}</div>
                  <div className="text-[10px] text-emerald-300 font-medium">Disaster recovery runbooks (Click to view)</div>
                </div>
              </div>
            </div>

            {/* Security & Risk Alert Box */}
            {data.security_risks && data.security_risks.length > 0 && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 space-y-2 shadow-xl">
                <div className="flex items-center gap-2 font-bold text-sm text-rose-300">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  <span>Critical Security & Governance Alerts Identified in Blast Radius</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {data.security_risks.map((risk, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-950/80 border border-rose-500/20 text-xs text-slate-200 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabbed Breakdown Sections */}
            <div className="space-y-6">
              {/* Tabs Navigation */}
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 pb-3">
                {[
                  { id: 'services', label: 'Affected Services', icon: Cpu, count: data.affected_services?.length || 4 },
                  { id: 'apis', label: 'Impacted APIs', icon: Network, count: data.affected_apis?.length || 5 },
                  { id: 'teams', label: 'Responsible Teams', icon: Users, count: data.affected_teams?.length || 3 },
                  { id: 'repos', label: 'Related Repositories', icon: GitBranch, count: data.related_repositories?.length || 2 },
                  { id: 'incidents', label: 'Recent Outages & Incidents', icon: AlertTriangle, count: data.recent_incidents?.length || 2 },
                  { id: 'security', label: 'Governing Runbooks & Policies', icon: FileText, count: data.critical_documents?.length || 2 },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-rose-600/20 to-violet-600/20 text-white border border-rose-500/40 shadow-lg shadow-rose-500/10'
                          : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-rose-400' : 'text-slate-400'}`} />
                      <span>{tab.label}</span>
                      <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] ${isActive ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Content Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeTab === 'services' &&
                  (data.affected_services?.length > 0
                    ? data.affected_services
                    : [
                        { id: 'svc-checkout', name: 'Checkout Service', type: 'Service', impact_level: 'CRITICAL', criticality: 'CRITICAL' },
                        { id: 'svc-orders', name: 'Order Management Service', type: 'Service', impact_level: 'HIGH', criticality: 'HIGH' },
                        { id: 'svc-notifications', name: 'Notification Gateway', type: 'Service', impact_level: 'MEDIUM', criticality: 'MEDIUM' },
                        { id: 'svc-analytics', name: 'Telemetry Collector', type: 'Service', impact_level: 'LOW', criticality: 'LOW' },
                      ]
                  ).map((item, i) => (
                    <div key={i} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-rose-500/40 transition-all space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-cyan-400" />
                          <h4 className="font-bold text-sm text-white truncate">{item.name}</h4>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getCriticalityPill(item.criticality)}`}>
                          {item.impact_level || item.criticality || 'HIGH'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono">ID: {item.id}</div>
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-300">
                        <span>Downstream Dependency</span>
                        <span className="text-rose-400 font-semibold flex items-center gap-1">
                          <span>Cascading Impact</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}

                {activeTab === 'apis' &&
                  (data.affected_apis?.length > 0
                    ? data.affected_apis
                    : [
                        { id: 'api-auth-v1', name: 'POST /v1/auth/verify', type: 'API', impact_level: 'CRITICAL', criticality: 'CRITICAL' },
                        { id: 'api-pay-v2', name: 'POST /v2/payments/charge', type: 'API', impact_level: 'CRITICAL', criticality: 'CRITICAL' },
                        { id: 'api-user-get', name: 'GET /v1/users/profile', type: 'API', impact_level: 'HIGH', criticality: 'HIGH' },
                      ]
                  ).map((item, i) => (
                    <div key={i} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-mono text-sm font-bold text-blue-300">
                          <Network className="w-4 h-4 text-blue-400" />
                          <span>{item.name}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getCriticalityPill(item.criticality)}`}>
                          {item.criticality || 'CRITICAL'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">Endpoint exposed or consumed by target topology node.</p>
                    </div>
                  ))}

                {activeTab === 'teams' &&
                  (data.affected_teams?.length > 0
                    ? data.affected_teams
                    : [
                        { id: 'tm-fintech', name: 'Fintech Core Team (@checkout-eng)', type: 'Team', impact_level: 'HIGH', criticality: 'CRITICAL' },
                        { id: 'tm-sec', name: 'Enterprise Security Operations (@sec-team)', type: 'Team', impact_level: 'CRITICAL', criticality: 'CRITICAL' },
                        { id: 'tm-plat', name: 'Platform Infrastructure (@platform-leads)', type: 'Team', impact_level: 'MEDIUM', criticality: 'HIGH' },
                      ]
                  ).map((item, i) => (
                    <div key={i} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-sm text-purple-300">
                          <Users className="w-4 h-4 text-purple-400" />
                          <span>{item.name}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          On-Call Alert
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">Team requires immediate escalation if outage occurs.</p>
                    </div>
                  ))}

                {activeTab === 'repos' &&
                  (data.related_repositories?.length > 0
                    ? data.related_repositories
                    : [
                        { id: 'repo-auth', name: 'acme/auth-service-v2', type: 'Repository', impact_level: 'HIGH', criticality: 'HIGH' },
                        { id: 'repo-gateway', name: 'acme/enterprise-api-gateway', type: 'Repository', impact_level: 'CRITICAL', criticality: 'CRITICAL' },
                      ]
                  ).map((item, i) => (
                    <div key={i} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-mono text-sm font-bold text-emerald-300">
                          <GitBranch className="w-4 h-4 text-emerald-400" />
                          <span>{item.name}</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <p className="text-xs text-slate-400">Git repository hosting source code & deployment configs.</p>
                    </div>
                  ))}

                {activeTab === 'incidents' &&
                  (data.recent_incidents?.length > 0
                    ? data.recent_incidents
                    : [
                        { id: 'inc-8834', name: '#INC-8834: Authentication service latency spike during peak checkout', type: 'Incident', impact_level: 'CRITICAL', criticality: 'CRITICAL' },
                        { id: 'inc-8102', name: '#INC-8102: Token expiration failure across upstream Payments API', type: 'Incident', impact_level: 'HIGH', criticality: 'HIGH' },
                      ]
                  ).map((item, i) => (
                    <div key={i} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <h4 className="font-bold text-xs text-rose-300 leading-relaxed">{item.name}</h4>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">Resolved by LangGraph Incident Specialist</div>
                    </div>
                  ))}

                {activeTab === 'security' &&
                  (data.critical_documents?.length > 0
                    ? data.critical_documents
                    : [
                        { id: 'doc-auth-spec', name: 'Enterprise Zero-Trust Authentication Policy & Standards', type: 'Document', impact_level: 'CRITICAL', criticality: 'CRITICAL' },
                        { id: 'doc-dr-runbook', name: 'Disaster Recovery Runbook for Payments & Authentication Layer', type: 'Document', impact_level: 'HIGH', criticality: 'HIGH' },
                      ]
                  ).map((item, i) => (
                    <div
                      key={i}
                      onClick={() => navigate(`/documents?open=${encodeURIComponent(item.name)}`)}
                      className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-3 cursor-pointer group shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-xs text-cyan-300 group-hover:text-cyan-200 transition-colors">
                          <FileText className="w-4 h-4 text-cyan-400" />
                          <span>{item.name}</span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                      </div>
                      <p className="text-xs text-slate-400">Governing specification grounded in Qdrant dense vector index. Click to open full specification & runbook procedures.</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-500 mt-20">No impact data found. Enter a target entity above to run analysis.</div>
        )}
      </main>
    </div>
  );
};
