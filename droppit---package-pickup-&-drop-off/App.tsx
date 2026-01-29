
import React, { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { ProfilePage } from './components/ProfilePage';
import { AuthProvider, useAuth } from './context/AuthContext';

const AppContent: React.FC = () => {
  const { user, loading, logout, updateUser } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'profile'>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-lime-400/20 blur-xl rounded-full animate-pulse" />
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-400 relative z-10"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <LandingPage />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {currentView === 'dashboard' ? (
        <Dashboard 
          user={user} 
          onLogout={logout} 
          onNavigateProfile={() => setCurrentView('profile')} 
        />
      ) : (
        <ProfilePage 
          user={user} 
          onBack={() => setCurrentView('dashboard')} 
          onUpdate={updateUser} 
          onLogout={logout}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
