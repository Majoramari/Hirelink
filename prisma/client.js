// database/client.js
import dotenv from "dotenv";
dotenv.config(); // لازم يكون فوق أي import لل PrismaClient

//import { PrismaClient } from "@prisma/client";

import { PrismaClient } from "../src/generated/prisma/client.js"; // أو default.js حسب الملف اللي اتولد

const prisma = new PrismaClient();



//database connection -> for clean code
export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully!");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
};

//disconnect function -> for clean code
export const disconnectDB = async () => {
  await prisma.$disconnect();
  console.log("🛑 Database connection closed.");

};

export default prisma;
