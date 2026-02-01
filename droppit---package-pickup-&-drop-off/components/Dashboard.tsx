import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, Booking, BookingStatus, PACKAGE_SIZES } from '../types';
import {
  Package, User as UserIcon, Plus, Clock, CheckCircle, MapPin, Navigation, Star,
  PackageCheck, Truck, X, Compass, Zap, Radar, Camera,
  ChevronRight, ShieldCheck, Image as ImageIcon, FileText, Smartphone,
  Receipt, Check, QrCode, ShieldAlert, Ban, UserCheck, AlertCircle, Database, Search, Loader2
} from 'lucide-react';
import { BookingWizard } from './BookingWizard';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onNavigateProfile: () => void;
  onStartCheckout: (orderId: string, amountCents: number) => void;
}

const isValidTransition = (current: BookingStatus, next: BookingStatus, role: string): boolean => {
  if (role === 'admin') return true;
  if (current === next) return true;

  const transitions: Record<BookingStatus, BookingStatus[]> = {
    'booked': ['courier_assigned', 'canceled'],
    'courier_assigned': ['picked_up', 'issue_hold', 'canceled'],
    'picked_up': ['at_dropoff', 'issue_hold'],
    'at_dropoff': ['completed', 'issue_hold'],
    'completed': [],
    'issue_hold': ['courier_assigned', 'picked_up', 'at_dropoff', 'canceled'],
    'canceled': []
  };

  return transitions[current]?.includes(next) || false;
};

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  onLogout,
  onNavigateProfile,
  onStartCheckout
}) => {
  const [activeTab, setActiveTab] = useState<'deliveries' | 'tracking' | 'admin'>('deliveries');
  const [isBooking, setIsBooking] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isProcessingOp, setIsProcessingOp] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('droppit_bookings_db');
    if (saved) {
      setBookings(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('droppit_bookings_db', JSON.stringify(bookings));
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (user.role === 'admin') return true;
      if (user.role === 'courier') return b.courier_id === user.id || b.status === 'booked';
      return b.customer_id === user.id;
    });
  }, [bookings, user]);

  const secureCompleteDelivery = async (id: string) => {
    const job = bookings.find(b => b.id === id);
    if (!job) return;

    setIsProcessingOp(true);
    await new Promise(r => setTimeout(r, 1500));

    if (user.role !== 'admin' && job.courier_id !== user.id) {
      alert("Access Denied: You are not assigned to this delivery.");
      setIsProcessingOp(false);
      return;
    }

    if (!job.pickup_proof_url || !job.dropoff_receipt_url) {
      alert("Please upload pickup proof and drop-off receipt to complete.");
      setIsProcessingOp(false);
      return;
    }

    updateBooking(id, { status: 'completed' });
    setIsProcessingOp(false);
    setSelectedBooking(null);
  };

  const updateBooking = useCallback((id: string, updates: Partial<Booking>) => {
    setBookings(prev => prev.map(b => {
      if (b.id !== id) return b;

      if (user.role === 'customer' && updates.status && updates.status !== 'canceled') {
        alert("Status changes are handled by your runner.");
        return b;
      }

      if (updates.status && !isValidTransition(b.status, updates.status, user.role)) {
        alert(`Cannot move from ${b.status} to ${updates.status}.`);
        return b;
      }

      return { ...b, ...updates, updated_at: new Date().toISOString() };
    }));
  }, [user]);

  /**
   * ✅ PAYMENT GATE:
   * When booking wizard completes, we do NOT publish to bookings_db yet.
   * We store it temporarily and force Stripe checkout first.
   */
  const handleBookingComplete = (newBooking: Booking) => {
    localStorage.setItem('droppit_pending_booking', JSON.stringify(newBooking));
    setIsBooking(false);

    const amountCents = Math.round(newBooking.price_total * 100);
    onStartCheckout(newBooking.id, amountCents);
  };

  const activeJobs = filteredBookings.filter(b => b.status !== 'completed' && b.status !== 'canceled');
  const userHistory = filteredBookings.filter(b => b.status === 'completed' || b.status === 'canceled');

  const renderCourierFlow = (job: Booking) => {
    const hasPickup = !!job.pickup_proof_url;
    const hasReceipt = !!job.dropoff_receipt_url;
    const canFinalize = hasPickup && hasReceipt;

    const capturePickup = () => {
      const path = `pickup_proof/${job.id}/pickup_${Date.now()}.png`;
      updateBooking(job.id, { pickup_proof_url: path, status: 'picked_up' });
    };

    const captureReceipt = () => {
      const path = `dropoff_receipts/${job.id}/receipt_${Date.now()}.png`;
      updateBooking(job.id, { dropoff_receipt_url: path, status: 'at_dropoff' });
    };

    return (
      <div className="bg-slate-900 border-2 border-lime-400/30 rounded-[2.5rem] p-6 space-y-6 animate-in slide-in-from-bottom-4 shadow-2xl z-50 fixed bottom-0 left-0 right-0 max-w-md mx-auto mb-20 font-inter">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-lime-400" size={20} />
            <h4 className="text-xs font-black uppercase tracking-widest text-white italic">Delivery Task</h4>
          </div>
          <button onClick={() => setSelectedBooking(null)} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <p className="text-[10px] text-slate-500 font-black uppercase mb-1 italic tracking-widest">Drop-off Location</p>
            <p className="text-sm font-black text-white italic tracking-tighter leading-tight">{job.dropoff_name}</p>
            <p className="text-[9px] text-slate-400 uppercase mt-1 tracking-tighter leading-tight">{job.dropoff_address}</p>
          </div>

          {job.courier_id === null ? (
            <button
              onClick={() => updateBooking(job.id, { courier_id: user.id, status: 'courier_assigned' })}
              className="w-full bg-lime-400 text-slate-950 font-black py-4 rounded-2xl uppercase italic tracking-tighter shadow-lg shadow-lime-400/20 active:scale-95"
            >
              Claim Job
            </button>
          ) : (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[8px] text-slate-500 font-black uppercase tracking-widest italic">1. Photo of Pickup</label>
                  {hasPickup && <span className="text-[8px] text-lime-400 font-black uppercase">Captured</span>}
                </div>
                {!hasPickup ? (
                  <button onClick={capturePickup} className="w-full p-6 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center gap-2 hover:border-lime-400/50 transition-all group">
                    <Camera size={24} className="text-slate-600 group-hover:text-lime-400" />
                    <span className="text-[9px] font-black uppercase text-slate-500 italic">Take Photo</span>
                  </button>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-lime-400/50 bg-slate-950 p-4 flex items-center justify-center shadow-inner">
                    <PackageCheck className="text-lime-400" size={24} />
                    <div className="absolute top-2 right-2 bg-lime-400 p-1 rounded-full"><Check size={10} className="text-slate-950" /></div>
                  </div>
                )}
              </div>

              {(job.status === 'picked_up' || job.status === 'at_dropoff' || job.status === 'completed') && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[8px] text-slate-500 font-black uppercase tracking-widest italic">2. Drop-off Receipt</label>
                    {hasReceipt && <span className="text-[8px] text-lime-400 font-black uppercase">Captured</span>}
                  </div>
                  {!hasReceipt ? (
                    <button onClick={captureReceipt} className="w-full p-6 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center gap-2 hover:border-lime-400/50 transition-all group">
                      <Receipt size={24} className="text-slate-600 group-hover:text-lime-400" />
                      <span className="text-[9px] font-black uppercase text-slate-500 italic">Take Photo</span>
                    </button>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden border border-lime-400/50 bg-slate-950 p-4 flex items-center justify-center shadow-inner">
                      <CheckCircle className="text-lime-400" size={24} />
                      <div className="absolute top-2 right-2 bg-lime-400 p-1 rounded-full"><Check size={10} className="text-slate-950" /></div>
                    </div>
                  )}
                </div>
              )}

              <button
                disabled={!canFinalize || job.status === 'completed' || isProcessingOp}
                onClick={() => secureCompleteDelivery(job.id)}
                className="w-full bg-lime-400 text-slate-950 font-black py-4 rounded-2xl uppercase italic tracking-tighter disabled:opacity-20 active:scale-95 transition-all text-sm shadow-xl shadow-lime-400/10 flex items-center justify-center gap-2"
              >
                {isProcessingOp ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  job.status === 'completed' ? 'Delivery Completed' : 'Finish Delivery'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAdminView = () => (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24 font-inter">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-2 italic leading-none">
          <Database size={12} className="text-lime-400" /> Admin Panel
        </h3>
        <span className="bg-slate-900 text-[8px] font-black uppercase px-2.5 py-1 rounded border border-slate-800 text-slate-500 leading-none">Total Shipments: {bookings.length}</span>
      </div>

      <div className="space-y-4">
        {bookings.length === 0 ? (
          <div className="bg-slate-900/20 border border-dashed border-slate-800 rounded-[2.5rem] p-16 text-center text-slate-800 text-[10px] font-black uppercase tracking-[0.4em] italic leading-loose">No deliveries found</div>
        ) : (
          bookings.map(b => (
            <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl group hover:border-lime-400/30 transition-all relative">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[8px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase tracking-widest italic leading-none">ID: {b.id.slice(0, 8)}</span>
                  <h4 className="text-sm font-black text-white mt-1 uppercase italic tracking-tighter leading-tight">{b.carrier} Order</h4>
                </div>
                <div className={`text-[8px] font-black px-2.5 py-1 rounded uppercase italic leading-none ${
                  b.status === 'completed' ? 'bg-lime-400 text-slate-950' : b.status === 'issue_hold' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {b.status.replace('_', ' ')}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Asset', url: b.qr_url || b.label_url, icon: FileText },
                  { label: 'Pickup', url: b.pickup_proof_url, icon: Camera },
                  { label: 'Receipt', url: b.dropoff_receipt_url, icon: Receipt },
                ].map((art, i) => (
                  <div key={i} className={`aspect-square bg-slate-950 rounded-xl border flex flex-col items-center justify-center transition-all ${art.url ? 'border-lime-400/40' : 'border-slate-800'}`}>
                    {art.url ? (
                      <div className="text-center p-1">
                        <art.icon size={12} className="text-lime-400 mx-auto" />
                        <p className="text-[4px] text-lime-400/40 font-black uppercase tracking-tighter truncate w-10 mt-1">{art.url}</p>
                      </div>
                    ) : (
                      <art.icon size={12} className="text-slate-800" />
                    )}
                  </div>
                ))}
                <button className="aspect-square bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center text-slate-500 hover:text-lime-400 transition-all shadow-inner">
                  <Search size={14} />
                </button>
              </div>

              <div className="flex gap-2">
                <button onClick={() => updateBooking(b.id, { status: 'issue_hold' })} className="flex-1 bg-orange-500/10 border border-orange-500/30 text-orange-500 text-[8px] font-black uppercase py-2.5 rounded-lg active:scale-95 leading-none">Hold</button>
                <button onClick={() => updateBooking(b.id, { courier_id: null, status: 'booked' })} className="flex-1 bg-blue-500/10 border border-blue-500/30 text-blue-500 text-[8px] font-black uppercase py-2.5 rounded-lg active:scale-95 leading-none">Reset</button>
                <button onClick={() => updateBooking(b.id, { status: 'canceled' })} className="flex-1 bg-red-500/10 border border-red-500/30 text-red-500 text-[8px] font-black uppercase py-2.5 rounded-lg active:scale-95 leading-none">Cancel</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-950 pb-24 text-slate-100 font-inter">
      <div className="p-6 flex justify-between items-center bg-slate-950 sticky top-0 z-40 border-b border-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="bg-lime-400 p-1.5 rounded-lg shadow-lg shadow-lime-400/20 neon-glow">
            <Package className="text-slate-950 w-5 h-5" />
          </div>
          <span className="font-bold tracking-tighter text-xl italic text-white uppercase leading-none">DROPP<span className="text-lime-400">IT</span></span>
        </div>
        <div className="flex items-center gap-1">
          <div className="bg-slate-900 px-3 py-1 rounded text-[8px] font-black uppercase text-slate-500 tracking-[0.2em] border border-slate-800 mr-2 italic shadow-inner leading-none">
            {user.role}
          </div>
          <button onClick={onNavigateProfile} className="text-slate-500 hover:text-lime-400 p-2 transition-colors relative leading-none">
            <UserIcon size={20} />
            <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-lime-400 rounded-full border border-slate-950"></div>
          </button>
        </div>
      </div>

      <div className="px-6 space-y-8 pt-4">
        {user.role === 'admin' && activeTab === 'admin' ? renderAdminView() : (
          <>
            {activeTab === 'deliveries' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="bg-gradient-to-br from-lime-400 to-lime-500 rounded-[2.5rem] p-8 shadow-xl shadow-lime-400/20 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-1000 pointer-events-none">
                    <Truck size={160} />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-slate-950 text-4xl font-black mb-1 uppercase tracking-tighter italic leading-none">Drop packages,<br />not your plans.</h3>
                    <p className="text-slate-950/60 text-[11px] font-black uppercase tracking-[0.2em] mb-8 italic leading-tight">Fast, secure package pickup service</p>
                    <button onClick={() => setIsBooking(true)} className="flex items-center gap-3 bg-slate-950 text-white font-black py-4 px-8 rounded-2xl active:scale-95 transition-all uppercase italic tracking-tighter text-sm shadow-2xl hover:bg-slate-900 leading-none">
                      <Plus size={18} className="text-lime-400" />
                      Ship a Package
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] text-slate-500 uppercase font-black tracking-widest italic leading-none">
                    {user.role === 'courier' ? 'Assigned Deliveries' : 'Active Shipments'}
                  </h3>
                  {activeJobs.length === 0 ? (
                    <div className="bg-slate-900/20 border border-dashed border-slate-800 rounded-[2.5rem] p-16 text-center text-slate-800 uppercase text-[9px] font-black tracking-[0.4em] italic leading-relaxed">No active shipments right now</div>
                  ) : (
                    <div className="space-y-3">
                      {activeJobs.map(job => (
                        <div
                          key={job.id}
                          onClick={() => user.role === 'courier' ? setSelectedBooking(job) : setActiveTab('tracking')}
                          className="bg-slate-900 p-5 rounded-3xl border border-slate-800 flex items-center justify-between hover:border-lime-400/30 transition-all cursor-pointer group shadow-xl"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-slate-800 text-slate-400 group-hover:text-lime-400 transition-all shadow-inner leading-none">
                              <PackageCheck size={20} />
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none mb-1 italic">{job.carrier} Order</p>
                              <h4 className="font-black text-sm uppercase italic text-white tracking-tighter leading-tight">{job.dropoff_name}</h4>
                            </div>
                          </div>
                          <div className="bg-slate-800 p-2 rounded-xl text-slate-400 group-hover:text-lime-400 transition-colors leading-none">
                            <ChevronRight size={18} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] text-slate-500 uppercase font-black tracking-widest italic leading-none">Past Orders</h3>
                  {userHistory.length === 0 ? (
                    <div className="text-center text-slate-800 text-[8px] font-black uppercase tracking-widest p-8 italic leading-none">History is empty.</div>
                  ) : (
                    <div className="space-y-3">
                      {userHistory.map((job) => (
                        <div key={job.id} className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800 flex items-center justify-between hover:bg-slate-900/60 transition-all group">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-xl border transition-all leading-none ${job.status === 'completed' ? 'bg-lime-400/10 border-lime-400/30 text-lime-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                              {job.status === 'completed' ? <CheckCircle size={18} /> : <Clock size={18} />}
                            </div>
                            <div>
                              <h4 className="font-black text-xs uppercase italic text-white leading-tight">{job.carrier} Trip</h4>
                              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest italic mt-0.5 leading-none">{job.status.replace('_', ' ')} • {job.dropoff_name}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black text-white italic tracking-tighter leading-none">${job.price_total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'tracking' && (
              <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <h3 className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-2 italic leading-none">
                  <Radar size={12} className="text-lime-400" /> Track My Delivery
                </h3>
                {activeJobs.length === 0 ? (
                  <div className="p-20 text-center text-slate-800 text-[10px] font-black uppercase italic tracking-[0.4em] leading-loose">No active deliveries to track</div>
                ) : (
                  <div className="space-y-8">
                    {activeJobs.map(job => (
                      <div key={job.id} className="bg-slate-900 border border-lime-400/20 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden group">
                        <div className="flex justify-between items-start relative z-10">
                          <div>
                            <h4 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none">{job.carrier} SHIPMENT</h4>
                            <p className="text-[10px] text-lime-400 font-black uppercase tracking-widest mt-2 italic leading-none">{job.status.replace('_', ' ')}</p>
                          </div>
                          <div className="bg-slate-800 p-3 rounded-2xl text-lime-400 border border-slate-700 shadow-xl leading-none"><Radar className="animate-pulse" size={24} /></div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 relative z-10">
                          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 group/art shadow-inner">
                            <span className="text-[7px] font-black uppercase text-slate-600 tracking-widest italic block leading-none">QR/Label</span>
                            <div className="h-24 bg-slate-900/50 rounded-xl border border-lime-400/20 flex flex-col items-center justify-center p-2 leading-none">
                              <FileText size={20} className="text-lime-400 mb-1.5" />
                              <p className="text-[4px] text-slate-700 font-black uppercase truncate w-full text-center tracking-tighter italic leading-none">{job.qr_url || job.label_url}</p>
                            </div>
                          </div>
                          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 group/art shadow-inner">
                            <span className="text-[7px] font-black uppercase text-slate-600 tracking-widest italic block leading-none">Pickup Proof</span>
                            {job.pickup_proof_url ? (
                              <div className="h-24 bg-slate-900/50 rounded-xl border border-lime-400/20 flex flex-col items-center justify-center p-2 leading-none">
                                <Camera size={20} className="text-lime-400 mb-1.5" />
                                <p className="text-[4px] text-slate-700 font-black uppercase truncate w-full text-center tracking-tighter leading-none italic">{job.pickup_proof_url}</p>
                              </div>
                            ) : <div className="h-24 bg-slate-900/50 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-[7px] font-black text-slate-800 italic uppercase leading-none">Waiting for pickup</div>}
                          </div>
                        </div>

                        {job.dropoff_receipt_url && (
                          <div className="bg-slate-950 p-5 rounded-3xl border border-lime-400/40 space-y-4 animate-in zoom-in-95 duration-700 shadow-2xl relative z-10">
                            <div className="flex items-center gap-2">
                              <Receipt size={16} className="text-lime-400" />
                              <span className="text-[9px] font-black uppercase text-lime-400 italic tracking-[0.2em] leading-none">Delivery Receipt</span>
                            </div>
                            <div className="h-12 bg-slate-900/50 rounded-xl border border-lime-400/20 flex items-center justify-center px-4 leading-none">
                              <ShieldCheck size={16} className="text-lime-400 shrink-0 mr-2" />
                              <p className="text-[6px] text-lime-400/60 font-black uppercase italic tracking-widest truncate w-full text-center leading-none italic">{job.dropoff_receipt_url}</p>
                            </div>
                          </div>
                        )}

                        <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden z-10 shadow-inner">
                          <div
                            className="absolute h-full bg-gradient-to-r from-lime-600 to-lime-400 transition-all duration-1000 ease-out"
                            style={{ width: job.status === 'completed' ? '100%' : job.status === 'at_dropoff' ? '85%' : job.status === 'picked_up' ? '50%' : '15%' }}
                          />
                        </div>
                        <div className="flex justify-between items-center z-10 relative">
                          <span className="text-[7px] text-slate-600 font-black uppercase tracking-widest italic leading-none">Real-time status: {job.status.replace('_', ' ')}</span>
                          <span className="text-[7px] text-slate-600 font-black uppercase tracking-widest italic leading-none">SECURE DATA</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {selectedBooking && renderCourierFlow(selectedBooking)}

      {isBooking && (
        <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col overflow-y-auto">
          <div className="max-w-md mx-auto w-full min-h-screen">
            <BookingWizard currentUser={user} onCancel={() => setIsBooking(false)} onComplete={handleBookingComplete} />
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur-2xl border-t border-slate-900/50 z-50">
        <div className="max-w-md mx-auto flex justify-between px-10 items-center">
          <button onClick={() => setActiveTab('deliveries')} className={`flex flex-col items-center gap-1.5 transition-all duration-300 leading-none ${activeTab === 'deliveries' ? 'text-lime-400 scale-110' : 'text-slate-700'}`}>
            <Package size={24} className={activeTab === 'deliveries' ? 'drop-shadow-[0_0_8px_rgba(163,230,53,0.4)]' : ''} />
            <span className="text-[8px] font-black uppercase italic tracking-widest leading-none">Home</span>
          </button>

          <button onClick={() => setIsBooking(true)} className="bg-lime-400 p-4 rounded-2xl shadow-2xl shadow-lime-400/30 text-slate-950 active:scale-90 transition-all border-4 border-slate-950 -mt-10 hover:rotate-3 leading-none">
            <Plus size={28} />
          </button>

          <button onClick={() => setActiveTab('tracking')} className={`flex flex-col items-center gap-1.5 transition-all duration-300 leading-none ${activeTab === 'tracking' ? 'text-lime-400 scale-110' : 'text-slate-700'}`}>
            <Navigation size={24} className={activeTab === 'tracking' ? 'drop-shadow-[0_0_8px_rgba(163,230,53,0.4)]' : ''} />
            <span className="text-[8px] font-black uppercase italic tracking-widest leading-none">Track</span>
          </button>

          {user.role === 'admin' && (
            <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1.5 transition-all duration-300 leading-none ${activeTab === 'admin' ? 'text-lime-400 scale-110' : 'text-slate-700'}`}>
              <Ban size={24} className={activeTab === 'admin' ? 'drop-shadow-[0_0_8px_rgba(163,230,53,0.4)]' : ''} />
              <span className="text-[8px] font-black uppercase italic tracking-widest leading-none">Admin</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
