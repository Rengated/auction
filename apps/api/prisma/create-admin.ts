/* Создание/обновление сотрудника по логину и паролю.
 * Запуск: pnpm exec tsx prisma/create-admin.ts <username> <password> [displayName] [role]
 * role: manager | admin | director (по умолчанию admin).
 * Идемпотентно: если username уже есть — обновляет пароль и роль. */
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const STAFF_ROLES: Role[] = [Role.manager, Role.admin, Role.director];

async function main() {
  const [username, password, displayName, roleArg] = process.argv.slice(2);
  if (!username || !password) {
    console.error('Использование: tsx prisma/create-admin.ts <username> <password> [displayName] [role]');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('Пароль не короче 6 символов');
    process.exit(1);
  }
  const role = (roleArg as Role | undefined) ?? Role.admin;
  if (!STAFF_ROLES.includes(role)) {
    console.error(`Недопустимая роль "${roleArg}". Допустимо: manager | admin | director`);
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { username },
    create: {
      username,
      passwordHash,
      displayName: displayName || username,
      role,
      contactsFilledAt: new Date(),
    },
    update: { passwordHash, role },
  });
  console.log(`✅ Сотрудник готов: ${username} (${role}, id=${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
