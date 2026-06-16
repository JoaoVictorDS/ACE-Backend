const prisma = require('../../config/prisma')

const BoardMemberRepository = {

    /**
     * Busca todos os membros de um board com dados básicos do usuário
     * @param {number} boardId
     * @returns {Promise<array>}
     */
    async findByBoard(boardId) {
        return prisma.boardMember.findMany({
            where: { board_id: boardId },
            include: { user: { select: { id: true, name: true, email: true } } }
        })
    },

    /**
     * Verifica se um usuário é membro de um board
     * @param {number} userId
     * @param {number} boardId
     * @returns {Promise<boolean>}
     */
    async isBoardMember(userId, boardId) {
        const member = await prisma.boardMember.findUnique({
            where: { user_id_board_id: { board_id: boardId, user_id: userId } }
        })
        return !!member
    },

    /**
     * Conta membros privilegiados (OWNER e ADMIN) de um board
     * Usado para impedir remoção/rebaixamento do último privilegiado
     * @param {number} boardId
     * @param {object} tx - cliente de transação (opcional)
     * @returns {Promise<number>}
     */
    async countPrivilegedMembers(boardId, tx = null) {
        const client = tx || prisma

        return client.boardMember.count({
            where: {
                board_id: boardId,
                role: { in: ['OWNER', 'ADMIN'] }
            }
        })
    },

    /**
     * Decrementa a ordem dos boards após uma posição específica
     * Chamado após remoção de membro para manter a ordem contínua
     * @param {number} userId
     * @param {number} workspaceId
     * @param {number} order - posição de referência
     * @param {object} tx - cliente de transação (opcional)
     */
    async decrementOrderAfter(userId, workspaceId, order, tx = null) {
        const client = tx || prisma

        return client.boardMember.updateMany({
            where: {
                user_id: userId,
                board: { workspace_id: workspaceId },
                order: { gt: order }
            },
            data: { order: { decrement: 1 } }
        })
    },

    /**
     * Decrementa ordem dos boards_members após exclusão de um board
     * Mantém a sequência contínua após remoção
     * @param {number} boardId - board sendo removido
     * @param {number} workspaceId
     * @param {object} tx
     */
    async decrementOrderAfterBoardDeletion(boardId, workspaceId, tx = null) {
        const client = tx || prisma

        return client.$executeRaw`
        UPDATE "board_members" AS bm
        SET "order" = bm."order" - 1
        FROM "board_members" AS deleted_bm, "boards" AS b
        WHERE bm.user_id = deleted_bm.user_id
        AND deleted_bm.board_id = ${boardId}
        AND bm.board_id = b.id
        AND b.workspace_id = ${workspaceId}
        AND bm."order" > deleted_bm."order"
    `
    },

    /**
     * Remove um vínculo board-membro pelo ID do vínculo
     * @param {number} id - ID do boardMember
     * @param {object} tx - cliente de transação (opcional)
     */
    async removeById(id, tx = null) {
        const client = tx || prisma

        return client.boardMember.delete({ where: { id } })
    },

    async removeByUser(userId, tx = null) {
        const client = tx || prisma

        return client.boardMember.deleteMany({
            where: { user_id: userId }
        })
    },

    async removeByUserAndWorkspace(userId, workspaceId, tx = null) {
        const client = tx || prisma

        client.boardMember.deleteMany({
            where: {
                user_id: userId,
                board: { workspace_id: workspaceId }
            }
        })
    },

    /**
     * Busca o vínculo básico entre usuário e board sem includes
     * Usado para verificações de existência e leitura de role
     * @param {number} userId
     * @param {number} boardId
     * @returns {Promise<object|null>}
     */
    async findMembership(userId, boardId) {
        return prisma.boardMember.findUnique({
            where: { user_id_board_id: { user_id: userId, board_id: boardId } }
        })
    },

    async findMembershipsInWorkspace(userId, workspaceId) {
        return prisma.boardMember.findMany({
            where: {
                user_id: userId,
                board: { workspace_id: workspaceId }
            },
            include: {
                board: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                        creator_id: true,
                        workspace_id: true,
                    }
                }
            },
            orderBy: { order: 'asc' }
        })
    },

    /**
     * Busca o último board do usuário no workspace por ordem
     * Usado para calcular o nextOrder ao adicionar um novo membro
     * @param {number} userId
     * @param {number} workspaceId
     * @returns {Promise<{ order: number }|null>}
     */
    async findMaxOrderByWorkspace(userId, workspaceId) {
        const result = await prisma.boardMember.findFirst({
            where: {
                user_id: userId,
                board: { workspace_id: workspaceId }
            },
            orderBy: { order: 'desc' },
            select: { order: true }
        })

        return result ? result.order + 1 : 0
    },

    async findBoardsWhereUserIsPrivilegedMemberByWorkspace(userId, workspaceId, tx = null) {
        const client = tx || prisma

        return client.boardMember.findMany({
            where: {
                user_id: userId,
                role: { in: ['ADMIN', 'OWNER'] },
                board: { workspace_id: workspaceId }
            },
            include: { board: { include: { board_members: { where: { role: { in: ['ADMIN', 'OWNER'] } } } } } }
        })
    },

    /**
     * Cria ou atualiza o vínculo de um usuário com um board
     * Retorna o membro com dados do usuário para emissão via socket
     * @param {number} userId
     * @param {number} boardId
     * @param {string} role
     * @param {number} order
     * @returns {Promise<object>}
     */
    async upsertMember(userId, boardId, role, order) {
        return prisma.boardMember.upsert({
            where: { user_id_board_id: { user_id: userId, board_id: boardId } },
            update: { role },
            create: { user_id: userId, board_id: boardId, role, order },
            include: { user: { select: { id: true, name: true, email: true } } }
        })
    },

    /**
     * Busca o vínculo com dados do board e do usuário
     * Usado em remove e leave onde o nome do usuário e workspace são necessários
     * @param {number} boardId
     * @param {number} userId
     * @returns {Promise<object|null>}
     */
    async findMembershipWithBoardAndUser(boardId, userId) {
        return prisma.boardMember.findUnique({
            where: { user_id_board_id: { user_id: userId, board_id: boardId } },
            select: {
                id: true,
                user_id: true,
                role: true,
                order: true,
                board: { select: { workspace_id: true, id: true, creator_id: true } },
                user: { select: { name: true } }
            }
        })
    },

    /**
     * Busca o vínculo com dados do board
     * Usado em move onde apenas o workspace_id é necessário
     * @param {number} userId
     * @param {number} boardId
     * @returns {Promise<object|null>}
     */
    async findMembershipWithBoard(userId, boardId) {
        return prisma.boardMember.findUnique({
            where: { user_id_board_id: { user_id: userId, board_id: boardId } },
            select: {
                order: true,
                board: { select: { workspace_id: true } }
            }
        })
    },

    /**
     * Conta quantos boards um usuário possui em um workspace
     * Usado para calcular o maxOrder no move
     * @param {number} userId
     * @param {number} workspaceId
     * @returns {Promise<number>}
     */
    async countBoardsByUserInWorkspace(userId, workspaceId) {
        return prisma.boardMember.count({
            where: {
                user_id: userId,
                board: { workspace_id: workspaceId }
            }
        })
    },

    /**
     * Atualiza a ordem de membros em um intervalo de posições
     * Usado em move para deslocar os boards afetados pela reordenação
     * @param {number} userId
     * @param {number} workspaceId
     * @param {object} orderCondition - ex: { gt: 2, lte: 5 }
     * @param {'increment'|'decrement'} direction
     * @param {object} tx - cliente de transação (opcional)
     */
    async updateOrderInRange(userId, workspaceId, orderCondition, direction = 'increment', tx = null) {
        const client = tx || prisma

        return client.boardMember.updateMany({
            where: {
                user_id: userId,
                board: { workspace_id: workspaceId },
                order: orderCondition
            },
            data: { order: { [direction]: 1 } }
        })
    },

    /**
     * Atualiza a posição final do board do usuário após reordenação
     * Sempre chamado como última operação dentro da transação de move
     * @param {number} userId
     * @param {number} boardId
     * @param {number} newOrder
     * @param {object} tx - cliente de transação (opcional)
     */
    async updateMemberOrder(userId, boardId, newOrder, tx = null) {
        const client = tx || prisma

        return client.boardMember.update({
            where: { user_id_board_id: { user_id: userId, board_id: boardId } },
            data: { order: newOrder }
        })
    },

    /**
     * Busca membros de um board por Roles
     * @param {number} boardId
     * @param {array} roles
     */
    async findByBoardAndRoles(boardId, roles = []) {
        return prisma.boardMember.findMany({
            where: {
                board_id: boardId,
                role: { in: roles }
            }
        })
    },

    async findValidMemberIds(boardId, userIds, tx = null) {
        const client = tx || prisma

        return client.boardMember.findMany({
            where: {
                board_id: boardId,
                user_id: { in: userIds }
            },
            select: { user_id: true }
        })
    },

    /**
     * Busca usuários membros do quadro com IDs específicos
     * @param {number} boardId
     * @param {array} userIds
     * @returns {Promise<number>} Contagem de membros válidos
     */
    async countValidMembers(boardId, userIds) {
        return prisma.boardMember.count({
            where: { board_id: boardId, user_id: { in: userIds } }
        })
    },

    async findUserRoleInBoard(boardId, userId) {
        return prisma.boardMember.findUnique({
            where: { user_id_board_id: { user_id: userId, board_id: boardId } },
            select: { role: true },
        })
    },

}

module.exports = BoardMemberRepository