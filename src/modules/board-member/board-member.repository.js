const prisma = require('../../config/prisma')

const BoardMemberRepository = {

    async findByBoard(boardId) {
        return prisma.boardMember.findMany({
            where: {
                board_id: boardId,
                board: { deleted_at: null }
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { order: 'desc' }
        })
    },

    async countPrivilegedMembers(boardId, tx = null) {
        const client = tx || prisma

        return client.boardMember.count({
            where: {
                board_id: boardId,
                board: { deleted_at: null },
                role: { in: ['OWNER', 'ADMIN'] }
            }
        })
    },

    async decrementOrderAfter(userId, workspaceId, order, tx = null) {
        const client = tx || prisma

        return client.boardMember.updateMany({
            where: {
                user_id: userId,
                board: {
                    workspace_id: workspaceId
                },
                order: { gt: order }
            },
            data: { order: { decrement: 1 } }
        })
    },

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

    async removeById(id, tx = null) {
        const client = tx || prisma

        return client.boardMember.delete({
            where: { id }
        })
    },

    async removeByUser(userId, tx = null) {
        const client = tx || prisma

        return client.boardMember.deleteMany({
            where: { user_id: userId }
        })
    },

    async removeByUserAndWorkspace(userId, workspaceId, tx = null) {
        const client = tx || prisma

        return client.boardMember.deleteMany({
            where: {
                user_id: userId,
                board: { workspace_id: workspaceId }
            }
        })
    },

    async findMembership(userId, boardId) {
        return prisma.boardMember.findUnique({
            where: {
                user_id_board_id: { user_id: userId, board_id: boardId },
                board: { deleted_at: null }
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                }
            }
        })
    },

    async findMembershipsInWorkspace(userId, workspaceId) {
        return prisma.boardMember.findMany({
            where: {
                user_id: userId,
                board: {
                    workspace_id: workspaceId,
                    deleted_at: null
                },
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

    async findMaxOrderByWorkspace(userId, workspaceId) {
        const result = await prisma.boardMember.findFirst({
            where: {
                user_id: userId,
                board: {
                    workspace_id: workspaceId,
                    deleted_at: null
                }
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
                board: {
                    workspace_id: workspaceId,
                    deleted_at: null
                }
            },
            include: {
                board: {
                    include: {
                        board_members: {
                            where: { role: { in: ['ADMIN', 'OWNER'] } }
                        }
                    }
                }
            }
        })
    },

    async upsertMember(userId, boardId, role, order) {
        return prisma.boardMember.upsert({
            where: { user_id_board_id: { user_id: userId, board_id: boardId } },
            update: { role },
            create: { user_id: userId, board_id: boardId, role, order },
            include: {
                user: { select: { id: true, name: true, email: true } }
            }
        })
    },

    async findMembershipWithBoardAndUser(boardId, userId) {
        return prisma.boardMember.findUnique({
            where: {
                user_id_board_id: { user_id: userId, board_id: boardId },
                board: { deleted_at: null }
            },
            select: {
                id: true,
                board_id: true,
                user_id: true,
                role: true,
                order: true,
                board: { select: { id: true, name: true, workspace_id: true, creator_id: true } },
                user: { select: { id: true, name: true, email: true } }
            }
        })
    },

    async findMembershipWithBoard(userId, boardId) {
        return prisma.boardMember.findUnique({
            where: {
                user_id_board_id: { user_id: userId, board_id: boardId },
                board: { deleted_at: null }
            },
            include: { board: { select: { workspace_id: true } } }
        })
    },

    async countBoardsByUserInWorkspace(userId, workspaceId) {
        return prisma.boardMember.count({
            where: {
                user_id: userId,
                board: {
                    workspace_id: workspaceId,
                    deleted_at: null
                }
            }
        })
    },

    async updateOrderInRange(userId, workspaceId, orderCondition, direction = 'increment', tx = null) {
        const client = tx || prisma

        return client.boardMember.updateMany({
            where: {
                user_id: userId,
                board: {
                    workspace_id: workspaceId
                },
                order: orderCondition
            },
            data: { order: { [direction]: 1 } }
        })
    },

    async updateMemberOrder(userId, boardId, newOrder, tx = null) {
        const client = tx || prisma

        return client.boardMember.update({
            where: {
                user_id_board_id: { user_id: userId, board_id: boardId }
            },
            data: { order: newOrder }
        })
    },

    async findByBoardAndRoles(boardId, roles = []) {
        return prisma.boardMember.findMany({
            where: {
                board_id: boardId,
                board: { deleted_at: null },
                role: { in: roles }
            }
        })
    },

    async findValidMemberIds(boardId, userIds, tx = null) {
        const client = tx || prisma

        return client.boardMember.findMany({
            where: {
                board_id: boardId,
                board: { deleted_at: null },
                user_id: { in: userIds },
                user: { is_active: true }
            },
            select: { user_id: true, role: true, user: { select: { id: true, role: true } } }
        })
    },

    async countValidMembers(boardId, userIds) {
        return prisma.boardMember.count({
            where: {
                board_id: boardId,
                board: { deleted_at: null },
                user_id: { in: userIds },
                user: { is_active: true }
            }
        })
    },

    async findUserRoleInBoard(boardId, userId) {
        return prisma.boardMember.findUnique({
            where: {
                user_id_board_id: { user_id: userId, board_id: boardId }
            },
            select: { role: true },
        })
    },

}

module.exports = BoardMemberRepository