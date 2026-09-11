import {
  createCheckout,
  subscriptionStatus,
  verifyPayment,
} from "./payment.controller.js";

export default async function paymentRoutes(app) {
  app.post(
    "/checkout",
    {
      preHandler: [app.authenticate, app.authorize(["candidate"])],
    },
    createCheckout,
  );

  app.get(
    "/verify",
    {
      preHandler: [app.authenticate, app.authorize(["candidate"])],
    },
    verifyPayment,
  );

  app.get(
    "/status",
    {
      preHandler: [app.authenticate, app.authorize(["candidate"])],
    },
    subscriptionStatus,
  );
}
