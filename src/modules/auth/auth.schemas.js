export const registerSchema = {
  body: {
    type: "object",
    additionalProperties: false,

    required: ["fullName", "email", "password", "role"],

    properties: {
      fullName: {
        type: "string",
        minLength: 2,
      },

      email: {
        type: "string",
        format: "email",
      },

      password: {
        type: "string",
        minLength: 8,
      },

      role: {
        type: "string",
        enum: ["candidate", "recruiter"],
      },

      jobTitle: {
        type: "string",
        minLength: 2,
      },

      phone: {
        type: "string",
        minLength: 7,
        maxLength: 50,
      },

      bio: {
        type: "string",
        maxLength: 1000,
      },
    },
  },
};

export const loginSchema = {
  body: {
    type: "object",
    additionalProperties: false,

    required: ["email", "password"],

    properties: {
      email: {
        type: "string",
        format: "email",
      },

      password: {
        type: "string",
        minLength: 8,
      },
    },
  },
};