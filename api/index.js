import dotenv from "dotenv";
dotenv.config();

import app from "../Backend/src/app.js";
import connectDB from "../Backend/src/config/db.js";

let isInitialized = false;

const initServerless = async () => {
  if (isInitialized) return;

  const connected = await connectDB();
  if (connected) {
    // Ensure default developer user exists in DB
    try {
      const User = (await import("../Backend/src/models/User.js")).default;
      const bcrypt = (await import("bcryptjs")).default;
      const seedEmail = "developer@cloudforge.io";
      const existing = await User.findOne({ email: seedEmail });
      if (!existing) {
        const hashedPassword = await bcrypt.hash("Password123!", 12);
        await User.create({
          name: "Cloud Developer",
          email: seedEmail,
          password: hashedPassword,
        });
        console.log("Seeded default developer user: developer@cloudforge.io / Password123!");
      }
    } catch (seedErr) {
      console.warn("User auto-seed check skipped:", seedErr.message);
    }
  }

  isInitialized = true;
};

export default async function handler(req, res) {
  try {
    await initServerless();
  } catch (err) {
    console.error("Serverless init error:", err);
  }

  return app(req, res);
}
