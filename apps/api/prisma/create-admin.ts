/* Создание/обновление администратора по логину и паролю.
 * Запуск: pnpm exec tsx prisma/create-admin.ts <username> <password> [displayName]
 * Идемпотентно: если username уже есть — обновляет пароль (и роль до admin). */
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const [username, password, displayName] = process.argv.slice(2);
  if (!username || !password) {
    console.error('Использование: tsx prisma/create-admin.ts <username> <password> [displayName]');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('Пароль не короче 6 символов');
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { username },
    create: {
      username,
      passwordHash,
      displayName: displayName || username,
      role: Role.admin,
      contactsFilledAt: new Date(),
    },
    update: { passwordHash, role: Role.admin },
  });
  console.log(`✅ Администратор готов: ${username} (id=${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
