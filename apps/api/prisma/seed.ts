import "dotenv/config";
import { PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_SEED_EMAIL ?? 'admin@petdots.local';
  const password = process.env.ADMIN_SEED_PASSWORD ?? 'AdminP@ssw0rd123';
  const name = process.env.ADMIN_SEED_NAME ?? 'PetDots Admin';

  const passwordHash = await argon2.hash(password);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: UserRole.ADMIN, isActive: true },
    create: {
      email,
      name,
      passwordHash,
      role: UserRole.ADMIN,
      emailVerified: true,
    },
  });

  console.log(`Usuário admin pronto: ${admin.email} (id: ${admin.id})`);
  if (!process.env.ADMIN_SEED_PASSWORD) {
    console.log(`Senha padrão de dev: ${password} (defina ADMIN_SEED_PASSWORD para customizar)`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
