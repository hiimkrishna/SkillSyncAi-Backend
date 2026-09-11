import {
  createCheckoutSession,
  getSubscriptionStatus,
  verifyCheckoutSession,
} from "./payment.service.js";

export const createCheckout = async (request, reply) => {
  try {
    const { plan = "monthly" } = request.body || {};

    const session = await createCheckoutSession({
      userId: request.user.userId,
      customerEmail: request.user.email || request.body?.customerEmail || null,
      plan,
    });

    return reply.code(201).send({
      success: true,
      ...session,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to create checkout session",
    });
  }
};

export const verifyPayment = async (request, reply) => {
  try {
    const { session_id: sessionId } = request.query || {};
    const result = await verifyCheckoutSession(sessionId, request.user.userId);

    return reply.code(200).send({
      success: true,
      ...result,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to verify payment",
    });
  }
};

export const subscriptionStatus = async (request, reply) => {
  try {
    const result = await getSubscriptionStatus(request.user.userId);
    return reply.code(200).send({ success: true, ...result });
  } catch (error) {
    request.log.error(error);

    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to load subscription status",
    });
  }
};
