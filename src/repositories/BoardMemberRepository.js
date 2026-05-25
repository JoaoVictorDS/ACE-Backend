const BaseRepository = require('./BaseRepository')

/**
 * Repositório de BoardMember
 * Gerencia todas as operações de membros de boards
 */
class BoardMemberRepository extends BaseRepository {

    constructor() {
        super('boardMember')
    }

    /**
     * Busca todos os membros de um board
     * @param {number} boardId - ID do board
     * @returns {Promise<array>} Array de membros
     */
    async findByBoard(boardId) {
        return await this.findMany(
            { board_id: boardId },
            {
                include: {
                    user: {
                        select: { id: true, name: true, email: true },
                    },
                    orderBy: { role: 'asc' }
                },
            }
        )
    }

    /**
     * Busca membro específico do board
     * @param {number} boardId - ID do board
     * @param {number} userId - ID do usuário
     * @returns {Promise<object>} Membro ou null
     */
    async findByBoardAndUser(boardId, userId) {
        return await this.findOne({
            board_id: boardId,
            user_id: userId,
        })
    }

    /**
     * Busca todos os boards de um usuário
     * @param {number} userId - ID do usuário
     * @returns {Promise<array>} Array de boards
     */
    async findBoardsByUser(userId) {
        return await this.findMany(
            { user_id: userId },
            {
                include: {
                    board: {
                        select: { id: true, title: true, description: true },
                    },
                },
            }
        )
    }

    /**
    * Busca membro com todos os dados necessários para remoção
    */
    async findMembershipForRemoval(boardId, userId, tx = null) {
        return await this.findUnique(
            {
                user_id_board_id: {
                    user_id: userId,
                    board_id: boardId
                }
            },
            {
                select: {
                    id: true,
                    user_id: true,
                    role: true,
                    order: true,
                    board: {
                        select: {
                            workspace_id: true,
                            id: true,
                            creator_id: true
                        }
                    },
                    user: { select: { name: true } }
                }
            },
            tx
        )
    }

    async findMembershipForMove(userId, boardId, tx = null) {
        return await this.findUnique(
            {
                user_id_board_id: {
                    user_id: userId,
                    board_id: boardId
                }
            },
            {
                include: { board: { select: { workspace_id: true } } }
            },
            tx
        )
    }

    /**
     * Adiciona um membro ao board
     * @param {number} boardId - ID do board
     * @param {number} userId - ID do usuário
     * @param {string} role - Role do membro (MEMBER, ADMIN)
     * @returns {Promise<object>} Membro criado
     */
    async addMember(boardId, userId, role = 'MEMBER') {
        return await this.create({
            board_id: boardId,
            user_id: userId,
            role,
        })
    }

    /**
     * Remove um membro do board
     * @param {number} boardId - ID do board
     * @param {number} userId - ID do usuário
     * @returns {Promise<object>} Membro deletado
     */
    async removeMember(boardId, userId) {
        return await this.prisma.boardMember.delete({
            where: {
                user_id_board_id: { user_id: userId, board_id: boardId },
            },
        })
    }

    /**
     * Atualiza role de um membro
     * @param {number} boardId - ID do board
     * @param {number} userId - ID do usuário
     * @param {string} newRole - Novo role
     * @returns {Promise<object>} Membro atualizado
     */
    async updateRole(boardId, userId, newRole) {
        return await this.prisma.boardMember.update({
            where: {
                user_id_board_id: { user_id: userId, board_id: boardId },
            },
            data: { role: newRole },
        })
    }

    /**
     * Conta membros de um board
     * @param {number} boardId - ID do board
     * @returns {Promise<number>} Total de membros
     */
    async countByBoard(boardId) {
        return await this.count({ board_id: boardId })
    }

    /**
     * Conta membros privilegiados de um board
     * @param {number} boardId - ID do board
     * @param {object} tx - Cliente de transação (opcional)
     * @returns {Promise<number>} Total de membros privilegiados
     */
    async countPrivilegedMembers(boardId, tx) {
        return await this.count({
            board_id: boardId,
            role: { in: ['ADMIN', 'OWNER'] }
        }, tx)
    }

    async upsertMember(userId, boardId, role, order = 0, tx = null) {
        return await this.upsert(
            {
                user_id_board_id: {
                    user_id: userId,
                    board_id: boardId
                }
            },
            {
                user_id: userId,
                board_id: boardId,
                role,
                order
            },
            { role },
            {
                include: {
                    user: { select: { id: true, name: true, email: true } }
                }
            },
            tx
        )
    }

    async findLastMemberInWorkspace(userId, workspaceId, tx = null) {
        return await this.findOne(
            {
                user_id: userId,
                board: { workspace_id: workspaceId }
            },
            {
                orderBy: { order: 'desc' },
                select: { order: true }
            },
            tx
        )
    }

    async decrementOrderAfter(userId, workspaceId, order, tx = null) {
        return await this.updateMany(
            {
                user_id: userId,
                board: { workspace_id: workspaceId },
                order: { gt: order }
            },
            { order: { decrement: 1 } },
            tx
        )
    }

    async removeById(id, tx = null) {
        return await this.delete(id, tx)
    }

    async removeByUserAndBoard(userId, boardId, tx = null) {
        return await this.deleteByUnique(
            {
                user_id_board_id: {
                    user_id: userId,
                    board_id: boardId
                }
            },
            tx
        )
    }

    /**
     * Atualiza ordem em range (para movimento)
     * @param {number} userId - ID do usuário
     * @param {number} workspaceId - ID do workspace
     * @param {object} orderCondition - Condição de where (ex: { gt: 5, lte: 10 })
     * @param {boolean} increment - true para incrementar, false para decrementar
     * @param {object} tx - Transação opcional
     */
    async updateOrderInRange(userId, workspaceId, orderCondition, increment = true, tx = null) {
        return await this.updateMany(
            {
                user_id: userId,
                board: { workspace_id: workspaceId },
                order: orderCondition
            },
            {
                order: increment ? { increment: 1 } : { decrement: 1 }
            },
            tx
        )
    }

    async updateMemberOrder(userId, boardId, newOrder, tx = null) {
        return await this.updateByUnique(
            {
                user_id_board_id: {
                    user_id: userId,
                    board_id: boardId
                }
            },
            { order: newOrder },
            {},
            tx
        )
    }

    /**
     * Busca membros com role específico em um board
     * @param {number} boardId - ID do board
     * @param {string} role - Role a filtrar
     * @returns {Promise<array>} Array de membros
     */
    async findByBoardAndRole(boardId, role, tx) {
        return await this.findMany(
            { board_id: boardId, role },
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
     * Verifica se usuário é admin em um board
     * @param {number} boardId - ID do board
     * @param {number} userId - ID do usuário
     * @returns {Promise<boolean>} true se é admin, false caso contrário
     */
    async isUserAdmin(boardId, userId) {
        const member = await this.findOne(
            { board_id: boardId, user_id: userId }
        )
        return member?.role === 'ADMIN'
    }

    /**
     * Remove todos os membros de um board
     * @param {number} boardId - ID do board
     * @returns {Promise<object>} Resultado da deleção
     */
    async removeAllFromBoard(boardId) {
        return await this.prisma.boardMember.deleteMany({
            where: { board_id: boardId },
        })
    }
}

module.exports = BoardMemberRepository
