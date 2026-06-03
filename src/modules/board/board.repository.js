const { prisma } = require('../../config')

const BoardRepository = {

    async create(name, workspaceId, creatorId, order) {
        return prisma.board.create({
            data: {
                name,
                workspace_id: workspaceId,
                creator_id: creatorId,
                board_members: {
                    create: {
                        user_id: creatorId,
                        role: 'OWNER',
                        order
                    }
                }
            }
        })
    },

    async findByIdWithStructure(boardId, userId) {
        return prisma.board.findUnique({
            where: { id: boardId },
            include: {
                board_members: {
                    where: { user_id: userId }
                },
                columns: {
                    orderBy: [{ order: 'asc' }, { id: 'asc' }],
                    include: { restrictions: true }
                },
                sections: {
                    orderBy: [{ order: 'asc' }, { id: 'asc' }],
                    include: {
                        items: {
                            orderBy: [{ order: 'asc' }, { id: 'asc' }],
                            include: { item_values: true }
                        }
                    }
                },
            }
        })
    },

    async findPermissionContext(boardId) {
        return prisma.board.findUnique({
            where: { id: boardId },
            select: { id: true, workspace_id: true, creator_id: true }
        })
    },

    async findUserRoleInBoard(boardId, userId) {
        return prisma.boardMember.findUnique({
            where: { user_id_board_id: { user_id: userId, board_id: boardId } },
            select: { role: true },
        })
    },

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
    },

    async findById(boardId) {
        return prisma.board.findUnique({
            where: { id: boardId }
        })
    },

    async update(boardId, data) {
        return prisma.board.update({
            where: { id: boardId },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.color && { color: data.color }),
                ...(data.item_label_singular && { item_label_singular: data.item_label_singular }),
                ...(data.item_label_plural && { item_label_plural: data.item_label_plural }),
            }
        })
    },

}

module.exports = BoardRepository