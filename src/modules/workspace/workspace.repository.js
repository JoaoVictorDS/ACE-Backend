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

    /**
     * Busca workspaces de um usuário através de memberships
     * @param {number} userId - ID do usuário
     * @returns {Promise<array>} Array de workspaces com role do usuário
     */
    async findByUserWithRole(userId) {
        const memberships = await this.prisma.workspaceMember.findMany({
            where: { user_id: userId },
            include: {
                workspace: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        icon: true,
                        creator_id: true,
                        created_at: true,
                        updated_at: true
                    }
                }
            },
            orderBy: { order: 'asc' }
        })

        return memberships.map(m => ({
            ...m.workspace,
            user_role: m.role,
            personal_order: m.order
        }))
    },

    /**
     * Busca workspace por ID com contagens
     * @param {number} workspaceId - ID do workspace
     * @returns {Promise<object>} Workspace com _count
     */
    async findByIdWithCounts(workspaceId) {
        return await this.findById(workspaceId, {
            include: {
                _count: {
                    select: {
                        boards: true,
                        workspace_members: true
                    }
                }
            }
        })
    },

    /**
     * Cria workspace e adiciona criador como OWNER
     * @param {object} data - { name, description, icon, creator_id, memberOrder }
     * @returns {Promise<object>} Workspace criado
     */
    async createWithOwner(data) {
        const { name, description, icon, creator_id, memberOrder } = data

        return await this.prisma.workspace.create({
            data: {
                name,
                description,
                icon,
                creator_id,
                workspace_members: {
                    create: {
                        user_id: creator_id,
                        role: 'OWNER',
                        order: memberOrder
                    }
                }
            }
        })
    },

    /**
     * Conta itens dentro de um workspace
     * @param {number} workspaceId - ID do workspace
     * @returns {Promise<number>} Total de itens
     */
    async countItemsInWorkspace(workspaceId) {
        return await this.prisma.item.count({
            where: {
                section: {
                    board: {
                        workspace_id: workspaceId
                    }
                }
            }
        })
    }
}

module.exports = WorkspaceRepository