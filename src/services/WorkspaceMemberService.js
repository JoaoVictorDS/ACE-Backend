const prisma = require('../config/prisma')
const PermissionService = require('./PermissionService')
const LogService = require('./LogService')
const AppError = require('../utils/AppError')

const WorkspaceMemberService = {

    async _performRemoval(tx, { membership }) {
        const { role, order, user_id, id, workspace_id } = membership
        const isPrivilegedMember = PermissionService.isPrivileged(role)

        if (isPrivilegedMember) {
            const privilegedMembersCount = await tx.workspaceMember.count({
                where: {
                    workspace_id,
                    role: { in: ['ADMIN', 'OWNER'] }
                }
            })
            const isLastPrivilegedMember = privilegedMembersCount <= 1

            if (isLastPrivilegedMember) throw new AppError('Não é possível remover o último membro privilegiado!', 400)
        }
        const boardsWhereIsPrivilegedMember = await tx.boardMember.findMany({
            where: {
                user_id,
                role: { in: ['ADMIN', 'OWNER'] },
                board: { workspace_id }
            },
            include: { board: { include: { board_members: { where: { role: { in: ['ADMIN', 'OWNER'] } } } } } }
        })
        const isLastPrivilegedMemberSomewhere = boardsWhereIsPrivilegedMember.some(b => b.board.board_members.length <= 1)

        if (isLastPrivilegedMemberSomewhere) throw new AppError('Não é possível remover o último membro privilegiado de um ou mais quadros!', 400)

        await tx.workspaceMember.updateMany({
            where: {
                user_id,
                order: { gt: order }
            },
            data: { order: { decrement: 1 } }
        })

        await tx.boardMember.deleteMany({
            where: {
                user_id,
                board: { workspace_id }
            }
        })

        return await tx.workspaceMember.delete({
            where: { id }
        })
    },

    async upsert({ user, workspaceId, memberEmail, role }) {
        const { creatorId } = await PermissionService.checkWorkspace(workspaceId, user, PermissionService.LEVELS.ADMIN)
        const userId = user.id

        const targetUser = await prisma.user.findUnique({
            where: { email: memberEmail },
            select: { id: true, name: true }
        })
        if (!targetUser) throw new AppError('Usuário com este e-mail não encontrado!', 404)

        const { id: targetUserId, name: targetUserName } = targetUser
        const isSelf = targetUserId === userId
        const isTargetOwner = targetUserId === creatorId

        if (isSelf) throw new AppError('Não é permitido alterar sua própria permissão de membro!', 400)
        if (isTargetOwner) throw new AppError('O proprietário da área de trabalho não pode ter seu cargo alterado!', 403)

        const existingMember = await prisma.workspaceMember.findUnique({
            where: {
                user_id_workspace_id: {
                    user_id: targetUserId,
                    workspace_id: workspaceId
                }
            }
        })
        const isDowngradingAdmin = existingMember && existingMember.role === 'ADMIN' && role !== 'ADMIN'

        if (isDowngradingAdmin) {
            const privilegedMembersCount = await prisma.workspaceMember.count({
                where: {
                    workspace_id: workspaceId,
                    role: { in: ['ADMIN', 'OWNER'] }
                }
            })
            const isLastAdmin = privilegedMembersCount <= 1

            if (isLastAdmin) throw new AppError('Não é possível rebaixar o único administrador da área de trabalho!', 400)
        }

        let nextOrder = 0
        if (!existingMember) {
            const lastMemberEntry = await prisma.workspaceMember.findFirst({
                where: { user_id: targetUserId },
                orderBy: { order: 'desc' },
                select: { order: true }
            })

            nextOrder = lastMemberEntry ? lastMemberEntry.order + 1 : 0
        }

        const member = await prisma.workspaceMember.upsert({
            where: { user_id_workspace_id: { user_id: targetUserId, workspace_id: workspaceId } },
            update: { role },
            create: {
                user_id: targetUserId,
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
                entityId: targetUserId,
                newValue: `Membro adicionado: ${targetUserName} (${role})`
            })
        } else if (existingMember.role !== role) {
            LogService.register({
                userId,
                workspaceId,
                action: 'UPDATE',
                entityType: 'MEMBER',
                entityId: targetUserId,
                oldValue: `Cargo: ${existingMember.role}`,
                newValue: `Cargo: ${role}`
            })
        }

        return member
    },

    async getByWorkspace({ user, workspaceId }) {
        await PermissionService.checkWorkspace(workspaceId, user, PermissionService.LEVELS.VIEW)

        return await prisma.workspaceMember.findMany({
            where: { workspace_id: workspaceId },
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { role: 'asc' }
        })
    },

    async remove({ user, workspaceId, memberIdToRemove }) {
        await PermissionService.checkWorkspace(workspaceId, user, PermissionService.LEVELS.ADMIN)

        const userId = user.id
        const isSelf = memberIdToRemove === userId

        if (isSelf) throw new AppError('Não é possível remover a si mesmo da área de trabalho!', 400)

        const membership = await prisma.workspaceMember.findUnique({
            where: { user_id_workspace_id: { user_id: memberIdToRemove, workspace_id: workspaceId } },
            select: {
                id: true,
                user_id: true,
                role: true,
                order: true,
                workspace_id: true,
                user: { select: { name: true } }
            }
        })

        if (!membership) throw new AppError('Membro não encontrado nesta área de trabalho!', 404)

        const { role, user: { name: targetUserName } } = membership
        const isTargetOwner = role === 'OWNER'

        if (isTargetOwner) throw new AppError('Não é possível remover o proprietário da área de trabalho!', 400)

        const result = await prisma.$transaction(async (tx) => {
            return await this._performRemoval(tx, { membership })
        })

        LogService.register({
            userId,
            workspaceId,
            action: 'DELETE',
            entityType: 'MEMBER',
            entityId: memberIdToRemove,
            oldValue: `Membro removido: ${targetUserName}`
        })

        return result
    },

    async move({ user, workspaceId, newOrder }) {
        const userId = user.id
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
        const isSamePosition = oldOrder === newOrder || oldOrder === finalOrder

        if (isSamePosition) return currentMembership

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
    },

    async leave({ user, workspaceId }) {
        const userId = user.id
        const membership = await prisma.workspaceMember.findUnique({
            where: { user_id_workspace_id: { user_id: userId, workspace_id: workspaceId } },
            select: {
                id: true,
                user_id: true,
                role: true,
                order: true,
                workspace_id: true,
                user: { select: { name: true } }
            }
        })

        if (!membership) throw new AppError('Vínculo entre usuário e área de trabalho não encontrada!', 404)

        const result = await prisma.$transaction(async (tx) => {
            return await this._performRemoval(tx, { membership })
        })

        LogService.register({
            userId,
            workspaceId,
            action: 'DELETE',
            entityType: 'MEMBER',
            entityId: userId,
            oldValue: `${membership.user.name} saiu da área de trabalho`
        })

        return result
    },

}

module.exports = WorkspaceMemberService