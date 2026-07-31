const prisma = require('../../config/prisma')

const UndoRepository = {

    async create(data) {
        return prisma.undoAction.create({
            data
        })
    }

}

module.exports = UndoRepository