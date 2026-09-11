import "dotenv/config";
import Stripe from "stripe";
import { eq } from "drizzle-orm";

import { db } from "../../db/index.js";
import { users } from "../../db/schema/users.js";

const VALID_BILLING_CYCLES = ["monthly", "yearly"];

// ============================================
// PLAN CATALOG
// UI shows BDT (৳100 / ৳1000). Stripe cannot
// charge BDT, so Checkout charges the USD
// equivalent below. Keep the 1:10 ratio.
// ============================================

export const PLAN_CATALOG = {
  monthly: {
    displayAmount: 100,
    displayCurrency: "BDT",
    stripeAmountCents: 100, // $1.00 USD
    stripeCurrency: "usd",
    name: "SkillSync Premium — Monthly",
  },
  yearly: {
    displayAmount: 1000,
    displayCurrency: "BDT",
    stripeAmountCents: 1000, // $10.00 USD
    stripeCurrency: "usd",
    name: "SkillSync Premium — Yearly",
  },
};

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) return null;

  return new Stripe(key);
};

export const isStripeEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY);

const getFrontendUrl = () =>
  process.env.FRONTEND_URL || "http://localhost:3000";

export const createCheckoutSession = async ({
  userId,
  customerEmail,
  plan,
}) => {
  const normalizedPlan = String(plan || "monthly").toLowerCase();

  if (!VALID_BILLING_CYCLES.includes(normalizedPlan)) {
    const error = new Error("Plan must be either monthly or yearly");
    error.statusCode = 400;
    throw error;
  }

  const catalog = PLAN_CATALOG[normalizedPlan];
  const stripe = getStripe();
  const frontendUrl = getFrontendUrl();

  if (!stripe) {
    const error = new Error("Stripe is not configured on the server");
    error.statusCode = 503;
    throw error;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: customerEmail || undefined,
    line_items: [
      {
        price_data: {
          currency: catalog.stripeCurrency,
          product_data: { name: catalog.name },
          unit_amount: catalog.stripeAmountCents,
          recurring: {
            interval: normalizedPlan === "yearly" ? "year" : "month",
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId,
      plan: normalizedPlan,
    },
    subscription_data: {
      metadata: {
        userId,
        plan: normalizedPlan,
      },
    },
    success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&plan=${normalizedPlan}`,
    cancel_url: `${frontendUrl}/payment?canceled=1`,
  });

  return {
    stripeEnabled: true,
    sessionId: session.id,
    paymentId: session.id,
    plan: normalizedPlan,
    displayAmount: catalog.displayAmount,
    displayCurrency: catalog.displayCurrency,
    chargeAmount: catalog.stripeAmountCents / 100,
    chargeCurrency: catalog.stripeCurrency.toUpperCase(),
    url: session.url,
  };
};

// ============================================
// VERIFY CHECKOUT SESSION
// GET /api/payments/verify?session_id=cs_...
// Source of truth: Stripe API, not localStorage.
// ============================================

export const verifyCheckoutSession = async (sessionId, userId) => {
  if (!sessionId || typeof sessionId !== "string") {
    const error = new Error("session_id is required");
    error.statusCode = 400;
    throw error;
  }

  const stripe = getStripe();

  if (!stripe) {
    const error = new Error(
      "Stripe is not configured. Add STRIPE_SECRET_KEY to backend .env first."
    );
    error.statusCode = 503;
    throw error;
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  if (session.metadata?.userId !== userId) {
    const error = new Error("This checkout session does not belong to the current user");
    error.statusCode = 403;
    throw error;
  }

  const paid = session.payment_status === "paid";
  const plan = session.metadata?.plan || "monthly";

  if (paid && session.subscription) {
    const subscription = session.subscription;
    await db
      .update(users)
      .set({
        stripeCustomerId: session.customer || null,
        stripeSubscriptionId: subscription.id,
        subscriptionPlan: plan,
        subscriptionStatus: subscription.status,
        subscriptionPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null,
      })
      .where(eq(users.id, userId));
  }

  return {
    paid,
    plan,
    sessionId: session.id,
    customerEmail: session.customer_details?.email || null,
    amountTotal: session.amount_total != null ? session.amount_total / 100 : null,
    currency: session.currency ? session.currency.toUpperCase() : null,
    paymentStatus: session.payment_status,
  };
};

export const getSubscriptionStatus = async (userId) => {
  const [user] = await db
    .select({
      plan: users.subscriptionPlan,
      status: users.subscriptionStatus,
      periodEnd: users.subscriptionPeriodEnd,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const active = ["active", "trialing"].includes(user?.status);

  return {
    isPremium: active,
    plan: active ? user.plan || "monthly" : "free",
    status: user?.status || "inactive",
    periodEnd: user?.periodEnd || null,
  };
};
