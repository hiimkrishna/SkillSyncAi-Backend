import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users } from "../../db/schema/users.js";
import { recruiterProfiles } from "../../db/schema/recruiter-profiles.js";
import { candidateSettings } from "../../db/schema/candidate-settings.js";

import {
  buildOtpResponse,
  issueOtpForUser,
  verifyOtpForUser,
} from "../../utils/otp.js";

const DEFAULT_SETTINGS = {
  security: {
    twoFactor: false,
  },

  notifications: {
    email: true,
    push: true,
  },

  appearance: {
    theme: "system",
  },

  preferences: {
    location: "",
  },

  connectedAccounts: [],
};

const getOrCreateCandidateSettings = async (userId) => {
  const [existing] = await db
    .select()
    .from(candidateSettings)
    .where(eq(candidateSettings.userId, userId))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(candidateSettings)
    .values({
      userId,
    })
    .returning();

  return created;
};

const syncRecruiterAccountDetails = async (userId, account) => {
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || user.role !== "recruiter") {
    return;
  }

  const updateData = {};

  if (account.phone !== undefined) {
    updateData.phone = account.phone.trim();
  }

  if (account.companyName !== undefined) {
    updateData.companyName = account.companyName.trim();
  }

  if (Object.keys(updateData).length === 0) {
    return;
  }

  const [existingProfile] = await db
    .select({ id: recruiterProfiles.id })
    .from(recruiterProfiles)
    .where(eq(recruiterProfiles.userId, userId))
    .limit(1);

  if (!existingProfile) {
    await db.insert(recruiterProfiles).values({
      userId,
      ...updateData,
    });
    return;
  }

  await db
    .update(recruiterProfiles)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(recruiterProfiles.id, existingProfile.id));
};

export const sendTwoFactorOtp = async (userId) => {
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  let phone = null;

  if (user.role === "recruiter") {
    const [profile] = await db
      .select({ phone: recruiterProfiles.phone })
      .from(recruiterProfiles)
      .where(eq(recruiterProfiles.userId, userId))
      .limit(1);

    phone = profile?.phone ?? null;
  }

  if (!phone) {
    throw new Error(
      "Save a phone number in your account settings before enabling two-factor authentication"
    );
  }

  const code = await issueOtpForUser(userId, phone);

  return buildOtpResponse(code, phone);
};

export const verifyTwoFactorOtp = async (userId, code) => {
  const verified = await verifyOtpForUser(userId, code);

  if (!verified) {
    throw new Error("Incorrect verification code. Please try again.");
  }

  const settings = await getOrCreateCandidateSettings(userId);
  const currentSecurity = settings.security ?? { twoFactor: false };

  await db
    .update(candidateSettings)
    .set({
      security: { ...currentSecurity, twoFactor: true },
      updatedAt: new Date(),
    })
    .where(eq(candidateSettings.id, settings.id));

  return { twoFactor: true };
};

export const getUserSettings = async (userId) => {
  const [user] = await db
    .select({
      id: users.id,
      name: users.fullName,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  let phone = null;
  let companyName = null;

  if (user.role === "recruiter") {
    const [profile] = await db
      .select({
        phone: recruiterProfiles.phone,
        companyName: recruiterProfiles.companyName,
      })
      .from(recruiterProfiles)
      .where(eq(recruiterProfiles.userId, userId))
      .limit(1);

    phone = profile?.phone ?? null;
    companyName = profile?.companyName ?? null;
  }

  const settings = await getOrCreateCandidateSettings(userId);

  return {
    account: {
      name: user.name,
      email: user.email,
      phone,
      companyName,
    },

    security: settings.security ?? DEFAULT_SETTINGS.security,
    notifications:
      settings.notifications ?? DEFAULT_SETTINGS.notifications,

    appearance:
      settings.appearance ?? DEFAULT_SETTINGS.appearance,

    preferences:
      settings.preferences ?? DEFAULT_SETTINGS.preferences,

    connectedAccounts:
      settings.connectedAccounts ??
      DEFAULT_SETTINGS.connectedAccounts,
  };
};

export const updateUserSettings = async (userId, data) => {
  // Account information belongs to users table
  if (data.account) {
    const accountUpdate = {};

    if (data.account.name !== undefined) {
      accountUpdate.fullName = data.account.name.trim();
    }

    if (data.account.email !== undefined) {
      accountUpdate.email = data.account.email
        .trim()
        .toLowerCase();
    }

    if (Object.keys(accountUpdate).length > 0) {
      await db
        .update(users)
        .set({
          ...accountUpdate,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }

    // Phone and company belong to recruiter_profiles
    if (
      data.account.phone !== undefined ||
      data.account.companyName !== undefined
    ) {
      await syncRecruiterAccountDetails(userId, data.account);
    }
  }

  // Settings belong to candidate_settings table
  const settingsUpdate = {};

  if (data.security !== undefined) {
    settingsUpdate.security = data.security;
  }

  if (data.notifications !== undefined) {
    settingsUpdate.notifications = data.notifications;
  }

  if (data.appearance !== undefined) {
    settingsUpdate.appearance = data.appearance;
  }

  if (data.preferences !== undefined) {
    settingsUpdate.preferences = data.preferences;
  }

  if (data.connectedAccounts !== undefined) {
    settingsUpdate.connectedAccounts = data.connectedAccounts;
  }

  if (Object.keys(settingsUpdate).length > 0) {
    const existing = await getOrCreateCandidateSettings(userId);

    await db
      .update(candidateSettings)
      .set({
        ...settingsUpdate,
        updatedAt: new Date(),
      })
      .where(eq(candidateSettings.id, existing.id));
  }

  return getUserSettings(userId);
};

