import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import { MainLayout } from './layouts/MainLayout';

// Lazy load views for optimal code-splitting performance
const Login = React.lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Leads = React.lazy(() => import('./pages/Leads').then(m => ({ default: m.Leads })));
const RawLeads = React.lazy(() => import('./pages/RawLeads').then(m => ({ default: m.RawLeads })));
const CalledLeads = React.lazy(() => import('./pages/CalledLeads').then(m => ({ default: m.CalledLeads })));
const QualifiedLeads = React.lazy(() => import('./pages/QualifiedLeads').then(m => ({ default: m.QualifiedLeads })));
const Customers = React.lazy(() => import('./pages/Customers').then(m => ({ default: m.Customers })));
const Bookings = React.lazy(() => import('./pages/Bookings').then(m => ({ default: m.Bookings })));
const LostDeals = React.lazy(() => import('./pages/LostDeals').then(m => ({ default: m.LostDeals })));
const Followups = React.lazy(() => import('./pages/Followups').then(m => ({ default: m.Followups })));
const Reports = React.lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Settings = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const AdminConsole = React.lazy(() => import('./pages/AdminConsole').then(m => ({ default: m.AdminConsole })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

// Guard checks auth validation
const RequireAuth = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { isAuthenticated, userInfo } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && userInfo && !allowedRoles.includes(userInfo.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)', color: 'var(--text-muted)' }}>Loading Builder CRM...</div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Authenticated Application routes */}
            <Route path="/" element={<RequireAuth><MainLayout /></RequireAuth>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="raw-leads" element={<RawLeads />} />
              <Route path="called-leads" element={<CalledLeads />} />
              <Route path="qualified-leads" element={<QualifiedLeads />} />
              <Route path="leads" element={<Leads />} />
              <Route path="customers" element={<Customers />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="lost" element={<LostDeals />} />
              <Route path="followups" element={<Followups />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              
              {/* RBAC protected admin panel */}
              <Route 
                path="admin" 
                element={
                  <RequireAuth allowedRoles={['Super Admin']}>
                    <AdminConsole />
                  </RequireAuth>
                } 
              />
            </Route>
            
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
