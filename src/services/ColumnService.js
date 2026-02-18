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

        if (columns.length !== columnIds.length) {
            const foundIds = columns.map(c => c.id)
            const invalidIds = columnIds.filter(id => !foundIds.includes(id))
            throw new Error(`Ação bloqueada: As colunas [${invalidIds.join(', ')}] não pertencem a este quadro!`)
        }

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

        LogService.register({
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

        const boardId = column.board_id
        await PermissionService.checkEditPermission(boardId, userId)

        const isChangingDataType = dataType && dataType !== column.data_type

        const result = await prisma.$transaction(async (tx) => {
            if (isChangingDataType) {
                await tx.itemValue.deleteMany({
                    where: { column_id: columnId }
                })
            }

            return await tx.column.update({
                where: { id: columnId },
                data: {
                    name: name || undefined,
                    data_type: dataType || undefined,
                    options: dataType === 'SELECT' ? (options || null) : (dataType ? null : undefined),
                    formula_expression: dataType === 'FORMULA' ? (formulaExpression || null) : (dataType ? null : undefined)
                }
            })
        })

        const logBase = {
            userId,
            boardId,
            action: 'UPDATE',
            entityType: 'COLUMN',
            entityId: columnId
        }

        if (name && name !== column.name) {
            LogService.register({
                ...logBase,
                oldValue: column.name,
                newValue: name
            })
        }

        if (isChangingDataType) {
            LogService.register({
                ...logBase,
                oldValue: `Tipo: ${column.data_type}`,
                newValue: `Tipo: ${dataType} (Dados anteriores resetados por segurança!)`
            })
        }

        if (options && JSON.stringify(options) !== JSON.stringify(column.options)) {
            LogService.register({
                ...logBase,
                oldValue: 'Opções alteradas',
                newValue: Array.isArray(options) ? options.join(', ') : 'Novas opções configuradas'
            })
        }

        return result
    },

    async deleteColumn({ columnId, userId }) {
        const columnToDelete = await prisma.column.findUnique({
            where: { id: columnId }
        })
        if (!columnToDelete) throw new Error('Coluna não encontrada!')

        const boardId = columnToDelete.board_id
        await PermissionService.checkEditPermission(boardId, userId)

        const affectedValuesCount = await prisma.itemValue.count({
            where: { column_id: columnId }
        })

        const result = await prisma.$transaction(async (tx) => {
            await tx.itemValue.deleteMany({
                where: { column_id: columnId }
            })

            await tx.column.delete({
                where: { id: columnId }
            })

            await tx.column.updateMany({
                where: {
                    board_id: boardId,
                    order: { gt: columnToDelete.order }
                },
                data: { order: { decrement: 1 } }
            })

            return { message: 'Coluna excluída com sucesso!', deletedCount: affectedValuesCount }
        })

        LogService.register({
            userId,
            boardId,
            action: 'DELETE',
            entityType: 'COLUMN',
            entityId: columnId,
            oldValue: `Nome: ${columnToDelete.name} | Registros vinculados removidos: ${affectedValuesCount}`
        })

        return result
    },

    async moveColumn({ columnId, userId, newOrder }) {
        const currentColumn = await prisma.column.findUnique({
            where: { id: columnId },
            select: { board_id: true, order: true, name: true }
        })
        if (!currentColumn) throw new Error('Coluna não encontrada!')

        const boardId = currentColumn.board_id
        await PermissionService.checkEditPermission(boardId, userId)

        const oldOrder = currentColumn.order

        const totalColumns = await prisma.column.count({
            where: { board_id: boardId }
        })
        const finalOrder = Math.max(0, Math.min(newOrder, totalColumns - 1))

        if (oldOrder === finalOrder) return currentColumn

        return await prisma.$transaction(async (tx) => {
            if (finalOrder > oldOrder) {
                await tx.column.updateMany({
                    where: {
                        board_id: boardId,
                        order: {
                            gt: oldOrder,
                            lte: finalOrder,
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
                            gte: finalOrder,
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
                data: { order: finalOrder },
            })
        })
    }

}

module.exports = ColumnService