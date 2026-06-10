const ColumnRepository = require('./column.repository')
const PermissionService = require('../../shared/services/permission.service')
const LogService = require('../log/log.service')
const ColumnValueValidator = require('./column.value-validator')
const { AppError, NotFoundError, AuthorizationError } = require('../../shared/errors')
const { RESOURCE_TYPES, PERMISSION_LEVELS } = require('../../shared/constants')
const { emitToRoom } = require('../../config')

const ColumnService = {

    async validateValue(user, boardId, columnId, value) {
        const [membership, column] = await Promise.all([
            ColumnRepository.findMembership(user.id, boardId),
            ColumnRepository.findById(columnId)
        ])

        if (!column) {
            throw new NotFoundError()
        }

        const isSystemAdmin = user.role === 'ADMIN'
        if (!isSystemAdmin && !membership) {
            throw new AuthorizationError('Acesso negado: usuário não é membro deste quadro.')
        }

        const userBoardRole = membership?.role
        const isPrivilegedMember = isSystemAdmin || PermissionService.isPrivileged(userBoardRole)

        if (!isPrivilegedMember) {
            const restriction = column.restrictions.find(
                r => r.user_id === user.id || r.board_role === userBoardRole
            )

            if (restriction) {
                if (restriction.can_view === false) {
                    throw new AuthorizationError(`Você não tem permissão sequer para visualizar esta coluna.`)
                }
                if (restriction.can_edit === false) {
                    throw new AuthorizationError('Você não tem permissão para editar esta coluna.')
                }
            }
        }

        return ColumnValueValidator.validate(column, value)
    },

    async create({ user, boardId, name, dataType, options, formulaExpression }) {
        const { workspaceId } = await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.ADMIN)

        const nextOrder = await ColumnRepository.findMaxOrder(boardId)

        const columnData = {
            board_id: boardId,
            name,
            data_type: dataType,
            formula_expression: dataType === 'FORMULA' ? formulaExpression : null,
            options: dataType === 'SELECT' ? options : null,
            order: nextOrder,
        }

        const result = await ColumnRepository.create(columnData)

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

        const columns = await ColumnRepository.findByBoard(boardId)

        const isSystemAdmin = user.role === 'ADMIN'
        const isPrivilegedMember = isSystemAdmin || PermissionService.isPrivileged(role)

        return columns.filter(col => {
            if (isPrivilegedMember) return true

            const restriction = col.restrictions.find(
                r => r.user_id === user.id || r.board_role === role
            )

            return !(restriction && restriction.can_view === false)
        })
    },

    async update({ user, columnId, name, dataType, options, formulaExpression }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.COLUMN, columnId, user, PERMISSION_LEVELS.ADMIN)

        const column = await ColumnRepository.findByIdBasic(columnId)
        if (!column) {
            throw new NotFoundError()
        }

        const hasDataTypeChanged = dataType && dataType !== column.data_type
        const hasNameChanged = name && name !== column.name
        const hasOptionsChanged = options && JSON.stringify(options) !== JSON.stringify(column.options)

        const finalDataType = dataType ?? column.data_type
        const finalOptions = finalDataType === 'SELECT' ? (options ?? column.options) : null
        const finalFormula = finalDataType === 'FORMULA' ? (formulaExpression ?? column.formula_expression) : null

        const changes = []
        if (hasNameChanged) {
            changes.push({ old: `Nome: "${column.name}"`, new: `Nome: "${name}"` })
        }
        if (hasDataTypeChanged) {
            changes.push({
                old: `Tipo: "${column.data_type}"`,
                new: `Tipo: "${dataType} (Dados anteriores resetados por segurança)"`
            })
        }
        if (hasOptionsChanged) {
            changes.push({
                old: `Opções: "${Array.isArray(column.options) ? column.options.join(', ') : ''}"`,
                new: `Opções: "${Array.isArray(options) ? options.join(', ') : ''}"`
            })
        }

        if (hasDataTypeChanged) {
            await Promise.all([
                ColumnRepository.deleteItemValues(columnId),
                column.data_type === 'USER'
                    ? ColumnRepository.deleteItemAssignees(columnId)
                    : Promise.resolve()
            ])
        }

        const result = await ColumnRepository.update(columnId, {
            name: name ?? undefined,
            data_type: finalDataType,
            options: finalOptions,
            formula_expression: finalFormula
        })

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

        const columnToDelete = await ColumnRepository.findByIdBasic(columnId)
        if (!columnToDelete) {
            throw new NotFoundError()
        }

        const affectedValuesCount = await ColumnRepository.countItemValues(columnId)

        if (!force && affectedValuesCount > 0) {
            throw new AppError(
                `Não é possível excluir a coluna: existem ${affectedValuesCount} itens vinculados. A exclusão removerá permanentemente esses dados. Use "force=true" para prosseguir!`,
                409
            )
        }

        await Promise.all([
            ColumnRepository.deleteItemValues(columnId),
            ColumnRepository.deleteItemAssignees(columnId)
        ])

        await ColumnRepository.delete(columnId)
        await ColumnRepository.decrementOrderAfter(boardId, columnToDelete.order)

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

        return { deletedCount: affectedValuesCount }
    },

    async move({ user, columnId, newOrder }) {
        const { boardId } = await PermissionService.check(RESOURCE_TYPES.COLUMN, columnId, user, PERMISSION_LEVELS.ADMIN)

        const currentColumn = await ColumnRepository.findByIdBasic(columnId)
        if (!currentColumn) {
            throw new NotFoundError()
        }

        const oldOrder = currentColumn.order

        const totalColumns = await ColumnRepository.countByBoard(boardId)
        const finalOrder = Math.max(0, Math.min(newOrder, totalColumns - 1))

        if (oldOrder === finalOrder) {
            return currentColumn
        }

        if (finalOrder > oldOrder) {
            await ColumnRepository.decrementOrderRange(boardId, oldOrder, finalOrder)
        } else {
            await ColumnRepository.incrementOrderRange(boardId, oldOrder, finalOrder)
        }

        const result = await ColumnRepository.updateOrder(columnId, finalOrder)

        emitToRoom(`board:${boardId}`, 'column:moved', result)

        return result
    },

    async updateRestrictions({ user, columnId, restrictions }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.COLUMN, columnId, user, PERMISSION_LEVELS.ADMIN)

        const currentColumn = await ColumnRepository.findByIdBasic(columnId)
        if (!currentColumn) {
            throw new NotFoundError()
        }

        await ColumnRepository.deleteRestrictions(columnId)

        const restrictionData = restrictions.map(r => ({
            column_id: columnId,
            user_id: r.user_id || null,
            board_role: r.board_role || null,
            can_view: r.can_view ?? true,
            can_edit: r.can_edit ?? false
        }))

        await ColumnRepository.createRestrictions(restrictionData)

        const result = await ColumnRepository.findRestrictions(columnId)

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