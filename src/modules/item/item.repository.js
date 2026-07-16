const prisma = require('../../config/prisma')

const ItemRepository = {

    /**
    * Busca item por ID para verificar permissão
    * @param {number} itemId - ID do item
    * @returns {Promise<object>} Item ou null
    */
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
            },
            include: { item_values: true, comments: true }
        })
    },

    async findById(itemId, tx = null) {
        const client = tx || prisma

        return client.item.findUnique({
            where: { id: itemId },
            include: {
                item_updates: { orderBy: { created_at: 'asc' } },
                comments: { orderBy: { created_at: 'asc' } }
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