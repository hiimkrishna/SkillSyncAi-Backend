export const createRecruiterProfileSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    properties: {
      jobTitle: {
        type: ["string", "null"],
        maxLength: 255,
      },

      phone: {
        type: ["string", "null"],
        maxLength: 50,
      },

      bio: {
        type: ["string", "null"],
      },
    },
  },
};

export const updateRecruiterProfileSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    properties: {
      jobTitle: {
        type: ["string", "null"],
        maxLength: 255,
      },

      phone: {
        type: ["string", "null"],
        maxLength: 50,
      },

      bio: {
        type: ["string", "null"],
      },
    },
  },
};