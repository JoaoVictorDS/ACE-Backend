const { appEventEmitter, logger } = require('../../config')
const { domainEventSchema } = require('./event.validator')
const { DOMAIN_EVENT } = require('./event.constants')

/**
 * @typedef {Object} DomainEvent
 * @property {{id: number, name: string}} actor
 * @property {number|null} [workspaceId]
 * @property {number|null} [boardId]
 * @property {number|null} [itemId]
 * @property {string} entityType
 * @property {number} entityId
 * @property {'CREATE'|'UPDATE'|'DELETE'|'MOVE'|'RESTORE'} action
 * @property {Object.<string, any>} resource
 * @property {any} [changes]
 * @property {any} [snapshot]
 * @property {number[]} [specificRecipients]
 */

const EventPublisher = {

    /** @param {DomainEvent} event  */
    publish(event) {
        const result = domainEventSchema.safeParse(event)

        if (!result.success) {
            logger.error({ errors: result.error.format(), event })

            return
        }

        appEventEmitter.emit(
            DOMAIN_EVENT,
            result.data
        )
    }

}

module.exports = EventPublisher 