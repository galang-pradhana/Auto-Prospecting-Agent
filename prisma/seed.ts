import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@prospectingengine.com';
  const password = '12345';
  const name = 'Admin Engine';

  const qaEmail = 'qa@forge.dev';
  const qaPassword = 'Test1234!';
  const qaName = 'QA Tester';

  const existingQa = await prisma.user.findUnique({
    where: { email: qaEmail },
  });

  if (!existingQa) {
    const hashedQaPassword = await bcrypt.hash(qaPassword, 12);
    await prisma.user.create({
      data: {
        email: qaEmail,
        password: hashedQaPassword,
        name: qaName,
      },
    });
    console.log(`QA user created: ${qaEmail}`);
  } else {
    console.log(`QA user ${qaEmail} already exists. Skipping.`);
  }

  console.log('---------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
