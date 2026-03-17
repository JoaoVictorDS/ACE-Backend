const prisma = require('../config/prisma')
const PermissionService = require('./PermissionService')
const LogService = require('./LogService')
const AppError = require('../utils/AppError')

const WorkspaceMemberService = {

    async upsertMember({ workspaceId, userId, memberEmail, role }) {
        await PermissionService.checkWorkspacePermission(workspaceId, userId, PermissionService.LEVELS.ADMIN)

        const memberUser = await prisma.user.findUnique({ where: { email: memberEmail } })
        if (!memberUser) throw new AppError('Usuário com este e-mail não encontrado!', 404)
        if (memberUser.id === userId) throw new AppError('Não é permitido alterar sua própria permissão de membro!', 400)

        const existingMember = await prisma.workspaceMember.findUnique({
            where: { user_id_workspace_id: { user_id: memberUser.id, workspace_id: workspaceId } }
        })

        let nextOrder = 0
        if (!existingMember) {
            const lastMemberEntry = await prisma.workspaceMember.findFirst({
                where: { user_id: memberUser.id },
                orderBy: { order: 'desc' },
                select: { order: true }
            })
            nextOrder = lastMemberEntry ? lastMemberEntry.order + 1 : 0
        }

        const member = await prisma.workspaceMember.upsert({
            where: { user_id_workspace_id: { user_id: memberUser.id, workspace_id: workspaceId } },
            update: { role },
            create: {
                user_id: memberUser.id,
                workspace_id: workspaceId,
                role,
                order: nextOrder
            },
            include: { user: { select: { id: true, name: true, email: true } } }
        })

        if (!existingMember) {
            LogService.register({
                userId,
                workspaceId,
                action: 'CREATE',
                entityType: 'MEMBER',
                entityId: memberUser.id,
                newValue: `Adicionado: ${memberUser.name} (${role})`
            })
        } else if (existingMember.role !== role) {
            LogService.register({
                userId,
                workspaceId,
                action: 'UPDATE',
                entityType: 'MEMBER',
                entityId: memberUser.id,
                oldValue: existingMember.role,
                newValue: role
            })
        }

        return member
    },

    async getMembersByWorkspace({ workspaceId, userId }) {
        await PermissionService.checkWorkspacePermission(workspaceId, userId, PermissionService.LEVELS.VIEW)

        return await prisma.workspaceMember.findMany({
            where: { workspace_id: workspaceId },
            include: {
                user: { select: { id: true, name: true, email: true } }
            },
            orderBy: { role: 'asc' }
        })
    },

    async removeMember({ workspaceId, userId, memberIdToRemove }) {
        await PermissionService.checkWorkspacePermission(workspaceId, userId, PermissionService.LEVELS.ADMIN)

        if (memberIdToRemove === userId) throw new AppError('Não é possível remover a si mesmo da Área de Trabalho!', 400)
        const membershipToDelete = await prisma.workspaceMember.findUnique({
            where: {
                user_id_workspace_id: { user_id: memberIdToRemove, workspace_id: workspaceId }
            },
            include: { user: { select: { name: true } } }
        })
        if (!membershipToDelete) throw new AppError('Membro não encontrado nesta Área de Trabalho!', 404)
        if (membershipToDelete.role === 'OWNER') throw new AppError('O proprietário da Área de Trabalho não pode ser removido!', 400)

        const result = await prisma.$transaction(async (tx) => {
            const deleted = await tx.workspaceMember.delete({
                where: { user_id_workspace_id: { user_id: memberIdToRemove, workspace_id: workspaceId } }
            })

            await tx.workspaceMember.updateMany({
                where: {
                    user_id: memberIdToRemove,
                    order: { gt: membershipToDelete.order }
                },
                data: { order: { decrement: 1 } }
            })

            return deleted
        })

        LogService.register({
            userId,
            workspaceId,
            action: 'DELETE',
            entityType: 'MEMBER',
            entityId: memberIdToRemove,
            oldValue: membershipToDelete.user.name
        })

        return result
    },

    async moveWorkspace({ workspaceId, userId, newOrder }) {
        const currentMembership = await prisma.workspaceMember.findUnique({
            where: { user_id_workspace_id: { user_id: userId, workspace_id: workspaceId } }
        })
        if (!currentMembership) throw new AppError('Vínculo entre usuário e Área de Trabalho não encontrada!', 404)

        const totalWorkspaces = await prisma.workspaceMember.count({
            where: { user_id: userId }
        })

        const maxOrder = totalWorkspaces - 1
        const finalOrder = Math.max(0, Math.min(newOrder, maxOrder))
        const oldOrder = currentMembership.order

        if (oldOrder === newOrder || oldOrder === finalOrder) return currentMembership

        const result = await prisma.$transaction(async (tx) => {
            if (finalOrder > oldOrder) {
                await tx.workspaceMember.updateMany({
                    where: {
                        user_id: userId,
                        order: { gt: oldOrder, lte: finalOrder }
                    }, data: { order: { decrement: 1 } }
                })
            } else {
                await tx.workspaceMember.updateMany({
                    where: {
                        user_id: userId,
                        order: { gte: finalOrder, lt: oldOrder }
                    },
                    data: { order: { increment: 1 } }
                })
            }

            return await tx.workspaceMember.update({
                where: { user_id_workspace_id: { user_id: userId, workspace_id: workspaceId } },
                data: { order: finalOrder }
            })
        })

        return result
    }
}

module.exports = WorkspaceMemberService