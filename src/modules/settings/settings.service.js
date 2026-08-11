import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users } from "../../db/schema/users.js";
import { candidateSettings } from "../../db/schema/candidate-settings.js";

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

export const getUserSettings = async (userId) => {
  const [user] = await db
    .select({
      id: users.id,
      name: users.fullName,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  const settings = await getOrCreateCandidateSettings(userId);

  return {
    account: {
      name: user.name,
      email: user.email,
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

