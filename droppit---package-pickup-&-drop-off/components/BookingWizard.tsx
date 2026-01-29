import React, { useState, useRef } from 'react';
import { 
  X, ChevronRight, ArrowLeft, Store, 
  ShoppingBag, Box, Loader2, Truck, Building2, QrCode, FileText, Upload, CheckCircle2, 
  Check, Camera, Shield, Sparkles, MessageSquare, MapPin, UserCheck, Clock
} from 'lucide-react';
import { Carrier, PackageSize, PACKAGE_SIZES, Booking, User } from '../types';
import { getSizingRecommendation } from '../services/gemini';

interface BookingWizardProps {
  currentUser: User;
  onCancel: () => void;
  onComplete: (booking: Booking) => void;
}

const CARRIERS: { id: Carrier; color: string; logo: string; phone: string; address: string; hours: string }[] = [
  { id: 'USPS', color: 'bg-blue-600', logo: '📬', phone: '1-800-275-8777', address: 'Local USPS Office', hours: '8:30 AM - 5:00 PM' },
  { id: 'UPS', color: 'bg-yellow-800', logo: '📦', phone: '1-800-742-5877', address: 'UPS Customer Center', hours: '8:30 AM - 7:00 PM' },
  { id: 'FedEx', color: 'bg-purple-700', logo: '🚚', phone: '1-800-463-3339', address: 'FedEx Ship Center', hours: '8:00 AM - 8:00 PM' },
  { id: 'Amazon', color: 'bg-slate-100', logo: '🛒', phone: '1-888-280-4331', address: 'Amazon Hub Fulfillment', hours: '9:00 AM - 9:00 PM' },
];

const AMAZON_HUBS = [
  { id: 'whole_foods', name: 'Whole Foods Market', address: '1001 Amazon Way, Hub City', icon: <ShoppingBag size={20} /> },
  { id: 'kohls', name: "Kohl's Return Center", address: '202 Retail Rd, Retail Way', icon: <Store size={20} /> },
  { id: 'amazon_locker', name: 'Amazon Hub Locker', address: '7-Eleven, 456 Main St', icon: <Box size={20} /> },
  { id: 'amazon_fresh', name: 'Amazon Fresh', address: '789 Grocery Blvd, Market District', icon: <ShoppingBag size={20} /> },
  { id: 'ups_store', name: 'The UPS Store', address: 'UPS Store #542, Business Park', icon: <Truck size={20} /> },
  { id: 'amazon_go', name: 'Amazon Physical Store', address: 'Downtown Plaza, Suite 100', icon: <Building2 size={20} /> },
];

