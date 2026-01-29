
import React, { useState, useRef, useMemo } from 'react';
import { 
  ArrowLeft, Camera, CreditCard, Home, Lock, Mail, Phone, 
  User as UserIcon, Plus, Trash2, CheckCircle, ChevronRight, Save, AlertCircle, X, Send, Loader2, Check, LogOut
} from 'lucide-react';
import { User, PaymentMethod, UserAddress } from '../types';

interface ProfilePageProps {
  user: User;
  onBack: () => void;
  onUpdate: (user: User) => void;
  onLogout: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onBack, onUpdate, onLogout }) => {
  const [formData, setFormData] = useState<User>(user);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardExpiry, setNewCardExpiry] = useState('');
  const [newCardCvv, setNewCardCvv] = useState('');
  
  // Verification states
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const passwordStrength = useMemo(() => {
    if (!newPassword) return null;
    const length = newPassword.length;
    const hasLetters = /[a-zA-Z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    const hasMixed = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);

    if (length >= 10 && hasMixed && hasNumbers && hasSpecial) {
      return { label: 'Strong', color: 'text-lime-300', bar: 'w-full bg-lime-300' };
    }
    if (length >= 6 && (hasLetters && (hasNumbers || hasSpecial))) {
      return { label: 'Medium', color: 'text-lime-500', bar: 'w-2/3 bg-lime-500' };
    }
    return { label: 'Weak', color: 'text-lime-700', bar: 'w-1/3 bg-lime-700' };
  }, [newPassword]);

  // Real-time card type detection
  const cardType = useMemo(() => {
    const raw = newCardNumber.replace(/\s/g, '');
    if (raw.startsWith('4')) return 'visa';
    if (raw.startsWith('5') || raw.startsWith('2')) return 'mastercard';
    if (raw.startsWith('34') || raw.startsWith('37')) return 'amex';
    return 'visa'; // Default to visa if unknown or empty
  }, [newCardNumber]);

  const handleSave = async () => {
    if (isSaving || showSaved) return;
    setError('');
    
    if (newPassword || confirmPassword) {
      if (newPassword !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (newPassword.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    setIsSaving(true);
    // Simulate API call
    await new Promise(r => setTimeout(r, 1200));
    
    const updatedUser = { ...formData };
    if (newPassword) {
      updatedUser.password = newPassword;
    }
    onUpdate(updatedUser);
    
    setIsSaving(false);
    setShowSaved(true);
    setNewPassword('');
    setConfirmPassword('');

    // Revert success state after delay
    setTimeout(() => {
      setShowSaved(false);
    }, 2500);
  };

  const handleSendVerification = async () => {
    setIsVerifying(true);
    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));
    setIsVerifying(false);
    setVerificationSent(true);
    
    // Reset success message after 5 seconds
    setTimeout(() => setVerificationSent(false), 5000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, profileImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    const isAmex = value.startsWith('34') || value.startsWith('37');
    const maxLength = isAmex ? 15 : 16;
    value = value.substring(0, maxLength);
    
    let formattedValue = '';
    if (isAmex) {
      const parts = [];
      if (value.length > 0) parts.push(value.substring(0, 4));
      if (value.length > 4) parts.push(value.substring(4, 10));
      if (value.length > 10) parts.push(value.substring(10, 15));
      formattedValue = parts.join(' ');
    } else {
      formattedValue = value.match(/.{1,4}/g)?.join(' ') || '';
    }
    
    setNewCardNumber(formattedValue);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    
    // Smart leading zero for months 2-9
    if (value.length === 1 && parseInt(value) > 1) {
      value = '0' + value;
    }
    
    if (value.length > 4) value = value.substring(0, 4);
    
    if (value.length > 2) {
      const month = parseInt(value.substring(0, 2));
      // Cap month at 12
      if (month > 12) value = '12' + value.substring(2);
      if (month === 0) value = '01' + value.substring(2);
      value = value.substring(0, 2) + '/' + value.substring(2);
    }
    setNewCardExpiry(value);
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const limit = cardType === 'amex' ? 4 : 3;
    setNewCardCvv(value.substring(0, limit));
  };

  const confirmAddPaymentMethod = () => {
    const digitsOnly = newCardNumber.replace(/\s/g, '');
    const isAmex = digitsOnly.startsWith('34') || digitsOnly.startsWith('37');
    const expectedCvvLength = isAmex ? 4 : 3;
    
    if (isAmex ? digitsOnly.length < 15 : digitsOnly.length < 16) {
      setError('Please enter a valid card number');
      return;
    }
    if (newCardExpiry.length < 5) {
      setError('Please enter a valid expiry date (MM/YY)');
      return;
    }
    if (newCardCvv.length < expectedCvvLength) {
      setError(`Please enter a valid ${expectedCvvLength}-digit CVV`);
      return;
    }

    const newCard: PaymentMethod = {
      id: Math.random().toString(36).substr(2, 9),
      type: cardType,
      last4: digitsOnly.slice(-4),
      expiry: newCardExpiry
    };
    
    setFormData({
      ...formData,
      paymentMethods: [...(formData.paymentMethods || []), newCard]
    });
    
    setIsAddingCard(false);
    setNewCardNumber('');
    setNewCardExpiry('');
    setNewCardCvv('');
    setError('');
  };

  const removePaymentMethod = (id: string) => {
    setFormData({
      ...formData,
      paymentMethods: formData.paymentMethods?.filter(p => p.id !== id)
    });
  };

  const updateAddress = (field: keyof UserAddress, value: string) => {
    setFormData({
      ...formData,
      address: {
        ...(formData.address || { street: '', city: '', state: '', zip: '' }),
        [field]: value
      }
    });
  };

  const renderCardTypeIcon = (type: PaymentMethod['type'], size = 18) => {
    switch (type) {
      case 'visa':
        return <span className="font-black italic text-blue-400" style={{ fontSize: size - 4 }}>VISA</span>;
      case 'mastercard':
        return (
          <div className="flex -space-x-1.5">
            <div className="w-4 h-4 rounded-full bg-red-500 opacity-80" />
            <div className="w-4 h-4 rounded-full bg-yellow-500 opacity-80" />
          </div>
        );
      case 'amex':
        return <div className="bg-blue-600 px-1 rounded text-[10px] font-black text-white">AMEX</div>;
      default:
        return <CreditCard size={size} className="text-slate-400" />;
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-950 pb-32 text-slate-100">
      {/* Header */}
      <div className="p-6 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md z-20">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-black italic uppercase tracking-tighter">My Profile</h1>
        <button 
          onClick={handleSave} 
          disabled={isSaving || showSaved}
          className={`font-black italic uppercase text-xs tracking-widest transition-all duration-300 ${
            showSaved ? 'text-lime-400 scale-110' : 'text-lime-400 disabled:opacity-50'
          }`}
        >
          {isSaving ? 'Saving...' : showSaved ? 'Saved!' : 'Save'}
        </button>
      </div>

      <div className="px-6 space-y-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="text-red-500 shrink-0" size={18} />
            <p className="text-red-500 text-xs font-bold uppercase tracking-widest leading-tight">{error}</p>
          </div>
        )}

        {/* Profile Pic Section */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full border-4 border-slate-900 overflow-hidden shadow-2xl shadow-lime-400/10">
              {formData.profileImage ? (
                <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                  <UserIcon className="text-slate-700 w-10 h-10" />
                </div>
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-lime-400 p-2 rounded-full text-slate-950 shadow-lg active:scale-90 transition-transform"
            >
              <Camera size={16} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload} 
            />
          </div>
          <h2 className="mt-4 font-black italic text-2xl uppercase tracking-tighter">{formData.name}</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Premium Member</p>
        </div>

        {/* Section: Personal Details */}
        <div className="space-y-4">
          <h3 className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-2">
            <UserIcon size={12} className="text-lime-400" /> Personal Details
          </h3>
          <div className="space-y-3">
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 focus-within:border-lime-400/50 transition-colors">
              <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Full Name</label>
              <input 
                type="text" 
                className="w-full bg-transparent border-none p-0 focus:ring-0 text-white font-bold placeholder:text-slate-700"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 focus-within:border-lime-400/50 transition-colors">
              <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Phone Number</label>
              <input 
                type="tel" 
                className="w-full bg-transparent border-none p-0 focus:ring-0 text-white font-bold placeholder:text-slate-700"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Section: Email Verification */}
        <div className="space-y-4">
          <h3 className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-2">
            <Mail size={12} className="text-lime-400" /> Email Verification
          </h3>
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Registered Email</label>
                <p className="text-sm font-bold text-white">{formData.email}</p>
              </div>
              {!verificationSent && (
                <div className="bg-slate-800/50 px-2 py-1 rounded-md">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Unverified</span>
                </div>
              )}
            </div>
            
            {verificationSent ? (
              <div className="bg-lime-400/10 border border-lime-400/30 p-4 rounded-xl flex items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
                <CheckCircle className="text-lime-400 shrink-0" size={18} />
                <p className="text-lime-400 text-[10px] font-black uppercase tracking-widest leading-tight">
                  Verification link sent to your inbox. Please check your email.
                </p>
              </div>
            ) : (
              <button 
                onClick={handleSendVerification}
                disabled={isVerifying}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-lime-400" />
                    <span className="text-xs font-black uppercase tracking-widest italic">Sending Link...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} className="text-lime-400" />
                    <span className="text-xs font-black uppercase tracking-widest italic">Send Verification Link</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Section: Security */}
        <div className="space-y-4">
          <h3 className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-2">
            <Lock size={12} className="text-lime-400" /> Security
          </h3>
          <div className="space-y-3">
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 focus-within:border-lime-400/50 transition-colors">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] text-slate-500 font-bold uppercase">New Password</label>
                {passwordStrength && (
                  <span className={`text-[10px] font-black uppercase tracking-tighter ${passwordStrength.color}`}>
                    Strength: {passwordStrength.label}
                  </span>
                )}
              </div>
              <input 
                type="password" 
                placeholder="Enter new password"
                className="w-full bg-transparent border-none p-0 focus:ring-0 text-white font-bold placeholder:text-slate-700 text-sm"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              {passwordStrength && (
                <div className="mt-2 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${passwordStrength.bar}`} />
                </div>
              )}
            </div>
            <div className={`bg-slate-900 rounded-2xl p-4 border transition-colors ${error === 'Passwords do not match' ? 'border-red-500/50' : 'border-slate-800 focus-within:border-lime-400/50'}`}>
              <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Confirm New Password</label>
              <input 
                type="password" 
                placeholder="Re-enter new password"
                className="w-full bg-transparent border-none p-0 focus:ring-0 text-white font-bold placeholder:text-slate-700 text-sm"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section: Address */}
        <div className="space-y-4">
          <h3 className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-2">
            <Home size={12} className="text-lime-400" /> Default Address
          </h3>
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
            <input 
              type="text" 
              placeholder="Street Address"
              className="w-full bg-transparent border-none p-0 focus:ring-0 text-white font-bold placeholder:text-slate-700 text-sm"
              value={formData.address?.street}
              onChange={e => updateAddress('street', e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <input 
                type="text" 
                placeholder="City"
                className="bg-transparent border-none p-0 focus:ring-0 text-white font-bold placeholder:text-slate-700 text-sm"
                value={formData.address?.city}
                onChange={e => updateAddress('city', e.target.value)}
              />
              <input 
                type="text" 
                placeholder="State"
                className="bg-transparent border-none p-0 focus:ring-0 text-white font-bold placeholder:text-slate-700 text-sm"
                value={formData.address?.state}
                onChange={e => updateAddress('state', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section: Payment Methods */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-2">
              <CreditCard size={12} className="text-lime-400" /> Payment Methods
            </h3>
            <span className="text-[10px] text-slate-600 font-black uppercase">
              {formData.paymentMethods?.length || 0}/3 Max
            </span>
          </div>
          
          <div className="space-y-3">
            {formData.paymentMethods?.map(card => (
              <div key={card.id} className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-800 p-2 rounded-lg min-w-[40px] flex justify-center">
                    {renderCardTypeIcon(card.type)}
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase italic tracking-tight">
                      Credit/Debit •••• {card.last4}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase font-black">Expires {card.expiry}</p>
                  </div>
                </div>
                <button 
                  onClick={() => removePaymentMethod(card.id)}
                  className="text-slate-700 hover:text-red-500 p-2 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {isAddingCard ? (
              <div className="bg-slate-900 rounded-2xl p-5 border border-lime-400/30 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-lime-400 italic">Add New Card</h4>
                    {newCardNumber.length > 0 && (
                      <div className="bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1.5 animate-in slide-in-from-left-2">
                        {renderCardTypeIcon(cardType, 12)}
                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Credit/Debit</span>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setIsAddingCard(false)} className="text-slate-500 hover:text-white">
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 focus-within:border-lime-400/50">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[8px] text-slate-500 font-bold uppercase">Card Number</label>
                      {newCardNumber.length > 0 && <CheckCircle size={10} className="text-lime-400" />}
                    </div>
                    <input 
                      type="text" 
                      placeholder="0000 0000 0000 0000"
                      className="w-full bg-transparent border-none p-0 focus:ring-0 text-white font-bold placeholder:text-slate-800 tracking-widest text-sm"
                      value={newCardNumber}
                      onChange={handleCardNumberChange}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 focus-within:border-lime-400/50">
                      <label className="block text-[8px] text-slate-500 font-bold uppercase mb-1">Expiry</label>
                      <input 
                        type="text" 
                        placeholder="MM/YY"
                        className="w-full bg-transparent border-none p-0 focus:ring-0 text-white font-bold placeholder:text-slate-800 text-sm"
                        value={newCardExpiry}
                        onChange={handleExpiryChange}
                      />
                    </div>
                    <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 focus-within:border-lime-400/50">
                      <label className="block text-[8px] text-slate-500 font-bold uppercase mb-1">CVV</label>
                      <input 
                        type="password" 
                        placeholder="***"
                        maxLength={cardType === 'amex' ? 4 : 3}
                        className="w-full bg-transparent border-none p-0 focus:ring-0 text-white font-bold placeholder:text-slate-800 text-sm"
                        value={newCardCvv}
                        onChange={handleCvvChange}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={confirmAddPaymentMethod}
                    className="w-full bg-lime-400 text-slate-950 font-black py-3 rounded-xl uppercase italic tracking-tighter text-sm active:scale-95 transition-all mt-2"
                  >
                    Add Credit/Debit Card
                  </button>
                </div>
              </div>
            ) : (
              (formData.paymentMethods?.length || 0) < 3 && (
                <button 
                  onClick={() => setIsAddingCard(true)}
                  className="w-full border-2 border-dashed border-slate-800 rounded-2xl p-4 flex items-center justify-center gap-2 text-slate-500 hover:border-lime-400/50 hover:text-lime-400 transition-all"
                >
                  <Plus size={16} />
                  <span className="text-xs font-black uppercase tracking-widest italic">Add New Card</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Section: Account Actions */}
        <div className="space-y-4 pt-4">
          <h3 className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-2">
            <Plus size={12} className="text-lime-400" /> Account Actions
          </h3>
          <button 
            onClick={onLogout}
            className="w-full bg-slate-900 border border-slate-800 hover:border-red-500/50 hover:bg-red-500/5 rounded-2xl p-5 flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 bg-slate-800 text-slate-500 group-hover:text-red-500 transition-colors rounded-xl">
                <LogOut size={18} />
              </div>
              <span className="text-sm font-black uppercase italic tracking-tighter text-white group-hover:text-red-500 transition-colors">Sign Out of Droppit</span>
            </div>
            <ChevronRight size={18} className="text-slate-700" />
          </button>
        </div>

        {/* Delete Account CTA */}
        <div className="pt-8 border-t border-slate-900 pb-12">
          <button className="w-full text-red-500/50 hover:text-red-500 text-[10px] font-black uppercase tracking-widest py-4 transition-colors">
            Deactivate Droppit Account
          </button>
        </div>
      </div>

      {/* Save Button (Floating on Mobile) */}
      {!isAddingCard && (
        <div className="fixed bottom-6 left-6 right-6 max-w-md mx-auto z-30">
          <button
            onClick={handleSave}
            disabled={isSaving || showSaved}
            className={`w-full font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 uppercase italic transition-all duration-300 transform active:scale-95 ${
              showSaved 
                ? 'bg-lime-500 text-slate-950 shadow-lime-500/30' 
                : 'bg-lime-400 text-slate-950 shadow-lime-400/20 disabled:opacity-80'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 text-slate-950" />
                <span>Saving...</span>
              </>
            ) : showSaved ? (
              <>
                <Check className="h-5 w-5 animate-in zoom-in duration-300" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save size={18} />
                Save Profile Changes
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
