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
            const { data_type, id, name, options } = col
            const rawValue = values[id]

            if (rawValue === null || rawValue === undefined || String(rawValue).trim() === '') continue
            const sentValue = String(rawValue).trim()

            switch (data_type) {
                case 'SELECT':
                    const allowedOptions = options || []
                    if (sentValue !== 'null' && !allowedOptions.includes(sentValue)) {
                        throw new AppError(`O valor "${sentValue}" não é permitido para a coluna "${name}". Opções válidas: ${allowedOptions.join(', ')}`, 400)
                    }
                    break

                case 'NUMBER':
                    const parsedNum = parseFloat(sentValue)
                    if (isNaN(parsedNum) || !Number.isFinite(parsedNum)) {
                        throw new AppError(`O valor "${sentValue}" não é permitido para a coluna "${name}". Opções válidas: Number`, 400)
                    }
                    break

                case 'DATE':
                    const date = new Date(sentValue)
                    if (isNaN(date.getTime())) {
                        throw new AppError(`O valor "${sentValue}" não é permitido para a coluna "${name}". Opções válidas: Date`, 400)
                    }
                    break

                case 'USER':
                    const userIdToValidate = parseInt(sentValue)
                    if (isNaN(userIdToValidate)) throw new AppError(`O valor "${sentValue}" não é permitido para a coluna "${name}". Opções válidas: Integer (user_id)"`, 400)
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

    async createColumn({ user, boardId, name, dataType, options, formulaExpression }) {
        const { workspaceId } = await PermissionService.checkPermission(PermissionService.TYPES.BOARD, boardId, user, PermissionService.LEVELS.ADMIN)

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
            userId: user.id,
            workspaceId,
            boardId,
            action: 'CREATE',
            entityType: 'COLUMN',
            entityId: newColumn.id,
            newValue: `Coluna criada: ${name}`
        })

        return newColumn
    },

    async getColumnsByBoard({ user, boardId }) {
        await PermissionService.checkPermission(PermissionService.TYPES.BOARD, boardId, user, PermissionService.LEVELS.VIEW)

        const columns = await prisma.column.findMany({
            where: { board_id: boardId, },
            orderBy: { order: 'asc', }
        })

        return columns
    },

    async updateColumn({ user, columnId, name, dataType, options, formulaExpression }) {
        const { boardId, workspaceId } = await PermissionService.checkPermission(PermissionService.TYPES.COLUMN, columnId, user, PermissionService.LEVELS.ADMIN)

        const column = await prisma.column.findUnique({
            where: { id: columnId }
        })
        if (!column) throw new AppError('Coluna não encontrada!', 404)

        const hasDataTypeChanged = dataType && dataType !== column.data_type
        const hasNameChanged = name && name !== column.name
        const hasOptionsChanged = options && JSON.stringify(options) !== JSON.stringify(column.options)
        const finalDataType = dataType ?? column.data_type
        const finalOptions = finalDataType === 'SELECT' ? (options ?? column.options) : null
        const finalFormula = finalDataType === 'FORMULA' ? (formulaExpression ?? column.formula_expression) : null
        const changes = []
        const addChange = (label, oldValue, newValue) => {
            changes.push({
                old: `${label}: "${oldValue || ''}"`,
                new: `${label}: "${newValue || ''}"`
            })
        }
        const result = await prisma.$transaction(async (tx) => {
            if (hasDataTypeChanged) {
                await tx.itemValue.deleteMany({
                    where: { column_id: columnId }
                })

                if (column.data_type === 'USER') {
                    await tx.itemAssignee.deleteMany({
                        where: { column_id: columnId }
                    })
                }
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

        if (hasNameChanged) {
            addChange('Nome', column.name, name)
        }

        if (hasDataTypeChanged) {
            addChange('Tipo', column.data_type, `${dataType} (Dados anteriores resetados por segurança)`)
        }

        if (hasOptionsChanged) {
            addChange('Opções', Array.isArray(column.options) ? column.options.join(', ') : '', Array.isArray(options) ? options.join(', ') : '')
        }

        if (changes.length > 0) {
            LogService.register({
                userId: user.id,
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

    async deleteColumn({ user, columnId, force = false }) {
        const { boardId, workspaceId } = await PermissionService.checkPermission(PermissionService.TYPES.COLUMN, columnId, user, PermissionService.LEVELS.ADMIN)

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

            await tx.itemAssignee.deleteMany({
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
            userId: user.id,
            workspaceId,
            boardId,
            action: 'DELETE',
            entityType: 'COLUMN',
            entityId: columnId,
            oldValue: `Coluna removida: ${columnToDelete.name} | Registros vinculados removidos: ${affectedValuesCount}`
        })

        return result
    },

    async moveColumn({ user, columnId, newOrder }) {
        const { boardId } = await PermissionService.checkPermission(PermissionService.TYPES.COLUMN, columnId, user, PermissionService.LEVELS.ADMIN)

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
        const isSamePosition = oldOrder === finalOrder

        if (isSamePosition) return currentColumn

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