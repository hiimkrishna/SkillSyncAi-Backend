// src/modules/applications/application.schema.js

// ============================================
// APPLY TO JOB
// POST /api/applications
// ============================================

export const applyToJobSchema = {
  body: {
    type: "object",
    additionalProperties: false,

    required: ["jobId"],

    properties: {
      jobId: {
        type: "string",
        format: "uuid",
      },
    },
  },
};

// ============================================
// APPLICATION ID
// /api/applications/:id
// ============================================

export const applicationIdSchema = {
  params: {
    type: "object",
    additionalProperties: false,

    required: ["id"],

    properties: {
      id: {
        type: "string",
        format: "uuid",
      },
    },
  },
};

// ============================================
// UPDATE APPLICATION STATUS
// PATCH /api/applications/:id/status
// ============================================

export const updateApplicationStatusSchema = {
  params: applicationIdSchema.params,

  body: {
    type: "object",
    additionalProperties: false,

    required: ["status"],

    properties: {
      // ========================================
      // STATUS
      // ========================================

      status: {
        type: "string",
        enum: [
          "pending",
          "screening",
          "shortlisted",
          "interview",
          "offer",
          "rejected",
        ],
      },

      // ========================================
      // REJECTION
      // ========================================

      rejectionReason: {
        type: "string",
        maxLength: 2000,
      },

      // ========================================
      // SHORTLIST
      // ========================================

      shortlistNotes: {
        type: "string",
        maxLength: 5000,
      },

      shortlistPriority: {
        type: "string",
        enum: ["low", "medium", "high", "urgent"],
      },

      // ========================================
      // INTERVIEW
      // ========================================

      interviewDetails: {
        type: "object",
        additionalProperties: false,

        properties: {
          date: {
            type: "string",
          },

          time: {
            type: "string",
          },

          type: {
            type: "string",
            enum: ["screening", "technical", "behavioral", "final"],
          },

          interviewer: {
            type: "string",
            maxLength: 255,
          },
        },
      },

      // ========================================
      // OFFER
      // ========================================

      offerDetails: {
        type: "object",
        additionalProperties: false,

        properties: {
          salary: {
            type: "number",
            minimum: 0,
          },

          currency: {
            type: "string",
            maxLength: 10,
          },

          startDate: {
            type: "string",
          },

          notes: {
            type: "string",
            maxLength: 5000,
          },
        },
      },
    },
  },
};
