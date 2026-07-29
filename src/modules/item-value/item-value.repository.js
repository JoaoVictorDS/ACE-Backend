const prisma = require('../../config/prisma')

const ItemValueRepository = {

    async findByItemAndColumn(itemId, columnId) {
        return prisma.itemValue.findUnique({
            where: { item_id_column_id: { item_id: itemId, column_id: columnId } }
        })
    },

    async delete(itemId, columnId, tx = null) {
        const client = tx || prisma

        return client.itemValue.deleteMany({
            where: { item_id: itemId, column_id: columnId }
        })
    },

    async upsertValue(itemId, columnId, value, tx = null) {
        const client = tx || prisma

        return client.itemValue.upsert({
            where: { item_id_column_id: { item_id: itemId, column_id: columnId } },
            update: { value },
            create: { item_id: itemId, column_id: columnId, value }
        })
    },

    /**
     * Conta valores vinculados à coluna
     * @param {number} columnId
     * @returns {Promise<number>}
     */
    async countItemValuesByColumn(columnId) {
        return prisma.itemValue.count({
            where: { column_id: columnId }
        })
    },

    /**
     * Deleta todos os valores da coluna
     * @param {number} columnId
     * @returns {Promise<object>} { count }
     */
    async deleteItemValuesByColumn(columnId) {
        return prisma.itemValue.deleteMany({
            where: { column_id: columnId }
        })
    },

}

module.exports = ItemValueRepository