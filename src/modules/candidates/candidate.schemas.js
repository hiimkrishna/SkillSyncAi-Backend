export const createCandidateProfileSchema = {
  body: {
    type: "object",
    properties: {
      phone: { type: "string", maxLength: 50 },
      location: { type: "string", maxLength: 255 },
      headline: { type: "string", maxLength: 255 },
      bio: { type: "string" },

      skills: {
        type: "array",
      },

      education: {
        type: "array",
      },

      experience: {
        type: "array",
      },

      certifications: {
        type: "array",
      },

      portfolio: {
        type: "array",
      },

      socialLinks: {
        type: "object",
      },
    },
  },
};