const ItemAssigneeRepository = require('../item/item-assignee.repository')
const BoardMemberRepository = require('../board-member/board-member.repository')
const NotificationRepository = require('./notification.repository')
const UserNotificationSettingRepository = require('../user-notification-setting/user-notification-setting.repository')
const NotificationDictionary = require('./notification.dictionary')
const { appEventEmitter, getIO, logger } = require('../../config')
const { NotFoundError, AuthorizationError } = require('../../shared/errors')
const PaginationService = require('../../shared/services/PaginationService')
const NotificationPresenter = require('./notification.presenter')

const NotificationService = {

    init() {
        appEventEmitter.on('item.action', (payload) => this.handleItem(payload))
        logger.info('Notifications: Listeners ativos')
    },

    async handleItem(payload) {
        const { actor, boardId, itemId, action, content, specificRecipients } = payload

        try {
            const assignedUsersIdsSet = new Set()

            if (specificRecipients && specificRecipients.length > 0) {
                specificRecipients.forEach(id => assignedUsersIdsSet.add(id))
            } else {
                const assignees = await ItemAssigneeRepository.findByItem(itemId)
                const admins = await BoardMemberRepository.findByBoardAndRoles(boardId, ['ADMIN', 'OWNER'])

                assignees.forEach(a => assignedUsersIdsSet.add(a.user_id))
                admins.forEach(a => assignedUsersIdsSet.add(a.user_id))
            }

            if (content?.changes?.removedUserIds) {
                content.changes.removedUserIds.forEach(id => assignedUsersIdsSet.add(id))
            }
            if (content?.changes?.addedUserIds) {
                content.changes.addedUserIds.forEach(id => assignedUsersIdsSet.add(id))
            }

            assignedUsersIdsSet.delete(actor.id)

            if (assignedUsersIdsSet.size === 0) return

            const assignedUsersIds = Array.from(assignedUsersIdsSet)

            const userSettings = await UserNotificationSettingService.findUserSettings(
                assignedUsersIds,
                boardId
            )

            const finalAssignedUserIds = assignedUsersIds.filter(userId => {
                const settingsForUser = userSettings.filter(s => s.user_id === userId)
                const specificSetting = settingsForUser.find(s => s.board_id === boardId)
                const globalSetting = settingsForUser.find(s => s.board_id === null)

                if (specificSetting) {
                    return specificSetting.enabled
                } else if (globalSetting) {
                    return globalSetting.enabled
                }

                return true
            })

            if (finalAssignedUserIds.length === 0) return

            const contentString = content && Object.keys(content).length > 0
                ? JSON.stringify(content)
                : null

            const notificationsData = finalAssignedUserIds.map(userId => ({
                user_id: userId,
                actor_id: actor.id,
                entity_type: 'ITEM',
                entity_id: itemId,
                action: action,
                content: contentString,
            }))

            await NotificationRepository.createMany(notificationsData)

            const io = getIO()
            const template = NotificationDictionary[action] || NotificationDictionary['DEFAULT']

            finalAssignedUserIds.forEach(userId => {
                const messageText = template(actor.name, content, userId)

                io.to(`user:${userId}`).emit('notification:received', {
                    message: messageText,
                    entity_type: 'ITEM',
                    entity_id: itemId,
                    created_at: new Date(),
                })
            })
        } catch (error) {
            logger.error({ error: error.message, stack: error.stack }, 'Erro critico no NotificationService')
        }
    },

    async getByUser({ user, page, limit }) {
        const { data, total } = await NotificationRepository.findByUserPaginated(
            user.id,
            page,
            limit
        )

        const formattedNotifications = NotificationPresenter.formatMany(data)

        return PaginationService.createPaginatedResponse(formattedNotifications, total, page, limit)
    },

    async markAsRead({ user, notificationId }) {
        const notification = await NotificationRepository.findById(notificationId)

        if (!notification) {
            throw new NotFoundError()
        }

        if (notification.user_id !== user.id) {
            throw new AuthorizationError()
        }

        return await NotificationRepository.markAsRead(notificationId)
    },
}

module.exports = NotificationService