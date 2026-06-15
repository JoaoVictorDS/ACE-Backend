const prisma = require('../../config/prisma')

const WorkspaceMemberRepository = {

    async isWorkspaceMember(userId, workspaceId) {
        const member = await prisma.workspaceMember.findUnique({
            where: { user_id_workspace_id: { user_id: userId, workspace_id: workspaceId } }
        })
        return !!member
    },

    async removeByUserId(userId, tx = null) {
        const client = tx || prisma

        return client.workspaceMember.deleteMany({
            where: { user_id: userId }
        })
    },

    async findMaxOrder(userId) {
        const result = await prisma.workspaceMember.findFirst({
            where: { user_id: userId },
            orderBy: { 'order': 'desc' },
            select: { order: true }
        })

        return result ? result.order + 1 : 0
    },

    async findMemberships(userId) {
        return prisma.workspaceMember.findMany({
            where: { user_id: userId },
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
    }
}

module.exports = WorkspaceMemberRepository