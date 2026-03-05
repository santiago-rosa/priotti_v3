import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

import { Navbar } from './components/layout/Navbar';
import { CartDrawer } from './components/cart/CartDrawer';

import { Catalog } from './pages/Catalog';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AdminClients } from './pages/admin/Clients';
import { AdminImport } from './pages/admin/Import';

const Layout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
    <Navbar />
    <CartDrawer />
    <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      {children}
    </main>
  </div>
);

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, role } = useAuthStore();

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && role && !allowedRoles.includes(role)) return <Navigate to="/" replace />;

  return <Layout>{children}</Layout>;
};

function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Client Routes */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/catalog" element={<ProtectedRoute><Catalog /></ProtectedRoute>} />

        {/* Admin Routes */}
        <Route path="/admin/clients" element={<ProtectedRoute allowedRoles={['admin']}><AdminClients /></ProtectedRoute>} />
        <Route path="/admin/import" element={<ProtectedRoute allowedRoles={['admin']}><AdminImport /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
