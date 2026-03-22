import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

import { Navbar } from './components/layout/Navbar';
import { CartDrawer } from './components/cart/CartDrawer';
import { CartSync } from './components/cart/CartSync';

import { Catalog } from './pages/Catalog';
import { Login } from './pages/Login';
import { Contact } from './pages/Contact';
import { Orders } from './pages/Orders';
import { AdminClients } from './pages/admin/Clients';
import { AdminImport } from './pages/admin/Import';
import { PriceHistory } from './pages/PriceHistory';

const Layout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-background flex flex-col font-sans text-text-primary transition-colors duration-300">
    <Navbar />
    <CartDrawer />
    <CartSync />
    <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      {children}
    </main>
  </div>
);

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] | string }) => {
  const { user, role, isInitializing } = useAuthStore();

  if (isInitializing) return null; // Wait for localStorage hydration before deciding
  if (!user) return <Navigate to="/login" replace />;
  
  const roles = Array.isArray(allowedRoles) ? allowedRoles : (allowedRoles ? [allowedRoles] : []);
  if (roles.length > 0 && role && !roles.includes(role)) return <Navigate to="/" replace />;

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

        {/* Public Routes with Layout */}
        <Route path="/" element={<Layout><Catalog /></Layout>} />
        <Route path="/catalog" element={<Navigate to="/" replace />} />
        
        {/* Client Routes */}
        <Route path="/contact" element={<Layout><Contact /></Layout>} />
        <Route path="/orders" element={<ProtectedRoute allowedRoles="client"><Orders /></ProtectedRoute>} />
        <Route path="/price-history" element={<ProtectedRoute allowedRoles={['client', 'admin']}><PriceHistory /></ProtectedRoute>} />

        {/* Admin Routes */}
        <Route path="/admin/clients" element={<ProtectedRoute allowedRoles="admin"><AdminClients /></ProtectedRoute>} />
        <Route path="/admin/import" element={<ProtectedRoute allowedRoles="admin"><AdminImport /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
