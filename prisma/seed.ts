import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn("Skipping admin seed: set ADMIN_EMAIL and ADMIN_PASSWORD in .env");
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "Admin",
      password: hashed,
      role: "ADMIN",
      isActive: true,
    },
    update: {
      password: hashed,
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log(`Admin user ready: ${email}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
