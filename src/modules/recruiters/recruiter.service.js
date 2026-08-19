import { eq } from "drizzle-orm";

import { db } from "../../db/index.js";
import { recruiterProfiles } from "../../db/schema/recruiter-profiles.js";
import { users } from "../../db/schema/users.js";

// ============================================
// GET RECRUITER PROFILE
// ============================================

export const getRecruiterProfile = async (userId) => {
  // ============================================
  // GET USER
  // ============================================

  const [user] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  // ============================================
  // ROLE CHECK
  // ============================================

  if (user.role !== "recruiter") {
    throw new Error("User is not a recruiter");
  }

  // ============================================
  // FIND PROFILE
  // ============================================

  const [profile] = await db
    .select()
    .from(recruiterProfiles)
    .where(
      eq(recruiterProfiles.userId, userId)
    )
    .limit(1);

  // ============================================
  // CREATE EMPTY PROFILE IF NEEDED
  // ============================================

  if (!profile) {
    const [createdProfile] = await db
      .insert(recruiterProfiles)
      .values({
        userId,
        jobTitle: null,
        phone: null,
        bio: null,
      })
      .returning();

    return {
      id: createdProfile.id,
      userId: createdProfile.userId,

      fullName: user.fullName,
      email: user.email,
      role: user.role,

      jobTitle: createdProfile.jobTitle,
      phone: createdProfile.phone,
      bio: createdProfile.bio,

      createdAt: createdProfile.createdAt,
      updatedAt: createdProfile.updatedAt,
    };
  }

  // ============================================
  // EXISTING PROFILE
  // ============================================

  return {
    id: profile.id,
    userId: profile.userId,

    fullName: user.fullName,
    email: user.email,
    role: user.role,

    jobTitle: profile.jobTitle,
    phone: profile.phone,
    bio: profile.bio,

    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
};

// ============================================
// CREATE RECRUITER PROFILE
// ============================================

export const createRecruiterProfile = async (
  userId,
  data = {}
) => {
  // ============================================
  // CHECK USER
  // ============================================

  const [user] = await db
    .select({
      id: users.id,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  // ============================================
  // ROLE CHECK
  // ============================================

  if (user.role !== "recruiter") {
    throw new Error("User is not a recruiter");
  }

  // ============================================
  // CHECK EXISTING PROFILE
  // ============================================

  const [existing] = await db
    .select()
    .from(recruiterProfiles)
    .where(
      eq(recruiterProfiles.userId, userId)
    )
    .limit(1);

  if (existing) {
    throw new Error(
      "Recruiter profile already exists"
    );
  }

  // ============================================
  // CREATE PROFILE
  // ============================================

  const [profile] = await db
    .insert(recruiterProfiles)
    .values({
      userId,

      jobTitle: data.jobTitle ?? null,
      phone: data.phone ?? null,
      bio: data.bio ?? null,
    })
    .returning();

  return profile;
};

// ============================================
// UPDATE RECRUITER PROFILE
// ============================================

export const updateRecruiterProfile = async (
  userId,
  data = {}
) => {
  // ============================================
  // CHECK USER
  // ============================================

  const [user] = await db
    .select({
      id: users.id,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  // ============================================
  // ROLE CHECK
  // ============================================

  if (user.role !== "recruiter") {
    throw new Error("User is not a recruiter");
  }

  // ============================================
  // ALLOW ONLY PROFILE FIELDS
  // ============================================

  const updateData = {};

  if (data.jobTitle !== undefined) {
    updateData.jobTitle =
      data.jobTitle;
  }

  if (data.phone !== undefined) {
    updateData.phone =
      data.phone;
  }

  if (data.bio !== undefined) {
    updateData.bio =
      data.bio;
  }

  // ============================================
  // UPDATE PROFILE
  // ============================================

  const [profile] = await db
    .update(recruiterProfiles)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(
      eq(
        recruiterProfiles.userId,
        userId
      )
    )
    .returning();

  // ============================================
  // PROFILE DOES NOT EXIST
  // ============================================

  if (!profile) {
    return createRecruiterProfile(
      userId,
      data
    );
  }

  // ============================================
  // RETURN UPDATED PROFILE
  // ============================================

  return profile;
};