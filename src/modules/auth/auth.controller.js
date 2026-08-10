import {
  registerUser,
  loginUser,
} from "./auth.service.js";

export const register = async (request, reply) => {
  try {
    const user = await registerUser(request.body);

    return reply.code(201).send({
      message: "Registration successful",
      user,
    });
  } catch (error) {
    if (error.message === "Email already registered") {
      return reply.code(409).send({
        message: error.message,
      });
    }

    if (error.message === "Admin registration is not allowed") {
      return reply.code(403).send({
        message: error.message,
      });
    }

    request.log.error(error);

    return reply.code(500).send({
      message: "Internal server error",
    });
  }
};

export const login = async (request, reply) => {
  try {
    const result = await loginUser(
      request.server,
      request.body
    );

    return reply.code(200).send({
      message: "Login successful",
      ...result,
    });
  } catch (error) {
    if (
      error.message === "Invalid email or password" ||
      error.message === "Account is inactive"
    ) {
      return reply.code(401).send({
        message: error.message,
      });
    }

    if (
      error.message ===
      "Your account is waiting for admin approval"
    ) {
      return reply.code(403).send({
        message: error.message,
      });
    }

    if (error.message === "Your account has been rejected") {
      return reply.code(403).send({
        message: error.message,
      });
    }

    request.log.error(error);

    return reply.code(500).send({
      message: "Internal server error",
    });
  }
};

