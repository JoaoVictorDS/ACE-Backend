const { prisma } = require('../../config')
const PermissionService = require('../permission/permission.service')
const { PERMISSION_LEVELS } = require('../../shared/constants')
const LogService = require('../log/log.service')
const { AppError } = require('../../shared/errors')

const WorkspaceService = {

    async create({ user, name }) {
        const userId = user.id

        const lastMemberEntry = await prisma.workspaceMember.findFirst({
            where: { user_id: userId },
            orderBy: { order: 'desc' },
            select: { order: true }
        })

        const nextOrder = lastMemberEntry ? lastMemberEntry.order + 1 : 0

        const newWorkspace = await prisma.workspace.create({
            data: {
                name,
                creator_id: userId,
                workspace_members: {
                    create: {
                        user_id: userId,
                        role: 'OWNER',
                        order: nextOrder
                    }
                }
            }
        })

        LogService.register({
            userId,
            workspaceId: newWorkspace.id,
            action: 'CREATE',
            entityType: 'WORKSPACE',
            entityId: newWorkspace.id,
            newValue: `Área de trabalho criada: ${name}`
        })

        return newWorkspace
    },

    async getByUser({ user }) {
        const memberships = await prisma.workspaceMember.findMany({
            where: { user_id: user.id },
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

    async update({ user, workspaceId, name }) {
        await PermissionService.checkWorkspace(workspaceId, user, PERMISSION_LEVELS.ADMIN)

        const currentWorkspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { name: true }
        })

        if (!currentWorkspace) throw new AppError('Área de Trabalho não encontrada!', 404)

        const isSameName = currentWorkspace.name === name

        if (isSameName) return currentWorkspace

        const updatedWorkspace = await prisma.workspace.update({
            where: { id: workspaceId },
            data: { name }
        })

        LogService.register({
            userId: user.id,
            workspaceId,
            action: 'UPDATE',
            entityType: 'WORKSPACE',
            entityId: workspaceId,
            oldValue: `Nome: ${currentWorkspace.name}`,
            newValue: `Nome: ${name}`
        })

        return updatedWorkspace
    },

    async delete({ user, workspaceId, force = false }) {
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

        const result = await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`
                UPDATE "workspace_members" AS wm
                SET "order" = wm."order" - 1
                FROM "workspace_members" AS deleted_wm
                WHERE wm.user_id = deleted_wm.user_id
                AND deleted_wm.workspace_id = ${workspaceId}
                AND wm."order" > deleted_wm."order"
            `

            await tx.activityLog.create({
                data: {
                    user_id: user.id,
                    workspace_id: workspaceId,
                    action: 'DELETE',
                    entity_type: 'WORKSPACE',
                    entity_id: workspaceId,
                    old_value: `Área de trabalho removida: ${workspace.name}`
                }
            })

            return await tx.workspace.delete({
                where: { id: workspaceId }
            })
        })

        return result
    }

}

module.exports = WorkspaceService