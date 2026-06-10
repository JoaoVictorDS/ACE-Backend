const { prisma } = require('../../config')

const ItemRepository = {

    /**
    * Busca item por ID para verificar permissão
    * @param {number} itemId - ID do item
    * @returns {Promise<object>} Item ou null
    */
    async findPermissionContext(itemId) {
        return prisma.item.findUnique({
            where: { id: itemId },
            select: {
                section: { select: { board_id: true, board: { select: { workspace_id: true, creator_id: true } } } }
            }
        })
    },

    async findItemTitle(itemId) {
        return prisma.item.findUnique({
            where: { id: itemId },
            select: { title: true }
        })
    }

}

module.exports = ItemRepository