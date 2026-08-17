// src/modules/resumes/parsing/resume.schema.js

// ============================================
// EMPTY RESUME
// ============================================

export const createEmptyResume = () => ({
  personal: {
    name: "",
    email: "",
    alternateEmail: "",
    phone: "",
    alternatePhone: "",
    location: "",
    dateOfBirth: "",
    gender: "",
    nationality: "",
    maritalStatus: "",
    bloodGroup: "",
    fatherName: "",
    motherName: "",
    religion: "",
    height: "",
    weight: "",
  },

  summary: "",

  skills: [],

  education: [],

  experience: [],

  projects: [],

  certifications: [],

  languages: [],

  achievements: [],

  portfolio: "",

  socialLinks: {
    linkedin: "",
    github: "",
    other: [],
  },

  references: [],
});

// ============================================
// EDUCATION
// ============================================

export const createEducation = () => ({
  degree: "",
  institution: "",
  department: "",
  result: "",
  resultScale: "",
  startYear: "",
  endYear: "",
  description: "",
});

// ============================================
// EXPERIENCE
// ============================================

export const createExperience = () => ({
  title: "",
  company: "",
  location: "",
  startDate: "",
  endDate: "",
  description: "",
  technologies: [],
});

// ============================================
// PROJECT
// ============================================

export const createProject = () => ({
  name: "",
  description: "",
  technologies: [],
  url: "",
});

// ============================================
// CERTIFICATION
// ============================================

export const createCertification = () => ({
  name: "",
  issuer: "",
  year: "",
  url: "",
});

// ============================================
// LANGUAGE
// ============================================

export const createLanguage = () => ({
  language: "",
  reading: "",
  writing: "",
  speaking: "",
});

// ============================================
// REFERENCE
// ============================================

export const createReference = () => ({
  name: "",
  organization: "",
  designation: "",
  address: "",
  phone: "",
  email: "",
  relation: "",
});