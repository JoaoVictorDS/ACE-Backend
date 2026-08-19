const prisma = require('../../config/prisma')

const ItemUpdateRespository = {

    async create(userId, itemId, content) {
        return prisma.itemUpdate.create({
            data: {
                user_id: userId,
                item_id: itemId,
                content
            }
        })
    },

    async findByItem(itemId) {
        return prisma.itemUpdate.findMany({
            where: { item_id: itemId },
            orderBy: { created_at: 'asc' },
            include: { user: { select: { id: true, name: true } } }
        })
    },

    async findById(itemUpdateId) {
        return prisma.itemUpdate.findUnique({
            where: { id: itemUpdateId },
            include: {
                item: { select: { id: true, title: true } },
                user: { select: { id: true, name: true } }
            }
        })
    },

    async update(itemUpdateId, content) {
        return prisma.itemUpdate.update({
            where: { id: itemUpdateId },
            data: { content },
            include: {
                item: { select: { id: true, title: true } },
                user: { select: { id: true, name: true } }
            }
        })
    },

    async softDelete(itemUpdateId) {
        return prisma.itemUpdate.update({
            where: { id: itemUpdateId },
            data: { deleted_at: new Date() }
        })

    },

    async delete(itemUpdateId) {
        return prisma.itemUpdate.delete({
            where: { id: itemUpdateId }
        })
    }

}

module.exports = ItemUpdateRespository