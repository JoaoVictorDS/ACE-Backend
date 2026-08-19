const prisma = require('../../config/prisma')

const WorkspaceMemberRepository = {

    async upsertMember(userId, workspaceId, role, order) {
        return prisma.workspaceMember.upsert({
            where: { user_id_workspace_id: { user_id: userId, workspace_id: workspaceId } },
            update: { role },
            create: {
                user_id: userId,
                workspace_id: workspaceId,
                role,
                order
            },
            include: { user: { select: { id: true, name: true, email: true } } }
        })
    },

    async isWorkspaceMember(userId, workspaceId) {
        const member = await prisma.workspaceMember.findFirst({
            where: {
                user_id: userId,
                workspace_id: workspaceId,
                user: { is_active: true },
                workspace: { deleted_at: null }
            }
        })
        return !!member
    },

    async removeByUser(userId, tx = null) {
        const client = tx || prisma

        return client.workspaceMember.deleteMany({
            where: { user_id: userId }
        })
    },

    async removeById(id, tx = null) {
        const client = tx || prisma

        return client.workspaceMember.delete({
            where: { id }
        })
    },

    async findByWorkspace(workspaceId) {
        return prisma.workspaceMember.findMany({
            where: { workspace_id: workspaceId },
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { role: 'asc' }
        })
    },

    async findMembershipWithUserAndWorkspace(userId, workspaceId) {
        return prisma.workspaceMember.findUnique({
            where: { user_id_workspace_id: { user_id: userId, workspace_id: workspaceId } },
            select: {
                id: true,
                workspace_id: true,
                user_id: true,
                role: true,
                order: true,
                workspace: { select: { id: true, name: true } },
                user: { select: { id: true, name: true } }
            }
        })
    },

    async findMembership(userId, workspaceId) {
        return prisma.workspaceMember.findUnique({
            where: {
                user_id_workspace_id: { user_id: userId, workspace_id: workspaceId },
                workspace: { deleted_at: null }
            },
            include: { user: { select: { id: true, name: true, email: true } } }
        })
    },

    async findMemberships(userId) {
        return prisma.workspaceMember.findMany({
            where: {
                user_id: userId,
                workspace: { deleted_at: null }
            },
            include: {
                workspace: {
                    select: {
                        id: true,
                        name: true,
                        creator_id: true
                    }
                }
            },
            orderBy: { order: 'asc' }
        })
    },

    async findMaxOrder(userId) {
        const result = await prisma.workspaceMember.findFirst({
            where: {
                user_id: userId,
                workspace: { deleted_at: null }
            },
            orderBy: { 'order': 'desc' },
            select: { order: true }
        })

        return result ? result.order + 1 : 0
    },

    async findByWorkspaceAndRoles(workspaceId, roles = []) {
        return prisma.workspaceMember.findMany({
            where: {
                workspace_id: workspaceId,
                role: { in: roles }
            }
        })
    },

    async decrementOrderAfterWorkspaceDeletion(workspaceId, tx = null) {
        const client = tx || prisma

        return client.$executeRaw`
                UPDATE "workspace_members" AS wm
                SET "order" = wm."order" - 1
                FROM "workspace_members" AS deleted_wm
                WHERE wm.user_id = deleted_wm.user_id
                AND deleted_wm.workspace_id = ${workspaceId}
                AND wm."order" > deleted_wm."order"
        `
    },

    async decrementOrderAfter(userId, order, tx = null) {
        const client = tx || prisma

        return client.workspaceMember.updateMany({
            where: {
                user_id: userId,
                order: { gt: order }
            },
            data: { order: { decrement: 1 } }
        })
    },

    async countPrivilegedMembers(workspaceId, tx = null) {
        const client = tx || prisma

        return client.workspaceMember.count({
            where: {
                workspace_id: workspaceId,
                role: { in: ['ADMIN', 'OWNER'] }
            }
        })
    },

    async countWorkspaceByUser(userId) {
        return prisma.workspaceMember.count({
            where: {
                user_id: userId,
                workspace: { deleted_at: null }
            }
        })
    },

    async updateOrderInRange(userId, orderCondition, direction = 'increment', tx = null) {
        const client = tx || prisma

        return client.workspaceMember.updateMany({
            where: {
                user_id: userId,
                order: orderCondition
            },
            data: { order: { [direction]: 1 } }
        })
    },

    async updateMemberOrder(userId, workspaceId, newOrder, tx = null) {
        const client = tx || prisma

        return client.workspaceMember.update({
            where: { user_id_workspace_id: { user_id: userId, workspace_id: workspaceId } },
            data: { order: newOrder }
        })
    },

}

module.exports = WorkspaceMemberRepository