const { emitToRoom } = require('../../config')
const LogService = require('../log/log.service')
const ColumnRepository = require('./column.repository')
const ItemAssigneeRepository = require('../item/item-assignee.repository')
const ItemValueRepository = require('../item-value/item-value.repository')
const BoardMemberRepository = require('../board-member/board-member.repository')
const ColumnValueValidator = require('./column.value-validator')
const { NotFoundError, AuthorizationError, ConflictError } = require('../../shared/errors')
const { RESOURCE_TYPES, PERMISSION_LEVELS } = require('../../shared/constants')
const { PermissionService } = require('../../shared/services')
const ERROR_CATALOG = require('../../shared/errors/error-catalog')

const ColumnService = {

    async validateValue(user, boardId, columnId, value) {
        const [membership, column] = await Promise.all([
            BoardMemberRepository.findMembership(user.id, boardId),
            ColumnRepository.findById(columnId)
        ])
        if (!column) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.COLUMN)

        const isSystemAdmin = user.role === 'ADMIN'
        if (!isSystemAdmin && !membership) throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.NOT_MEMBER('BOARD'))

        const userBoardRole = membership?.role
        const isPrivilegedMember = isSystemAdmin || PermissionService.isPrivileged(userBoardRole)

        if (!isPrivilegedMember) {
            const restriction = column.restrictions.find(
                r => r.user_id === user.id || r.board_role === userBoardRole
            )

            if (restriction) {
                if (restriction.can_view === false) {
                    throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('sequer visualizar', 'COLUMN'))
                }
                if (restriction.can_edit === false) {
                    throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('editar', 'COLUMN'))
                }
            }
        }

        return await ColumnValueValidator.validate(column, value)
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
        if (!column) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.COLUMN)

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
                ItemValueRepository.deleteItemValuesByColumn(columnId),
                column.data_type === 'USER'
                    ? ItemAssigneeRepository.deleteItemAssignees(columnId)
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
        if (!columnToDelete) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.COLUMN)

        const affectedValuesCount = await ItemValueRepository.countItemValuesByColumn(columnId)

        if (!force && affectedValuesCount > 0) {
            throw new ConflictError(ERROR_CATALOG.CONFLICT.RESOURCE_HAS_CONTENT('a coluna', `${affectedValuesCount} itens`))
        }

        await Promise.all([
            ItemValueRepository.deleteItemValuesByColumn(columnId),
            ItemAssigneeRepository.deleteItemAssignees(columnId)
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
        if (!currentColumn) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.COLUMN)

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
        if (!currentColumn) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.COLUMN)

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