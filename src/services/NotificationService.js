const prisma = require('../config/prisma')
const appEventEmitter = require('../config/events')
const NotificationDictionary = require('../utils/notificationDictionary')
const { getIO } = require('../config/socket')
const AppError = require('../utils/AppError')

const NotificationService = {

    init() {
        appEventEmitter.on('item.action', (payload) => this.handleItemNotification(payload))
        console.log('✅ Sistema de Notificações: Listeners ativos')
    },

    async handleItemNotification(payload) {
        const { actor, boardId, itemId, action, content, specificRecipients } = payload

        try {
            const assignedUsersIdsSet = new Set()

            if (specificRecipients && specificRecipients.length > 0) {
                specificRecipients.forEach(id => assignedUsersIdsSet.add(id))
            } else {
                const [assignees, board] = await Promise.all([
                    prisma.itemAssignee.findMany({
                        where: { item_id: itemId },
                        select: { user_id: true }
                    }),
                    boardId ? prisma.boardMember.findMany({
                        where: {
                            board_id: boardId,
                            role: { in: ['ADMIN', 'OWNER'] }
                        },
                        select: { user_id: true }
                    }) : []
                ])

                assignees.forEach(a => assignedUsersIdsSet.add(a.user_id))
                board.forEach(a => assignedUsersIdsSet.add(a.user_id))
            }

            if (content && Array(content.changes)) {
                content.changes.forEach(c => {
                    if (c.removedUserIds) c.removedUserIds.forEach(id => assignedUsersIdsSet.add(id))
                    if (c.addedUserIds) c.addedUserIds.forEach(id => assignedUsersIdsSet.add(id))
                })
            }

            assignedUsersIdsSet.delete(actor.id)

            if (assignedUsersIdsSet.size === 0) return

            const assignedUsersIds = Array.from(assignedUsersIdsSet)
            const disabledSettings = await prisma.userNotificationSetting.findMany({
                where: {
                    user_id: { in: assignedUsersIds },
                    board_id: boardId || null,
                    action_type: action,
                    enabled: false
                },
                select: { user_id: true }
            })
            const disabledUserIds = new Set(disabledSettings.map(u => u.user_id))
            const finalAssignedUserIds = assignedUsersIds.filter(id => !disabledUserIds.has(id))

            if (finalAssignedUserIds.length === 0) return

            const contentString = content && Object.keys(content).length > 0 ? JSON.stringify(content) : null

            const notificationsData = finalAssignedUserIds.map(userId => ({
                user_id: userId,
                actor_id: actor.id,
                entity_type: 'ITEM',
                entity_id: itemId,
                action: action,
                content: contentString
            }))

            await prisma.notification.createMany({
                data: notificationsData
            })

            const io = getIO()
            const template = NotificationDictionary[action] || NotificationDictionary['DEFAULT']
            finalAssignedUserIds.forEach(userId => {
                const messageText = template(actor.name, content, userId)

                io.to(`user:${userId}`).emit('notification:received', {
                    message: messageText,
                    entity_type: 'ITEM',
                    entity_id: itemId,
                    created_at: new Date()
                })
            })
        } catch (error) {
            console.error('❌ Erro crítico no NotificationService:', error)
        }
    },

    async getUserNotifications({ user, page = 1, limit = 20 }) {
        const userId = user.id
        const skip = (page - 1) * limit
        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where: { user_id: userId },
                include: { actor: { select: { id: true, name: true } } },
                orderBy: { created_at: 'desc' },
                skip: skip,
                take: limit
            }),
            prisma.notification.count({
                where: { user_id: userId }
            })
        ])
        const formattedNotifications = notifications.map(notif => {
            const meta = notif.content ? JSON.parse(notif.content) : {}
            const templateFunction = NotificationDictionary[notif.action] || NotificationDictionary[`${notif.entity_type}_${notif.action}`] || NotificationDictionary['DEFAULT']
            const messageText = templateFunction(notif.actor.name, meta, notif.user_id)

            return {
                id: notif.id,
                is_read: notif.is_read,
                created_at: notif.created_at,
                actor: {
                    id: notif.actor.id,
                    name: notif.actor.name
                },
                entity: {
                    type: notif.entity_type,
                    id: notif.entity_id
                },
                message: messageText,
                changes: meta.changes || null
            }
        })

        return {
            data: formattedNotifications,
            meta: {
                total,
                page,
                totalPages: Math.ceil(total / limit)
            }
        }
    },

    async markAsRead({ user, notificationId }) {
        const userId = user.id
        const notification = await prisma.notification.findUnique({
            where: { id: notificationId },
            select: { user_id: true }
        })

        if (!notification) throw new AppError('Notificação não encontrada!', 404)

        const isRecipient = userId === notification.user_id

        if (!isRecipient) throw new AppError('Você não tem permissão para alterar esta notificação!', 403)

        return await prisma.notification.update({
            where: { id: notificationId },
            data: { is_read: true }
        })
    }

}

module.exports = NotificationService