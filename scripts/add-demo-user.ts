// Script to add demo user without affecting existing data
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const demoEmail = "demo@rtr-mrp.com";
  const demoPassword = "DemoMRP@2026!";

  // Check if demo user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (existingUser) {
    console.log("Demo user already exists, updating password...");
    const hashedPassword = await bcrypt.hash(demoPassword, 12);
    await prisma.user.update({
      where: { email: demoEmail },
      data: {
        password: hashedPassword,
        status: "active",
      },
    });
    console.log("Demo user password updated!");
  } else {
    console.log("Creating demo user...");
    const hashedPassword = await bcrypt.hash(demoPassword, 12);
    await prisma.user.create({
      data: {
        email: demoEmail,
        name: "Demo User",
        password: hashedPassword,
        role: "admin",
        status: "active",
      },
    });
    console.log("Demo user created!");
  }

  console.log("\nDemo credentials:");
  console.log("Email:", demoEmail);
  console.log("Password:", demoPassword);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
