import React, { useState } from 'react';
import CheckoutPage from "./components/CheckoutPage";
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { ProfilePage } from './components/ProfilePage';
import { AuthProvider, useAuth } from './context/AuthContext';

const AppContent: React.FC = () => {
 const { user, loading, logout, updateUser } = useAuth();

const [currentView, setCurrentView] = useState<
  'dashboard' | 'profile' | 'checkout'
>('dashboard');

const [checkoutOrderId, setCheckoutOrderId] = useState<string>('');
const [checkoutAmountCents, setCheckoutAmountCents] = useState<number>(0);
  const startCheckout = (orderId: string, amountCents: number) => {
  setCheckoutOrderId(orderId);
  setCheckoutAmountCents(amountCents);
  setCurrentView('checkout');
};
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
   
   {currentView === 'checkout' ? (
  <div className="p-4">
    <button
      className="mb-4 px-4 py-2 rounded bg-slate-800 hover:bg-slate-700"
      onClick={() => setCurrentView('dashboard')}
    >
      ← Back
    </button>

    <CheckoutPage
      orderId={checkoutOrderId}
      amountCents={checkoutAmountCents}
    />
  </div>
) : currentView === 'dashboard' ? (
  <Dashboard
    user={user}
    onLogout={logout}
    onNavigateProfile={() => setCurrentView('profile')}
    onStartCheckout={startCheckout}
  />
) : (
  <ProfilePage
    user={user}
    onBack={() => setCurrentView('dashboard')}
    onUpdate={updateUser}
    onLogout={logout}
  />
)}
