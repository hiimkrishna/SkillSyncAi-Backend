// src/modules/resumes/parsing/resume.normalizer.js

const cleanString = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/\s+/g, " ")
    .trim();
};

// ============================================
// STRING ARRAY
// ============================================

const normalizeStringArray = (values) => {
  if (!Array.isArray(values)) {
    return [];
  }

  const normalized = values
    .map(cleanString)
    .filter(Boolean);

  return [
    ...new Map(
      normalized.map((item) => [
        item.toLowerCase(),
        item,
      ])
    ).values(),
  ];
};

// ============================================
// EDUCATION
// ============================================

const normalizeEducation = (values) => {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((item) => ({
      degree: cleanString(item?.degree),
      institution: cleanString(item?.institution),
      department: cleanString(item?.department),
      result: cleanString(item?.result),
      resultScale: cleanString(item?.resultScale),
      startYear: cleanString(item?.startYear),
      endYear: cleanString(item?.endYear),
      description: cleanString(item?.description),
    }))
    .filter(
      (item) =>
        item.degree ||
        item.institution ||
        item.department ||
        item.result
    );
};

// ============================================
// EXPERIENCE
// ============================================

const normalizeExperience = (values) => {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((item) => ({
      title: cleanString(item?.title),
      company: cleanString(item?.company),
      location: cleanString(item?.location),
      startDate: cleanString(item?.startDate),
      endDate: cleanString(item?.endDate),
      description: cleanString(item?.description),
      technologies: normalizeStringArray(
        item?.technologies
      ),
    }))
    .filter(
      (item) =>
        item.title ||
        item.company ||
        item.description
    );
};

// ============================================
// PROJECTS
// ============================================

const normalizeProjects = (values) => {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((item) => ({
      name: cleanString(item?.name),
      description: cleanString(item?.description),
      technologies: normalizeStringArray(
        item?.technologies
      ),
      url: cleanString(item?.url),
    }))
    .filter(
      (item) =>
        item.name ||
        item.description
    );
};

// ============================================
// CERTIFICATIONS
// ============================================

const normalizeCertifications = (values) => {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((item) => ({
      name: cleanString(item?.name),
      issuer: cleanString(item?.issuer),
      year: cleanString(item?.year),
      url: cleanString(item?.url),
    }))
    .filter(
      (item) =>
        item.name ||
        item.issuer
    );
};

// ============================================
// LANGUAGES
// ============================================

const normalizeLanguages = (values) => {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((item) => {
      if (typeof item === "string") {
        return {
          language: cleanString(item),
          reading: "",
          writing: "",
          speaking: "",
        };
      }

      return {
        language: cleanString(item?.language),
        reading: cleanString(item?.reading),
        writing: cleanString(item?.writing),
        speaking: cleanString(item?.speaking),
      };
    })
    .filter(
      (item) => item.language
    );
};

// ============================================
// REFERENCES
// ============================================

const normalizeReferences = (values) => {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((item) => ({
      name: cleanString(item?.name),
      organization: cleanString(
        item?.organization
      ),
      designation: cleanString(
        item?.designation
      ),
      address: cleanString(item?.address),
      phone: cleanString(item?.phone),
      email: cleanString(item?.email),
      relation: cleanString(item?.relation),
    }))
    .filter(
      (item) =>
        item.name ||
        item.organization
    );
};

// ============================================
// NORMALIZE RESUME
// ============================================

export const normalizeResume = (resume) => {
  const data = resume || {};

  return {
    personal: {
      name: cleanString(
        data.personal?.name
      ),

      email: cleanString(
        data.personal?.email
      ),

      alternateEmail: cleanString(
        data.personal?.alternateEmail
      ),

      phone: cleanString(
        data.personal?.phone
      ),

      alternatePhone: cleanString(
        data.personal?.alternatePhone
      ),

      location: cleanString(
        data.personal?.location
      ),

      dateOfBirth: cleanString(
        data.personal?.dateOfBirth
      ),

      gender: cleanString(
        data.personal?.gender
      ),

      nationality: cleanString(
        data.personal?.nationality
      ),

      maritalStatus: cleanString(
        data.personal?.maritalStatus
      ),

      bloodGroup: cleanString(
        data.personal?.bloodGroup
      ),

      fatherName: cleanString(
        data.personal?.fatherName
      ),

      motherName: cleanString(
        data.personal?.motherName
      ),

      religion: cleanString(
        data.personal?.religion
      ),

      height: cleanString(
        data.personal?.height
      ),

      weight: cleanString(
        data.personal?.weight
      ),
    },

    summary: cleanString(
      data.summary
    ),

    skills: normalizeStringArray(
      data.skills
    ),

    education: normalizeEducation(
      data.education
    ),

    experience: normalizeExperience(
      data.experience
    ),

    projects: normalizeProjects(
      data.projects
    ),

    certifications:
      normalizeCertifications(
        data.certifications
      ),

    languages: normalizeLanguages(
      data.languages
    ),

    achievements:
      normalizeStringArray(
        data.achievements
      ),

    portfolio: cleanString(
      data.portfolio
    ),

    socialLinks: {
      linkedin: cleanString(
        data.socialLinks?.linkedin
      ),

      github: cleanString(
        data.socialLinks?.github
      ),

      other: normalizeStringArray(
        data.socialLinks?.other
      ),
    },

    references: normalizeReferences(
      data.references
    ),
  };
};