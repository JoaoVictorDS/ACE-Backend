const prisma = require('../../config/prisma')

const ItemUpdateRespository = {

    async create(userId, itemId, content) {
        return prisma.itemUpdate.create({
            data: {
                user_id: userId,
                item_id: itemId,
                content
            }
        })
    },

}

module.exports = ItemUpdateRespository