const prisma = require('../config/prisma')
const PermissionService = require('./PermissionService')
const LogService = require('./LogService')
const AppError = require('../utils/AppError')

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
            throw new AppError(`Ação bloqueada: As colunas [${invalidIds.join(', ')}] não pertencem a este quadro!`, 400)
        }

        for (const col of columns) {
            const rawValue = values[col.id]
            if (rawValue === null || rawValue === undefined || String(rawValue).trim() === '') continue
            const sentValue = String(rawValue).trim()

            switch (col.data_type) {
                case 'SELECT':
                    const allowedOptions = col.options || []
                    if (sentValue !== 'null' && !allowedOptions.includes(sentValue)) {
                        throw new AppError(`O valor "${sentValue}" não é permitido para a coluna "${col.name}". Opções válidas: ${allowedOptions.join(', ')}`, 400)
                    }
                    break

                case 'NUMBER':
                    const parsedNum = parseFloat(sentValue)
                    if (isNaN(parsedNum) || !Number.isFinite(parsedNum)) {
                        throw new AppError(`O valor "${sentValue}" não é permitido para a coluna "${col.name}". Opções válidas: Number`, 400)
                    }
                    break

                case 'DATE':
                    const date = new Date(sentValue)
                    if (isNaN(date.getTime())) {
                        throw new AppError(`O valor "${sentValue}" não é permitido para a coluna "${col.name}". Opções válidas: Date`, 400)
                    }
                    break

                case 'USER':
                    const userIdToValidate = parseInt(sentValue)
                    if (isNaN(userIdToValidate)) throw new AppError(`O valor "${sentValue}" não é permitido para a coluna "${col.name}". Opções válidas: Integer (user_id)"`, 400)
                    const userInBoard = await prisma.boardMember.findFirst({
                        where: {
                            board_id: boardId,
                            user_id: userIdToValidate
                        }
                    })
                    if (!userInBoard) throw new AppError('O usuário não pertence a este quadro', 400)
                    break
            }
        }
    },

    async createColumn({ boardId, name, dataType, options, formulaExpression, userId }) {
        const { workspaceId } = await PermissionService.checkPermission(PermissionService.TYPES.BOARD, boardId, userId, PermissionService.LEVELS.ADMIN)

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
            workspaceId,
            boardId,
            action: 'CREATE',
            entityType: 'COLUMN',
            entityId: newColumn.id,
            newValue: name
        })

        return newColumn
    },

    async getColumnsByBoard({ boardId, userId }) {
        await PermissionService.checkPermission(PermissionService.TYPES.BOARD, boardId, userId, PermissionService.LEVELS.VIEW)

        const columns = await prisma.column.findMany({
            where: { board_id: boardId, },
            orderBy: { order: 'asc', }
        })

        return columns
    },

    async updateColumn({ columnId, userId, name, dataType, options, formulaExpression }) {
        const { boardId, workspaceId } = await PermissionService.checkPermission(PermissionService.TYPES.COLUMN, columnId, userId, PermissionService.LEVELS.ADMIN)

        const column = await prisma.column.findUnique({
            where: { id: columnId },
        })
        if (!column) throw new AppError('Coluna não encontrada!', 404)

        const isChangingDataType = dataType && dataType !== column.data_type

        const finalDataType = dataType ?? column.data_type
        const finalOptions = finalDataType === 'SELECT' ? (options ?? column.options) : null
        const finalFormula = finalDataType === 'FORMULA' ? (formulaExpression ?? column.formula_expression) : null

        const result = await prisma.$transaction(async (tx) => {
            if (isChangingDataType) {
                await tx.itemValue.deleteMany({
                    where: { column_id: columnId }
                })
            }

            return await tx.column.update({
                where: { id: columnId },
                data: {
                    name: name ?? undefined,
                    data_type: finalDataType,
                    options: finalOptions,
                    formula_expression: finalFormula
                }
            })
        })

        const changes = []
        const addChange = (label, oldValue, newValue) => {
            changes.push({
                old: `${label}: "${oldValue || ''}"`,
                new: `${label}: "${newValue || ''}"`
            })
        }

        if (name && name !== column.name) {
            addChange('Nome', column.name, name)
        }

        if (isChangingDataType) {
            addChange('Tipo', column.data_type, `${dataType} (Dados anteriores resetados por segurança)`)
        }

        if (options && JSON.stringify(options) !== JSON.stringify(column.options)) {
            addChange('Opções', Array.isArray(column.options) ? column.options.join(', ') : '', Array.isArray(options) ? options.join(', ') : '')
        }

        if (changes.length > 0) {
            LogService.register({
                userId,
                workspaceId,
                boardId,
                action: 'UPDATE',
                entityType: 'COLUMN',
                entityId: columnId,
                oldValue: changes.map(c => c.old).join(' | '),
                newValue: changes.map(c => c.new).join(' | ')
            })
        }

        return result
    },

    async deleteColumn({ columnId, userId, force = false }) {
        const { boardId, workspaceId } = await PermissionService.checkPermission(PermissionService.TYPES.COLUMN, columnId, userId, PermissionService.LEVELS.ADMIN)

        const columnToDelete = await prisma.column.findUnique({
            where: { id: columnId }
        })
        if (!columnToDelete) throw new AppError('Coluna não encontrada!', 404)

        const affectedValuesCount = await prisma.itemValue.count({
            where: { column_id: columnId }
        })

        if (!force && affectedValuesCount > 0) throw new AppError(`Não é possível excluir a coluna: existem ${affectedValuesCount} itens vinculados. A exclusão removerá permanentemente esses dados. Use "force=true" para prosseguir!`, 409)

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
            workspaceId,
            boardId,
            action: 'DELETE',
            entityType: 'COLUMN',
            entityId: columnId,
            oldValue: `Nome: ${columnToDelete.name} | Registros vinculados removidos: ${affectedValuesCount}`
        })

        return result
    },

    async moveColumn({ columnId, userId, newOrder }) {
        const { boardId } = await PermissionService.checkPermission(PermissionService.TYPES.COLUMN, columnId, userId, PermissionService.LEVELS.ADMIN)

        const currentColumn = await prisma.column.findUnique({
            where: { id: columnId },
            select: { order: true, name: true }
        })
        if (!currentColumn) throw new AppError('Coluna não encontrada!', 404)

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