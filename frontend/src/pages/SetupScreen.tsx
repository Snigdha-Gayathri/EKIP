import React, { useState } from 'react';
import {
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  Database,
  BrainCircuit,
  Shield,
  KeyRound,
  Zap,
} from 'lucide-react';
import { apiClient } from '../services/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ApiKeys {
  gemini_api_key: string;
  groq_api_key: string;
  qdrant_url: string;
  qdrant_api_key: string;
  neo4j_uri: string;
  neo4j_username: string;
  neo4j_password: string;
  supabase_url: string;
  supabase_anon_key: string;
}

interface ValidationResult {
  connected: boolean;
  message: string;
}

interface Props {
  onComplete: () => void;
  initialKeys?: Partial<ApiKeys>;
}

const DEFAULT_KEYS: ApiKeys = {
  gemini_api_key: '',
  groq_api_key: '',
  qdrant_url: '',
  qdrant_api_key: '',
  neo4j_uri: '',
  neo4j_username: '',
  neo4j_password: '',
  supabase_url: '',
  supabase_anon_key: '',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const SetupScreen: React.FC<Props> = ({ onComplete, initialKeys }) => {
  const [keys, setKeys] = useState<ApiKeys>({ ...DEFAULT_KEYS, ...initialKeys });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [validating, setValidating] = useState(false);
  const [results, setResults] = useState<Record<string, ValidationResult> | null>(null);
  const [overallValid, setOverallValid] = useState<boolean | null>(null);
  const [error, setError] = useState('');

  const update = (field: keyof ApiKeys, value: string) => {
    setKeys((prev) => ({ ...prev, [field]: value }));
    setResults(null);
    setOverallValid(null);
    setError('');
  };

  const toggle = (field: string) =>
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }));

  /* ---- Validate -------------------------------------------------- */
  const handleValidate = async () => {
    if (!keys.gemini_api_key.trim()) {
      setError('Gemini API key is required to power the AI agents.');
      return;
    }

    setValidating(true);
    setError('');
    setResults(null);

    try {
      const payload: Record<string, string> = {};
      for (const [k, v] of Object.entries(keys)) {
        if (v.trim()) payload[k] = v.trim();
      }

      const res = await apiClient.post('/config/validate', payload, {
        headers: { 'X-API-Keys': JSON.stringify(payload) },
      });

      setResults(res.data.results);
      setOverallValid(res.data.valid);

      if (res.data.valid) {
        // Persist to localStorage
        localStorage.setItem('ekip_api_keys', JSON.stringify(payload));
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const handleLaunch = () => {
    onComplete();
  };

  /* ---- Input renderer -------------------------------------------- */
  const renderInput = (
    field: keyof ApiKeys,
    label: string,
    placeholder: string,
    required = false,
  ) => {
    const val = keys[field];
    const isSecret = field.includes('key') || field.includes('password') || field.includes('anon');
    const visible = showSecrets[field];
    const result = results?.[field];

    return (
      <div key={field} className="group relative">
        <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide uppercase">
          {label}
          {required && <span className="text-rose-400 ml-1">*</span>}
        </label>
        <div className="relative">
          <input
            type={isSecret && !visible ? 'password' : 'text'}
            value={val}
            onChange={(e) => update(field, e.target.value)}
            placeholder={placeholder}
            className={`w-full bg-slate-900/70 border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-all duration-200 focus:ring-2 pr-20 ${
              result?.connected
                ? 'border-emerald-500/50 focus:ring-emerald-500/30'
                : result && !result.connected && val.trim()
                ? 'border-rose-500/50 focus:ring-rose-500/30'
                : 'border-slate-700/80 focus:border-violet-500/60 focus:ring-violet-500/20'
            }`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isSecret && val && (
              <button
                onClick={() => toggle(field)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
                type="button"
              >
                {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
            {result?.connected && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-in fade-in" />
            )}
            {result && !result.connected && val.trim() && (
              <XCircle className="w-4 h-4 text-rose-400 animate-in fade-in" />
            )}
          </div>
        </div>
        {result && val.trim() && (
          <p className={`text-[11px] mt-1 ${result.connected ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
            {result.message}
          </p>
        )}
      </div>
    );
  };

  /* ---- Render ---------------------------------------------------- */
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center overflow-y-auto">
      {/* Background gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 shadow-xl shadow-indigo-500/25 mb-5">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
            Welcome to EKIP
          </h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
            Connect your API keys to power the multi-agent intelligence engine.
            <br />
            Only the Gemini key is required — everything else is optional.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl">
          {/* AI Models Section */}
          <div className="flex items-center gap-2 mb-5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <BrainCircuit className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">AI Models</h2>
              <p className="text-[11px] text-slate-500">Powers the multi-agent system</p>
            </div>
          </div>
          <div className="grid gap-4 mb-8">
            {renderInput('gemini_api_key', 'Gemini API Key', 'AIzaSy...', true)}
            {renderInput('groq_api_key', 'Groq API Key (Optional)', 'gsk_...')}
          </div>

          {/* Databases Section */}
          <div className="flex items-center gap-2 mb-5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Database className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Databases</h2>
              <p className="text-[11px] text-slate-500">Optional — local fallbacks are used if not configured</p>
            </div>
          </div>

          {/* Qdrant */}
          <div className="mb-4">
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> Qdrant Vector DB
            </p>
            <div className="grid grid-cols-2 gap-3">
              {renderInput('qdrant_url', 'URL', 'https://your-cluster.qdrant.io:6333')}
              {renderInput('qdrant_api_key', 'API Key', 'Your Qdrant API key')}
            </div>
          </div>

          {/* Neo4j */}
          <div className="mb-4">
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Shield className="w-3 h-3" /> Neo4j Graph DB
            </p>
            <div className="grid grid-cols-3 gap-3">
              {renderInput('neo4j_uri', 'URI', 'neo4j+s://your-id.neo4j.io')}
              {renderInput('neo4j_username', 'Username', 'neo4j')}
              {renderInput('neo4j_password', 'Password', 'Password')}
            </div>
          </div>

          {/* Supabase */}
          <div className="mb-6">
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <KeyRound className="w-3 h-3" /> Supabase
            </p>
            <div className="grid grid-cols-2 gap-3">
              {renderInput('supabase_url', 'Project URL', 'https://your-project.supabase.co')}
              {renderInput('supabase_anon_key', 'Anon Key', 'eyJhbG...')}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleValidate}
              disabled={validating}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {validating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Validate & Connect
                </>
              )}
            </button>

            {overallValid && (
              <button
                onClick={handleLaunch}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:from-emerald-500 hover:to-cyan-500 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 animate-in slide-in-from-right"
              >
                Launch EKIP
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Validation summary */}
          {results && (
            <div className="mt-5 grid grid-cols-2 gap-2">
              {Object.entries(results).map(([key, result]) => {
                if (result.message === 'Not provided') return null;
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                      result.connected
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {result.connected ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className="truncate">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-600 mt-6">
          Keys are stored locally in your browser and sent securely to the backend on each request.
          <br />
          They are never persisted server-side.
        </p>
      </div>
    </div>
  );
};
