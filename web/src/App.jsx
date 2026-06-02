import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ReportListPage from './pages/ReportListPage';
import ReportDetailsPage from './pages/ReportDetailsPage';
import ManagerListPage from './pages/ManagerListPage';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a2f4a',
              color: '#fff',
              borderRadius: '10px',
              fontSize: '0.875rem',
              border: '1px solid rgba(255,255,255,.1)',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />

        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Reports — accessible by both boss and manager */}
          <Route
            path="/dashboard/reports"
            element={
              <ProtectedRoute>
                <ReportListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/reports/:id"
            element={
              <ProtectedRoute>
                <ReportDetailsPage />
              </ProtectedRoute>
            }
          />

          {/* Managers — boss only */}
          <Route
            path="/dashboard/managers"
            element={
              <ProtectedRoute role="boss">
                <ManagerListPage />
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard/reports" replace />} />
          <Route path="*" element={<Navigate to="/dashboard/reports" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
