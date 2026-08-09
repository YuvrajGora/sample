import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Login from '@/components/Login';
import AppShell, { type Tab } from '@/components/AppShell';
import CitizenDashboard from '@/components/dashboards/CitizenDashboard';
import ResidentDashboard from '@/components/dashboards/ResidentDashboard';
import WorkerDashboard from '@/components/dashboards/WorkerDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import AIAssistant from '@/components/AIAssistant';
import ComplaintsView from '@/components/views/ComplaintsView';
import ProfileView from '@/components/views/ProfileView';
import UnifiedBinScanner from '@/components/UnifiedBinScanner';
import ScanPage from '@/components/ScanPage';
import DbTestPage from '@/components/DbTestPage';

function AppInner() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('home');

  if (!user) return <Login />;

  const renderTab = () => {
    if (tab === 'ai') return <AIAssistant />;
    if (tab === 'complaints') return <ComplaintsView />;
    if (tab === 'profile') return <ProfileView />;
    if (tab === 'scanner' && user.role === 'worker') {
      return <UnifiedBinScanner role="worker" onClose={() => setTab('home')} />;
    }
    // home
    if (user.role === 'resident') return <ResidentDashboard onOpenAI={() => setTab('ai')} />;
    if (user.role === 'citizen') return <CitizenDashboard onOpenAI={() => setTab('ai')} />;
    if (user.role === 'worker') return <WorkerDashboard onOpenScanner={() => setTab('scanner')} />;
    return <AdminDashboard />;
  };

  return (
    <AppShell tab={tab} setTab={setTab}>
      {renderTab()}
    </AppShell>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/scan/:houseId" element={<ScanPage />} />
            <Route path="/db-test" element={<DbTestPage />} />
            <Route path="*" element={<AppInner />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
