const prisma = require('../../config/prisma')

const SectionRepository = {

    /**
    * Busca section por ID para verificar permissão
    * @param {number} sectionId - ID da section
    * @returns {Promise<object>} Section ou null
    */
    async findPermissionContext(sectionId) {
        return prisma.section.findUnique({
            where: { id: sectionId },
            select: {
                board_id: true,
                board: { select: { workspace_id: true, creator_id: true } }
            }
        })
    },

    async create(boardId, name, order, tx = null) {
        const client = tx || prisma

        return client.section.create({
            data: {
                board_id: boardId,
                name,
                order,
            },
        })
    },

    async findMaxOrder(boardId, tx = null) {
        const client = tx || prisma

        const result = await client.section.findFirst({
            where: { board_id: boardId },
            orderBy: { order: 'desc' },
            select: { order: true }
        })

        return result ? result.order + 1 : 0
    },

    async findByBoard(boardId) {
        return prisma.section.findMany({
            where: { board_id: boardId, },
            orderBy: { order: 'asc' },
            include: {
                _count: {
                    select: { items: true }
                }
            }
        })
    },

    async findSectionName(sectionId) {
        return prisma.section.findUnique({
            where: { id: sectionId },
            select: { name: true }
        })
    },

    async update(sectionId, name) {
        return prisma.section.update({
            where: { id: sectionId },
            data: { name }
        })
    },

    async findSectionDeletionContext(sectionId) {
        return prisma.section.findUnique({
            where: { id: sectionId },
            select: {
                order: true, name: true,
                _count: { select: { items: true } }
            }
        })
    },

    async delete(sectionId, tx = null) {
        const client = tx || prisma

        return client.section.delete({
            where: { id: sectionId }
        })
    },

    async decrementOrderAfter(boardId, order, tx = null) {
        const client = tx || prisma

        return client.section.updateMany({
            where: {
                board_id: boardId,
                order: { gt: order }
            },
            data: { order: { decrement: 1 } }
        })
    },

    async findById(sectionId) {
        return prisma.section.findUnique({
            where: { id: sectionId }
        })
    },

    async countByBoard(boardId) {
        return prisma.section.count({
            where: { board_id: boardId }
        })
    },

    async decrementOrderRange(boardId, fromOrder, toOrder, tx = null) {
        const client = tx || prisma

        return client.section.updateMany({
            where: {
                board_id: boardId,
                order: {
                    gt: fromOrder,
                    lte: toOrder,
                },
            },
            data: { order: { decrement: 1 } },
        })
    },

    async incrementOrderRange(boardId, fromOrder, toOrder, tx = null) {
        const client = tx || prisma

        return client.section.updateMany({
            where: {
                board_id: boardId,
                order: {
                    gte: toOrder,
                    lt: fromOrder,
                },
            },
            data: { order: { increment: 1 } },
        })
    },

    async updateOrder(sectionId, newOrder, tx = null) {
        const client = tx || prisma

        return client.section.update({
            where: { id: sectionId },
            data: { order: newOrder }
        })
    },

}

module.exports = SectionRepository