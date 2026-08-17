import { relations } from "drizzle-orm";

import { users } from "./schema/users.js";
import { candidateProfiles } from "./schema/candidate-profiles.js";
import { resumes } from "./schema/resumes.js";
export const usersRelations = relations(users, ({ one }) => ({
  candidateProfile: one(candidateProfiles),
}));

export const candidateProfilesRelations = relations(
  candidateProfiles,
  ({ one }) => ({
    user: one(users, {
      fields: [candidateProfiles.userId],
      references: [users.id],
    }),
  })
);