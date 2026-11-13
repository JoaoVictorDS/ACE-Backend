const { emitToRoom } = require('../../config')
const { ENTITY_TYPES } = require('../constants')

const REALTIME_EVENT = 'domain:changed'
const WORKSPACE_SCOPED_TYPES = [ENTITY_TYPES.BOARD, ENTITY_TYPES.MEMBER, ENTITY_TYPES.WORKSPACE]

const RealtimeEventHandler = (event) => {
    const basePayload = {
        entityType: event.entityType,
        entityId: event.entityId,
        action: event.action,
    }

    if (event.entityType === ENTITY_TYPES.USER_AVAILABILITY_DAY) {
        emitToRoom('availability', REALTIME_EVENT, basePayload)

        return
    }

    const payload = {
        ...basePayload,
        resource: event.resource,
        changes: event.changes,
    }

    if (event.boardId) {
        emitToRoom(`board:${event.boardId}`, REALTIME_EVENT, payload)
    }

    if (event.workspaceId && WORKSPACE_SCOPED_TYPES.includes(event.entityType)) {
        emitToRoom(`workspace:${event.workspaceId}`, REALTIME_EVENT, payload)
    }
}

module.exports = RealtimeEventHandler