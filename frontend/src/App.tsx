import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { SetupScreen } from './pages/SetupScreen';
import { QueryWorkspace } from './pages/QueryWorkspace';
import { KnowledgeGraphPage } from './pages/KnowledgeGraphPage';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { ImpactAnalysisPage } from './pages/ImpactAnalysisPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { DiagnosticsPage } from './pages/DiagnosticsPage';

/** Check if the minimum required API keys are configured. */
function hasRequiredKeys(): boolean {
  try {
    const stored = localStorage.getItem('ekip_api_keys');
    if (!stored) return false;
    const keys = JSON.parse(stored);
    return Boolean(keys.gemini_api_key);
  } catch {
    return false;
  }
}

export const App: React.FC = () => {
  const [isConfigured, setIsConfigured] = useState(hasRequiredKeys);
  const [showSetup, setShowSetup] = useState(false);

  const handleSetupComplete = useCallback(() => {
    setIsConfigured(true);
    setShowSetup(false);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setShowSetup(true);
  }, []);

  const handleDisconnect = useCallback(() => {
    localStorage.removeItem('ekip_api_keys');
    setIsConfigured(false);
    setShowSetup(false);
  }, []);

  // Show setup screen if not configured or user explicitly opened settings
  if (!isConfigured || showSetup) {
    const existingKeys = (() => {
      try {
        const stored = localStorage.getItem('ekip_api_keys');
        return stored ? JSON.parse(stored) : undefined;
      } catch {
        return undefined;
      }
    })();

    return <SetupScreen onComplete={handleSetupComplete} initialKeys={existingKeys} />;
  }

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-slate-950 font-sans antialiased overflow-hidden selection:bg-violet-500 selection:text-white">
        <Sidebar onOpenSettings={handleOpenSettings} onDisconnect={handleDisconnect} />
        <Routes>
          <Route path="/" element={<QueryWorkspace />} />
          <Route path="/graph" element={<KnowledgeGraphPage />} />
          <Route path="/knowledge" element={<Navigate to="/graph" replace />} />
          <Route path="/architecture" element={<ArchitecturePage />} />
          <Route path="/impact" element={<ImpactAnalysisPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/diagnostics" element={<DiagnosticsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
