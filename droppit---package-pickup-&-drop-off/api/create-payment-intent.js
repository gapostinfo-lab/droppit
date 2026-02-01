const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { amountCents, currency = "usd", orderId } = req.body || {};

    if (!amountCents || typeof amountCents !== "number" || amountCents < 50) {
      return res.status(400).json({ error: "Invalid amountCents" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId: orderId || "",
      },
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    console.error("Stripe error:", err);
    return res.status(500).json({ error: "Stripe error" });
  }
};
