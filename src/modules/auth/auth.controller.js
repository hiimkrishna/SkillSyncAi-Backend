import {
  registerUser,
  loginUser,
  changePasswordUser,
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

export const changePassword = async (request, reply) => {
  try {
    const userId = request.user.userId;

const result = await changePasswordUser(
  userId,
  request.body
);

return reply.code(200).send({
  message: "Password changed successfully",
  ...result,
});

  } catch (error) {
    if (
      error.message === "Current password is incorrect" ||
      error.message ===
      "New password must be different from current password"
    ) {
      return reply.code(400).send({
        message: error.message,
      });
    }

if (error.message === "User not found") {
  return reply.code(404).send({
    message: error.message,
  });
}

if (error.message === "Account is inactive") {
  return reply.code(401).send({
    message: error.message,
  });
}

request.log.error(error);

return reply.code(500).send({
  message: "Internal server error",
});

  }
};
