const logger = require('../../config/logger')

class LogPresenter {

    static format(log) {
        const meta = this._parseContent(log.payload)

        return {
            id: log.id,
            actor: {
                id: log.actor.id,
                name: log.actor.name,
                email: log.actor.email
            },
            workspace_id: log.workspace_id,
            board_id: log.board_id,
            entity: {
                type: log.entity_type,
                id: log.entity_id,
            },
            action: log.action,
            payload: log.payload,
            created_at: log.created_at,
        }
    }

    static formatMany(logs) {
        return logs.map(log => this.format(log))
    }

    static _parseContent(content) {
        if (!content) return {}
        if (typeof content === 'object') return content

        try {
            return JSON.parse(content)
        } catch (error) {
            logger.warn('Falha no parseContent do Log:', error)
            return {}
        }
    }

}

module.exports = LogPresenter