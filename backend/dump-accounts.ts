import { PrismaClient } from './src/generated/prisma';

async function main() {
    const prisma = new PrismaClient();
    const accounts = await prisma.account.findMany({
        select: {
            id: true,
            code: true,
            name: true,
            type: true,
            isPosting: true,
        }
    });
    console.log(JSON.stringify(accounts, null, 2));
    await prisma.$disconnect();
}

main();
