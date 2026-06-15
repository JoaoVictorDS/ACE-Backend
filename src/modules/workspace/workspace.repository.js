const prisma = require('../../config/prisma')

const WorkspaceRepository = {
    /**
    * Busca workspace por ID para verificar permissão
    * @param {number} workspaceId - ID do workspace
    * @param {number} userId - ID do usuário
    * @returns {Promise<object>} Workspace ou null
    */
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
                name: true,
                _count: { select: { boards: true, workspace_members: true } }
            }
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