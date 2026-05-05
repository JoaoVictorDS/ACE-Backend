const prisma = require('../src/config/prisma')
const bcrypt = require('bcryptjs')
const { setupUserDefaults } = require('../src/services/UserService')

async function main() {
    const adminEmail = 'admin@admin.com'
    const passwordHash = await bcrypt.hash('admin123', 10)

    console.log('🌱 Iniciando o seed...')

    await prisma.$transaction(async (tx) => {
        const admin = await tx.user.upsert({
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

        await setupUserDefaults(admin.id, tx)

        console.log(`✅ Admin verificado: ${admin.email}`)
    })
}

main()
    .catch((e) => {
        console.error('❌ Erro no seed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })