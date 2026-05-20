const BaseRepository = require('./BaseRepository')

/**
 * Repositório de Notification
 * Gerencia todas as operações de banco de dados relacionadas a notificações
 * Estende BaseRepository para herdar métodos comuns
 */
class NotificationRepository extends BaseRepository {
    /**
     * Construtor
     * Define o model como 'notification' para usar nas queries
     */
    constructor() {
        super('notification')
    }

    /**
     * Busca notificações de um usuário com paginação
     * @param {number} userId - ID do usuário
     * @param {number} page - Número da página (começa em 1)
     * @param {number} limit - Itens por página
     * @returns {Promise<object>} { data, total, page, totalPages }
     */
    async findByUserPaginated(userId, page = 1, limit = 20) {
        return await this.paginate(
            { user_id: userId },
            page,
            limit,
            {
                include: {
                    actor: {
                        select: { id: true, name: true },
                    },
                },
                orderBy: { created_at: 'desc' },
            }
        )
    }

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
    }

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
    }

    /**
     * Marca uma notificação como lida
     * @param {number} notificationId - ID da notificação
     * @returns {Promise<object>} Notificação atualizada
     */
    async markAsRead(notificationId) {
        return await this.update(notificationId, {
            is_read: true,
        })
    }

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
    }

    /**
     * Deleta uma notificação
     * @param {number} notificationId - ID da notificação
     * @returns {Promise<object>} Notificação deletada
     */
    async deleteNotification(notificationId) {
        return await this.delete(notificationId)
    }

    /**
     * Deleta todas as notificações lidas de um usuário
     * @param {number} userId - ID do usuário
     * @returns {Promise<object>} Resultado da deleção
     */
    async deleteAllReadByUser(userId) {
        return await this.prisma.notification.deleteMany({
            where: { user_id: userId, is_read: true },
        })
    }

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
    }

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
    }

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
    }

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