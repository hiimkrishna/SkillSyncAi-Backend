export const getJobsSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,

    properties: {
      search: {
        type: "string",
      },

      location: {
        type: "string",
      },

      type: {
        type: "string",
      },

      status: {
        type: "string",
        enum: [
          "open",
          "closed",
          "draft",
        ],
      },
    },
  },
};

export const jobIdSchema = {
  params: {
    type: "object",
    required: ["id"],

    properties: {
      id: {
        type: "string",
        format: "uuid",
      },
    },
  },
};

export const createJobSchema = {
  body: {
    type: "object",
    additionalProperties: false,

    required: [
      "title",
      "company",
      "description",
      "type",
    ],

    properties: {
      title: {
        type: "string",
        minLength: 2,
        maxLength: 255,
      },

      company: {
        type: "string",
        minLength: 2,
        maxLength: 255,
      },

      description: {
        type: "string",
        minLength: 10,
      },

      location: {
        type: "string",
        maxLength: 255,
      },

      type: {
        type: "string",
        enum: [
          "full-time",
          "part-time",
          "contract",
          "internship",
          "remote",
        ],
      },

      salaryMin: {
        type: "integer",
        minimum: 0,
      },

      salaryMax: {
        type: "integer",
        minimum: 0,
      },

      requirements: {
        type: "string",
      },

      status: {
        type: "string",
        enum: [
          "open",
          "closed",
          "draft",
        ],
      },
    },
  },
};

export const updateJobSchema = {
  params: jobIdSchema.params,

  body: {
    type: "object",
    additionalProperties: false,

    properties: {
      title: {
        type: "string",
        minLength: 2,
        maxLength: 255,
      },

      company: {
        type: "string",
        minLength: 2,
        maxLength: 255,
      },

      description: {
        type: "string",
        minLength: 10,
      },

      location: {
        type: "string",
        maxLength: 255,
      },

      type: {
        type: "string",
      },

      salaryMin: {
        type: "integer",
        minimum: 0,
      },

      salaryMax: {
        type: "integer",
        minimum: 0,
      },

      requirements: {
        type: "string",
      },

      status: {
        type: "string",
        enum: [
          "open",
          "closed",
          "draft",
        ],
      },
    },
  },
};