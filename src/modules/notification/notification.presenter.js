const NotificationDictionary = require('./notification.dictionary')
const logger = require('../../config/logger')

class NotificationPresenter {

    static format(notification) {
        const messageText = this._buildMessage(notification, notification.payload)

        return {
            id: notification.id,
            is_read: notification.is_read,
            actor: {
                id: notification.actor.id,
                name: notification.actor.name,
                email: notification.actor.email
            },
            item_id: notification.item_id,
            entity: {
                type: notification.entity_type,
                id: notification.entity_id,
            },
            action: notification.action,
            message: messageText,
            payload: notification.payload,
            created_at: notification.created_at,
        }
    }

    static formatMany(notifications) {
        return notifications.map(notif => this.format(notif))
    }

    static _buildMessage(notification, meta) {
        const templateFunction =
            NotificationDictionary[notification.action] ||
            NotificationDictionary['DEFAULT']

        return templateFunction(notification.actor.name, meta, notification.user_id)
    }
}

module.exports = NotificationPresenter