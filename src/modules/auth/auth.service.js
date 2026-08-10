// import bcrypt from "bcrypt";
// import { eq } from "drizzle-orm";

// import { db } from "../../db/index.js";
// import { users } from "../../db/schema/users.js";
// import { recruiterProfiles } from "../../db/schema/recruiter-profiles.js";

// export const registerUser = async ({
//   fullName,
//   email,
//   password,
//   role,
//   jobTitle,
//   phone,
//   bio,
// }) => {
//   // 1. Admin cannot be created through public registration
//   if (role === "admin") {
//     throw new Error("Admin registration is not allowed");
//   }

//   // 2. Check if email already exists
//   const existingUser = await db
//     .select()
//     .from(users)
//     .where(eq(users.email, email))
//     .limit(1);

//   if (existingUser.length > 0) {
//     throw new Error("Email already registered");
//   }

//   // 3. Hash password
//   const hashedPassword = await bcrypt.hash(password, 12);

//   // 4. Determine approval status
//   const approvalStatus =
//     role === "recruiter" ? "pending" : "approved";

//   // 5. Create user + recruiter profile atomically
//   const result = await db.transaction(async (tx) => {
//     const [user] = await tx
//       .insert(users)
//       .values({
//         fullName,
//         email,
//         password: hashedPassword,
//         role,
//         approvalStatus,
//         isActive: true,
//       })
//       .returning({
//         id: users.id,
//         fullName: users.fullName,
//         email: users.email,
//         role: users.role,
//         approvalStatus: users.approvalStatus,
//         isActive: users.isActive,
//       });

//     // 6. If recruiter, create recruiter profile
//     if (role === "recruiter") {
//       await tx.insert(recruiterProfiles).values({
//         userId: user.id,
//         jobTitle: jobTitle || null,
//         phone: phone || null,
//         bio: bio || null,
//       });
//     }

//     return user;
//   });

//   return result;
// };

// export const loginUser = async (fastify, { email, password }) => {
//   // 1. Find user
//   const result = await db
//     .select()
//     .from(users)
//     .where(eq(users.email, email))
//     .limit(1);

//   if (result.length === 0) {
//     throw new Error("Invalid email or password");
//   }

//   const user = result[0];

//   // 2. Check account status
//   if (!user.isActive) {
//     throw new Error("Account is inactive");
//   }

//   // 3. Check approval status
//   if (user.approvalStatus === "pending") {
//     throw new Error("Your account is waiting for admin approval");
//   }

//   if (user.approvalStatus === "rejected") {
//     throw new Error("Your account has been rejected");
//   }

//   // 4. Compare password
//   const passwordMatch = await bcrypt.compare(
//     password,
//     user.password
//   );

//   if (!passwordMatch) {
//     throw new Error("Invalid email or password");
//   }

//   // 5. Generate JWT
//   const token = fastify.jwt.sign({
//     userId: user.id,
//     role: user.role,
//     approvalStatus: user.approvalStatus,
//   });

//   // 6. Return safe data
//   return {
//     token,
//     user: {
//       id: user.id,
//       fullName: user.fullName,
//       email: user.email,
//       role: user.role,
//       approvalStatus: user.approvalStatus,
//     },
//   };
// };

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