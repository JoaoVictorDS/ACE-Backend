const prisma = require('../config/prisma')
const PermissionService = require('./PermissionService')
const LogService = require('./LogService')
const AppError = require('../utils/AppError')

const BoardMemberService = {

    async upsertMember({ boardId, userId, memberEmail, role }) {
        const { workspaceId, creatorId } = await PermissionService.checkPermission(PermissionService.TYPES.BOARD, boardId, userId, PermissionService.LEVELS.ADMIN)

        const targetUser = await prisma.user.findUnique({
            where: { email: memberEmail },
            include: {
                board_members: {
                    where: { board_id: boardId }
                },
                _count: { select: { board_members: true } }
            }
        })
        if (!targetUser) throw new AppError('Usuário com este e-mail não encontrado!', 404)
        if (targetUser.id === userId) throw new AppError('Não é permitido alterar sua própria permissão!', 400)
        if (targetUser.id === creatorId) throw new AppError('O proprietário do Quadro não pode ter seu cargo alterado!', 403)

        const existingMember = targetUser.board_members[0]

        if (existingMember && existingMember.role === 'ADMIN' && role !== 'ADMIN') {
            const privilegedMembersCount = await prisma.boardMember.count({
                where: {
                    board_id: boardId,
                    role: { in: ['ADMIN', 'OWNER'] }
                }
            })
            if (privilegedMembersCount <= 1) throw new AppError('Não é possível rebaixar o único administrador do Quadro!', 400)
        }

        const nextOrder = existingMember ? existingMember.order : targetUser._count.board_members

        const member = await prisma.boardMember.upsert({
            where: { user_id_board_id: { user_id: targetUser.id, board_id: boardId } },
            update: { role },
            create: {
                user_id: targetUser.id,
                board_id: boardId,
                role,
                order: nextOrder
            },
            include: { user: { select: { id: true, name: true, email: true } } }
        })

        if (!existingMember) {
            LogService.register({
                userId,
                boardId,
                workspaceId,
                action: 'CREATE',
                entityType: 'MEMBER',
                entityId: targetUser.id,
                newValue: `Adicionado: ${targetUser.name} (${role})`
            })
        } else if (existingMember.role !== role) {
            LogService.register({
                userId,
                boardId,
                workspaceId,
                action: 'UPDATE',
                entityType: 'MEMBER',
                entityId: targetUser.id,
                oldValue: existingMember.role,
                newValue: role
            })
        }

        return member
    },

    async getMembersByBoard({ boardId, userId }) {
        await PermissionService.checkPermission(PermissionService.TYPES.BOARD, boardId, userId, PermissionService.LEVELS.VIEW)

        return await prisma.boardMember.findMany({
            where: { board_id: boardId },
            include: {
                user: { select: { id: true, name: true, email: true } }
            },
            orderBy: { role: 'asc' }
        })
    },

    async removeMember({ boardId, userId, memberIdToRemove }) {
        const { workspaceId } = await PermissionService.checkPermission(PermissionService.TYPES.BOARD, boardId, userId, PermissionService.LEVELS.ADMIN)

        if (memberIdToRemove === userId) throw new AppError('Não é permitido remover a si mesmo do quadro!', 400)

        const membershipToDelete = await prisma.boardMember.findUnique({
            where: { user_id_board_id: { user_id: memberIdToRemove, board_id: boardId } },
            include: { user: { select: { name: true } } }
        })
        if (!membershipToDelete) throw new AppError('Membro não encontrado neste quadro!', 404)
        if (membershipToDelete.role === 'OWNER') throw new AppError('O proprietário do Quadro não pode ser removido!', 400)
        if (membershipToDelete.role === 'ADMIN') {
            const privilegedMembersCount = await prisma.boardMember.count({
                where: {
                    board_id: boardId,
                    role: { in: ['ADMIN', 'OWNER'] }
                }
            })
            if (privilegedMembersCount <= 1) throw new AppError('Não é possível remover o último administrador do quadro!', 400)
        }

        const result = await prisma.$transaction(async (tx) => {
            const deleted = await tx.boardMember.delete({
                where: { user_id_board_id: { user_id: memberIdToRemove, board_id: boardId } }
            })

            await tx.boardMember.updateMany({
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
            boardId,
            workspaceId,
            action: 'DELETE',
            entityType: 'MEMBER',
            entityId: memberIdToRemove,
            oldValue: membershipToDelete.user.name
        })

        return result
    },

    async moveBoard({ userId, boardId, newOrder }) {
        const currentMembership = await prisma.boardMember.findUnique({
            where: { user_id_board_id: { user_id: userId, board_id: boardId } }
        })
        if (!currentMembership) throw new AppError('Vínculo entre usuário e quadro não encontrado!', 404)

        const totalBoards = await prisma.boardMember.count({
            where: { user_id: userId }
        })

        const maxOrder = totalBoards - 1
        const finalOrder = Math.max(0, Math.min(newOrder, maxOrder))
        const oldOrder = currentMembership.order

        if (oldOrder === newOrder || oldOrder === finalOrder) return currentMembership

        const result = await prisma.$transaction(async (tx) => {
            if (finalOrder > oldOrder) {
                await tx.boardMember.updateMany({
                    where: {
                        user_id: userId,
                        order: { gt: oldOrder, lte: finalOrder }
                    },
                    data: { order: { decrement: 1 } }
                })
            } else {
                await tx.boardMember.updateMany({
                    where: {
                        user_id: userId,
                        order: { gte: finalOrder, lt: oldOrder }
                    },
                    data: { order: { increment: 1 } }
                })
            }

            return await tx.boardMember.update({
                where: {
                    user_id_board_id:
                    {
                        user_id: userId,
                        board_id: boardId
                    }
                },
                data: { order: finalOrder }
            })
        })

        return result
    },

}

module.exports = BoardMemberService