const prisma = require('../config/prisma')
const PermissionService = require('./PermissionService')
const LogService = require('./LogService')
const AppError = require('../utils/AppError')

const WorkspaceService = {

    async createWorkspace({ userId, name }) {
        const result = await prisma.$transaction(async (tx) => {
            const lastMemberEntry = await tx.workspaceMember.findFirst({
                where: { user_id: userId },
                orderBy: { order: 'desc' },
                select: { order: true }
            })

            const nextOrder = lastMemberEntry ? lastMemberEntry.order + 1 : 0

            const newWorkspace = await tx.workspace.create({
                data: {
                    name,
                    creator_id: userId
                }
            })

            await tx.workspaceMember.create({
                data: {
                    workspace_id: newWorkspace.id,
                    user_id: userId,
                    role: 'OWNER',
                    order: nextOrder
                }
            })

            return newWorkspace
        })

        LogService.register({
            userId,
            workspaceId: result.id,
            action: 'CREATE',
            entityType: 'WORKSPACE',
            entityId: result.id,
            newValue: name
        })

        return result
    },

    async getWorkspaceByUser({ userId }) {
        const memberships = await prisma.workspaceMember.findMany({
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
            orderBy: {
                order: 'asc'
            }
        })

        return memberships.map(m => ({
            ...m.workspace,
            user_role: m.role,
            personal_order: m.order
        }))
    },

    async updateWorkspace({ userId, workspaceId, name }) {
        await PermissionService.checkWorkspacePermission(workspaceId, userId, PermissionService.LEVELS.ADMIN)

        const currentWorkspace = await prisma.workspace.findUnique({
            where: {
                id: workspaceId
            }
        })
        if (!currentWorkspace) throw new AppError('Área de Trabalho não encontrada!', 404)

        if (currentWorkspace.name === name) return currentWorkspace

        const updatedWorkspace = await prisma.workspace.update({
            where: { id: workspaceId },
            data: { name }
        })

        LogService.register({
            userId,
            workspaceId,
            action: 'UPDATE',
            entityType: 'WORKSPACE',
            entityId: workspaceId,
            oldValue: currentWorkspace.name,
            newValue: name
        })

        return updatedWorkspace
    },

    async deleteWorkspace({ userId, workspaceId, force = false }) {
        await PermissionService.checkWorkspacePermission(workspaceId, userId, PermissionService.LEVELS.OWNER)

        const [workspace, items] = await Promise.all([
            prisma.workspace.findUnique({
                where: { id: workspaceId },
                select: {
                    name: true,
                    _count: { select: { boards: true, workspace_members: true } }
                }
            }),

            prisma.item.count({
                where: { section: { board: { workspace_id: workspaceId } } }
            })
        ])
        if (!workspace) throw new AppError('Área de Trabalho não encontrada!', 404)

        const { boards, workspace_members } = workspace._count
        const hasContent = boards > 0 || items > 0
        if (!force && hasContent) throw new AppError(`Não é possível excluir a área de trabalho: existem ${boards} quadros, ${workspace_members} membros e ${items} itens vinculados. A exclusão removerá permanentemente esses dados. Use "force=true" para prosseguir!`, 409)

        await LogService.register({
            userId,
            workspaceId,
            action: 'DELETE',
            entityType: 'WORKSPACE',
            entityId: workspaceId,
            oldValue: workspace.name
        })

        const deleted = await prisma.workspace.delete({
            where: { id: workspaceId }
        })

        return deleted
    }

}

module.exports = WorkspaceService