const { emitToRoom, appEventEmitter } = require('../../config')
const LogService = require('../log/log.service')
const ColumnRepository = require('./column.repository')
const ItemAssigneeRepository = require('../item/item-assignee.repository')
const ItemValueRepository = require('../item-value/item-value.repository')
const BoardMemberRepository = require('../board-member/board-member.repository')
const ColumnValueValidator = require('./column.value-validator')
const { NotFoundError, AuthorizationError, ConflictError } = require('../../shared/errors')
const { RESOURCE_TYPES, PERMISSION_LEVELS, ENTITY_TYPES } = require('../../shared/constants')
const { PermissionService } = require('../../shared/services')
const ERROR_CATALOG = require('../../shared/errors/error-catalog')
const { DOMAIN_EVENT } = require('../../shared/events/domain-event')

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

        const newColumn = await ColumnRepository.create({
            board_id: boardId,
            name,
            data_type: dataType,
            formula_expression: dataType === 'FORMULA' ? formulaExpression : null,
            options: dataType === 'SELECT' ? options : null,
            order: nextOrder,
        })

        appEventEmitter.emit(DOMAIN_EVENT, {
            actor: user,
            workspaceId,
            boardId,
            action: 'CREATE',
            entityType: ENTITY_TYPES.COLUMN,
            entityId: newColumn.id,
            resource: {
                workspaceId,
                boardId,
                column: { id: newColumn.id, name: newColumn.name }
            },
            changes: { before: null, after: newColumn.name },
            snapshot: {
                before: null,
                after: {
                    id: newColumn.id,
                    board_id: newColumn.board_id,
                    name: newColumn.name,
                    data_type: newColumn.data_type,
                    formula_expression: newColumn.formula_expression,
                    options: newColumn.options,
                    order: newColumn.order,
                    deleted_at: null,
                }
            }
        })

        emitToRoom(`board:${boardId}`, 'column:created', newColumn)

        return newColumn
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

    async update({ user, columnId, data }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.COLUMN, columnId, user, PERMISSION_LEVELS.ADMIN)

        const currentColumn = await ColumnRepository.findByIdBasic(columnId)
        if (!currentColumn) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.COLUMN)

        const hasChanges = Object.keys(data).some(
            (key) => data[key] !== undefined && data[key] !== currentColumn[key]
        )
        if (!hasChanges) return currentColumn

        const FIELD_LABELS = {
            name: 'nome',
            data_type: 'tipo de dados',
            options: 'opções',
            formula_expression: 'expressão da fórmula',
        }

        const fields = Object.keys(FIELD_LABELS)
            .filter(key => data[key] !== undefined && data[key] !== currentColumn[key])
            .map(field => ({ field, label: FIELD_LABELS[field], before: currentColumn[field], after: data[field] }))

        const dataType = data.data_type
        const hasDataTypeChanged = dataType && dataType !== currentColumn.data_type

        if (hasDataTypeChanged) {
            await Promise.all([
                ItemValueRepository.deleteItemValuesByColumn(columnId),
                currentColumn.data_type === 'USER'
                    ? ItemAssigneeRepository.deleteItemAssignees(columnId)
                    : Promise.resolve()
            ])
        }

        const updatedColumn = await ColumnRepository.update(columnId, data)

        appEventEmitter.emit(DOMAIN_EVENT, {
            actor: user,
            workspaceId,
            boardId,
            action: 'UPDATE',
            entityType: ENTITY_TYPES.COLUMN,
            entityId: columnId,
            resource: {
                workspaceId,
                boardId,
                column: { id: updatedColumn.id, name: updatedColumn.name }
            },
            changes: { fields }
        })

        emitToRoom(`board:${boardId}`, 'column:updated', updatedColumn)

        return updatedColumn
    },

    async delete({ user, columnId, force = false }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.COLUMN, columnId, user, PERMISSION_LEVELS.ADMIN)

        const columnToDelete = await ColumnRepository.findByIdBasic(columnId)
        if (!columnToDelete) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.COLUMN)

        const affectedValuesCount = await ItemValueRepository.countItemValuesByColumn(columnId)

        if (!force && affectedValuesCount > 0) {
            throw new ConflictError(ERROR_CATALOG.CONFLICT.RESOURCE_HAS_CONTENT('a coluna', `${affectedValuesCount} itens`))
        }

        // provavelmente isso vai ser removido, pois com o soft delete não queremos que esses dados sejam apagados 
        await Promise.all([
            ItemValueRepository.deleteItemValuesByColumn(columnId),
            ItemAssigneeRepository.deleteItemAssignees(columnId)
        ])

        await ColumnRepository.delete(columnId)
        await ColumnRepository.decrementOrderAfter(boardId, columnToDelete.order)

        LogService.register({
            actorId: user.id,
            workspaceId,
            boardId,
            action: 'DELETE',
            entityType: 'COLUMN',
            entityId: columnId,
            oldValue: {
                name: columnToDelete.name,
                deleted_count: affectedValuesCount
            }
        })

        emitToRoom(`board:${boardId}`, 'column:deleted', { columnId })

        return { deleted_count: affectedValuesCount }
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

        const currentRestrictions = await ColumnRepository.findRestrictions(columnId)

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
            actorId: user.id,
            workspaceId,
            boardId,
            action: 'UPDATE',
            entityType: 'COLUMN_RESTRICTION',
            entityId: columnId,
            oldValue: currentRestrictions.map(({ user_id, board_role, can_view, can_edit }) => ({ user_id, board_role, can_view, can_edit })),
            newValue: result.map(({ user_id, board_role, can_view, can_edit }) => ({ user_id, board_role, can_view, can_edit }))
        })

        emitToRoom(`board:${boardId}`, 'column:restrictions_updated', { columnId, restrictions: result })

        return result
    }

}

module.exports = ColumnService