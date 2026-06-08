const prisma = require('../../config/prisma')

const LogRepository = {

    async create(data, tx = null) {
        const client = tx || prisma
        return client.activityLog.create({ data })
    }

}

module.exports = LogRepository