import {
  register,
  login,
  changePassword,
} from "./auth.controller.js";

import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from "./auth.schemas.js";

export default async function authRoutes(app) {
  app.post(
    "/register",
    { schema: registerSchema },
    register
  );

  app.post(
    "/login",
    { schema: loginSchema },
    login
  );

  app.post(
    "/change-password",
    {
      preHandler: [app.authenticate],
      schema: changePasswordSchema,
    },
    changePassword
  );

  app.get(
    "/candidate-test",
    {
      preHandler: [
        app.authenticate,
        app.authorize(["candidate"]),
      ],
    },
    async (request) => {
      return {
        message: "Candidate access granted",
        user: request.user,
      };
    }
  );

  app.get(
    "/recruiter-test",
    {
      preHandler: [
        app.authenticate,
        app.authorize(["recruiter"]),
      ],
    },
    async (request) => {
      return {
        message: "Recruiter access granted",
        user: request.user,
      };
    }
  );
}