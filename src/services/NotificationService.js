const { ItemAssigneeRepository, BoardMemberRepository, NotificationRepository, UserNotificationSettingRepository } = require('../repositories')
const appEventEmitter = require('../config/events')
const NotificationDictionary = require('../utils/notificationDictionary')
const { getIO } = require('../config/socket')
const AppError = require('../errors/AppError')
const { HTTP_STATUS } = require('../constants')

const NotificationService = {
    itemAssigneeRepository: new ItemAssigneeRepository(),
    boardMemberRepository: new BoardMemberRepository(),
    userNotificationSettingRepository: new UserNotificationSettingRepository(),
    notificationRepository: new NotificationRepository(),

    init() {
        appEventEmitter.on('item.action', (payload) => this.handleItem(payload))
        console.log('✅ Sistema de Notificações: Listeners ativos')
    },

    async handleItem(payload) {
        const { actor, boardId, itemId, action, content, specificRecipients } = payload

        try {
            const assignedUsersIdsSet = new Set()

            if (specificRecipients && specificRecipients.length > 0) {
                specificRecipients.forEach(id => assignedUsersIdsSet.add(id))
            } else {
                const assignees = await this.itemAssigneeRepository.findByItem(itemId)
                const admins = await this.boardMemberRepository.findByBoardAndRole(boardId, 'ADMIN, OWNER')

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

            const userSettings = await this.userNotificationSettingRepository.findByUserAndBoard(
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

            await this.notificationRepository.createMany(notificationsData)

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
            console.error('❌ Erro crítico no NotificationService:', error)
        }
    },

    async getByUser({ user, page = 1, limit = 20 }) {
        const { data, total } = await this.notificationRepository.findByUserPaginated(
            user.id,
            page,
            limit
        )

        const formattedNotifications = data.map(notif => {
            const meta = notif.content ? JSON.parse(notif.content) : {}
            const templateFunction = NotificationDictionary[notif.action]
                || NotificationDictionary[`${notif.entity_type}_${notif.action}`]
                || NotificationDictionary['DEFAULT']

            const messageText = templateFunction(notif.actor.name, meta, notif.user_id)

            return {
                id: notif.id,
                is_read: notif.is_read,
                created_at: notif.created_at,
                actor: {
                    id: notif.actor.id,
                    name: notif.actor.name,
                },
                entity: {
                    type: notif.entity_type,
                    id: notif.entity_id,
                },
                message: messageText,
                changes: meta.changes || null,
            }
        })

        return {
            data: formattedNotifications,
            meta: {
                total,
                page,
                totalPages: Math.ceil(total / limit),
            },
        }
    },

    async markAsRead({ user, notificationId }) {
        const notification = await this.notificationRepository.findById(notificationId)

        if (!notification) {
            throw new AppError('Notificação não encontrada!', HTTP_STATUS.NOT_FOUND)
        }

        if (notification.user_id !== user.id) {
            throw new AppError('Você não tem permissão!', HTTP_STATUS.FORBIDDEN)
        }

        return await this.notificationRepository.markAsRead(notificationId)
    },
}

module.exports = NotificationService