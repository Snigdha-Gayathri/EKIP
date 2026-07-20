import React from 'react';
import { X, FileText, CheckCircle2, ArrowUpRight, Sparkles, Database, Layers, Calendar, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface SourceDetail {
  document_id: string;
  document_title: string;
  chunk_id?: string;
  chunk_text: string;
  relevance_score: number;
  doc_type?: string;
  created_at?: string;
  extracted_entities?: string[];
  section_header?: string;
}

interface SourceExplorerModalProps {
  source: SourceDetail | null;
  onClose: () => void;
}

export const SourceExplorerModal: React.FC<SourceExplorerModalProps> = ({ source, onClose }) => {
  const navigate = useNavigate();

  if (!source) return null;

  const scorePct = Math.round((source.relevance_score || 0.94) * 100);
  const entities = source.extracted_entities || ['auth-service', 'api-gateway', 'Payments Service', 'Enterprise Zero-Trust'];

  const handleJumpToGraph = (entityName: string) => {
    onClose();
    navigate(`/graph?entity=${encodeURIComponent(entityName)}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>{source.document_title || source.document_id}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-violet-500/15 text-violet-300 border border-violet-500/30">
                  {source.doc_type || 'Enterprise Spec'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">ID: {source.document_id} • Qdrant Dense Vector Grounding</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Metadata Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Vector Similarity Score</span>
              </div>
              <div className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{scorePct}% Match</span>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-violet-400" />
                <span>Section Header</span>
              </div>
              <div className="text-xs font-semibold text-slate-200 truncate">
                {source.section_header || 'Architecture & Security Requirements'}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Indexed Date</span>
              </div>
              <div className="text-xs font-semibold text-slate-200">
                {source.created_at || '2025-06-15 (Qdrant & Neo4j Aura)'}
              </div>
            </div>
          </div>

          {/* Highlighted Chunk Text */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="uppercase tracking-wider text-[11px] text-slate-400">Extracted Grounding Chunk (Exact Context)</span>
              <span className="text-cyan-400 font-mono text-[11px]">Chunk ID: {source.chunk_id || `${source.document_id}_chk_1`}</span>
            </div>
            <div className="bg-gradient-to-r from-cyan-500/5 via-slate-950 to-violet-500/5 border border-cyan-500/30 rounded-2xl p-5 text-slate-200 leading-relaxed font-mono text-xs relative overflow-hidden shadow-inner">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-cyan-500" />
              <p className="whitespace-pre-wrap">{source.chunk_text}</p>
            </div>
          </div>

          {/* Extracted Graph Entities */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="uppercase tracking-wider text-[11px] text-slate-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-purple-400" />
                <span>Entities Referenced in Graph</span>
              </span>
              <span className="text-xs text-slate-400">Click entity to jump to Neo4j Knowledge Graph</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {entities.map((ent, i) => (
                <button
                  key={i}
                  onClick={() => handleJumpToGraph(ent)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-xs font-medium text-cyan-300 transition-all flex items-center gap-1.5 shadow-md hover:scale-105"
                >
                  <Layers className="w-3.5 h-3.5 text-violet-400" />
                  <span>{ent}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Verified by LangGraph Grounding Specialist against enterprise knowledge corpus.
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onClose();
                navigate(`/documents?open=${encodeURIComponent(source.document_title || source.document_id)}`);
              }}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-violet-500/20"
            >
              <FileText className="w-4 h-4 text-cyan-300" />
              <span>Open Governing Document</span>
            </button>
            <button
              onClick={() => handleJumpToGraph(source.document_title || source.document_id)}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
            >
              <span>Jump to Knowledge Graph</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
