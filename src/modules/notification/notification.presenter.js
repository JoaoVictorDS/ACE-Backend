const NotificationDictionary = require('./notification.dictionary')
const logger = require('../../config/logger')

class NotificationPresenter {

    static format(notification) {
        const meta = this._parseContent(notification.content)
        const messageText = this._buildMessage(notification, meta)

        return {
            id: notification.id,
            is_read: notification.is_read,
            created_at: notification.created_at,
            actor: {
                id: notification.actor.id,
                name: notification.actor.name,
            },
            entity: {
                type: notification.entity_type,
                id: notification.entity_id,
            },
            message: messageText,
            changes: meta.changes || null,
        }
    }

    static formatMany(notifications) {
        return notifications.map(notif => this.format(notif))
    }

    static _parseContent(content) {
        if (!content) return {}
        try {
            return JSON.parse(content)
        } catch (error) {
            logger.warn('Falha no parseContent da notificação:', error)
            return {}
        }
    }

    static _buildMessage(notification, meta) {
        const templateFunction =
            NotificationDictionary[notification.action] ||
            NotificationDictionary[`${notification.entity_type}_${notification.action}`] ||
            NotificationDictionary['DEFAULT']

        return templateFunction(notification.actor.name, meta, notification.user_id)
    }
}

module.exports = NotificationPresenter