const prisma = require('../config/prisma')
const LogService = require('./LogService')
const PermissionService = require('./PermissionService')

const ColumnService = {

    async validateItemValues(values, boardId) {
        const columnIds = Object.keys(values).map(id => parseInt(id))
        if (columnIds.length === 0) return

        const columns = await prisma.column.findMany({
            where: {
                id: { in: columnIds },
                board_id: boardId
            },
            select: { id: true, data_type: true, options: true, name: true }
        })

        for (const col of columns) {
            const sentValue = String(values[col.id])
            if (col.data_type === 'SELECT') {
                const allowedOptions = col.options || []

                if (sentValue !== '' && sentValue !== 'null' && !allowedOptions.includes(sentValue)) {
                    throw new Error(`O valor "${sentValue}" não é permitido para a coluna "${col.name}". Opções válidas: ${allowedOptions.join(', ')}`)
                }
            }
        }
    },

    async createColumn({ boardId, name, dataType, options, formulaExpression, userId }) {
        await PermissionService.checkEditPermission(boardId, userId)

        const maxOrderColumn = await prisma.column.findFirst({
            where: { board_id: boardId },
            orderBy: { order: 'desc' },
            select: { order: true }
        })

        const nextOrder = maxOrderColumn ? maxOrderColumn.order + 1 : 0

        const newColumn = await prisma.column.create({
            data: {
                board_id: boardId,
                name,
                data_type: dataType,
                formula_expression: dataType === 'FORMULA' ? formulaExpression : null,
                options: dataType === 'SELECT' ? options : null,
                order: nextOrder,
            },
        })

        await LogService.register({
            userId,
            boardId,
            action: 'CREATE',
            entityType: 'COLUMN',
            entityId: newColumn.id,
            newValue: name
        })

        return newColumn
    },

    async getColumnsByBoard({ boardId, userId }) {
        await PermissionService.checkViewPermission(boardId, userId)

        const column = await prisma.column.findMany({
            where: {
                board_id: boardId,
            },
            orderBy: {
                order: 'asc',
            }
        })

        return column
    },

    async updateColumn({ columnId, userId, name, dataType, options, formulaExpression }) {
        const column = await prisma.column.findUnique({
            where: { id: columnId },
        })
        if (!column) throw new Error('Coluna não encontrada!')

        await PermissionService.checkEditPermission(column.board_id, userId)

        const updatedColumn = await prisma.column.update({
            where: { id: columnId },
            data: {
                name: name || undefined,
                data_type: dataType || undefined,
                options: options || undefined,
                formula_expression: formulaExpression || undefined
            }
        })

        if (name && name !== column.name) {
            await LogService.register({
                userId,
                boardId: column.board_id,
                action: 'UPDATE',
                entityType: 'COLUMN',
                entityId: columnId,
                oldValue: column.name,
                newValue: name
            })
        }

        if (dataType && dataType !== column.data_type) {
            await LogService.register({
                userId,
                boardId: column.board_id,
                action: 'UPDATE',
                entityType: 'COLUMN',
                entityId: columnId,
                oldValue: column.data_type,
                newValue: dataType
            })
        }

        //Falta aqui Logs para outros tipos de alteração!!!

        return updatedColumn
    },

    async deleteColumn({ columnId, userId }) {
        const columnToDelete = await prisma.column.findUnique({
            where: { id: columnId }
        })
        if (!columnToDelete) throw new Error('Coluna não encontrada!')

        await PermissionService.checkEditPermission(columnToDelete.board_id, userId)

        const result = await prisma.$transaction(async (tx) => {
            await tx.column.delete({
                where: { id: columnId }
            })

            await tx.column.updateMany({
                where: {
                    board_id: columnToDelete.board_id,
                    order: { gt: columnToDelete.order }
                },
                data: { order: { decrement: 1 } }
            })

            return { message: 'Coluna excluída com sucesso!' }
        })

        await LogService.register({
            userId,
            boardId: columnToDelete.board_id,
            action: 'DELETE',
            entityType: 'COLUMN',
            entityId: columnId,
            oldValue: columnToDelete.name
        })

        return result
    },

    async moveColumn({ columnId, userId, newOrder }) {
        const currentColumn = await prisma.column.findUnique({
            where: { id: columnId },
            select: { board_id: true, order: true, name: true }
        })
        if (!currentColumn) throw new Error('Coluna não encontrada!')

        await PermissionService.checkEditPermission(currentColumn.board_id, userId)

        const oldOrder = currentColumn.order
        const boardId = currentColumn.board_id

        if (oldOrder === newOrder) return currentColumn

        const updatedColumn = await prisma.$transaction(async (tx) => {
            if (newOrder > oldOrder) {
                await tx.column.updateMany({
                    where: {
                        board_id: boardId,
                        order: {
                            gt: oldOrder,
                            lte: newOrder,
                        },
                    },
                    data: {
                        order: { decrement: 1 },
                    },
                })
            } else {
                await tx.column.updateMany({
                    where: {
                        board_id: boardId,
                        order: {
                            gte: newOrder,
                            lt: oldOrder,
                        },
                    },
                    data: {
                        order: { increment: 1 },
                    },
                })
            }

            return await tx.column.update({
                where: { id: columnId },
                data: { order: newOrder },
            })
        })

        await LogService.register({
            userId,
            boardId,
            action: 'MOVE',
            entityType: 'COLUMN',
            entityId: columnId,
            oldValue: `Ordem: ${oldOrder}`,
            newValue: `Ordem: ${newOrder}`
        })

        return updatedColumn
    }

}

module.exports = ColumnService