const prisma = require('../../config/prisma')
const PermissionService = require('../permission/permission.service')
const RESOURCE_TYPES = require('../../shared/constants/resourceTypes')
const PERMISSION_LEVELS = require('../../shared/constants/permissionLevels')
const LogService = require('../log/log.service')
const { emitToRoom } = require('../../config/socket')
const AppError = require('../../shared/errors/AppError')

const isEmpty = (val) =>
    val === null || val === undefined || (Array.isArray(val) && val.length === 0) || String(val).trim() === '' || val === 'null' || val === '[]'

const ColumnService = {

    async validateValue(user, boardId, columnId, value) {
        const [membership, column] = await Promise.all([
            prisma.boardMember.findUnique({
                where: { user_id_board_id: { user_id: user.id, board_id: boardId } },
                select: { role: true }
            }),
            prisma.column.findFirst({
                where: { id: columnId, board_id: boardId },
                include: { restrictions: true }
            })
        ])
        if (!column) throw new AppError('Coluna não encontrada.', 404)

        const isSystemAdmin = user.role === 'ADMIN'
        if (!isSystemAdmin && !membership) throw new AppError('Acesso negado: usuário não é membro deste quadro.', 403)

        const userBoardRole = membership?.role
        const isPrivilegedMember = isSystemAdmin || PermissionService.isPrivileged(userBoardRole)
        if (!isPrivilegedMember) {
            const restriction = column.restrictions.find(r => r.user_id === user.id || r.board_role === userBoardRole)
            if (restriction) {
                if (restriction.can_view === false) throw new AppError(`Você não tem permissão sequer para visualizar esta coluna.`, 403)
                if (restriction.can_edit === false) throw new AppError('Você não tem permissão para editar esta coluna.', 403)
            }
        }

        if (isEmpty(value)) return ''

        const sentValue = String(value).trim()

        switch (column.data_type) {
            case 'SELECT':
                const allowedOptions = column.options || []
                if (!allowedOptions.includes(sentValue)) throw new AppError(`O valor "${sentValue}" não é permitido para "${column.name}". Opções válidas: ${allowedOptions.join(', ')}`, 400)
                return sentValue

            case 'NUMBER':
                const parsedNum = parseFloat(sentValue)
                if (isNaN(parsedNum) || !Number.isFinite(parsedNum)) throw new AppError(`O valor "${sentValue}" não é permitido para a coluna "${column.name}". Opções válidas: Number`, 400)
                return String(parsedNum)

            case 'DATE':
                const date = new Date(sentValue)
                if (isNaN(date.getTime())) throw new AppError(`O valor "${sentValue}" não é permitido para a coluna "${column.name}". Opções válidas: Date`, 400)
                return date.toISOString()

            case 'USER':
                const rawIds = Array.isArray(value) ? value : sentValue.split(',')

                const numericIds = rawIds.map(id => {
                    const parsed = Number(String(id).trim())
                    if (isNaN(parsed) || parsed <= 0) throw new AppError(`O valor "${id}" não é um ID de usuário válido.`, 400)
                    return parsed
                })

                const cleanIds = [...new Set(numericIds)].sort((a, b) => a - b)

                if (cleanIds.length === 0) throw new AppError('Nenhum usuário válido foi enviado.', 400)

                const validMembersCount = await prisma.boardMember.count({
                    where: { board_id: boardId, user_id: { in: cleanIds } }
                })

                if (validMembersCount !== cleanIds.length) throw new AppError('Um ou mais usuários não pertencem ao quadro.', 400)

                return cleanIds.join(', ')

            default:
                return sentValue
        }
    },

    async create({ user, boardId, name, dataType, options, formulaExpression }) {
        const { workspaceId } = await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.ADMIN)

        const result = await prisma.$transaction(async (tx) => {
            const maxOrderColumn = await tx.column.findFirst({
                where: { board_id: boardId },
                orderBy: { order: 'desc' },
                select: { order: true }
            })
            const nextOrder = maxOrderColumn ? maxOrderColumn.order + 1 : 0

            return await tx.column.create({
                data: {
                    board_id: boardId,
                    name,
                    data_type: dataType,
                    formula_expression: dataType === 'FORMULA' ? formulaExpression : null,
                    options: dataType === 'SELECT' ? options : null,
                    order: nextOrder,
                },
            })
        })

        LogService.register({
            userId: user.id,
            workspaceId,
            boardId,
            action: 'CREATE',
            entityType: 'COLUMN',
            entityId: result.id,
            newValue: `Coluna criada: ${name}`
        })

        emitToRoom(`board:${boardId}`, 'column:created', result)

        return result
    },

    async getByBoard({ user, boardId }) {
        const { role } = await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.VIEW)

        const columns = await prisma.column.findMany({
            where: { board_id: boardId, },
            orderBy: [{ order: 'asc' }, { id: 'asc' }],
            include: { restrictions: true }
        })
        const isSystemAdmin = user.role === 'ADMIN'
        const isPrivilegedMember = isSystemAdmin || PermissionService.isPrivileged(role)

        return columns.filter(col => {
            if (isPrivilegedMember) return true

            const restriction = col.restrictions.find(r => r.user_id === user.id || r.board_role === role)

            return !(restriction && restriction.can_view === false)
        })
    },

    async update({ user, columnId, name, dataType, options, formulaExpression }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.COLUMN, columnId, user, PERMISSION_LEVELS.ADMIN)

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

        emitToRoom(`board:${boardId}`, 'column:updated', result)

        return result
    },

    async delete({ user, columnId, force = false }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.COLUMN, columnId, user, PERMISSION_LEVELS.ADMIN)

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

            return { deletedCount: affectedValuesCount }
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

        emitToRoom(`board:${boardId}`, 'column:deleted', { columnId })

        return result
    },

    async move({ user, columnId, newOrder }) {
        const { boardId } = await PermissionService.check(RESOURCE_TYPES.COLUMN, columnId, user, PERMISSION_LEVELS.ADMIN)

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

        const result = await prisma.$transaction(async (tx) => {
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

        emitToRoom(`board:${boardId}`, 'column:moved', result)

        return result
    },

    async updateRestrictions({ user, columnId, restrictions }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.COLUMN, columnId, user, PERMISSION_LEVELS.ADMIN)

        const currentColumn = await prisma.column.findUnique({
            where: { id: columnId }
        })
        if (!currentColumn) throw new AppError('Coluna não encontrada.', 404)

        const result = await prisma.$transaction(async (tx) => {
            await tx.columnRestriction.deleteMany({
                where: { column_id: columnId }
            })

            await tx.columnRestriction.createMany({
                data: restrictions.map(r => ({
                    column_id: columnId,
                    user_id: r.user_id || null,
                    board_role: r.board_role || null,
                    can_view: r.can_view ?? true,
                    can_edit: r.can_edit ?? false
                }))
            })

            return await tx.columnRestriction.findMany({
                where: { column_id: columnId }
            })
        })

        LogService.register({
            userId: user.id,
            workspaceId,
            boardId,
            action: 'UPDATE',
            entityType: 'COLUMN',
            entityId: columnId,
            newValue: `Restrições de acesso atualizadas.`
        })

        emitToRoom(`board:${boardId}`, 'column:restrictions_updated', { columnId, restrictions: result })

        return result
    }

}

module.exports = ColumnService