import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { QueryWorkspace } from './pages/QueryWorkspace';
import { KnowledgeGraphPage } from './pages/KnowledgeGraphPage';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { ImpactAnalysisPage } from './pages/ImpactAnalysisPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { DiagnosticsPage } from './pages/DiagnosticsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-slate-950 font-sans antialiased overflow-hidden selection:bg-violet-500 selection:text-white">
        <Sidebar />
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
