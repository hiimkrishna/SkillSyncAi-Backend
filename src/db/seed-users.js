import bcrypt from "bcrypt";
import { db } from "./index.js";
import { users } from "./schema/users.js";

const seedUsers = async () => {
  const password = await bcrypt.hash("password123", 12);

  await db.insert(users).values([
    {
      fullName: "Test Admin",
      email: "admin@test.com",
      password,
      role: "admin",
    },
    {
      fullName: "Test Recruiter",
      email: "recruiter@test.com",
      password,
      role: "recruiter",
    },
  ]);

  console.log("Admin and recruiter created");

  process.exit(0);
};

seedUsers();