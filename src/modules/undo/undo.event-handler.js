const UndoService = require('./undo.service')

const UNDOABLE_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'RESTORE']

const UndoEventHandler = async (event) => {
    if (!UNDOABLE_ACTIONS.includes(event.action)) return

    const undo = _buildUndo(event)
    if (!undo) return

    await UndoService.create(undo)
}

const _buildUndo = (event) => {
    const snapshot = event.snapshot ?? event.changes ?? null
    if (!snapshot) return

    return {
        actorId: event.actor.id,
        workspaceId: event.workspaceId,
        boardId: event.boardId,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        snapshot,
    }
}

module.exports = UndoEventHandler