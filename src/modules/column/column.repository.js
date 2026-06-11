const prisma = require('../../config/prisma')

const ColumnRepository = {

    /**
     * Busca column por ID para verificar permissão
     * @param {number} columnId - ID da column
     * @returns {Promise<object>} { board_id, board: { workspace_id } }
     */
    async findPermissionContext(columnId) {
        return prisma.column.findUnique({
            where: { id: columnId },
            select: {
                board_id: true,
                board: { select: { workspace_id: true, creator_id: true } }
            }
        })
    },

    /**
     * Busca coluna completa por ID
     * @param {number} columnId
     * @returns {Promise<object>} Column com restrições
     */
    async findById(columnId) {
        return prisma.column.findUnique({
            where: { id: columnId },
            include: { restrictions: true }
        })
    },

    /**
     * Busca coluna apenas para validação (sem restrictions)
     * @param {number} columnId
     * @returns {Promise<object>} Column básico
     */
    async findByIdBasic(columnId) {
        return prisma.column.findUnique({
            where: { id: columnId }
        })
    },

    /**
     * Busca todas as colunas de um quadro
     * @param {number} boardId
     * @returns {Promise<array>} Colunas ordenadas
     */
    async findByBoard(boardId) {
        return prisma.column.findMany({
            where: { board_id: boardId },
            orderBy: [{ order: 'asc' }, { id: 'asc' }],
            include: { restrictions: true }
        })
    },

    async findByIdForValueValidation(columnId) {
        return prisma.column.findUnique({
            where: { id: columnId },
            select: {
                id: true,
                name: true,
                data_type: true,
                options: true
            }
        })
    },

    /**
     * Busca próxima ordem para nova coluna
     * @param {number} boardId
     * @returns {Promise<number>} Próxima ordem (ou 0 se primeira)
     */
    async findMaxOrder(boardId) {
        const result = await prisma.column.findFirst({
            where: { board_id: boardId },
            orderBy: { order: 'desc' },
            select: { order: true }
        })
        return result ? result.order + 1 : 0
    },

    /**
     * Cria nova coluna
     * @param {object} data - { board_id, name, data_type, formula_expression, options, order }
     * @returns {Promise<object>} Coluna criada
     */
    async create(data) {
        return prisma.column.create({ data })
    },

    /**
     * Atualiza coluna
     * @param {number} columnId
     * @param {object} data - { name, data_type, formula_expression, options }
     * @returns {Promise<object>} Coluna atualizada
     */
    async update(columnId, data) {
        return prisma.column.update({
            where: { id: columnId },
            data
        })
    },

    /**
     * Deleta coluna
     * @param {number} columnId
     * @returns {Promise<void>}
     */
    async delete(columnId) {
        return prisma.column.delete({
            where: { id: columnId }
        })
    },

    /**
     * Reordena colunas após exclusão (decrementa ordem)
     * @param {number} boardId
     * @param {number} fromOrder - ordem mínima (exclusive)
     * @returns {Promise<object>} { count }
     */
    async decrementOrderAfter(boardId, fromOrder) {
        return prisma.column.updateMany({
            where: {
                board_id: boardId,
                order: { gt: fromOrder }
            },
            data: { order: { decrement: 1 } }
        })
    },

    /**
     * Reordena colunas ao mover (para cima)
     * @param {number} boardId
     * @param {number} fromOrder
     * @param {number} toOrder
     * @returns {Promise<object>} { count }
     */
    async incrementOrderRange(boardId, fromOrder, toOrder) {
        return prisma.column.updateMany({
            where: {
                board_id: boardId,
                order: {
                    gte: toOrder,
                    lt: fromOrder
                }
            },
            data: { order: { increment: 1 } }
        })
    },

    /**
     * Reordena colunas ao mover (para baixo)
     * @param {number} boardId
     * @param {number} fromOrder
     * @param {number} toOrder
     * @returns {Promise<object>} { count }
     */
    async decrementOrderRange(boardId, fromOrder, toOrder) {
        return prisma.column.updateMany({
            where: {
                board_id: boardId,
                order: {
                    gt: fromOrder,
                    lte: toOrder
                }
            },
            data: { order: { decrement: 1 } }
        })
    },

    /**
     * Atualiza ordem da coluna
     * @param {number} columnId
     * @param {number} newOrder
     * @returns {Promise<object>} Coluna atualizada
     */
    async updateOrder(columnId, newOrder) {
        return prisma.column.update({
            where: { id: columnId },
            data: { order: newOrder }
        })
    },

    /**
     * Conta total de colunas no quadro
     * @param {number} boardId
     * @returns {Promise<number>}
     */
    async countByBoard(boardId) {
        return prisma.column.count({
            where: { board_id: boardId }
        })
    },

    /**
     * Deleta restrições antigas
     * @param {number} columnId
     * @returns {Promise<object>} { count }
     */
    async deleteRestrictions(columnId) {
        return prisma.columnRestriction.deleteMany({
            where: { column_id: columnId }
        })
    },

    /**
     * Cria restrições em batch
     * @param {array} restrictions - Array com { column_id, user_id, board_role, can_view, can_edit }
     * @returns {Promise<object>} { count }
     */
    async createRestrictions(restrictions) {
        return prisma.columnRestriction.createMany({
            data: restrictions
        })
    },

    /**
     * Busca restrições atualizadas de uma coluna
     * @param {number} columnId
     * @returns {Promise<array>} Restrições
     */
    async findRestrictions(columnId) {
        return prisma.columnRestriction.findMany({
            where: { column_id: columnId }
        })
    },

}

module.exports = ColumnRepository