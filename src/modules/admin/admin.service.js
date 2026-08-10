import { eq, and } from "drizzle-orm";

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
      and(eq(users.role, "recruiter"), eq(users.approvalStatus, "pending")),
    );
};

// ============================================
// GET ALL USERS
// ============================================

export const getAllUsers = async () => {
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
    .from(users);
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
    .where(and(eq(users.id, userId), eq(users.role, "recruiter")));

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
    .where(and(eq(users.id, userId), eq(users.role, "recruiter")))
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
    .where(and(eq(users.id, userId), eq(users.role, "recruiter")))
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
    .where(and(eq(users.id, userId), eq(users.role, "recruiter")))
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
    .where(and(eq(users.id, userId), eq(users.role, "recruiter")))
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
// DELETE RECRUITER
// ============================================

export const deleteRecruiter = async (userId) => {
  const [deletedUser] = await db
    .delete(users)
    .where(and(eq(users.id, userId), eq(users.role, "recruiter")))
    .returning({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
    });

  if (!deletedUser) {
    throw new Error("Recruiter not found");
  }

  return deletedUser;
};
