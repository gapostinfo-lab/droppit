import React, { useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
);

type Props = {
  orderId?: string;
  amountCents?: number;
};

function CheckoutForm({ orderId, amountCents }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/review?orderId=${orderId}`,
      },
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message || "Payment failed");
      setLoading(false);
      return;
    }

    window.location.href = `/review?orderId=${orderId}`;
  };

  return (
    <div style={{ maxWidth: 420, margin: "40px auto" }}>
      <h2>Checkout</h2>
      <p>Total: ${(amountCents! / 100).toFixed(2)}</p>

      <PaymentElement />

      {error && <p style={{ color: "red" }}>{error}</p>}

      <button
        onClick={handlePayment}
        disabled={loading || !stripe || !elements}
        style={{ marginTop: 20, width: "100%" }}
      >
        {loading ? "Processing..." : "Pay & Continue"}
      </button>
    </div>
  );
}

export default function CheckoutPage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState("");
  const [amountCents, setAmountCents] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setOrderId(params.get("orderId") || "");
    setAmountCents(Number(params.get("amountCents")) || 0);
  }, []);

  useEffect(() => {
    if (!orderId || !amountCents) return;

    fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, amountCents }),
    })
      .then((res) => res.json())
      .then((data) => setClientSecret(data.clientSecret))
      .catch(() => alert("Failed to start payment"));
  }, [orderId, amountCents]);

  const options = useMemo(
    () => (clientSecret ? { clientSecret } : undefined),
    [clientSecret]
  );

  if (!clientSecret) return <p style={{ padding: 20 }}>Loading checkout…</p>;

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm orderId={orderId} amountCents={amountCents} />
    </Elements>
  );
}
