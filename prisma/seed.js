require('dotenv').config()
const bcrypt = require('bcryptjs')
const { prisma, logger } = require('../src/config')
const { setupDefaults } = require('../src/modules/user/user.service')

async function main() {
    const email = 'admin@admin.com'
    const password_hash = await bcrypt.hash('admin123', 10)

    logger.info('Iniciando o seed...')

    await prisma.$transaction(async (tx) => {
        const admin = await tx.user.create({
            data: {
                name: 'ADMIN',
                email,
                password_hash,
                role: 'ADMIN'
            }
        })

        await setupDefaults(admin.id, tx)

        logger.info(`Admin verificado: ${admin.email}`)
    })
}

main()
    .catch((e) => {
        logger.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })