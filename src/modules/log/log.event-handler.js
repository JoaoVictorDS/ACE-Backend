const LogService = require('./log.service')

const TRUNCATE_AT = 500

const handleEvent = async (event) => {
    if (event.action === 'USER_MENTIONED') return

    await LogService.register({
        actorId: event.actor.id,
        workspaceId: event.workspaceId,
        boardId: event.boardId,
        entityType: event.entityType,
        entityId: event.entityId,
        action: event.action,
        payload: {
            resource: event.resource,
            ...(event.changes && { changes: _truncateChanges(event.changes) }),
        },
    })
}

const _truncateChanges = (changes) => {
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
}

module.exports = handleEvent