const prisma = require('../../config/prisma')

const ColumnRepository = {

    async findPermissionContext(columnId) {
        return prisma.column.findUnique({
            where: { id: columnId },
            select: {
                board_id: true,
                board: { select: { workspace_id: true, creator_id: true } }
            }
        })
    },

    async findById(columnId) {
        return prisma.column.findUnique({
            where: { id: columnId },
            include: { restrictions: true }
        })
    },

    async findByIdBasic(columnId) {
        return prisma.column.findUnique({
            where: { id: columnId }
        })
    },

    async findByBoard(boardId) {
        return prisma.column.findMany({
            where: { board_id: boardId },
            orderBy: [{ order: 'asc' }, { id: 'asc' }],
            include: { restrictions: true }
        })
    },

    async findByIdForValueValidation(columnId) {
        return prisma.column.findUnique({
            where: { id: columnId },
            select: {
                id: true,
                name: true,
                data_type: true,
                options: true
            }
        })
    },

    async findMaxOrder(boardId, tx = null) {
        const client = tx || prisma

        const result = await client.column.findFirst({
            where: { board_id: boardId },
            orderBy: { order: 'desc' },
            select: { order: true }
        })
        return result ? result.order + 1 : 0
    },

    async create(data) {
        return prisma.column.create({ data })
    },

    async update(columnId, data) {
        return prisma.column.update({
            where: { id: columnId },
            data
        })
    },

    async findColumnIdsByBoards(boardIds, tx = null) {
        const client = tx || prisma

        return client.column.findMany({
            where: { board_id: { in: boardIds } },
            select: { id: true }
        })
    },

    async softDelete(columnId, tx = null) {
        const client = tx || prisma

        return client.column.update({
            where: { id: columnId },
            data: { deleted_at: new Date() }
        })
    },

    async softDeleteByBoards(boardIds, timestamp, tx = null) {
        const client = tx || prisma

        return client.column.updateMany({
            where: {
                board_id: { in: boardIds },
                deleted_at: null
            },
            data: { deleted_at: timestamp }
        })
    },

    async restore(columnId, tx = null) {
        const client = tx || prisma

        return client.column.update({
            where: { id: columnId },
            data: { deleted_at: null }
        })
    },

    async restoreMany(columnIds, tx = null) {
        const client = tx || prisma

        return client.column.updateMany({
            where: { id: { in: columnIds } },
            data: { deleted_at: null }
        })
    },

    async delete(columnId) {
        return prisma.column.delete({
            where: { id: columnId }
        })
    },

    async decrementOrderAfter(boardId, fromOrder, tx = null) {
        const client = tx || prisma

        return client.column.updateMany({
            where: {
                board_id: boardId,
                order: { gt: fromOrder }
            },
            data: { order: { decrement: 1 } }
        })
    },

    async incrementOrderRange(boardId, fromOrder, toOrder) {
        return prisma.column.updateMany({
            where: {
                board_id: boardId,
                order: {
                    gte: toOrder,
                    lt: fromOrder
                }
            },
            data: { order: { increment: 1 } }
        })
    },

    async decrementOrderRange(boardId, fromOrder, toOrder) {
        return prisma.column.updateMany({
            where: {
                board_id: boardId,
                order: {
                    gt: fromOrder,
                    lte: toOrder
                }
            },
            data: { order: { decrement: 1 } }
        })
    },

    async updateOrder(columnId, newOrder, tx = null) {
        const client = tx || prisma

        return client.column.update({
            where: { id: columnId },
            data: { order: newOrder }
        })
    },

    async countByBoard(boardId) {
        return prisma.column.count({
            where: { board_id: boardId }
        })
    },

    async createRestrictions(restrictions, tx = null) {
        const client = tx || prisma

        return client.columnRestriction.createMany({
            data: restrictions
        })
    },

    async findRestrictions(columnId, tx = null) {
        const client = tx || prisma

        return client.columnRestriction.findMany({
            where: { column_id: columnId }
        })
    },

    async deleteRestrictions(columnId, tx = null) {
        const client = tx || prisma

        return client.columnRestriction.deleteMany({
            where: { column_id: columnId }
        })
    },

}

module.exports = ColumnRepository