import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Network,
  RefreshCw,
  Layers,
  Shield,
  Cpu,
  Users,
  FileText,
  Database as DatabaseIcon,
  GitBranch,
  Server,
  AlertTriangle,
  UserCheck,
  Search,
  Zap,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Filter,
  Eye,
  Compass,
  CornerDownRight,
  X,
} from 'lucide-react';
import { knowledgeService } from '../services/knowledgeService';
import { EdgeInspectionDetails, SearchResultItem } from '../types/knowledge';

interface GraphFlowInnerProps {}

const GraphFlowInner: React.FC<GraphFlowInnerProps> = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [selectedEdgeDetails, setSelectedEdgeDetails] = useState<EdgeInspectionDetails | null>(null);
  const [loadingEdge, setLoadingEdge] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [layoutMode, setLayoutMode] = useState<'radial' | 'force'>('force');

  // Shortest Path Mode
  const [shortestPathMode, setShortestPathMode] = useState(false);
  const [pathSource, setPathSource] = useState<string | null>(null);
  const [pathTarget, setPathTarget] = useState<string | null>(null);
  const [pathResult, setPathResult] = useState<{ hops: number; desc: string; nodeIds: Set<string>; edgeIds: Set<string> } | null>(null);
  const [expanding, setExpanding] = useState(false);

  const { setCenter, fitView } = useReactFlow();
  const animationFrameRef = useRef<number | null>(null);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setSelectedEntity(null);
    setSelectedEdgeDetails(null);
    setPathResult(null);
    try {
      const data = await knowledgeService.getGraphOverview(150);
      const total = data.nodes.length || 1;
      const center = { x: 500, y: 350 };

      const mappedNodes: Node[] = data.nodes.map((n, idx) => {
        const angle = (idx / total) * 2 * Math.PI;
        const radius = layoutMode === 'radial' ? 260 : 150 + (idx % 3) * 80;
        return {
          id: n.id,
          data: { label: n.label, type: n.type },
          position: {
            x: center.x + radius * Math.cos(angle) + (layoutMode === 'force' ? (Math.random() - 0.5) * 120 : 0),
            y: center.y + radius * Math.sin(angle) + (layoutMode === 'force' ? (Math.random() - 0.5) * 120 : 0),
          },
          style: getNodeStyle(n.type, false),
        };
      });

      const mappedEdges: Edge[] = data.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.relationship,
        style: { stroke: '#6366f1', strokeWidth: 1.5, opacity: 0.85 },
        labelBgStyle: { fill: '#0f172a', fillOpacity: 0.9 },
        labelStyle: { fill: '#cbd5e1', fontSize: 10, fontWeight: 600 },
      }));

      setNodes(mappedNodes);
      setEdges(mappedEdges);

      if (layoutMode === 'force' && mappedNodes.length > 1) {
        runForceSimulation(mappedNodes, mappedEdges);
      }
      setTimeout(() => {
        fitView({ duration: 800 });
      }, 250);
    } catch (err) {
      console.error('Failed to load knowledge graph:', err);
    } finally {
      setLoading(false);
    }
  }, [layoutMode, setNodes, setEdges, fitView]);

  useEffect(() => {
    fetchGraph();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [fetchGraph]);

  const runForceSimulation = (initialNodes: Node[], initialEdges: Edge[]) => {
    let positions = initialNodes.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y, vx: 0, vy: 0 }));
    let iterations = 0;

    const simulate = () => {
      if (iterations++ > 60) {
        setNodes((nds) =>
          nds.map((n) => {
            const p = positions.find((pos) => pos.id === n.id);
            return p ? { ...n, position: { x: p.x, y: p.y } } : n;
          })
        );
        return;
      }

      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const dx = positions[i].x - positions[j].x;
          const dy = positions[i].y - positions[j].y;
          const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          const force = (30000 / (dist * dist)) * 0.15;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          positions[i].vx += fx;
          positions[i].vy += fy;
          positions[j].vx -= fx;
          positions[j].vy -= fy;
        }
      }

      initialEdges.forEach((e) => {
        const p1 = positions.find((p) => p.id === e.source);
        const p2 = positions.find((p) => p.id === e.target);
        if (p1 && p2) {
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          const force = (dist - 160) * 0.05;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          p1.vx += fx;
          p1.vy += fy;
          p2.vx -= fx;
          p2.vy -= fy;
        }
      });

      positions.forEach((p) => {
        p.vx *= 0.85;
        p.vy *= 0.85;
        p.x += p.vx;
        p.y += p.vy;
      });

      animationFrameRef.current = requestAnimationFrame(simulate);
    };

    simulate();
  };

  const getNodeStyle = (type: string, highlighted: boolean = false, isPath: boolean = false) => {
    const baseStyle: React.CSSProperties = {
      padding: '10px 16px',
      borderRadius: '12px',
      border: isPath
        ? '2px solid #fbbf24'
        : highlighted
        ? '2px solid #38bdf8'
        : '1px solid rgba(139, 92, 246, 0.4)',
      color: '#f8fafc',
      fontSize: '12px',
      fontWeight: '600',
      background: isPath
        ? 'rgba(245, 158, 11, 0.35)'
        : highlighted
        ? 'rgba(56, 189, 248, 0.25)'
        : 'rgba(15, 23, 42, 0.92)',
      boxShadow: isPath
        ? '0 0 20px rgba(245, 158, 11, 0.6)'
        : highlighted
        ? '0 0 16px rgba(56, 189, 248, 0.5)'
        : '0 4px 14px 0 rgba(0, 0, 0, 0.35)',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    };

    switch (type.toLowerCase()) {
      case 'service':
        return { ...baseStyle, border: isPath ? baseStyle.border : '1px solid #38bdf8', background: isPath ? baseStyle.background : 'rgba(14, 116, 144, 0.25)' };
      case 'api':
        return { ...baseStyle, border: isPath ? baseStyle.border : '1px solid #60a5fa', background: isPath ? baseStyle.background : 'rgba(29, 78, 216, 0.25)' };
      case 'database':
        return { ...baseStyle, border: isPath ? baseStyle.border : '1px solid #f59e0b', background: isPath ? baseStyle.background : 'rgba(180, 83, 9, 0.25)' };
      case 'team':
        return { ...baseStyle, border: isPath ? baseStyle.border : '1px solid #a855f7', background: isPath ? baseStyle.background : 'rgba(88, 28, 135, 0.3)' };
      case 'incident':
      case 'supportticket':
        return { ...baseStyle, border: isPath ? baseStyle.border : '1px solid #f43f5e', background: isPath ? baseStyle.background : 'rgba(159, 18, 57, 0.25)' };
      case 'document':
        return { ...baseStyle, border: isPath ? baseStyle.border : '1px solid #818cf8', background: isPath ? baseStyle.background : 'rgba(67, 56, 202, 0.25)' };
      case 'repository':
        return { ...baseStyle, border: isPath ? baseStyle.border : '1px solid #10b981', background: isPath ? baseStyle.background : 'rgba(6, 95, 70, 0.25)' };
      case 'infrastructure':
        return { ...baseStyle, border: isPath ? baseStyle.border : '1px solid #14b8a6', background: isPath ? baseStyle.background : 'rgba(15, 118, 110, 0.25)' };
      case 'securitypolicy':
      case 'policy':
        return { ...baseStyle, border: isPath ? baseStyle.border : '1px solid #c084fc', background: isPath ? baseStyle.background : 'rgba(126, 34, 206, 0.25)' };
      case 'person':
      case 'employee':
        return { ...baseStyle, border: isPath ? baseStyle.border : '1px solid #4ade80', background: isPath ? baseStyle.background : 'rgba(21, 128, 61, 0.25)' };
      default:
        return baseStyle;
    }
  };

  const expandNode = async (nodeIdOrLabel: string, sourcePosition?: { x: number; y: number }) => {
    setExpanding(true);
    try {
      const data = await knowledgeService.traverseEntity(nodeIdOrLabel);
      setNodes((prevNodes) => {
        const existingIds = new Set(prevNodes.map((n) => n.id));
        const center = sourcePosition || { x: 500, y: 350 };
        const newNodes: Node[] = [];
        const toAdd = data.nodes.filter((n) => !existingIds.has(n.id));
        toAdd.forEach((n, idx) => {
          const angle = (idx / (toAdd.length || 1)) * 2 * Math.PI;
          const radius = 170;
          newNodes.push({
            id: n.id,
            data: { label: n.label, type: n.type },
            position: {
              x: center.x + radius * Math.cos(angle),
              y: center.y + radius * Math.sin(angle),
            },
            style: getNodeStyle(n.type, false),
          });
        });
        return [...prevNodes, ...newNodes];
      });

      setEdges((prevEdges) => {
        const existingEdgeIds = new Set(prevEdges.map((e) => e.id));
        const newEdges: Edge[] = [];
        data.edges.forEach((e) => {
          if (!existingEdgeIds.has(e.id)) {
            newEdges.push({
              id: e.id,
              source: e.source,
              target: e.target,
              label: e.relationship,
              style: { stroke: '#6366f1', strokeWidth: 1.5 },
              labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
              labelStyle: { fill: '#cbd5e1', fontSize: 10, fontWeight: 600 },
            });
          }
        });
        return [...prevEdges, ...newEdges];
      });
    } catch (err) {
      console.error('Failed to expand node:', err);
    } finally {
      setExpanding(false);
    }
  };

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length >= 1) {
      try {
        const resp = await knowledgeService.searchGraph(val);
        setSearchResults(resp.results);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('Graph search failed:', err);
      }
    } else {
      setSearchResults([]);
      setShowSearchDropdown(false);
    }
  };

  const selectSearchNode = (item: SearchResultItem) => {
    setSearchQuery(item.name);
    setShowSearchDropdown(false);
    const foundNode = nodes.find((n) => n.id === item.id || n.data.label === item.name);
    if (foundNode) {
      setSelectedEntity({ ...foundNode.data, id: foundNode.id, position: foundNode.position });
      setSelectedEdgeDetails(null);
      setCenter(foundNode.position.x, foundNode.position.y, { zoom: 1.4, duration: 800 });
      setNodes((nds) =>
        nds.map((n) =>
          n.id === foundNode.id ? { ...n, style: getNodeStyle(n.data.type as string, true) } : n
        )
      );
    } else {
      expandNode(item.id);
    }
  };

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    if (shortestPathMode) {
      if (!pathSource) {
        setPathSource(node.id);
      } else if (!pathTarget && node.id !== pathSource) {
        setPathTarget(node.id);
        computePath(pathSource, node.id);
      } else {
        setPathSource(node.id);
        setPathTarget(null);
        setPathResult(null);
      }
      return;
    }

    setSelectedEntity({ ...node.data, id: node.id, position: node.position });
    setSelectedEdgeDetails(null);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        style: getNodeStyle(n.data.type as string, n.id === node.id, pathResult?.nodeIds.has(n.id)),
      }))
    );
  };

  const onNodeDoubleClick = (_: React.MouseEvent, node: Node) => {
    expandNode(node.id, node.position);
  };

  const onEdgeClick = async (_: React.MouseEvent, edge: Edge) => {
    if (shortestPathMode) return;
    setSelectedEntity(null);
    setLoadingEdge(true);
    try {
      const details = await knowledgeService.getEdgeDetails(edge.source, edge.target, edge.label as string || 'DEPENDS_ON');
      setSelectedEdgeDetails(details);
    } catch (err) {
      console.error('Failed to load edge inspection details:', err);
    } finally {
      setLoadingEdge(false);
    }
  };

  const computePath = async (src: string, tgt: string) => {
    try {
      const resp = await knowledgeService.getShortestPath(src, tgt);
      const nIds = new Set(resp.path_nodes.map((n) => n.id));
      const eIds = new Set(resp.path_edges.map((e) => e.id));
      setPathResult({ hops: resp.total_hops, desc: resp.description, nodeIds: nIds, edgeIds: eIds });

      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          style: getNodeStyle(n.data.type as string, false, nIds.has(n.id)),
        }))
      );
      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          style: {
            stroke: eIds.has(e.id) ? '#fbbf24' : '#6366f1',
            strokeWidth: eIds.has(e.id) ? 3.5 : 1.5,
            opacity: eIds.has(e.id) ? 1 : 0.4,
          },
        }))
      );
    } catch (err) {
      console.error('Failed to compute shortest path:', err);
    }
  };

  const resetPathMode = () => {
    setShortestPathMode(false);
    setPathSource(null);
    setPathTarget(null);
    setPathResult(null);
    setNodes((nds) => nds.map((n) => ({ ...n, style: getNodeStyle(n.data.type as string, false, false) })));
    setEdges((eds) => eds.map((e) => ({ ...e, style: { stroke: '#6366f1', strokeWidth: 1.5, opacity: 0.85 } })));
  };

  const filteredNodes = nodes.filter((n) => categoryFilter === 'ALL' || (n.data.type as string)?.toLowerCase() === categoryFilter.toLowerCase());

  return (
    <div className="flex-1 flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* Top Header & Search Bar */}
      <header className="h-16 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-950/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <Network className="w-5 h-5 text-cyan-400 animate-pulse" />
          <div>
            <h2 className="font-bold text-sm tracking-wide text-white flex items-center gap-2">
              <span>Enterprise Knowledge Graph</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                Neo4j Aura Multi-Type
              </span>
            </h2>
          </div>
        </div>

        {/* Search Bar & Auto-Complete */}
        <div className="relative w-80">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search services, APIs, databases, policies..."
              className="bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-full"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setShowSearchDropdown(false); }} className="text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute top-11 left-0 right-0 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-30 max-h-64 overflow-y-auto">
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  onClick={() => selectSearchNode(item)}
                  className="px-3.5 py-2.5 hover:bg-slate-800/80 cursor-pointer border-b border-slate-800/40 last:border-none flex items-center justify-between transition-colors"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-200">{item.name}</div>
                    <div className="text-[10px] text-slate-400">{item.snippet || item.id}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-cyan-300 border border-cyan-500/20">
                    {item.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Layout & Mode Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (shortestPathMode) resetPathMode();
              else {
                setShortestPathMode(true);
                setSelectedEntity(null);
                setSelectedEdgeDetails(null);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              shortestPathMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{shortestPathMode ? 'Exit Path Mode' : 'Shortest Path'}</span>
          </button>

          <button
            onClick={() => setLayoutMode(layoutMode === 'force' ? 'radial' : 'force')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-violet-400" />
            <span>Layout: {layoutMode.toUpperCase()}</span>
          </button>

          <button
            onClick={fetchGraph}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>
        </div>
      </header>

      {/* Category Filter Bar */}
      <div className="bg-slate-950/60 border-b border-slate-800/60 px-6 py-2 flex items-center gap-2 overflow-x-auto z-10">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 mr-2">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <span>Filter Entities:</span>
        </div>
        {['ALL', 'Service', 'API', 'Database', 'Team', 'Incident', 'Document', 'Repository', 'Infrastructure', 'SecurityPolicy', 'Person'].map(
          (cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              {cat === 'ALL' ? 'All Types' : cat}
            </button>
          )
        )}
      </div>

      {/* Shortest Path Banner */}
      {shortestPathMode && (
        <div className="absolute top-28 left-6 right-6 z-20 bg-gradient-to-r from-amber-500/20 via-slate-900/90 to-amber-500/20 border border-amber-500/40 rounded-2xl p-3 px-5 backdrop-blur-xl flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-3">
            <Compass className="w-5 h-5 text-amber-400 animate-spin" />
            <div className="text-xs">
              <span className="font-bold text-amber-300">Shortest Path Highlight Mode: </span>
              <span className="text-slate-200">
                {!pathSource
                  ? 'Click the source node to begin path calculation.'
                  : !pathTarget
                  ? `Source selected: (${pathSource}). Now click the target destination node.`
                  : pathResult?.desc || 'Computing path...'}
              </span>
            </div>
          </div>
          <button
            onClick={resetPathMode}
            className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors"
          >
            Reset
          </button>
        </div>
      )}

      {/* Graph Legend */}
      <div className="absolute top-32 left-6 z-10 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2.5 w-52 pointer-events-none">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>Entity Legend</span>
        </h4>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300">Service</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Network className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-300">API</span>
          </div>
          <div className="flex items-center gap-1.5">
            <DatabaseIcon className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-300">Database</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-300">Team</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-slate-300">Incident</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-300">Document</span>
          </div>
          <div className="flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-300">Repository</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-slate-300">Infra</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-slate-300">Policy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-green-400" />
            <span className="text-slate-300">Person</span>
          </div>
        </div>
      </div>

      {/* Selected Entity Side Panel (`onNodeClick`) */}
      {selectedEntity && !shortestPathMode && (
        <div className="absolute top-32 right-6 z-10 w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h3 className="font-semibold text-sm text-white truncate max-w-[180px]">{selectedEntity.label}</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-violet-500/15 text-violet-300 border border-violet-500/30">
              {selectedEntity.type}
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Entity ID: <span className="font-mono text-slate-200">{selectedEntity.id}</span>. Click Expand or double-click the node to query 1-hop neighborhood across Neo4j Aura.
          </p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => expandNode(selectedEntity.id, selectedEntity.position)}
              disabled={expanding}
              className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{expanding ? 'Expanding...' : 'Expand Neighborhood'}</span>
            </button>
            <button
              onClick={() => setSelectedEntity(null)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Relationship Inspector Side Panel (`onEdgeClick`) */}
      {selectedEdgeDetails && !shortestPathMode && (
        <div className="absolute top-32 right-6 z-10 w-96 bg-slate-900/95 backdrop-blur-2xl border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <CornerDownRight className="w-4 h-4 text-violet-400" />
              <h3 className="font-bold text-sm text-white">Relationship Inspector</h3>
            </div>
            <button onClick={() => setSelectedEdgeDetails(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <span>{selectedEdgeDetails.source_name}</span>
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
              <span>{selectedEdgeDetails.target_name}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-mono font-semibold">
                {selectedEdgeDetails.relationship}
              </span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Confidence: {Math.round(selectedEdgeDetails.confidence * 100)}%
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Explainable AI Evidence</h4>
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/40 border border-slate-800/80 rounded-xl p-3">
              {selectedEdgeDetails.description}
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-400 uppercase tracking-wider">Document Snippet</span>
              <span className="text-cyan-400 font-medium">Score: {Math.round(selectedEdgeDetails.similarity_score * 100)}%</span>
            </div>
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="text-[10px] text-violet-400 font-mono">{selectedEdgeDetails.supporting_document}</div>
              <p className="text-[11px] text-slate-300 italic">"{selectedEdgeDetails.extracted_evidence}"</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cypher Verification Query</h4>
            <pre className="text-[10px] bg-slate-950 border border-slate-800 p-2.5 rounded-xl font-mono text-cyan-300 overflow-x-auto">
              {selectedEdgeDetails.cypher_query}
            </pre>
          </div>

          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800">
            <span>Discovered: {selectedEdgeDetails.date_discovered}</span>
            <span className="text-slate-400">{selectedEdgeDetails.last_verified}</span>
          </div>
        </div>
      )}

      {/* Loading edge indicator */}
      {loadingEdge && (
        <div className="absolute right-8 top-24 z-20 bg-slate-900 border border-cyan-500/40 px-4 py-2.5 rounded-xl flex items-center gap-2.5 shadow-xl text-xs text-cyan-300 animate-fadeIn">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Inspecting relationship details...</span>
        </div>
      )}

      {/* React Flow Canvas */}
      <div className="flex-1 w-full h-full">
        <ReactFlow
          nodes={filteredNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onEdgeClick={onEdgeClick}
          fitView
          onlyRenderVisibleElements={true}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#334155" />
          <Controls className="bg-slate-900 border border-slate-800 rounded-xl" />
        </ReactFlow>
      </div>
    </div>
  );
};

export const KnowledgeGraphPage: React.FC = () => {
  return (
    <ReactFlowProvider>
      <GraphFlowInner />
    </ReactFlowProvider>
  );
};

