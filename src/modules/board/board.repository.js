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
                    where: { deleted_at: null },
                    orderBy: [{ order: 'asc' }, { id: 'asc' }],
                    include: { restrictions: true }
                },
                sections: {
                    where: { deleted_at: null },
                    orderBy: [{ order: 'asc' }, { id: 'asc' }],
                    include: {
                        items: {
                            where: { deleted_at: null },
                            orderBy: [{ order: 'asc' }, { id: 'asc' }],
                            include: {
                                item_values: {
                                    where: { column: { deleted_at: null } }
                                }
                            }
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

    async findBoardName(boardId) {
        return prisma.board.findUnique({
            where: { id: boardId },
            select: { name: true }
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
                color: true,
                creator_id: true,
                workspace_id: true,
                item_label_singular: true,
                item_label_plural: true,
                _count: {
                    select: {
                        columns: { where: { deleted_at: null } },
                        sections: { where: { deleted_at: null } }
                    }
                }
            }
        })
    },

    async findBoardIdsByWorkspaces(workspaceIds, tx = null) {
        const client = tx || prisma

        return client.board.findMany({
            where: { workspace_id: { in: workspaceIds } },
            select: { id: true }
        })
    },

    async softDelete(boardId, tx = null) {
        const client = tx || prisma

        return client.board.update({
            where: { id: boardId },
            data: { deleted_at: new Date() }
        })
    },

    async softDeleteByWorkspaces(workspaceIds, timestamp, tx = null) {
        const client = tx || prisma

        return client.board.updateMany({
            where: {
                workspace_id: { in: workspaceIds },
                deleted_at: null
            },
            data: { deleted_at: timestamp }
        })
    },

    async restore(boardId, tx = null) {
        const client = tx || prisma

        return client.board.update({
            where: { id: boardId },
            data: { deleted_at: null }
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