const { logger } = require('../../config')
const { NotFoundError, ConflictError, AppError, AuthorizationError } = require('../../shared/errors')
const ERROR_CATALOG = require('../../shared/errors/error-catalog')
const BoardRepository = require('../board/board.repository')
const UndoRepository = require('./undo.repository')
const { EventPublisher } = require('../../shared/events')
const RESTORE_EXECUTORS = require('./restore-executors')
const { PaginationService, PermissionService } = require('../../shared/services')
const { RESOURCE_TYPES, PERMISSION_LEVELS } = require('../../shared/constants')

const UNDO_WINDOW_HOURS = 24

const UndoService = {

    async create({ actorId, workspaceId, boardId, action, entityType, entityId, snapshot }) {
        try {
            if (action === 'DELETE') await UndoRepository.invalidatePendingUpdates(entityId, entityType)

            const expiresAt = new Date(Date.now() + UNDO_WINDOW_HOURS * 60 * 60 * 1000)

            await UndoRepository.create({
                actor_id: actorId,
                workspace_id: workspaceId,
                board_id: boardId,
                action: action,
                entity_type: entityType,
                entity_id: entityId,
                snapshot,
                expires_at: expiresAt,
            })
        } catch (error) {
            logger.error({ err: error, actorId, workspaceId, boardId, entityType, entityId, action }, 'Evento de Undo falhou')
        }
    },

    async restore({ user, undoActionId }) {
        const undoAction = await UndoRepository.findById(undoActionId)
        if (!undoAction) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.UNDO_ACTION)

        if (undoAction.consumed_at) throw new ConflictError(ERROR_CATALOG.CONFLICT.ALREADY_IN_STATE('Essa ação', 'defeita'))

        if (undoAction.expires_at < new Date()) throw new ConflictError(ERROR_CATALOG.CONFLICT.ALREADY_IN_STATE('Essa ação', 'expirada'))

        await this._checkRestorePermission(user, undoAction)

        if (undoAction.action === 'CREATE') await UndoRepository.invalidatePendingUpdates(undoAction.entity_id, undoAction.entity_type)

        const executor = RESTORE_EXECUTORS[undoAction.entity_type]
        if (!executor) throw new AppError(ERROR_CATALOG.INTERNAL.UNSUPPORTED_RESOURCE(undoAction.entity_type).message, 500, ERROR_CATALOG.INTERNAL.UNSUPPORTED_RESOURCE(undoAction.entity_type).code)

        const result = await executor.restore(undoAction)

        await UndoRepository.markConsumed(undoActionId)

        EventPublisher.publish({
            actor: user,
            workspaceId: undoAction.workspace_id,
            boardId: undoAction.board_id,
            itemId: result.itemId,
            entityType: undoAction.entity_type,
            entityId: undoAction.entity_id,
            action: 'RESTORE',
            resource: result.resource,
            changes: { before: null, after: result.summary }
        })

        return result.data
    },

    async listRecentForWorkspace({ user, workspaceId, page, limit }) {
        const { creatorId } = await PermissionService.checkWorkspace(workspaceId, user, PERMISSION_LEVELS.VIEW)
        const isPrivileged = PermissionService.isPrivileged(user.role) || creatorId === user.id
        const actorId = isPrivileged ? null : user.id

        const [data, total] = await Promise.all([
            UndoRepository.findRecentForWorkspacePaginated(workspaceId, actorId, page, limit),
            UndoRepository.countByWorkspace(workspaceId, actorId)
        ])

        return PaginationService.createPaginatedResponse(data, total, page, limit)
    },

    async listRecentForBoard({ user, boardId, page, limit }) {
        const { creatorId } = await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.VIEW)
        const isPrivileged = PermissionService.isPrivileged(user.role) || creatorId === user.id
        const actorId = isPrivileged ? null : user.id

        const [data, total] = await Promise.all([
            UndoRepository.findRecentForBoardPaginated(boardId, actorId, page, limit),
            UndoRepository.countByBoard(boardId, actorId)
        ])

        return PaginationService.createPaginatedResponse(data, total, page, limit)
    },

    async _checkRestorePermission(user, undoAction) {
        if (user.role === 'ADMIN') return
        if (undoAction.actor_id === user.id) return

        if (undoAction.board_id) {
            const board = await BoardRepository.findPermissionContext(undoAction.board_id)
            if (board?.creator_id === user.id) return
        }

        throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('desfazer essa ação'))
    },

}

module.exports = UndoService