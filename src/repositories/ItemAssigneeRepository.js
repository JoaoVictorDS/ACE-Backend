const BaseRepository = require('./BaseRepository')

/**
 * Repositório de ItemAssignee
 * Gerencia todas as operações de atribuição de itens a usuários
 * Estende BaseRepository para herdar métodos comuns
 */
class ItemAssigneeRepository extends BaseRepository {
    /**
     * Construtor
     * Define o model como 'itemAssignee' para usar nas queries
     */
    constructor() {
        super('itemAssignee')
    }

    /**
     * Busca todos os assignees de um item
     * @param {number} itemId - ID do item
     * @returns {Promise<array>} Array de usuários atribuídos
     */
    async findByItem(itemId) {
        return await this.findMany(
            { item_id: itemId },
            {
                include: {
                    user: {
                        select: { id: true, name: true, email: true },
                    },
                },
            }
        )
    }

    /**
     * Busca se um usuário está atribuído a um item
     * @param {number} itemId - ID do item
     * @param {number} userId - ID do usuário
     * @returns {Promise<object>} Assignee ou null
     */
    async findByItemAndUser(itemId, userId) {
        return await this.findOne({
            item_id: itemId,
            user_id: userId,
        })
    }

    /**
     * Atribui um usuário a um item
     * @param {number} itemId - ID do item
     * @param {number} userId - ID do usuário
     * @returns {Promise<object>} Assignee criado
     */
    async assignUser(itemId, userId) {
        return await this.create({
            item_id: itemId,
            user_id: userId,
        })
    }

    /**
     * Remove atribuição de um usuário a um item
     * @param {number} itemId - ID do item
     * @param {number} userId - ID do usuário
     * @returns {Promise<object>} Assignee deletado
     */
    async removeAssignment(itemId, userId) {
        return await this.prisma.itemAssignee.delete({
            where: {
                user_id_item_id: { user_id: userId, item_id: itemId },
            },
        })
    }

    /**
     * Remove todas as atribuições de um item
     * @param {number} itemId - ID do item
     * @returns {Promise<object>} Resultado da deleção
     */
    async removeAllFromItem(itemId) {
        return await this.prisma.itemAssignee.deleteMany({
            where: { item_id: itemId },
        })
    }

    /**
     * Conta quantos itens um usuário está atribuído
     * @param {number} userId - ID do usuário
     * @returns {Promise<number>} Total de itens
     */
    async countByUser(userId) {
        return await this.count({ user_id: userId })
    }

    /**
     * Busca itens onde um usuário está atribuído
     * @param {number} userId - ID do usuário
     * @param {number} limit - Limite de resultados
     * @returns {Promise<array>} Array de itens
     */
    async findItemsByUser(userId, limit = 20) {
        return await this.findMany(
            { user_id: userId },
            {
                include: {
                    item: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                            priority: true,
                            board_id: true,
                        },
                    },
                },
                take: limit,
            }
        )
    }
}

module.exports = ItemAssigneeRepository
