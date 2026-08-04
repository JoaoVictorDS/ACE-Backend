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
            where: { id: boardId, deleted_at: null },
            include: {
                board_members: {
                    where: { user_id: userId }
                },
                columns: {
                    where: { deleted_at: null },
                    orderBy: [{ order: 'asc' }, { id: 'asc' }],
                    include: { restrictions: true }
                },
                sections: {
                    where: { deleted_at: null },
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
            where: { id: boardId, deleted_at: null },
            select: { id: true, workspace_id: true, creator_id: true }
        })
    },

    async findById(boardId) {
        return prisma.board.findUnique({
            where: { id: boardId, deleted_at: null }
        })
    },

    async findBoardName(boardId) {
        return prisma.board.findUnique({
            where: { id: boardId, deleted_at: null },
            select: { name: true }
        })
    },

    async update(boardId, data) {
        return prisma.board.update({
            where: { id: boardId, deleted_at: null },
            data
        })
    },

    async findBoardDeletionContext(boardId) {
        return prisma.board.findUnique({
            where: { id: boardId, deleted_at: null },
            select: {
                name: true,
                color: true,
                creator_id: true,
                workspace_id: true,
                item_label_singular: true,
                item_label_plural: true,
                _count: { select: { columns: true, sections: true } }
            }
        })
    },

    async softDelete(boardId, tx = null) {
        const client = tx || prisma

        return client.board.update({
            where: { id: boardId },
            data: { deleted_at: new Date() }
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