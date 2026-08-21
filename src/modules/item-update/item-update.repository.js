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

    async findItemUpdateIdsForSoftDeleteByBoards(boardIds, tx = null) {
        const client = tx || prisma

        return client.itemUpdate.findMany({
            where: { item: { section: { board_id: { in: boardIds } } } },
            select: { id: true }
        })
    },

    async findItemUpdateIdsByItems(itemIds, tx = null) {
        const client = tx || prisma

        return client.itemUpdate.findMany({
            where: { item_id: { in: itemIds } },
            select: { id: true }
        })
    },

    async softDelete(itemUpdateId) {
        return prisma.itemUpdate.update({
            where: { id: itemUpdateId },
            data: { deleted_at: new Date() }
        })

    },

    async softDeleteByBoards(boardIds, timestamp, tx = null) {
        const client = tx || prisma

        return client.itemUpdate.updateMany({
            where: {
                item: { section: { board_id: { in: boardIds } } },
                deleted_at: null
            },
            data: { deleted_at: timestamp }
        })
    },

    async softDeleteByItems(itemIds, timestamp, tx = null) {
        const client = tx || prisma

        return client.itemUpdate.updateMany({
            where: {
                item_id: { in: itemIds },
                deleted_at: null
            },
            data: { deleted_at: timestamp }
        })
    },

    async delete(itemUpdateId) {
        return prisma.itemUpdate.delete({
            where: { id: itemUpdateId }
        })
    }

}

module.exports = ItemUpdateRespository