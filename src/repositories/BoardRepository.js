const BaseRepository = require('./BaseRepository')

/**
 * Repositório de Board
 * Gerencia todas as operações de banco de dados relacionadas a boards
 * Estende BaseRepository para herdar métodos comuns
 */
class BoardRepository extends BaseRepository {

    constructor() {
        super('board')
    }

    /**
    * Busca board por ID para verificar permissão
    * @param {number} boardId - ID do board
    * @returns {Promise<object>} Board ou null
    */
    async findPermissionContext(boardId) {
        return await this.findById(boardId, {
            select: { id: true, workspace_id: true, creator_id: true }
        })
    }

    /**
     * Busca boards de um usuário com paginação
     * @param {number} userId - ID do usuário
     * @param {number} page - Número da página (começa em 1)
     * @param {number} limit - Itens por página
     * @returns {Promise<object>} { data, total, page, totalPages }
     */
    async findByUserPaginated(userId, page = 1, limit = 20) {
        return await this.paginate(
            {
                members: {
                    some: { user_id: userId },
                },
            },
            page,
            limit,
            {
                include: {
                    members: {
                        select: {
                            user: { select: { id: true, name: true } },
                            role: true,
                        },
                    },
                    owner: {
                        select: { id: true, name: true },
                    },
                },
                orderBy: { created_at: 'desc' },
            }
        )
    }

    /**
     * Busca boards de um usuário sem paginação
     * @param {number} userId - ID do usuário
     * @returns {Promise<array>} Array de boards
     */
    async findByUser(userId) {
        return await this.findMany(
            {
                members: {
                    some: { user_id: userId },
                },
            },
            {
                include: {
                    members: {
                        select: {
                            user: { select: { id: true, name: true } },
                            role: true,
                        },
                    },
                    owner: {
                        select: { id: true, name: true },
                    },
                },
                orderBy: { created_at: 'desc' },
            }
        )
    }

    /**
     * Busca board por ID com detalhes completos
     * @param {number} boardId - ID do board
     * @returns {Promise<object>} Board ou null
     */
    async findByIdWithDetails(boardId) {
        return await this.findById(boardId, {
            include: {
                members: {
                    select: {
                        user: { select: { id: true, name: true, email: true } },
                        role: true,
                    },
                },
                owner: {
                    select: { id: true, name: true, email: true },
                },
                items: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        priority: true,
                    },
                },
            },
        })
    }

    /**
     * Busca boards criados por um usuário
     * @param {number} userId - ID do usuário
     * @returns {Promise<array>} Array de boards
     */
    async findByOwner(userId) {
        return await this.findMany(
            { owner_id: userId },
            {
                include: {
                    members: {
                        select: {
                            user: { select: { id: true, name: true } },
                            role: true,
                        },
                    },
                },
                orderBy: { created_at: 'desc' },
            }
        )
    }

    /**
     * Busca boards onde o usuário é admin ou owner
     * @param {number} userId - ID do usuário
     * @returns {Promise<array>} Array de boards
     */
    async findByUserAsAdmin(userId) {
        return await this.findMany(
            {
                OR: [
                    { owner_id: userId },
                    {
                        members: {
                            some: { user_id: userId, role: 'ADMIN' },
                        },
                    },
                ],
            },
            {
                include: {
                    members: {
                        select: {
                            user: { select: { id: true, name: true } },
                            role: true,
                        },
                    },
                    owner: {
                        select: { id: true, name: true },
                    },
                },
                orderBy: { created_at: 'desc' },
            }
        )
    }

    /**
     * Busca role de um usuário em um board
     * @param {number} boardId - ID do board
     * @param {number} userId - ID do usuário
     * @returns {Promise<object>} { role } ou null
     */
    async findUserRoleInBoard(boardId, userId) {
        return await this.prisma.boardMember.findUnique({
            where: {
                user_id_board_id: { user_id: userId, board_id: boardId },
            },
            select: { role: true },
        })
    }

    /**
     * Verifica se usuário é membro do board
     * @param {number} boardId - ID do board
     * @param {number} userId - ID do usuário
     * @returns {Promise<boolean>} true se é membro, false caso contrário
     */
    async isUserMember(boardId, userId) {
        const member = await this.prisma.boardMember.findUnique({
            where: {
                user_id_board_id: { user_id: userId, board_id: boardId },
            },
        })

        return !!member
    }

    /**
     * Verifica se usuário é owner do board
     * @param {number} boardId - ID do board
     * @param {number} userId - ID do usuário
     * @returns {Promise<boolean>} true se é owner, false caso contrário
     */
    async isUserOwner(boardId, userId) {
        const board = await this.findById(boardId, {
            select: { owner_id: true },
        })

        return board?.owner_id === userId
    }

    /**
     * Conta members de um board
     * @param {number} boardId - ID do board
     * @returns {Promise<number>} Total de membros
     */
    async countMembers(boardId) {
        return await this.prisma.boardMember.count({
            where: { board_id: boardId },
        })
    }

    /**
     * Conta items de um board
     * @param {number} boardId - ID do board
     * @returns {Promise<number>} Total de itens
     */
    async countItems(boardId) {
        return await this.prisma.item.count({
            where: { board_id: boardId },
        })
    }

    /**
     * Busca boards público/privado
     * @param {boolean} isPublic - Se é público
     * @param {number} limit - Limite de resultados
     * @returns {Promise<array>} Array de boards
     */
    async findByVisibility(isPublic, limit = 10) {
        return await this.findMany(
            { is_public: isPublic },
            {
                include: {
                    owner: {
                        select: { id: true, name: true },
                    },
                },
                orderBy: { created_at: 'desc' },
                take: limit,
            }
        )
    }

    /**
     * Atualiza visibilidade de um board
     * @param {number} boardId - ID do board
     * @param {boolean} isPublic - Nova visibilidade
     * @returns {Promise<object>} Board atualizado
     */
    async updateVisibility(boardId, isPublic) {
        return await this.update(boardId, {
            is_public: isPublic,
        })
    }

    /**
     * Busca boards ativos (não deletados)
     * @param {number} limit - Limite de resultados
     * @returns {Promise<array>} Array de boards
     */
    async findActive(limit = 20) {
        return await this.findMany(
            {},
            {
                include: {
                    owner: {
                        select: { id: true, name: true },
                    },
                },
                orderBy: { created_at: 'desc' },
                take: limit,
            }
        )
    }
}

module.exports = BoardRepository