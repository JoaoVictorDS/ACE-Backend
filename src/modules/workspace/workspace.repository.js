const prisma = require('../../config/prisma')

const WorkspaceRepository = {

    async findPermissionContext(workspaceId, userId) {
        return prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: {
                id: true,
                creator_id: true,
                workspace_members: {
                    where: { user_id: userId },
                    select: { role: true }
                }
            }
        })
    },

    async create(userId, name, order) {
        return prisma.workspace.create({
            data: {
                name,
                creator_id: userId,
                workspace_members: {
                    create: {
                        user_id: userId,
                        role: 'OWNER',
                        order
                    }
                }
            }
        })
    },

    async findById(workspaceId) {
        return prisma.workspace.findUnique({
            where: { id: workspaceId }
        })
    },

    async update(workspaceId, data) {
        return prisma.workspace.update({
            where: { id: workspaceId },
            data
        })
    },

    async findWorkspaceDeletionContext(workspaceId) {
        return prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: {
                id: true,
                creator_id: true,
                name: true,
                description: true,
                icon: true,
                _count: { select: { boards: true, workspace_members: true } }
            }
        })
    },

    async findWorkspaceName(workspaceId) {
        return prisma.workspace.findUnique({
            where: { id: workspaceId, deleted_at: null },
            select: { id: true, name: true }
        })
    },

    async delete(workspaceId, tx = null) {
        const client = tx || prisma

        return client.workspace.delete({
            where: { id: workspaceId }
        })
    },


}

module.exports = WorkspaceRepository