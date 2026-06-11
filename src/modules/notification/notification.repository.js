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

        const [data, total] = await Promise.all([
            prisma.notification.findMany({
                where: { user_id: userId },
                take: limit,
                skip,
                include: { actor: { select: { id: true, name: true } } },
                orderBy: { created_at: 'desc' }
            }),
            prisma.notification.count({ where: { user_id: userId } })
        ])

        return {
            data,
            total
        }
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





    // atualizar

    /**
     * Busca notificações não lidas de um usuário
     * @param {number} userId - ID do usuário
     * @param {number} limit - Limite de resultados
     * @returns {Promise<array>} Array de notificações não lidas
     */
    async findUnreadByUser(userId, limit = 10) {
        return await this.findMany(
            { user_id: userId, is_read: false },
            {
                include: {
                    actor: {
                        select: { id: true, name: true },
                    },
                },
                orderBy: { created_at: 'desc' },
                take: limit,
            }
        )
    },

    /**
     * Conta notificações não lidas de um usuário
     * @param {number} userId - ID do usuário
     * @returns {Promise<number>} Total de notificações não lidas
     */
    async countUnreadByUser(userId) {
        return await this.count({
            user_id: userId,
            is_read: false,
        })
    },

    /**
     * Marca todas as notificações de um usuário como lidas
     * @param {number} userId - ID do usuário
     * @returns {Promise<object>} Resultado da atualização
     */
    async markAllAsReadByUser(userId) {
        return await this.prisma.notification.updateMany({
            where: { user_id: userId },
            data: { is_read: true },
        })
    },

    /**
     * Deleta uma notificação
     * @param {number} notificationId - ID da notificação
     * @returns {Promise<object>} Notificação deletada
     */
    async deleteNotification(notificationId) {
        return await this.delete(notificationId)
    },

    /**
     * Deleta todas as notificações lidas de um usuário
     * @param {number} userId - ID do usuário
     * @returns {Promise<object>} Resultado da deleção
     */
    async deleteAllReadByUser(userId) {
        return await this.prisma.notification.deleteMany({
            where: { user_id: userId, is_read: true },
        })
    },

    /**
     * Busca notificações por tipo de ação
     * @param {number} userId - ID do usuário
     * @param {string} action - Tipo de ação (ex: 'ITEM_CREATED')
     * @param {number} limit - Limite de resultados
     * @returns {Promise<array>} Array de notificações
     */
    async findByUserAndAction(userId, action, limit = 10) {
        return await this.findMany(
            { user_id: userId, action },
            {
                include: {
                    actor: {
                        select: { id: true, name: true },
                    },
                },
                orderBy: { created_at: 'desc' },
                take: limit,
            }
        )
    },

    /**
     * Busca notificação por ID com detalhes completos
     * @param {number} notificationId - ID da notificação
     * @returns {Promise<object>} Notificação ou null
     */
    async findByIdWithDetails(notificationId) {
        return await this.findById(notificationId, {
            include: {
                actor: {
                    select: { id: true, name: true, email: true },
                },
            },
        })
    },

    /**
     * Cria múltiplas notificações em uma transação
     * Garante que todas são criadas ou nenhuma é
     * @param {array} notificationsData - Array de dados de notificações
     * @returns {Promise<object>} Resultado da criação
     */
    async createManyInTransaction(notificationsData) {
        return await this.prisma.$transaction(async (tx) => {
            return await tx.notification.createMany({
                data: notificationsData,
            })
        })
    },

    /**
     * Busca notificações para um usuário em um item específico
     * @param {number} userId - ID do usuário
     * @param {number} itemId - ID do item
     * @param {number} limit - Limite de resultados
     * @returns {Promise<array>} Array de notificações
     */
    async findByUserAndItem(userId, itemId, limit = 10) {
        return await this.findMany(
            { user_id: userId, entity_id: itemId, entity_type: 'ITEM' },
            {
                include: {
                    actor: {
                        select: { id: true, name: true },
                    },
                },
                orderBy: { created_at: 'desc' },
                take: limit,
            }
        )
    }
}

module.exports = NotificationRepository