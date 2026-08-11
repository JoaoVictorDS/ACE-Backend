const { getIO, logger } = require('../../config')
const ItemAssigneeRepository = require('../item/item-assignee.repository')
const BoardMemberRepository = require('../board-member/board-member.repository')
const NotificationRepository = require('./notification.repository')
const UserNotificationSettingRepository = require('../user-notification-setting/user-notification-setting.repository')
const NotificationDictionary = require('./notification.dictionary')
const NotificationPresenter = require('./notification.presenter')
const { NotFoundError, AuthorizationError } = require('../../shared/errors')
const { PaginationService } = require('../../shared/services')
const ERROR_CATALOG = require('../../shared/errors/error-catalog')
const { diffUserIds } = require('./notification.utils')

const NotificationService = {

    async create({ actor, boardId, itemId, entityType, entityId, action, specificRecipients, payload }) {
        try {
            const assignedUsersIdsSet = new Set()

            if (specificRecipients?.length > 0) {
                specificRecipients.forEach(id => assignedUsersIdsSet.add(id))
            } else {
                const assignees = await ItemAssigneeRepository.findByItem(itemId)
                const admins = await BoardMemberRepository.findByBoardAndRoles(boardId, ['ADMIN', 'OWNER'])
                assignees.forEach(a => assignedUsersIdsSet.add(a.user_id))
                admins.forEach(a => assignedUsersIdsSet.add(a.user_id))
            }

            if (payload?.resource?.column?.dataType === 'USER') {
                const { addedUserIds, removedUserIds } = diffUserIds(payload.changes?.before, payload.changes?.after)
                const affectedIds = [...addedUserIds, ...removedUserIds]
                affectedIds.forEach(id => assignedUsersIdsSet.add(id))
            }

            assignedUsersIdsSet.delete(actor.id)
            if (assignedUsersIdsSet.size === 0) return

            const assignedUsersIds = Array.from(assignedUsersIdsSet)
            const userSettings = await UserNotificationSettingRepository.findUserSettings(assignedUsersIds, boardId)

            const finalAssignedUserIds = assignedUsersIds.filter(userId => {
                const settingsForUser = userSettings.filter(s => s.user_id === userId && s.action_type === action)
                const specificSetting = settingsForUser.find(s => s.board_id === boardId)
                const globalSetting = settingsForUser.find(s => s.board_id === null)

                if (specificSetting) return specificSetting.enabled
                if (globalSetting) return globalSetting.enabled
                return true
            })

            if (finalAssignedUserIds.length === 0) return

            await NotificationRepository.createMany(finalAssignedUserIds.map(userId => ({
                user_id: userId,
                actor_id: actor.id,
                entity_type: entityType,
                entity_id: entityId,
                item_id: itemId,
                action,
                payload,
            })))

            const io = getIO()
            const template = NotificationDictionary[action] || NotificationDictionary['DEFAULT']

            await Promise.all(finalAssignedUserIds.map(async (userId) => {
                const totalUnread = await NotificationRepository.countUnread(userId)

                io.to(`user:${userId}`).emit('notification:received', {
                    unread_count: totalUnread,
                    data: {
                        message: template(actor.name, payload, userId),
                        entity_type: entityType,
                        entity_id: entityId,
                        board_id: boardId,
                        item_id: itemId,
                        created_at: new Date(),
                    }
                })
            }))
        } catch (error) {
            logger.error({ error: error.message }, 'Erro crítico no NotificationService')
        }
    },

    async getByUser({ user, page, limit }) {
        const userId = user.id
        const [data, total] = await Promise.all([
            NotificationRepository.findByUserPaginated(userId, page, limit),
            NotificationRepository.countByUser(userId)
        ])
        return PaginationService.createPaginatedResponse(NotificationPresenter.formatMany(data), total, page, limit)
    },

    async markAsRead({ user, notificationId }) {
        const notification = await NotificationRepository.findById(notificationId)
        if (!notification) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.NOTIFICATION)
        if (notification.user_id !== user.id) {
            throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('marcar como lida', 'NOTIFICATION'))
        }
        return await NotificationRepository.markAsRead(notificationId)
    },
}

module.exports = NotificationService