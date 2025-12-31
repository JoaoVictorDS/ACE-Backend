const prisma = require('../config/prisma')

const PermissionService = {

    async getRole(boardId, userId) {
        if (!boardId || !userId) return null

        const board = await prisma.board.findUnique({
            where: { id: boardId },
            select: {
                owner_id: true,
                board_members: {
                    where: { user_id: userId },
                    select: { role: true }
                }
            }
        })

        if (!board) throw new Error('Quadro não encontrado!')

        if (board.owner_id === userId) return 'OWNER'

        const member = board.board_members[0]

        return member ? member.role : null
    },

    async checkViewPermission(boardId, userId) {
        const role = await this.getRole(boardId, userId)

        if (!role) throw new Error('Você não tem permissão para visualizar este quadro!')

        return role
    },

    async checkEditPermission(boardId, userId) {
        const role = await this.getRole(boardId, userId)

        if (role === 'OWNER' || role === 'EDITOR') return role

        throw new Error('Você não tem permissão para editar ou modificar este quadro!')
    },

    async checkOwnerPermission(boardId, userId) {
        const role = await this.getRole(boardId, userId)

        if (role === 'OWNER') return role

        throw new Error('Você não tem permissão de proprietário para realizar esta ação!')
    }

}

module.exports = PermissionService