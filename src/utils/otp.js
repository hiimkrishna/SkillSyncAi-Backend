import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { candidateSettings } from "../db/schema/candidate-settings.js";

const OTP_TTL_MINUTES = 5;
const OTP_LENGTH = 6;

export const maskPhone = (phone) => {
  const value = String(phone ?? "");

  if (value.length <= 4) {
    return "****";
  }

  const tail = value.slice(-4);
  const head = value.startsWith("+") ? "+" : "";
  const maskedLength = Math.max(value.length - 4 - head.length, 1);

  return `${head}${"*".repeat(maskedLength)}${tail}`;
};

const hashOtp = (code) =>
  createHash("sha256").update(String(code)).digest("hex");

const shouldExposeDevCode = () =>
  process.env.NODE_ENV !== "production";

export const generateOtp = () =>
  String(randomInt(100000, 1000000));

export const buildOtpResponse = (code, phone) => {
  const payload = {
    sentTo: maskPhone(phone),
    expiresInSeconds: OTP_TTL_MINUTES * 60,
  };

  if (shouldExposeDevCode()) {
    payload.devCode = code;
  }

  return payload;
};

const getOrCreateSettingsRow = async (userId) => {
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
    .values({ userId })
    .returning();

  return created;
};

// Generates a fresh OTP for the user, replacing any previous code.
export const issueOtpForUser = async (userId, phone) => {
  const settings = await getOrCreateSettingsRow(userId);
  const code = generateOtp();
  const expiresAt = new Date(
    Date.now() + OTP_TTL_MINUTES * 60 * 1000
  );

  await db
    .update(candidateSettings)
    .set({
      otpCodeHash: hashOtp(code),
      otpExpiresAt: expiresAt,
      otpPhone: phone,
    })
    .where(eq(candidateSettings.id, settings.id));

  return code;
};

// Verifies the submitted code. Throws on any failure.
// On success it clears the stored code but does NOT change
// security.twoFactor — callers decide what verification unlocks.
export const verifyOtpForUser = async (userId, code) => {
  const [settings] = await db
    .select()
    .from(candidateSettings)
    .where(eq(candidateSettings.userId, userId))
    .limit(1);

  if (!settings || !settings.otpCodeHash) {
    throw new Error("No verification code was requested");
  }

  if (new Date(settings.otpExpiresAt).getTime() < Date.now()) {
    await clearOtp(settings.id);
    throw new Error("Verification code has expired. Request a new one.");
  }

  const submitted = Buffer.from(hashOtp(code));
  const stored = Buffer.from(settings.otpCodeHash);

  if (submitted.length !== stored.length || !timingSafeEqual(submitted, stored)) {
    throw new Error("Incorrect verification code. Please try again.");
  }

  await clearOtp(settings.id);
  return true;
};

export const clearOtp = async (settingsRowId) => {
  await db
    .update(candidateSettings)
    .set({
      otpCodeHash: null,
      otpExpiresAt: null,
      otpPhone: null,
    })
    .where(eq(candidateSettings.id, settingsRowId));
};
