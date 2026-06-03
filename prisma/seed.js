require('dotenv').config()
const { prisma, logger } = require('../src/config')
const bcrypt = require('bcryptjs')
const { setupDefaults } = require('../src/modules/user/user.service')

async function main() {
    const adminEmail = 'admin@admin.com'
    const passwordHash = await bcrypt.hash('admin123', 10)

    logger.info('Iniciando o seed...')

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

        await setupDefaults(admin.id, tx)

        logger.info(`Admin verificado: ${admin.email}`)
    })
}

main()
    .catch((e) => {
        logger.error('Erro no seed.')
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })