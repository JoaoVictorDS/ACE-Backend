const { logger } = require('../../config')
const UndoRepository = require('./undo.repository')

const UNDO_WINDOW_HOURS = 24

const UndoService = {

    async create({ actorId, workspaceId, boardId, action, entityType, entityId, snapshot, }) {
        try {
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
}

module.exports = UndoService