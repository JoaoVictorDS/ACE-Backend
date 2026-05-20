const BaseRepository = require('./BaseRepository')

/**
 * Repositório de BoardMember
 * Gerencia todas as operações de membros de boards
 * Estende BaseRepository para herdar métodos comuns
 */
class BoardMemberRepository extends BaseRepository {
    /**
     * Construtor
     * Define o model como 'boardMember' para usar nas queries
     */
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
     * Busca membros com role específico em um board
     * @param {number} boardId - ID do board
     * @param {string} role - Role a filtrar
     * @returns {Promise<array>} Array de membros
     */
    async findByBoardAndRole(boardId, role) {
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
