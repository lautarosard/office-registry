import { PrismaClient, RoleUser } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const existing = await prisma.user.findUnique({
        where: { username: 'superadmin' },
    });

    if (existing) {
        console.log('SuperAdmin ya existe');
        return;
    }

    const hashedPassword = await bcrypt.hash('SuperAdmin123!', 10);

    await prisma.user.create({
        data: {
            username: 'superadmin',
            name: 'Super Admin',
            password: hashedPassword,
            rol: RoleUser.SuperAdmin,
            isActive: true,
            mustChangePassword: false,
        },
    });

    console.log('SuperAdmin creado correctamente');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