export const BookingWizard: React.FC<BookingWizardProps> = ({ currentUser, onCancel, onComplete }) => {
  const [step, setStep] = useState(1);
  const [carrier, setCarrier] = useState<Carrier | null>(null);
  const [hub, setHub] = useState<typeof AMAZON_HUBS[0] | null>(null);
  const [size, setSize] = useState<PackageSize | null>(null);
  
  const [returnType, setReturnType] = useState<'qr' | 'label'>('qr');
  const [artifactName, setArtifactName] = useState<string | null>(null);
  
  const [pickupAddress, setPickupAddress] = useState(currentUser.address?.street || '');
  const [pickupName, setPickupName] = useState(currentUser.name);
  const [pickupPhone, setPickupPhone] = useState(currentUser.phone);
  
  const [dropoffName, setDropoffName] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  
  const [isBoxed, setIsBoxed] = useState(false);
  const [isCodeReady, setIsCodeReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAmazon = carrier === 'Amazon';
  const totalSteps = isAmazon ? 5 : 4;

  const handleNext = () => {
    if (step === 1 && carrier && carrier !== 'Amazon') {
       const c = CARRIERS.find(x => x.id === carrier);
       if (c) {
         setDropoffName(`${c.id} Drop-off`);
         setDropoffAddress(c.address);
       }
    }
    if (step === 2 && isAmazon && hub) {
      setDropoffName(hub.name);
      setDropoffAddress(hub.address);
    }
    setStep(step + 1);
  };
  
  const handleBack = () => setStep(step - 1);

  const handleSubmit = async () => {
    const hasReturnAsset = (returnType === 'qr' || returnType === 'label') && artifactName;
    
    if (!hasReturnAsset) {
      alert("Please upload your QR code or Label to continue.");
      return;
    }

    setIsProcessing(true);
    const deliveryId = crypto.randomUUID();
    const startTime = new Date().toISOString();

    const bucket = returnType === 'qr' ? 'amazon_qr' : 'amazon_labels';
    const storagePath = `${bucket}/${deliveryId}/artifact_${artifactName}`;

    const newBooking: Booking = {
      id: deliveryId,
      customer_id: currentUser.id, 
      courier_id: null,
      status: 'booked',
      return_type: returnType,
      dropoff_name: dropoffName,
      dropoff_address: dropoffAddress,
      qr_url: returnType === 'qr' ? storagePath : undefined,
      label_url: returnType === 'label' ? storagePath : undefined,
      carrier: carrier!,
      packageSize: size!.id,
      pickup_name: pickupName,
      pickup_phone: pickupPhone,
      pickup_address: pickupAddress,
      price_total: size!.price,
      created_at: startTime,
      updated_at: startTime
    };

    // Simulated network delay for professional feel
    await new Promise(r => setTimeout(r, 2000));
    setIsProcessing(false);
    onComplete(newBooking);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setArtifactName(file.name);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-inter">
      {isProcessing ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-12 animate-in fade-in zoom-in-95 duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-lime-400/30 blur-2xl rounded-full animate-pulse" />
            <Loader2 className="w-20 h-20 text-lime-400 animate-spin relative z-10" />
          </div>
          <div className="space-y-4 text-center">
            <h2 className="text-4xl font-black italic uppercase text-white tracking-tighter leading-tight">Securing<br/>Your Runner</h2>
            <p className="text-[10px] text-lime-400/60 font-black uppercase tracking-[0.4em] animate-pulse">Assigning Nearest Courier...</p>
          </div>
          <div className="grid grid-cols-3 gap-2 w-full max-w-xs opacity-50">
            <div className="h-1 bg-lime-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="h-1 bg-lime-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="h-1 bg-lime-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      ) : (
        <>
          <div className="p-8 flex items-center justify-between border-b border-slate-900/50 backdrop-blur-md sticky top-0 z-50">
            <button onClick={step === 1 ? onCancel : handleBack} className="p-2 text-slate-500 hover:text-white transition-colors">
              {step === 1 ? <X /> : <ArrowLeft />}
            </button>
            <div className="flex gap-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className={`h-1 rounded-full transition-all duration-700 ${i + 1 <= step ? 'w-10 bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.5)]' : 'w-4 bg-slate-800'}`} />
              ))}
            </div>
            <div className="w-6" />
          </div>

          <div className="px-8 flex-1 flex flex-col pt-6 pb-32 space-y-8 overflow-y-auto">
            {step === 1 && (
              <div className="space-y-10 animate-in slide-in-from-right duration-300">
                <div className="space-y-2">
                  <h2 className="text-5xl font-black italic uppercase text-white leading-none tracking-tighter">Select<br/><span className="text-lime-400">Hub</span></h2>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest italic">Where are we dropping this off?</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {CARRIERS.map(c => (
                    <button key={c.id} onClick={() => { setCarrier(c.id); handleNext(); }} className="p-8 rounded-[2.5rem] border-2 border-slate-800 bg-slate-900/40 hover:border-lime-400 transition-all flex flex-col items-center gap-3 group active:scale-95">
                      <span className="text-5xl group-hover:scale-110 transition-transform duration-500">{c.logo}</span>
                      <span className="font-black text-lg uppercase italic text-white tracking-tighter">{c.id}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-10 animate-in slide-in-from-right duration-300">
                {isAmazon ? (
                  <>
                    <div className="space-y-2">
                      <h2 className="text-5xl font-black italic uppercase text-white leading-none tracking-tighter">Amazon<br/><span className="text-lime-400">Hubs</span></h2>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest italic">Find your nearest return point</p>
                    </div>
                    <div className="space-y-4">
                      {AMAZON_HUBS.map(h => (
                        <button key={h.id} onClick={() => { setHub(h); handleNext(); }} className="w-full p-6 rounded-[2.5rem] border-2 border-slate-800 bg-slate-900/40 hover:border-lime-400 flex items-center justify-between group transition-all active:scale-[0.98]">
                          <div className="flex items-center gap-4">
                            <div className="p-4 bg-slate-800 text-slate-400 rounded-2xl group-hover:bg-lime-400 group-hover:text-slate-950 transition-colors shadow-inner">{h.icon}</div>
                            <div className="text-left">
                               <p className="font-black text-sm uppercase italic text-white leading-none">{h.name}</p>
                               <p className="text-[9px] text-slate-500 font-bold uppercase mt-1.5 flex items-center gap-1"><MapPin size={8} /> {h.address}</p>
                            </div>
                          </div>
                          <ChevronRight size={20} className="text-slate-800 group-hover:text-lime-400 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <SizeSelection size={size} onSelect={(s) => { setSize(s); handleNext(); }} />
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-10 animate-in slide-in-from-right duration-300">
                {isAmazon ? <SizeSelection size={size} onSelect={(s) => { setSize(s); handleNext(); }} /> : (
                  <Details step={step} onNext={handleNext} {...{returnType, setReturnType, artifactName, pickupAddress, setPickupAddress, isBoxed, setIsBoxed, isCodeReady, setIsCodeReady, fileInputRef, handleFileUpload}} />
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-10 animate-in slide-in-from-right duration-300">
                {isAmazon ? (
                  <Details step={step} onNext={handleNext} {...{returnType, setReturnType, artifactName, pickupAddress, setPickupAddress, isBoxed, setIsBoxed, isCodeReady, setIsCodeReady, fileInputRef, handleFileUpload}} />
                ) : (
                  <FinalBrief carrier={carrier!} size={size!} address={pickupAddress} artifactName={artifactName} onSubmit={handleSubmit} />
                )}
              </div>
            )}

            {step === 5 && isAmazon && (
              <div className="animate-in slide-in-from-right duration-300">
                <FinalBrief carrier={carrier!} hub={hub?.name} size={size!} address={pickupAddress} artifactName={artifactName} onSubmit={handleSubmit} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const SizeSelection = ({ size, onSelect }: any) => {
  const [showAi, setShowAi] = useState(false);
  const [itemDesc, setItemDesc] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  const askAi = async () => {
    if (!itemDesc.trim()) return;
    setIsAsking(true);
    const rec = await getSizingRecommendation(itemDesc);
    setRecommendation(rec || '');
    setIsAsking(false);
  };

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <h2 className="text-5xl font-black italic uppercase text-white leading-none tracking-tighter">Package<br/><span className="text-lime-400">Size</span></h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest italic">Pick dimensions that fit</p>
        </div>
        <button 
          onClick={() => setShowAi(!showAi)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all duration-500 ${showAi ? 'bg-lime-400 text-slate-950 border-lime-400 shadow-lg shadow-lime-400/20' : 'bg-slate-900 text-lime-400 border-lime-400/30 hover:border-lime-400'}`}
        >
          <Sparkles size={14} className={isAsking ? 'animate-spin' : ''} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none italic">{showAi ? 'Close AI' : 'AI Assistant'}</span>
        </button>
      </div>

      {showAi && (
        <div className="bg-slate-900 border border-lime-400/30 rounded-[2.5rem] p-6 space-y-5 animate-in zoom-in-95 duration-300 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Sparkles size={100} className="text-lime-400" /></div>
          <div className="flex items-center gap-2 text-lime-400 relative z-10">
            <MessageSquare size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest italic">Tell us what you're shipping...</span>
          </div>
          <div className="relative z-10">
            <textarea 
              placeholder="e.g. A pair of sneakers, two t-shirts and a small coffee maker..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm font-bold text-white placeholder:text-slate-800 outline-none focus:border-lime-400/50 transition-all resize-none h-32 shadow-inner"
              value={itemDesc}
              onChange={e => setItemDesc(e.target.value)}
            />
          </div>
          <button 
            onClick={askAi}
            disabled={isAsking || !itemDesc.trim()}
            className="w-full bg-lime-400 text-slate-950 font-black py-4 rounded-2xl uppercase italic tracking-tighter text-sm active:scale-95 disabled:opacity-30 transition-all shadow-xl shadow-lime-400/10 relative z-10"
          >
            {isAsking ? 'Calculating Fit...' : 'Get AI Recommendation'}
          </button>
          {recommendation && (
            <div className="p-5 bg-slate-950 rounded-2xl border border-lime-400/20 animate-in slide-in-from-top-4 duration-500 relative z-10">
              <p className="text-[11px] text-lime-400 leading-relaxed font-black italic uppercase tracking-tight">{recommendation}</p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {PACKAGE_SIZES.map(s => (
          <button 
            key={s.id} 
            onClick={() => onSelect(s)} 
            className={`w-full p-8 rounded-[2.5rem] border-2 bg-slate-900/40 hover:border-lime-400 text-left flex items-center justify-between transition-all group shadow-xl relative overflow-hidden ${recommendation.toLowerCase().includes(s.name.toLowerCase()) ? 'border-lime-400 bg-lime-400/5 ring-4 ring-lime-400/10 ring-offset-4 ring-offset-slate-950' : 'border-slate-800'}`}
          >
            {recommendation.toLowerCase().includes(s.name.toLowerCase()) && (
              <div className="absolute top-0 right-0 bg-lime-400 px-4 py-1.5 rounded-bl-2xl shadow-lg z-10">
                <span className="text-[8px] font-black uppercase italic text-slate-950 tracking-widest">AI Best Match</span>
              </div>
            )}
            <div>
              <h4 className="font-black text-2xl uppercase italic text-white leading-none tracking-tighter">{s.name}</h4>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2 italic flex items-center gap-2"><Box size={10} /> {s.dimensions}</p>
            </div>
            <div className="text-right">
              <span className="font-black text-lime-400 italic text-2xl group-hover:scale-110 transition-transform leading-none tracking-tighter block">${s.price}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const Details = ({ returnType, setReturnType, artifactName, pickupAddress, setPickupAddress, isBoxed, setIsBoxed, isCodeReady, setIsCodeReady, fileInputRef, handleFileUpload, onNext }: any) => {
  const canContinue = pickupAddress && artifactName && isBoxed && isCodeReady;

  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-500">
      <div className="space-y-2">
        <h2 className="text-5xl font-black italic uppercase text-white leading-none tracking-tighter">Final<br/><span className="text-lime-400">Steps</span></h2>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest italic">Confirm your pickup details</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setReturnType('qr')} className={`p-6 rounded-[2rem] border-2 transition-all duration-300 flex flex-col items-center gap-2 ${returnType === 'qr' ? 'border-lime-400 bg-lime-400/5 shadow-lg shadow-lime-400/10' : 'border-slate-800 bg-slate-900/40 opacity-50'}`}>
            <QrCode size={32} className={`${returnType === 'qr' ? 'text-lime-400' : 'text-slate-600'}`} />
            <span className={`text-[10px] font-black uppercase italic tracking-widest ${returnType === 'qr' ? 'text-lime-400' : 'text-slate-600'}`}>QR Code</span>
          </button>
          <button onClick={() => setReturnType('label')} className={`p-6 rounded-[2rem] border-2 transition-all duration-300 flex flex-col items-center gap-2 ${returnType === 'label' ? 'border-lime-400 bg-lime-400/5 shadow-lg shadow-lime-400/10' : 'border-slate-800 bg-slate-900/40 opacity-50'}`}>
            <FileText size={32} className={`${returnType === 'label' ? 'text-lime-400' : 'text-slate-600'}`} />
            <span className={`text-[10px] font-black uppercase italic tracking-widest ${returnType === 'label' ? 'text-lime-400' : 'text-slate-600'}`}>Prepaid Label</span>
          </button>
        </div>

        <div onClick={() => fileInputRef.current?.click()} className={`w-full p-10 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center gap-4 cursor-pointer transition-all duration-500 ${artifactName ? 'border-lime-400 bg-lime-400/5 shadow-lg shadow-lime-400/10' : 'border-slate-800 hover:border-lime-400/50 hover:bg-slate-900/50'}`}>
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          <div className={`p-5 rounded-3xl transition-all ${artifactName ? 'bg-lime-400 text-slate-950' : 'bg-slate-900 text-slate-700'}`}>
            {artifactName ? <CheckCircle2 size={40} /> : <Upload size={40} />}
          </div>
          <div className="text-center">
            <span className={`text-[11px] font-black uppercase tracking-[0.2em] italic block ${artifactName ? 'text-lime-400' : 'text-slate-500'}`}>
              {artifactName ? `File: ${artifactName}` : 'Upload your return asset'}
            </span>
            <p className="text-[8px] text-slate-700 font-bold uppercase mt-2">PDF, PNG, OR JPG ACCEPTED</p>
          </div>
        </div>

        <div className="space-y-3">
           <label className="text-[9px] text-slate-600 font-black uppercase tracking-[0.3em] ml-2 italic">Home Pickup Location</label>
           <div className="relative">
             <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-lime-400" size={18} />
             <input 
              placeholder="Your street address & unit..." 
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 pl-14 text-sm font-bold text-white italic focus:border-lime-400 outline-none transition-all shadow-inner placeholder:text-slate-800" 
              value={pickupAddress} 
              onChange={e => setPickupAddress(e.target.value)} 
            />
           </div>
        </div>

        <div className="space-y-3 pt-2">
          <button onClick={() => setIsBoxed(!isBoxed)} className={`w-full p-5 rounded-[1.5rem] border flex items-center gap-4 transition-all active:scale-95 ${isBoxed ? 'border-lime-400 bg-lime-400/5' : 'border-slate-800 bg-slate-900/30'}`}>
            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isBoxed ? 'bg-lime-400 border-lime-400' : 'border-slate-800'}`}>
              {isBoxed && <Check size={14} className="text-slate-950 font-black" />}
            </div>
            <span className={`text-xs font-black uppercase italic tracking-tighter ${isBoxed ? 'text-white' : 'text-slate-600'}`}>My package is sealed & ready</span>
          </button>
          <button onClick={() => setIsCodeReady(!isCodeReady)} className={`w-full p-5 rounded-[1.5rem] border flex items-center gap-4 transition-all active:scale-95 ${isCodeReady ? 'border-lime-400 bg-lime-400/5' : 'border-slate-800 bg-slate-900/30'}`}>
            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isCodeReady ? 'bg-lime-400 border-lime-400' : 'border-slate-800'}`}>
              {isCodeReady && <Check size={14} className="text-slate-950 font-black" />}
            </div>
            <span className={`text-xs font-black uppercase italic tracking-tighter ${isCodeReady ? 'text-white' : 'text-slate-600'}`}>I'm home for the Runner pickup</span>
          </button>
        </div>

        <button 
          disabled={!canContinue} 
          onClick={onNext} 
          className="w-full bg-lime-400 text-slate-950 font-black py-6 rounded-[2.5rem] disabled:opacity-30 uppercase italic active:scale-95 transition-all text-lg tracking-tighter shadow-2xl shadow-lime-400/20 mt-4"
        >
          {canContinue ? 'Review My Booking' : 'Please finish requirements'}
        </button>
      </div>
    </div>
  );
};

const FinalBrief = ({ carrier, hub, size, address, artifactName, onSubmit }: any) => (
  <div className="space-y-10 flex-1 flex flex-col font-inter animate-in slide-in-from-right duration-500">
    <div className="space-y-2">
      <h2 className="text-5xl font-black italic uppercase text-white leading-none tracking-tighter">Order<br/><span className="text-lime-400">Preview</span></h2>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest italic">Concierge pickup service</p>
    </div>

    <div className="bg-slate-900 rounded-[3rem] border border-slate-800 overflow-hidden shadow-2xl flex-1 max-h-[460px] relative flex flex-col">
      <div className="absolute top-0 right-0 p-10 opacity-10 text-lime-400 pointer-events-none group-hover:scale-110 transition-transform duration-1000"><Shield size={180} /></div>
      
      <div className="bg-lime-400 p-8 flex justify-between items-center relative z-10 shadow-lg">
        <div className="flex items-center gap-3">
           <div className="bg-slate-950 p-2 rounded-xl"><Shield className="text-lime-400" size={20} /></div>
           <div className="flex flex-col">
             <span className="text-slate-950 font-black uppercase text-[10px] tracking-widest italic leading-none">Verified Request</span>
             <span className="text-slate-950/60 font-bold uppercase text-[7px] tracking-[0.2em] mt-1 italic">Runner Assigned on Pay</span>
           </div>
        </div>
        <span className="text-slate-950 font-black text-4xl italic tracking-tighter leading-none">${size?.price}</span>
      </div>

      <div className="p-10 space-y-8 relative z-10 overflow-y-auto">
        <div className="flex items-start gap-4 animate-in slide-in-from-bottom duration-500">
           <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-lime-400"><Truck size={20} /></div>
           <div>
             <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest italic mb-1">Carrier Hub</p>
             <p className="text-xl font-black italic uppercase text-white tracking-tighter leading-tight">{carrier} {hub ? `• ${hub}` : ''}</p>
           </div>
        </div>

        <div className="flex items-start gap-4 animate-in slide-in-from-bottom duration-500 delay-100">
           <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-lime-400"><UserCheck size={20} /></div>
           <div>
             <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest italic mb-1">Concierge Pickup</p>
             <p className="text-sm font-black italic uppercase text-white tracking-tighter truncate max-w-[200px] leading-tight">{address}</p>
           </div>
        </div>

        <div className="flex items-start gap-4 animate-in slide-in-from-bottom duration-500 delay-200">
           <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-lime-400"><Clock size={20} /></div>
           <div>
             <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest italic mb-1">Estimated Arrival</p>
             <p className="text-sm font-black italic uppercase text-lime-400 tracking-tighter leading-tight">15 - 30 MINS</p>
           </div>
        </div>

        <div className="pt-6 border-t border-slate-800/50 animate-in slide-in-from-bottom duration-500 delay-300">
           <div className="flex items-center gap-2 mb-2">
             <CheckCircle2 size={12} className="text-lime-400" />
             <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest italic">Asset Verified</p>
           </div>
           <p className="text-[9px] font-black italic uppercase text-lime-400 tracking-widest truncate">{artifactName}</p>
        </div>
      </div>
    </div>

    <div className="mt-auto pt-6 space-y-4">
      <button 
        disabled={!artifactName}
        onClick={onSubmit} 
        className="w-full bg-lime-400 text-slate-950 font-black py-8 rounded-[3rem] uppercase italic tracking-tighter text-2xl active:scale-95 shadow-2xl shadow-lime-400/30 disabled:opacity-30 transition-all group"
      >
        <div className="flex items-center justify-center gap-3">
          <span>Book My Runner</span>
          <ChevronRight size={24} className="group-hover:translate-x-2 transition-transform" />
        </div>
      </button>
      <div className="flex items-center justify-center gap-2 opacity-40">
        <Shield size={10} className="text-lime-400" />
        <p className="text-[7px] text-slate-500 font-black uppercase tracking-[0.4em] italic">Encrypted Secure Transaction • 100% Insured</p>
      </div>
    </div>
  </div>
);
