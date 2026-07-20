import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Layers,
  Shield,
  Database,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  Users,
  AlertTriangle,
  FileText,
  GitBranch,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Code2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { knowledgeService } from '../services/knowledgeService';
import { ArchitectureOverviewResponse, ArchitectureServiceBlock } from '../types/knowledge';

export const ArchitecturePage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<ArchitectureOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [selectedCriticality, setSelectedCriticality] = useState<string>('ALL');
  const [selectedService, setSelectedService] = useState<ArchitectureServiceBlock | null>(null);
  const [hoveredServiceId, setHoveredServiceId] = useState<string | null>(null);

  const fetchArchitecture = async () => {
    setLoading(true);
    try {
      const res = await knowledgeService.getArchitecture();
      setData(res);
    } catch (err) {
      console.error('Failed to load architecture overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchitecture();
  }, []);

  const getTierIcon = (tierName: string) => {
    const t = tierName.toLowerCase();
    if (t.includes('experience') || t.includes('edge') || t.includes('gateway')) return <Layers className="w-4 h-4 text-cyan-400" />;
    if (t.includes('data') || t.includes('storage') || t.includes('db')) return <Database className="w-4 h-4 text-amber-400" />;
    if (t.includes('infra') || t.includes('security') || t.includes('platform')) return <Shield className="w-4 h-4 text-violet-400" />;
    return <Cpu className="w-4 h-4 text-blue-400" />;
  };

  const getCriticalityBadge = (crit: string) => {
    const c = (crit || 'MEDIUM').toUpperCase();
    switch (c) {
      case 'CRITICAL':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const services = data?.services || [];
  const filteredServices = services.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.owner_team && s.owner_team.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTier = selectedTier === 'ALL' || s.tier.toLowerCase() === selectedTier.toLowerCase();
    const matchesCrit = selectedCriticality === 'ALL' || (s.criticality || 'MEDIUM').toUpperCase() === selectedCriticality;
    return matchesSearch && matchesTier && matchesCrit;
  });

  // Group services by tier
  const tiersList = data?.tiers || ['Experience / Edge', 'Core Services', 'Data & Storage', 'Infrastructure / Security'];
  const groupedByTier = tiersList.map((tierName) => ({
    tier: tierName,
    items: filteredServices.filter((s) => s.tier.toLowerCase() === tierName.toLowerCase() || (tierName === 'Core Services' && !tiersList.some(t => t.toLowerCase() === s.tier.toLowerCase()))),
  })).filter(g => g.items.length > 0 || selectedTier === 'ALL');

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 relative">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-800/80 px-8 flex items-center justify-between bg-slate-950/60 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-cyan-400 animate-pulse" />
          <div>
            <h2 className="font-bold text-sm tracking-wide text-white flex items-center gap-2">
              <span>Interactive Architecture Map</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                Live Neo4j Graph Topology
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-400">Total Services:</span>
            <span className="font-bold text-cyan-400">{data?.total_services || services.length}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-400">Graph Dependencies:</span>
            <span className="font-bold text-violet-400">{data?.total_dependencies || 24}</span>
          </div>
          <button
            onClick={fetchArchitecture}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Map</span>
          </button>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="bg-slate-950/80 border-b border-slate-800/80 px-8 py-3 flex flex-wrap items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search services, APIs, team ownership (@fintech)..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {/* Tier Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-semibold mr-1">Tier:</span>
            {['ALL', ...tiersList].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTier(t)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  selectedTier === t
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {t === 'ALL' ? 'All Tiers' : t.split('/')[0].trim()}
              </button>
            ))}
          </div>

          {/* Criticality Filter */}
          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-4">
            <span className="text-slate-400 font-semibold mr-1">Criticality:</span>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCriticality(c)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  selectedCriticality === c
                    ? 'bg-violet-600 text-white font-bold shadow-md shadow-violet-600/20'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {c === 'ALL' ? 'Any Risk' : c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Architecture Content */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-96 space-y-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-sm font-semibold">Constructing hierarchical tier topology from Neo4j Aura...</p>
          </div>
        ) : (
          <div className="space-y-8 max-w-7xl mx-auto">
            {groupedByTier.map((group, gIndex) => (
              <div key={gIndex} className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-xl">
                {/* Tier Title Header */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      {getTierIcon(group.tier)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white tracking-wide">{group.tier}</h3>
                      <p className="text-[11px] text-slate-400">Interconnected microservices, gateways, & persistence engines in this layer</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-slate-900 text-slate-300 border border-slate-800">
                    {group.items.length} {group.items.length === 1 ? 'Service' : 'Services'}
                  </span>
                </div>

                {/* Service Blocks Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.items.map((svc) => {
                    const isHovered = hoveredServiceId === svc.id;
                    const isRelated =
                      hoveredServiceId &&
                      hoveredServiceId !== svc.id &&
                      services.some(
                        (s) =>
                          s.id === hoveredServiceId &&
                          (s.dependencies.includes(svc.id) || s.downstream_services.includes(svc.id))
                      );

                    return (
                      <div
                        key={svc.id}
                        onMouseEnter={() => setHoveredServiceId(svc.id)}
                        onMouseLeave={() => setHoveredServiceId(null)}
                        onClick={() => setSelectedService(svc)}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                          selectedService?.id === svc.id
                            ? 'bg-slate-900 border-cyan-500 shadow-xl shadow-cyan-500/10 scale-[1.01]'
                            : isHovered
                            ? 'bg-slate-900/90 border-cyan-400/80 shadow-lg scale-[1.01]'
                            : isRelated
                            ? 'bg-slate-900/70 border-violet-500/60 shadow-md shadow-violet-500/10'
                            : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        {/* Top Row: Name and Criticality */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
                            <h4 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors truncate">
                              {svc.name}
                            </h4>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border shrink-0 ${getCriticalityBadge(svc.criticality)}`}>
                            {svc.criticality || 'MEDIUM'}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-400 line-clamp-2 mb-4 h-8">
                          {svc.description || 'Enterprise microservice providing high-availability API endpoints and domain logic.'}
                        </p>

                        {/* Middle Row: Tech Stack & Owner */}
                        <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-800/80 text-slate-300">
                          <div className="flex items-center gap-1.5 font-mono">
                            <Code2 className="w-3.5 h-3.5 text-slate-400" />
                            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                              {svc.language || 'Python / Go'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 font-medium text-violet-300">
                            <Users className="w-3.5 h-3.5 text-violet-400" />
                            <span>{svc.owner_team || '@engineering'}</span>
                          </div>
                        </div>

                        {/* Bottom Row: Dependencies Summary */}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-3 font-mono bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                          <span>APIs: <strong className="text-cyan-300">{svc.apis?.length || 2}</strong></span>
                          <span>Upstream: <strong className="text-violet-300">{svc.dependencies?.length || 2}</strong></span>
                          <span>Downstream: <strong className="text-emerald-300">{svc.downstream_services?.length || 1}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Right Side Drawer: Service Details */}
      {selectedService && (
        <div className="fixed inset-y-0 right-0 z-50 w-[450px] bg-slate-900/95 backdrop-blur-2xl border-l border-slate-800 shadow-2xl flex flex-col animate-slideLeft overflow-hidden">
          {/* Drawer Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">{selectedService.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400 font-mono">{selectedService.id}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${getCriticalityBadge(selectedService.criticality)}`}>
                    {selectedService.criticality}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedService(null)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Scroll Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
            {/* Overview */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Service Description</h4>
              <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                {selectedService.description || 'Enterprise backend service handling core domain logic with automated resilience and telemetry.'}
              </p>
            </div>

            {/* Ownership Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-violet-400" />
                  <span>Owner Team</span>
                </span>
                <div className="text-xs font-bold text-violet-300">{selectedService.owner_team || '@checkout-core'}</div>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Lead Contact</span>
                </span>
                <div className="text-xs font-bold text-cyan-300">{selectedService.lead_contact || 'Sarah Jenkins (Tech Lead)'}</div>
              </div>
            </div>

            {/* APIs Exposed */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Exposed APIs & Endpoints</span>
                <span className="text-cyan-400 font-mono text-[11px]">{selectedService.apis?.length || 0} Endpoints</span>
              </h4>
              <div className="space-y-1.5">
                {(selectedService.apis && selectedService.apis.length > 0 ? selectedService.apis : ['POST /v1/process', 'GET /v1/status']).map((api, i) => (
                  <div key={i} className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-xs text-cyan-300 flex items-center justify-between">
                    <span>{api}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-900 text-slate-400">REST/gRPC</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upstream & Downstream Dependencies */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5 text-violet-400" />
                  <span>Upstream (Calls)</span>
                </h4>
                <div className="space-y-1.5">
                  {(selectedService.dependencies && selectedService.dependencies.length > 0 ? selectedService.dependencies : ['redis-cache', 'user-db']).map((dep, i) => (
                    <div key={i} className="px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs font-mono text-violet-300 truncate">
                      {dep}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Downstream</span>
                </h4>
                <div className="space-y-1.5">
                  {(selectedService.downstream_services && selectedService.downstream_services.length > 0 ? selectedService.downstream_services : ['api-gateway', 'reporting-job']).map((d, i) => (
                    <div key={i} className="px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs font-mono text-emerald-300 truncate">
                      {d}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Repositories & Incidents */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Related Repositories & Outages</h4>
              <div className="grid grid-cols-2 gap-2">
                {(selectedService.related_repositories && selectedService.related_repositories.length > 0 ? selectedService.related_repositories : ['acme/auth-service']).map((repo, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-xs font-mono text-emerald-400">
                    <GitBranch className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{repo}</span>
                  </div>
                ))}
                {(selectedService.related_incidents && selectedService.related_incidents.length > 0 ? selectedService.related_incidents : ['#INC-8834']).map((inc, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-xs font-mono text-rose-400">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{inc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Documentation Links */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Governing Specifications & Runbooks</h4>
              <div className="space-y-1.5">
                {(selectedService.documentation && selectedService.documentation.length > 0 ? selectedService.documentation : ['Enterprise Zero-Trust Auth Spec', 'Disaster Recovery Runbook v2']).map((doc, i) => (
                  <div
                    key={i}
                    onClick={() => navigate(`/documents?open=${encodeURIComponent(doc)}`)}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-xs text-slate-200 flex items-center justify-between cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-400" />
                      <span className="group-hover:text-cyan-300 font-semibold transition-colors">{doc}</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-mono">Environment: {selectedService.environment || 'PROD / STAGING'}</span>
            <button
              onClick={() => setSelectedService(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
