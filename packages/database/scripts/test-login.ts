import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { username: true, role: true },
    orderBy: { username: "asc" },
  });
  console.log("DB users:", users);

  const user = await prisma.user.findUnique({ where: { username: "yusufkirhan" } });
  if (!user) {
    console.log("yusufkirhan NOT FOUND");
    return;
  }

  const ok = await bcrypt.compare("yusuf634152K", user.passwordHash);
  console.log("yusufkirhan password valid:", ok);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
