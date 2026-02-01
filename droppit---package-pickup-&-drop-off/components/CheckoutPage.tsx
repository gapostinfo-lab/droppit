import React, { useEffect, useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

type Props = {
  orderId?: string;
  amountCents?: number;
  // Optional: if you later want App.tsx to auto-navigate after success
  onSuccess?: () => void;
};

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string);

async function createPaymentIntent(params: { orderId: string; amountCents: number }) {
  const res = await fetch('/api/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: params.orderId,
      amountCents: params.amountCents,
      currency: 'usd',
    }),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok) {
    const msg =
      data?.error ||
      data?.message ||
      `Failed to create payment intent (HTTP ${res.status}).`;
    throw new Error(msg);
  }

  if (!data?.clientSecret) {
    throw new Error('Server did not return clientSecret.');
  }

  return data.clientSecret as string;
}

function movePendingBookingIntoDb(orderId: string) {
  const pendingRaw = localStorage.getItem('droppit_pending_booking');
  if (!pendingRaw) return;

  let pending: any;
  try {
    pending = JSON.parse(pendingRaw);
  } catch {
    return;
  }

  // Only move if it matches the order we just paid for
  if (pending?.id && pending.id !== orderId) return;

  const dbRaw = localStorage.getItem('droppit_bookings_db');
  let db: any[] = [];
  try {
    db = dbRaw ? JSON.parse(dbRaw) : [];
    if (!Array.isArray(db)) db = [];
  } catch {
    db = [];
  }

  // De-dupe by booking id
  const exists = db.some((b) => b?.id === pending?.id);
  const next = exists ? db : [pending, ...db];

  localStorage.setItem('droppit_bookings_db', JSON.stringify(next));
  localStorage.removeItem('droppit_pending_booking');

  // Helpful flags for debugging / UI
  localStorage.setItem('droppit_last_paid_order', orderId);
  localStorage.setItem('droppit_checkout_success', 'true');
}

function CheckoutForm({ orderId, amountCents, onSuccess }: Props) {
  const stripe = useStripe();
  const elements = useElements();

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  const formattedAmount = useMemo(() => {
    const cents = typeof amountCents === 'number' ? amountCents : 0;
    return `$${(cents / 100).toFixed(2)}`;
  }, [amountCents]);

  const handlePayment = async () => {
    setErrorMsg(null);
    setStatusMsg(null);

    if (!orderId || typeof amountCents !== 'number') {
      setErrorMsg('Missing orderId or amountCents.');
      return;
    }
    if (!stripe || !elements) {
      setErrorMsg('Stripe is still loading. Try again in a moment.');
      return;
    }

    setLoading(true);
    setStatusMsg('Confirming payment...');

    try {
      // Confirm payment WITHOUT forced redirect (works for cards; redirects only if required)
      const result = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (result.error) {
        setErrorMsg(result.error.message || 'Payment failed. Please try again.');
        setStatusMsg(null);
        setLoading(false);
        return;
      }

      // If no error, payment intent is usually succeeded or processing depending on method
      const pi = result.paymentIntent;

      if (pi?.status === 'succeeded' || pi?.status === 'processing') {
        movePendingBookingIntoDb(orderId);
        setPaid(true);
        setStatusMsg('Payment successful!');

        // If the app wants to auto-navigate, it can pass onSuccess
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setStatusMsg(`Payment status: ${pi?.status || 'unknown'}`);
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Payment failed. Please try again.');
      setStatusMsg(null);
    } finally {
      setLoading(false);
    }
  };

  if (paid) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-lime-400/30 bg-slate-900 p-6">
          <h2 className="text-xl font-black italic tracking-tighter text-white">Payment Complete</h2>
          <p className="text-slate-400 mt-1 text-sm">
            Your order <span className="text-white font-semibold">{orderId}</span> was paid successfully.
          </p>
          <p className="text-slate-400 mt-1 text-sm">
            Booking has been saved to your shipments.
          </p>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="w-full bg-lime-400 text-slate-950 font-black py-4 rounded-2xl uppercase italic tracking-tighter shadow-lg shadow-lime-400/20 active:scale-95"
        >
          Continue
        </button>

        <p className="text-[11px] text-slate-500 text-center">
          If you don’t see your shipment, refresh again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black italic tracking-tighter text-white">Checkout</h2>
          <span className="text-slate-300 font-black italic">{formattedAmount}</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          Order: <span className="text-slate-300 font-semibold">{orderId || '—'}</span>
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <PaymentElement />
      </div>

      {statusMsg && (
        <div className="text-[12px] text-slate-400 bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3">
          {statusMsg}
        </div>
      )}

      {errorMsg && (
        <div className="text-[12px] text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          {errorMsg}
          {errorMsg.includes('/api/create-payment-intent') || errorMsg.includes('payment intent') ? (
            <div className="mt-2 text-[11px] text-red-200/80">
              Make sure your backend route <span className="font-semibold">/api/create-payment-intent</span> exists and returns
              <span className="font-semibold"> {"{ clientSecret: '...' }"}</span>.
            </div>
          ) : null}
        </div>
      )}

      <button
        onClick={handlePayment}
        disabled={loading || !stripe || !elements || !orderId || typeof amountCents !== 'number'}
        className="w-full bg-lime-400 text-slate-950 font-black py-4 rounded-2xl uppercase italic tracking-tighter shadow-lg shadow-lime-400/20 active:scale-95 disabled:opacity-30"
      >
        {loading ? 'Processing...' : 'Pay Now'}
      </button>

      <p className="text-[11px] text-slate-500 text-center">
        Secure payment powered by Stripe.
      </p>
    </div>
  );
}

export default function CheckoutPage(props: Props) {
  const { orderId, amountCents } = props;

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function boot() {
      setBootError(null);
      setClientSecret(null);

      if (!orderId || typeof amountCents !== 'number') {
        setBootError('Missing orderId or amountCents. Go back and start checkout again.');
        return;
      }

      try {
        const secret = await createPaymentIntent({ orderId, amountCents });
        if (alive) setClientSecret(secret);
      } catch (e: any) {
        if (alive) setBootError(e?.message || 'Failed to start checkout.');
      }
    }

    boot();
    return () => {
      alive = false;
    };
  }, [orderId, amountCents]);

  if (bootError) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-3">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
            <h2 className="text-lg font-black italic tracking-tighter">Checkout Error</h2>
            <p className="text-sm text-red-200/90 mt-2">{bootError}</p>
          </div>
          <button
            onClick={() => window.history.back()}
            className="w-full bg-slate-800 text-white font-black py-4 rounded-2xl uppercase italic tracking-tighter active:scale-95"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-lime-400/20 blur-xl rounded-full animate-pulse" />
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-400 relative z-10"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-md mx-auto p-6">
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: { theme: 'night' },
          }}
        >
          <CheckoutForm {...props} />
        </Elements>
      </div>
    </div>
  );
}
