const prisma = require('../../config/prisma')

const WorkspaceRepository = {

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

    async findWorkspaceName(workspaceId) {
        return prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { id: true, name: true }
        })
    },

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

    async findWorkspaceDeletionContext(workspaceId) {
        return prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: {
                id: true,
                creator_id: true,
                name: true,
                description: true,
                icon: true,
                _count: {
                    select: {
                        boards: { where: { deleted_at: null } },
                        workspace_members: true
                    }
                }
            }
        })
    },

    async update(workspaceId, data) {
        return prisma.workspace.update({
            where: { id: workspaceId },
            data
        })
    },

    async softDelete(workspaceId, tx = null) {
        const client = tx || prisma

        return client.workspace.update({
            where: { id: workspaceId },
            data: { deleted_at: new Date() }
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