const prisma = require('../config/prisma')
const PermissionService = require('./PermissionService')
const LogService = require('./LogService')

const BoardMemberService = {

    async upsertMember({ boardId, userId, memberEmail, role }) {
        await PermissionService.checkOwnerPermission(boardId, userId)

        const memberUser = await prisma.user.findUnique({
            where: {
                email: memberEmail
            }
        })
        if (!memberUser) throw new Error('Usuário com este e-mail não encontrado!')
        if (memberUser.id === userId) throw new Error('O proprietário não pode alterar sua própria permissão de membro!')

        const existingMember = await prisma.boardMember.findUnique({
            where: {
                user_id_board_id: { user_id: memberUser.id, board_id: boardId }
            }
        })

        let nextOrder = 0
        if (!existingMember) {
            const lastMemberEntry = await prisma.boardMember.findFirst({
                where: { user_id: memberUser.id },
                orderBy: { order: 'desc' },
                select: { order: true }
            })
            nextOrder = lastMemberEntry ? lastMemberEntry.order + 1 : 0
        }

        const member = await prisma.boardMember.upsert({
            where: {
                user_id_board_id: {
                    user_id: memberUser.id,
                    board_id: boardId,
                },
            },
            update: {
                role,
            },
            create: {
                user_id: memberUser.id,
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
                action: 'CREATE',
                entityType: 'MEMBER',
                entityId: memberUser.id,
                newValue: `Adicionado: ${memberUser.name} (${role})`
            })
        } else if (existingMember.role !== role) {
            LogService.register({
                userId,
                boardId,
                action: 'UPDATE',
                entityType: 'MEMBER',
                entityId: memberUser.id,
                oldValue: existingMember.role,
                newValue: role
            })
        }

        return member
    },

    async getMembersByBoard({ boardId, userId }) {
        await PermissionService.checkViewPermission(boardId, userId)

        const board = await prisma.board.findUnique({
            where: { id: boardId },
            include: {
                owner: { select: { id: true, name: true, email: true } },
                board_members: {
                    include: { user: { select: { id: true, name: true, email: true } } }
                }
            }
        })
        if (!board) throw new Error('Quadro não encontrado!')

        const ownerAsMember = {
            user_id: board.owner_id,
            board_id: boardId,
            role: 'OWNER',
            user: board.owner
        }

        const otherMembers = board.board_members.filter(m => m.user_id !== board.owner_id)

        return [ownerAsMember, ...otherMembers]
    },

    async moveBoard({ userId, boardId, newOrder }) {
        const currentMembership = await prisma.boardMember.findUnique({
            where: {
                user_id_board_id: {
                    user_id: userId, board_id: boardId
                }
            }
        })
        if (!currentMembership) throw new Error('Vínculo não encontrado!')

        const oldOrder = currentMembership.order
        if (oldOrder === newOrder) return currentMembership

        const totalBoards = await prisma.boardMember.count({
            where: { user_id: userId }
        })

        const maxOrder = totalBoards - 1
        const finalOrder = Math.max(0, Math.min(newOrder, maxOrder))

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
                    data: {
                        order: { increment: 1 }
                    }
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

    async removeMember({ boardId, userId, memberIdToRemove }) {
        await PermissionService.checkOwnerPermission(boardId, userId)

        if (memberIdToRemove === userId) throw new Error('O proprietário não pode remover a si mesmo do quadro!')

        const membershipToDelete = await prisma.boardMember.findUnique({
            where: {
                user_id_board_id: {
                    user_id: memberIdToRemove,
                    board_id: boardId
                }
            }
        })
        if (!membershipToDelete) throw new Error('Membro não encontrado!')

        const targetUser = await prisma.user.findUnique({
            where: { id: memberIdToRemove },
            select: { name: true }
        })

        const result = await prisma.$transaction(async (tx) => {
            const deleted = await tx.boardMember.delete({
                where: {
                    user_id_board_id: {
                        user_id: memberIdToRemove,
                        board_id: boardId
                    }
                }
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
            action: 'DELETE',
            entityType: 'MEMBER',
            entityId: memberIdToRemove,
            oldValue: targetUser?.name || 'Membro'
        })

        return result
    },

}

module.exports = BoardMemberService