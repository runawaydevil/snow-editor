import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import LocalEditorPage from './pages/LocalEditorPage.jsx';
import { STR } from './lib/strings.js';

const SharedViewPage = lazy(() => import('./pages/SharedViewPage.jsx'));
const SharedEditPage = lazy(() => import('./pages/SharedEditPage.jsx'));

function RouteFallback() {
  return (
    <div className="app">
      <p className="page-loading">{STR.LOADING_DOCUMENT}</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LocalEditorPage />} />
          <Route path="/v/:token" element={<SharedViewPage />} />
          <Route path="/e/:token" element={<SharedEditPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
