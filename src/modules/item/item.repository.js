const ItemRepository = {

    /**
    * Busca item por ID para verificar permissão
    * @param {number} itemId - ID do item
    * @returns {Promise<object>} Item ou null
    */
    async findPermissionContext(itemId) {
        return await this.findById(itemId, {
            select: {
                section: { select: { board_id: true, board: { select: { workspace_id: true, creator_id: true } } } }
            }
        })
    },

    /**
     * Busca itens de um board com paginação
     * @param {number} boardId - ID do board
     * @param {number} page - Número da página (começa em 1)
     * @param {number} limit - Itens por página
     * @returns {Promise<object>} { data, total, page, totalPages }
     */
    async findByBoardPaginated(boardId, page = 1, limit = 20) {
        return await this.paginate(
            { board_id: boardId },
            page,
            limit,
            {
                include: {
                    assignees: {
                        select: { user: { select: { id: true, name: true } } },
                    },
                    created_by_user: {
                        select: { id: true, name: true },
                    },
                },
                orderBy: { created_at: 'desc' },
            }
        )
    },

    /**
     * Busca itens de um board sem paginação
     * @param {number} boardId - ID do board
     * @returns {Promise<array>} Array de itens
     */
    async findByBoard(boardId) {
        return await this.findMany(
            { board_id: boardId },
            {
                include: {
                    assignees: {
                        select: { user: { select: { id: true, name: true } } },
                    },
                    created_by_user: {
                        select: { id: true, name: true },
                    },
                },
                orderBy: { created_at: 'asc' },
            }
        )
    },

    /**
     * Busca item por ID com detalhes completos
     * @param {number} itemId - ID do item
     * @returns {Promise<object>} Item ou null
     */
    async findByIdWithDetails(itemId) {
        return await this.findById(itemId, {
            include: {
                assignees: {
                    select: {
                        user: { select: { id: true, name: true, email: true } },
                    },
                },
                created_by_user: {
                    select: { id: true, name: true },
                },
                board: {
                    select: { id: true, title: true },
                },
            },
        })
    },

    /**
     * Busca itens atribuídos a um usuário
     * @param {number} userId - ID do usuário
     * @param {number} limit - Limite de resultados
     * @returns {Promise<array>} Array de itens
     */
    async findByAssignee(userId, limit = 20) {
        return await this.findMany(
            {},
            {
                where: {
                    assignees: {
                        some: { user_id: userId },
                    },
                },
                include: {
                    assignees: {
                        select: { user: { select: { id: true, name: true } } },
                    },
                    created_by_user: {
                        select: { id: true, name: true },
                    },
                    board: {
                        select: { id: true, title: true },
                    },
                },
                orderBy: { created_at: 'desc' },
                take: limit,
            }
        )
    },

    /**
     * Busca itens criados por um usuário
     * @param {number} userId - ID do usuário
     * @param {number} limit - Limite de resultados
     * @returns {Promise<array>} Array de itens
     */
    async findByCreator(userId, limit = 20) {
        return await this.findMany(
            { created_by: userId },
            {
                include: {
                    assignees: {
                        select: { user: { select: { id: true, name: true } } },
                    },
                    created_by_user: {
                        select: { id: true, name: true },
                    },
                },
                orderBy: { created_at: 'desc' },
                take: limit,
            }
        )
    },

    /**
     * Atualiza status de um item
     * @param {number} itemId - ID do item
     * @param {string} status - Novo status
     * @returns {Promise<object>} Item atualizado
     */
    async updateStatus(itemId, status) {
        return await this.update(itemId, {
            status,
            updated_at: new Date(),
        })
    },

    /**
     * Atualiza prioridade de um item
     * @param {number} itemId - ID do item
     * @param {string} priority - Nova prioridade
     * @returns {Promise<object>} Item atualizado
     */
    async updatePriority(itemId, priority) {
        return await this.update(itemId, {
            priority,
            updated_at: new Date(),
        })
    },

    /**
     * Busca itens por status
     * @param {number} boardId - ID do board
     * @param {string} status - Status a buscar
     * @returns {Promise<array>} Array de itens
     */
    async findByStatus(boardId, status) {
        return await this.findMany(
            { board_id: boardId, status },
            {
                include: {
                    assignees: {
                        select: { user: { select: { id: true, name: true } } },
                    },
                },
                orderBy: { created_at: 'asc' },
            }
        )
    },

    /**
     * Busca itens por prioridade
     * @param {number} boardId - ID do board
     * @param {string} priority - Prioridade a buscar
     * @returns {Promise<array>} Array de itens
     */
    async findByPriority(boardId, priority) {
        return await this.findMany(
            { board_id: boardId, priority },
            {
                include: {
                    assignees: {
                        select: { user: { select: { id: true, name: true } } },
                    },
                },
                orderBy: { created_at: 'asc' },
            }
        )
    },

    /**
     * Conta itens de um board
     * @param {number} boardId - ID do board
     * @returns {Promise<number>} Total de itens
     */
    async countByBoard(boardId) {
        return await this.count({ board_id: boardId })
    },

    /**
     * Conta itens por status em um board
     * @param {number} boardId - ID do board
     * @returns {Promise<object>} { status: count, ... }
     */
    async countByStatus(boardId) {
        const items = await this.findMany(
            { board_id: boardId },
            {
                select: { status: true },
            }
        )

        return items.reduce((acc, item) => {
            acc[item.status] = (acc[item.status] || 0) + 1
            return acc
        }, {})
    }
}

module.exports = ItemRepository