const prisma = require('../../config/prisma')

const ItemRepository = {

    async findPermissionContext(itemId) {
        return prisma.item.findUnique({
            where: { id: itemId },
            select: {
                section: { select: { board_id: true, board: { select: { workspace_id: true, creator_id: true } } } }
            }
        })
    },

    async findItemTitle(itemId) {
        return prisma.item.findUnique({
            where: { id: itemId },
            select: { title: true }
        })
    },

    async findMaxOrder(sectionId, tx = null) {
        const client = tx || prisma

        const result = await client.item.findFirst({
            where: { section_id: sectionId },
            orderBy: { order: 'desc' },
            select: { order: true }
        })

        return result ? result.order + 1 : 0
    },

    async create(sectionId, title, order, tx = null) {
        const client = tx || prisma

        return client.item.create({
            data: {
                section_id: sectionId,
                title,
                order,
            }
        })
    },

    async findById(itemId, tx = null) {
        const client = tx || prisma

        return client.item.findUnique({
            where: { id: itemId },
            include: {
                item_updates: {
                    where: { deleted_at: null },
                    orderBy: { created_at: 'asc' }
                },
                comments: {
                    where: { deleted_at: null },
                    orderBy: { created_at: 'asc' }
                }
            }
        })
    },

    async findByIdBasic(itemId, tx = null) {
        const client = tx || prisma

        return client.item.findUnique({
            where: { id: itemId }
        })
    },

    async update(itemId, title) {
        return prisma.item.update({
            where: { id: itemId },
            data: { title }
        })
    },

    async decrementOrderAfter(sectionId, order, tx = null) {
        const client = tx || prisma

        return client.item.updateMany({
            where: {
                section_id: sectionId,
                order: { gt: order }
            },
            data: { order: { decrement: 1 } }
        })
    },

    async incrementOrderAfter(sectionId, order, tx = null) {
        const client = tx || prisma

        return client.item.updateMany({
            where: {
                section_id: sectionId,
                order: { gte: order }
            },
            data: { order: { increment: 1 } }
        })
    },

    async findItemIdsByBoards(boardIds, tx = null) {
        const client = tx || prisma

        return client.item.findMany({
            where: { section: { board_id: { in: boardIds } } },
            select: { id: true }
        })
    },

    async findItemIdsBySections(sectionIds, tx = null) {
        const client = tx || prisma

        return client.item.findMany({
            where: { section_id: { in: sectionIds } },
            select: { id: true }
        })
    },

    async softDelete(itemId, tx = null) {
        const client = tx || prisma

        return client.item.update({
            where: { id: itemId },
            data: { deleted_at: new Date() }
        })
    },

    async softDeleteByBoards(boardIds, timestamp, tx = null) {
        const client = tx || prisma

        return client.item.updateMany({
            where: {
                section: { board_id: { in: boardIds } },
                deleted_at: null
            },
            data: { deleted_at: timestamp }
        })
    },

    async softDeleteBySections(sectionIds, timestamp, tx = null) {
        const client = tx || prisma

        return client.item.updateMany({
            where: {
                section_id: { in: sectionIds },
                deleted_at: null
            },
            data: { deleted_at: timestamp }
        })
    },

    async delete(itemId, tx = null) {
        const client = tx || prisma

        return client.item.delete({
            where: { id: itemId }
        })
    },

    async countBySection(sectionId, tx = null) {
        const client = tx || prisma

        return client.item.count({
            where: { section_id: sectionId }
        })
    },

    async countByBoard(boardId) {
        return prisma.item.count({ where: { section: { board_id: boardId } } })
    },

    async countByWorkspace(workspaceId) {
        return prisma.item.count({
            where: { section: { board: { workspace_id: workspaceId } } }
        })
    },

    async incrementOrderRange(sectionId, fromOrder, toOrder, tx = null) {
        const client = tx || prisma

        return client.item.updateMany({
            where: {
                section_id: sectionId,
                order: {
                    gte: toOrder,
                    lt: fromOrder,
                }
            },
            data: { order: { increment: 1 } }
        })
    },

    async decrementOrderRange(sectionId, fromOrder, toOrder, tx = null) {
        const client = tx || prisma

        return client.item.updateMany({
            where: {
                section_id: sectionId,
                order: {
                    gt: fromOrder,
                    lte: toOrder,
                }
            },
            data: { order: { decrement: 1 } }
        })
    },

    async updateSectionAndOrder(itemId, sectionId, order, tx = null) {
        const client = tx || prisma

        return client.item.update({
            where: { id: itemId },
            data: {
                section_id: sectionId,
                order,
            }
        })
    },

}

module.exports = ItemRepository