const NotificationService = require('./notification.service')

const ACTION_SUFFIX = { CREATE: 'CREATED', UPDATE: 'UPDATED', DELETE: 'DELETED', MOVE: 'MOVED', RESTORE: 'RESTORED' }

const NOTIFICATIONS_USING_CHANGES = ['ITEM_UPDATED', 'ITEM_VALUE_CREATED', 'ITEM_VALUE_UPDATED', 'ITEM_VALUE_DELETED', 'MEMBER_CREATED', 'MEMBER_UPDATED']

const handleEvent = async (event) => {
    const notification = _buildNotification(event)

    if (!notification) return

    await NotificationService.create(notification)
}

const _buildNotification = (event) => {
    const canResolveRecipients = event.itemId || event.specificRecipients?.length > 0
    if (!canResolveRecipients) return

    const action = _resolveAction(event)
    if (!action) return

    return {
        actor: event.actor,
        boardId: event.boardId,
        itemId: event.itemId,
        entityType: event.entityType,
        entityId: event.entityId,
        action,
        specificRecipients: event.specificRecipients,
        payload: _buildPayload(event, action),
    }
}

const _resolveAction = (event) => {
    if (event.action === 'USER_MENTIONED') return 'USER_MENTIONED'
    const suffix = ACTION_SUFFIX[event.action]
    return suffix ? `${event.entityType}_${suffix}` : null
}

const _buildPayload = (event, action) => {
    const includesChanges = NOTIFICATIONS_USING_CHANGES.includes(action)
    const isLongText = event.resource.column?.dataType === 'LONG_TEXT'

    return {
        resource: event.resource,
        ...(event.changes && includesChanges && !isLongText && { changes: event.changes }),
    }
}

module.exports = handleEvent