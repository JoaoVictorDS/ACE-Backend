const prisma = require('../../config/prisma')

const BoardRepository = {

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
    },

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
    },

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
    },

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
    },

    async isUserMember(boardId, userId) {
        const member = await this.prisma.boardMember.findUnique({
            where: {
                user_id_board_id: { user_id: userId, board_id: boardId },
            },
        })

        return !!member
    },

    async isUserOwner(boardId, userId) {
        const board = await this.findById(boardId, {
            select: { owner_id: true },
        })

        return board?.owner_id === userId
    },

    async countMembers(boardId) {
        return await this.prisma.boardMember.count({
            where: { board_id: boardId },
        })
    },

    async countItems(boardId) {
        return await this.prisma.item.count({
            where: { board_id: boardId },
        })
    },

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
    },

    async updateVisibility(boardId, isPublic) {
        return await this.update(boardId, {
            is_public: isPublic,
        })
    },

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