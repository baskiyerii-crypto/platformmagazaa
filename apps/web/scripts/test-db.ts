import bcrypt from "bcryptjs";
import { prisma } from "@magaza/database";

async function main() {
  const username = "yusufkirhan";
  const password = "yusuf634152K";

  const user = await prisma.user.findUnique({
    where: { username },
    include: { store: true },
  });

  console.log("DATABASE_URL set:", !!process.env.DATABASE_URL);
  console.log("user:", user?.username, user?.role);
  console.log("password valid:", user ? await bcrypt.compare(password, user.passwordHash) : false);
}

main()
  .catch((e) => {
    console.error("ERROR:", e.message);
  })
  .finally(() => prisma.$disconnect());
