import { eq, and, isNull } from "drizzle-orm";

import { db } from "../../db/index.js";
import { users } from "../../db/schema/users.js";

// ============================================
// GET PENDING RECRUITERS
// ============================================

export const getPendingRecruiters = async () => {
  return await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      approvalStatus: users.approvalStatus,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(
      and(
        eq(users.role, "recruiter"),
        eq(users.approvalStatus, "pending"),
        isNull(users.deletedAt),
      ),
    );
};

// ============================================
// GET ALL USERS
// ============================================

export const getAllUsers = async (options = {}) => {
  const baseConditions = [isNull(users.deletedAt)];
  if (options.role) baseConditions.push(eq(users.role, options.role));

  return await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      approvalStatus: users.approvalStatus,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(...baseConditions));
};

// ============================================
// GET RECRUITER BY ID
// ============================================

export const getRecruiterById = async (userId) => {
  const [recruiter] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      approvalStatus: users.approvalStatus,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(
      and(
        eq(users.id, userId),
        eq(users.role, "recruiter"),
        isNull(users.deletedAt),
      ),
    );

  if (!recruiter) {
    throw new Error("Recruiter not found");
  }

  return recruiter;
};

// ============================================
// APPROVE RECRUITER
// ============================================

export const approveRecruiter = async (userId) => {
  const [updatedUser] = await db
    .update(users)
    .set({
      approvalStatus: "approved",
      isActive: true,
    })
    .where(
      and(
        eq(users.id, userId),
        eq(users.role, "recruiter"),
        isNull(users.deletedAt),
      ),
    )
    .returning({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      approvalStatus: users.approvalStatus,
      isActive: users.isActive,
    });

  if (!updatedUser) {
    throw new Error("Recruiter not found");
  }

  return updatedUser;
};

// ============================================
// REJECT RECRUITER
// ============================================

export const rejectRecruiter = async (userId) => {
  const [updatedUser] = await db
    .update(users)
    .set({
      approvalStatus: "rejected",
      isActive: false,
    })
    .where(
      and(
        eq(users.id, userId),
        eq(users.role, "recruiter"),
        isNull(users.deletedAt),
      ),
    )
    .returning({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      approvalStatus: users.approvalStatus,
      isActive: users.isActive,
    });

  if (!updatedUser) {
    throw new Error("Recruiter not found");
  }

  return updatedUser;
};

// ============================================
// EDIT RECRUITER
// ============================================

export const updateRecruiter = async (userId, data) => {
  const updateData = {};

  if (data.fullName !== undefined) {
    updateData.fullName = data.fullName;
  }

  if (data.email !== undefined) {
    updateData.email = data.email;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("No fields to update");
  }

  const [updatedUser] = await db
    .update(users)
    .set(updateData)
    .where(
      and(
        eq(users.id, userId),
        eq(users.role, "recruiter"),
        isNull(users.deletedAt),
      ),
    )
    .returning({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      approvalStatus: users.approvalStatus,
      isActive: users.isActive,
    });

  if (!updatedUser) {
    throw new Error("Recruiter not found");
  }

  return updatedUser;
};

// ============================================
// SUSPEND RECRUITER
// ============================================

export const suspendRecruiter = async (userId) => {
  const [updatedUser] = await db
    .update(users)
    .set({
      isActive: false,
    })
    .where(
      and(
        eq(users.id, userId),
        eq(users.role, "recruiter"),
        isNull(users.deletedAt),
      ),
    )
    .returning({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      approvalStatus: users.approvalStatus,
      isActive: users.isActive,
    });

  if (!updatedUser) {
    throw new Error("Recruiter not found");
  }

  return updatedUser;
};

// ============================================
// DELETE RECRUITER (soft)
// ============================================

export const deleteRecruiter = async (userId) => {
  const [deletedUser] = await db
    .update(users)
    .set({
      deletedAt: new Date(),
      isActive: false,
    })
    .where(
      and(
        eq(users.id, userId),
        eq(users.role, "recruiter"),
        isNull(users.deletedAt),
      ),
    )
    .returning({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
    });

  if (!deletedUser) {
    throw new Error("Recruiter not found");
  }

  // soft-delete related recruiter jobs as well
  const { jobs } = await import("../../db/schema/jobs.js");
  await db
    .update(jobs)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(jobs.recruiterId, userId), isNull(jobs.deletedAt)));

  return deletedUser;
};

export const unsuspendRecruiter = async (userId) => {
  const [updatedUser] = await db
    .update(users)
    .set({
      isActive: true,
    })
    .where(
      and(
        eq(users.id, userId),
        eq(users.role, "recruiter"),
        isNull(users.deletedAt),
      ),
    )
    .returning({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      approvalStatus: users.approvalStatus,
      isActive: users.isActive,
    });

  if (!updatedUser) {
    throw new Error("Recruiter not found");
  }

  return updatedUser;
};
