import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'qa@forge.dev';
  
  // Clean up existing test user
  await prisma.user.deleteMany({
    where: { email }
  });
  
  console.log(`Successfully cleaned up user: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
