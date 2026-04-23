const prisma = require('../src/config/prisma')
const bcrypt = require('bcryptjs')

async function main() {
    const adminEmail = 'admin@admin.com'
    const passwordHash = await bcrypt.hash('admin123', 10)

    console.log('🌱 Iniciando o seed...')

    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            email: adminEmail,
            name: 'Admin do Sistema',
            password_hash: passwordHash,
            role: 'ADMIN',
            is_active: true,
        },
    })

    console.log(`✅ Admin verificado: ${admin.email}`)
}

main()
    .catch((e) => {
        console.error('❌ Erro no seed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })