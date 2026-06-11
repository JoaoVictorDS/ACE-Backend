const prisma = require('../../config/prisma')

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

    async findById(boardId) {
        return prisma.board.findUnique({
            where: { id: boardId }
        })
    },

    async update(boardId, data) {
        return prisma.board.update({
            where: { id: boardId },
            data
        })
    },

    async findBoardDeletionContext(boardId) {
        return prisma.board.findUnique({
            where: { id: boardId },
            select: {
                name: true,
                _count: { select: { columns: true, sections: true } }
            }
        })
    },

    async delete(boardId, tx = null) {
        const client = tx || prisma

        return client.board.delete({
            where: { id: boardId }
        })
    },

}

module.exports = BoardRepository