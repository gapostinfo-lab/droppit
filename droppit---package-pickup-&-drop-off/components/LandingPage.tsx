
import React, { useState } from 'react';
import { Package, Truck, User as UserIcon, Eye, EyeOff, Lock, AlertCircle, Mail, Key, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const LandingPage: React.FC = () => {
  const { login, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    password: '',
    role: 'customer' as UserRole 
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const result = await login(formData.email, formData.password);
        if (!result.success) {
          setError(result.error || 'Login failed');
        }
      } else {
        if (!formData.name || !formData.email || !formData.phone || !formData.password) {
          setError('Please fill out all fields');
          setIsSubmitting(false);
          return;
        }

        const result = await signUp({
          id: '', 
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: formData.role
        });

        if (!result.success) {
          setError(result.error || 'Signup failed');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col p-6 bg-slate-950">
      <div className="flex items-center gap-2 mb-12 mt-8">
        <div className="bg-lime-400 p-2 rounded-xl shadow-lg shadow-lime-400/20">
          <Package className="text-slate-950 w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white italic">
          DROPP<span className="text-lime-400">IT</span>
        </h1>
      </div>

      <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <h2 className="text-4xl font-black mb-4 leading-tight uppercase italic tracking-tighter text-white">
          {isLogin ? 'Welcome back.' : 'Drop packages,'} <br />
          <span className="text-lime-400">{isLogin ? 'ready to ship?' : 'not your plans.'}</span>
        </h2>
        <p className="text-slate-400 text-lg font-medium">
          Simple, secure package pickup and drop-off for everyone.
        </p>
      </div>

      <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-slate-800 shadow-2xl mt-auto relative overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">
            {isLogin ? 'Secure Login' : 'Create Account'}
          </h3>
          <button 
            type="button" 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-[10px] text-lime-400 font-black uppercase tracking-widest hover:underline"
          >
            {isLogin ? 'Register' : 'Sign in'}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] p-4 rounded-2xl mb-4 font-black uppercase tracking-widest flex items-center gap-2 animate-in shake duration-300">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2 block ml-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input
                    required
                    type="text"
                    placeholder="Jane Doe"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 pl-12 focus:border-lime-400 outline-none transition-all text-sm font-bold text-white"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2 block ml-1">Phone Number</label>
                <input
                  required
                  type="tel"
                  placeholder="(555) 000-0000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 focus:border-lime-400 outline-none transition-all text-sm font-bold text-white"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2 block ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                required
                type="email"
                placeholder="your@email.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 pl-12 focus:border-lime-400 outline-none transition-all text-sm font-bold text-white"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2 block ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                required
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 pl-12 pr-12 focus:border-lime-400 outline-none transition-all text-sm font-bold text-white"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-lime-400"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-lime-400 text-slate-950 font-black py-4 rounded-2xl hover:bg-lime-300 transition-all shadow-xl shadow-lime-400/20 active:scale-95 uppercase italic tracking-tighter disabled:opacity-50 mt-4"
          >
            {isLogin ? 'Log In' : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  );
};
