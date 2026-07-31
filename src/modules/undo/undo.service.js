const { appEventEmitter, logger } = require('../../config')
const UndoRepository = require('./undo.repository')
const { DOMAIN_EVENT } = require('../../shared/events/domain-event')

const UNDOABLE_ACTIONS = ['CREATE', 'UPDATE', 'DELETE']
const UNDO_WINDOW_HOURS = 24

const UndoService = {

    init() {
        appEventEmitter.on(DOMAIN_EVENT, (event) => this.handleEvent(event))
        logger.info('Undo: Listener ativo')
    },

    async handleEvent(event) {
        if (!UNDOABLE_ACTIONS.includes(event.action)) return

        try {
            const expiresAt = new Date(Date.now() + UNDO_WINDOW_HOURS * 60 * 60 * 1000)

            await UndoRepository.create({
                actor_id: event.actor.id,
                board_id: event.boardId,
                action: event.action,
                entity_type: event.entityType,
                entity_id: event.entityId,
                snapshot: event.snapshot ?? event.changes ?? null,
                expires_at: expiresAt,
            })
        } catch (error) {
            logger.error({ error: error.message }, 'Registro de Undo falhou')
        }
    },
}

module.exports = UndoService