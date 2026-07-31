const { appEventEmitter, logger } = require('../../config')
const LogRepository = require('./log.repository')
const { PERMISSION_LEVELS, RESOURCE_TYPES } = require('../../shared/constants')
const { PermissionService, PaginationService } = require('../../shared/services')
const { DOMAIN_EVENT } = require('../../shared/events/domain-event')
const LogPresenter = require('./log.presenter')

const TRUNCATE_AT = 500

const LogService = {

    init() {
        appEventEmitter.on(DOMAIN_EVENT, (event) => this.handleEvent(event))
        logger.info('Log: Listener ativo')
    },

    async handleEvent(event) {
        if (event.action === 'USER_MENTIONED') return // não é um ActivityAction — não gera log

        await this.register({
            actorId: event.actor.id,
            workspaceId: event.workspaceId,
            boardId: event.boardId,
            entityType: event.entityType,
            entityId: event.entityId,
            action: event.action,
            payload: {
                resource: event.resource,
                ...(event.changes && { changes: this._truncateChanges(event.changes) }),
            },
        })
    },

    async register({ actorId, workspaceId, boardId, action, entityType, entityId, payload, tx = null }) {
        try {
            await LogRepository.create({
                actor_id: actorId,
                workspace_id: workspaceId,
                board_id: boardId,
                action,
                entity_type: entityType,
                entity_id: entityId,
                payload,
            }, tx)
        } catch (error) {
            logger.error(
                { error: error.message, actorId, workspaceId, boardId, action, entityType, entityId },
                'Activity log registration failed'
            )
        }
    },

    _truncateChanges(changes) {
        const truncate = (val) =>
            typeof val === 'string' && val.length > TRUNCATE_AT
                ? `${val.substring(0, TRUNCATE_AT)}...`
                : val

        if (Array.isArray(changes.fields)) {
            return { ...changes, fields: changes.fields.map(f => ({ ...f, before: truncate(f.before), after: truncate(f.after) })) }
        }

        return {
            ...changes,
            ...('before' in changes && { before: truncate(changes.before) }),
            ...('after' in changes && { after: truncate(changes.after) }),
        }
    },

    async getByWorkspace({ user, workspaceId, page, limit }) {
        await PermissionService.checkWorkspace(workspaceId, user, PERMISSION_LEVELS.VIEW)
        const [data, total] = await Promise.all([
            LogRepository.findByWorkspacePaginated(workspaceId, page, limit),
            LogRepository.countByWorkspace(workspaceId)
        ])
        
        return PaginationService.createPaginatedResponse(LogPresenter.formatMany(data), total, page, limit)
    },

    async getByBoard({ user, boardId, page, limit }) {
        await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.VIEW)
        const [data, total] = await Promise.all([
            LogRepository.findByBoardPaginated(boardId, page, limit),
            LogRepository.countByBoard(boardId)
        ])

        return PaginationService.createPaginatedResponse(LogPresenter.formatMany(data), total, page, limit)
    },
}

module.exports = LogService