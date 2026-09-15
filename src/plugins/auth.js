import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";

const authPlugin = async (fastify) => {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET is not set. Set it in Railway → Service → Variables (and in local .env).",
    );
  }

  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET,
  });

  fastify.decorate("authenticate", async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (error) {
      return reply.code(401).send({
        message: "Unauthorized",
      });
    }
  });

  fastify.decorate("authorize", function (allowedRoles) {
    return async function (request, reply) {
      if (!allowedRoles.includes(request.user.role)) {
        return reply.code(403).send({
          message: "Forbidden",
        });
      }
    };
  });
};

export default fp(authPlugin);