const prisma = require('../../config/prisma')

const ColumnRepository = {

    /**
    * Busca column por ID para verificar permissão
    * @param {number} columnId - ID da column
    * @returns {Promise<object>} Column ou null
    */
    async findPermissionContext(columnId) {
        return prisma.column.findUnique({
            where: { id: columnId },
            select: {
                board_id: true,
                board: { select: { workspace_id: true, creator_id: true } }
            }
        })
    }



}

module.exports = ColumnRepository