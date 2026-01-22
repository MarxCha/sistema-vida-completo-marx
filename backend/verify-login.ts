
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@sistemavida.mx';
  const password = 'Demo123!';

  console.log(`Checking user: ${email}`);

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.log('❌ User NOT found in database.');
    return;
  }

  console.log('✅ User found.');
  console.log(`ID: ${user.id}`);
  console.log(`Hash: ${user.passwordHash}`);

  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (isValid) {
    console.log('✅ Password match!');
  } else {
    console.log('❌ Password DOES NOT match.');
    const newHash = await bcrypt.hash(password, 12);
    console.log(`Expected hash for '${password}' would look like: ${newHash}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
