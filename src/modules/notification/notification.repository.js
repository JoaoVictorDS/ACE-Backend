const prisma = require('../../config/prisma')
const PaginationService = require('../../shared/services/pagination.service')

const NotificationRepository = {

    /**
     * Busca notificações de um usuário com paginação
     * @param {number} userId - ID do usuário
     * @param {number} page - Número da página (começa em 1)
     * @param {number} limit - Itens por página
     * @returns {Promise<object>} { data, total, page, totalPages }
     */
    async findByUserPaginated(userId, page, limit) {
        const skip = PaginationService.calculateSkip(page, limit)

        return prisma.notification.findMany({
            where: { user_id: userId },
            take: limit,
            skip,
            include: {
                item: { select: { id: true, title: true } },
                actor: { select: { id: true, name: true } }
            },
            orderBy: { created_at: 'desc' }
        })
    },

    /**
     * Busca notificação por ID
     * @param {number} notificationId - ID da notificação
     * @returns {Promise<object>} Notificação
     */
    async findById(notificationId) {
        return prisma.notification.findUnique({
            where: { id: notificationId }
        })
    },

    /**
     * Marca uma notificação como lida
     * @param {number} notificationId - ID da notificação
     * @returns {Promise<object>} Notificação atualizada
     */
    async markAsRead(notificationId) {
        return prisma.notification.update({
            where: { id: notificationId },
            data: { is_read: true }
        })
    },

    /**
     * Cria múltiplas notificações
     * @param {array} notificationsData - Array de dados de notificações
     * @returns {Promise<object>} Resultado da criação
     */
    async createMany(notificationsData) {
        return prisma.notification.createMany({
            data: notificationsData
        })
    },

    async countByUser(userId) {
        return prisma.notification.count({ where: { user_id: userId } })
    },

    async countUnread(userId) {
        return prisma.notification.count({
            where: {
                user_id: userId,
                is_read: false
            }
        })
    }
}

module.exports = NotificationRepository