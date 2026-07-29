const { logger } = require('../../config')
const LogRepository = require('./log.repository')
const { PERMISSION_LEVELS, RESOURCE_TYPES } = require('../../shared/constants')
const { PermissionService, PaginationService } = require('../../shared/services')
const LogPresenter = require('./log.presenter')

const LogService = {

    async register({ actor, boardId, logAction, entityType, entityId, logPayload }, tx = null) {
        try {
            await LogRepository.create({
                actor_id: actor.id,
                workspace_id: logPayload.resource.workspaceId,
                board_id: boardId,
                action: logAction,
                entity_id: entityId,
                entity_type: entityType,
                payload: logPayload
            }, tx)

        } catch (error) {
            logger.error({ error: error.message }, 'Registro de Activity log falhou')
        }
    },

    async getByWorkspace({ user, workspaceId, page, limit }) {
        await PermissionService.checkWorkspace(workspaceId, user, PERMISSION_LEVELS.VIEW)
        const [data, total] = await Promise.all([
            LogRepository.findByWorkspacePaginated(workspaceId, page, limit),
            LogRepository.countByWorkspace(workspaceId)
        ])
        const formattedLogs = LogPresenter.formatMany(data)

        return PaginationService.createPaginatedResponse(formattedLogs, total, page, limit)
    },

    async getByBoard({ user, boardId, page, limit }) {
        await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.VIEW)
        const [data, total] = await Promise.all([
            LogRepository.findByBoardPaginated(boardId, page, limit),
            LogRepository.countByBoard(boardId)
        ])
        const formattedLogs = LogPresenter.formatMany(data)

        return PaginationService.createPaginatedResponse(formattedLogs, total, page, limit)
    },

}

module.exports = LogService