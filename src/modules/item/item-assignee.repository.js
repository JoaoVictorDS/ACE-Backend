const prisma = require('../../config/prisma')

const ItemAssigneeRepository = {

    /**
     * Busca todos os assignees de um item
     * @param {number} itemId - ID do item
     * @returns {Promise<array>} Array de usuários atribuídos
     */
    async findByItem(itemId) {
        return prisma.itemAssignee.findMany({
            where: { item_id: itemId },
            include: { user: { select: { id: true, name: true, email: true } } }
        })
    },

    /**
     * Atribui usuários a um item
     * @param {number} itemId - ID do item
     * @param {number} columnId - ID da coluna
     * @param {number} userIds - IDs de usuários
     * @returns {Promise<object>} Assignee criado
     */
    async assignUsers(itemId, columnId, userIds, tx = null) {
        const client = tx || prisma

        return client.itemAssignee.createMany({
            data: userIds.map(userId => ({
                item_id: itemId,
                user_id: userId,
                column_id: columnId
            })),
            skipDuplicates: true
        })
    },

    /**
     * Remove atribuição de usuários a um item
     * @param {number} itemId - ID do item
     * @param {number} columnId - ID da coluna
     * @param {number} userIds - IDs de usuários
     * @returns {Promise<object>} Assignees deletados
     */
    async removeAssignments(itemId, columnId, userIds, tx = null) {
        const client = tx || prisma

        return client.itemAssignee.deleteMany({
            where: {
                item_id: itemId,
                column_id: columnId,
                user_id: { in: userIds }
            }
        })
    },

    /**
     * Deleta todas as assignees da coluna (se tipo era USER)
     * @param {number} columnId
     * @returns {Promise<object>} { count }
     */
    async deleteItemAssignees(columnId, tx = null) {
        const client = tx || prisma

        return client.itemAssignee.deleteMany({
            where: { column_id: columnId }
        })
    },

}

module.exports = ItemAssigneeRepository