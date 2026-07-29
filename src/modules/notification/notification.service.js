const { appEventEmitter, getIO, logger } = require('../../config')
const ItemAssigneeRepository = require('../item/item-assignee.repository')
const BoardMemberRepository = require('../board-member/board-member.repository')
const NotificationRepository = require('./notification.repository')
const UserNotificationSettingRepository = require('../user-notification-setting/user-notification-setting.repository')
const NotificationPresenter = require('./notification.presenter')
const { NotFoundError, AuthorizationError } = require('../../shared/errors')
const { PaginationService } = require('../../shared/services')
const ERROR_CATALOG = require('../../shared/errors/error-catalog')

const NotificationService = {

    init() {
        appEventEmitter.on('item.action', (record) => this.handleItem(record))
        logger.info('Notifications: Listeners ativos')
    },

    async handleItem(record) {
        const { actor, boardId, itemId, entityId, entityType, notificationAction, notificationPayload, specificRecipients } = record

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

            if (notificationPayload?.changes?.removedUserIds) {
                notificationPayload.changes.removedUserIds.forEach(id => assignedUsersIdsSet.add(id))
            }
            if (notificationPayload?.changes?.addedUserIds) {
                notificationPayload.changes.addedUserIds.forEach(id => assignedUsersIdsSet.add(id))
            }

            assignedUsersIdsSet.delete(actor.id)

            if (assignedUsersIdsSet.size === 0) return

            const assignedUsersIds = Array.from(assignedUsersIdsSet)

            const userSettings = await UserNotificationSettingRepository.findUserSettings(
                assignedUsersIds,
                boardId
            )

            const finalAssignedUserIds = assignedUsersIds.filter(userId => {
                const settingsForUser = userSettings.filter(s => s.user_id === userId && s.action_type === notificationAction)
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

            const notificationsData = finalAssignedUserIds.map(userId => ({
                user_id: userId,
                actor_id: actor.id,
                item_id: itemId,
                entity_type: entityType,
                entity_id: entityId,
                action: notificationAction,
                payload: notificationPayload,
            }))

            await NotificationRepository.createMany(notificationsData)

            const io = getIO()

            await Promise.all(finalAssignedUserIds.map(async (userId) => {
                const totalUnread = await NotificationRepository.countUnread(userId)

                io.to(`user:${userId}`).emit('notification:refresh', {
                    unread_count: totalUnread
                })
            }))
        } catch (error) {
            logger.error({ error: error.message, stack: error.stack }, 'Erro critico no NotificationService')
        }
    },

    async getByUser({ user, page, limit }) {
        const userId = user.id
        const [data, total] = await Promise.all([
            NotificationRepository.findByUserPaginated(userId, page, limit),
            NotificationRepository.countByUser(userId)
        ])
        const formattedNotifications = NotificationPresenter.formatMany(data)

        return PaginationService.createPaginatedResponse(formattedNotifications, total, page, limit)
    },

    async markAsRead({ user, notificationId }) {
        const notification = await NotificationRepository.findById(notificationId)

        if (!notification) {
            throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.NOTIFICATION)
        }

        if (notification.user_id !== user.id) {
            throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('marcar como lida', 'NOTIFICATION'))
        }

        return await NotificationRepository.markAsRead(notificationId)
    },
}

module.exports = NotificationService