import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

import { db } from "../../db/index.js";
import { users } from "../../db/schema/users.js";
import { recruiterProfiles } from "../../db/schema/recruiter-profiles.js";

// Allowed public roles to prevent arbitrary role injection
const ALLOWED_PUBLIC_ROLES = ["candidate", "recruiter"];

export const registerUser = async ({
  fullName,
  email,
  password,
  role,
  jobTitle,
  phone,
  bio,
}) => {
  // 1. Normalize input
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !password || !fullName) {
    throw new Error("Missing required registration fields");
  }

  // 2. Validate role strictly against allowed public roles
  if (!ALLOWED_PUBLIC_ROLES.includes(role)) {
    throw new Error("Invalid or unauthorized user role");
  }

  // 3. Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // 4. Determine approval status
  const approvalStatus = role === "recruiter" ? "pending" : "approved";

  try {
    // 5. Create user and optional recruiter profile atomically within transaction
    return await db.transaction(async (tx) => {
      // Direct insertion handles potential race conditions (requires UNIQUE constraint on users.email in schema)
      const [user] = await tx
        .insert(users)
        .values({
          fullName: fullName.trim(),
          email: normalizedEmail,
          password: hashedPassword,
          role,
          approvalStatus,
          isActive: true,
        })
        .returning({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          approvalStatus: users.approvalStatus,
          isActive: users.isActive,
        });

      // 6. Create recruiter profile if applicable
      if (role === "recruiter") {
        await tx.insert(recruiterProfiles).values({
          userId: user.id,
          jobTitle: jobTitle?.trim() || null,
          phone: phone?.trim() || null,
          bio: bio?.trim() || null,
        });
      }

      return user;
    });
  } catch (error) {
    // Catch Postgres / SQLite unique constraint violation for duplicate email
    if (error.code === "23505" || error.message?.includes("UNIQUE constraint failed")) {
      throw new Error("Email already registered");
    }
    throw error;
  }
};

export const loginUser = async (fastify, { email, password }) => {
  // 1. Normalize input
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    throw new Error("Invalid email or password");
  }

  // 2. Find user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!user) {
    throw new Error("Invalid email or password");
  }

  // 3. Compare password before revealing account state to mitigate enumeration
  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    throw new Error("Invalid email or password");
  }

  // 4. Check account & approval status
  if (!user.isActive) {
    throw new Error("Account is inactive");
  }

  if (user.approvalStatus === "pending") {
    throw new Error("Your account is waiting for admin approval");
  }

  if (user.approvalStatus === "rejected") {
    throw new Error("Your account has been rejected");
  }

  // 5. Generate JWT
  const token = fastify.jwt.sign({
    userId: user.id,
    role: user.role,
    approvalStatus: user.approvalStatus,
  });

  // 6. Return safe payload
  return {
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus,
    },
  };
};

export const changePasswordUser = async (
  userId,
  { currentPassword, newPassword }
) => {
  // 1. Validate input
  if (!userId || !currentPassword || !newPassword) {
    throw new Error("Missing required password fields");
  }

  // 2. Get current user
  const [user] = await db
    .select({
      id: users.id,
      password: users.password,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  // 3. Make sure account is active
  if (!user.isActive) {
    throw new Error("Account is inactive");
  }

  // 4. Verify current password
  const passwordMatch = await bcrypt.compare(
    currentPassword,
    user.password
  );

  if (!passwordMatch) {
    throw new Error("Current password is incorrect");
  }

  // 5. Prevent using the same password
  const samePassword = await bcrypt.compare(
    newPassword,
    user.password
  );

  if (samePassword) {
    throw new Error(
      "New password must be different from current password"
    );
  }

  // 6. Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // 7. Update password
  await db
    .update(users)
    .set({
      password: hashedPassword,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return {
    success: true,
  };
};