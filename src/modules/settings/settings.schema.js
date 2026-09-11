export const updateSettingsSchema = {
  body: {
    type: "object",
    additionalProperties: false,

    properties: {
      account: {
        type: "object",
        additionalProperties: false,

        properties: {
          name: {
            type: "string",
            minLength: 2,
            maxLength: 255,
          },

          email: {
            type: "string",
            format: "email",
          },

          phone: {
            type: "string",
            maxLength: 50,
          },

          companyName: {
            type: "string",
            maxLength: 255,
          },
        },
      },

      security: {
        type: "object",
        additionalProperties: false,

        properties: {
          twoFactor: {
            type: "boolean",
          },
        },
      },

      notifications: {
        type: "object",
        additionalProperties: false,

        properties: {
          email: {
            type: "boolean",
          },

          push: {
            type: "boolean",
          },
        },
      },

      appearance: {
        type: "object",
        additionalProperties: false,

        properties: {
          theme: {
            type: "string",
            enum: ["light", "dark", "system"],
          },
        },
      },

      preferences: {
        type: "object",
        additionalProperties: false,

        properties: {
          location: {
            type: "string",
            maxLength: 255,
          },
        },
      },

      connectedAccounts: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,

          properties: {
            provider: {
              type: "string",
              maxLength: 50,
            },

            connected: {
              type: "boolean",
            },
          },
        },
      },
    },
  },
};

export const verifyTwoFactorSchema = {
  body: {
    type: "object",
    additionalProperties: false,

    required: ["code"],

    properties: {
      code: {
        type: "string",
        pattern: "^[0-9]{6}$",
      },
    },
  },
};
