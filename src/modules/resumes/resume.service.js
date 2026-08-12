import { and, eq } from "drizzle-orm";

import { db } from "../../db/index.js";
import { resumes } from "../../db/schema/resumes.js";
import { users } from "../../db/schema/users.js";

// ============================================
// GET MY RESUMES
// ============================================

export const getMyResumes = async (candidateId) => {
  const [candidate] = await db
    .select({
      id: users.id,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, candidateId))
    .limit(1);

  if (!candidate) {
    throw new Error("Candidate not found");
  }

  if (candidate.role !== "candidate") {
    throw new Error("User is not a candidate");
  }

  return db
    .select({
      id: resumes.id,
      fileName: resumes.fileName,
      fileUrl: resumes.fileUrl,
      fileType: resumes.fileType,
      fileSize: resumes.fileSize,
      isActive: resumes.isActive,
      createdAt: resumes.createdAt,
      updatedAt: resumes.updatedAt,
    })
    .from(resumes)
    .where(eq(resumes.candidateId, candidateId))
    .orderBy(resumes.createdAt);
};

// ============================================
// CREATE RESUME
// ============================================

export const createResume = async (candidateId, data) => {
  const [candidate] = await db
    .select({
      id: users.id,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, candidateId))
    .limit(1);

  if (!candidate) {
    throw new Error("Candidate not found");
  }

  if (candidate.role !== "candidate") {
    throw new Error("User is not a candidate");
  }

  // Make existing resumes inactive
  await db
    .update(resumes)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(resumes.candidateId, candidateId));

  // Create new active resume
  const [resume] = await db
    .insert(resumes)
    .values({
      candidateId,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      fileType: data.fileType,
      fileSize: data.fileSize ?? null,
      isActive: true,
    })
    .returning();

  return resume;
};