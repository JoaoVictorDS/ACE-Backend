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
            },
            include: { user: { select: { id: true, name: true, email: true } } }
        })

        if (!existingMember) {
            await LogService.register({
                userId,
                boardId,
                action: 'CREATE',
                entityType: 'MEMBER',
                entityId: memberUser.id,
                newValue: `Adicionado: ${memberUser.name} (${role})`
            })
        } else if (existingMember.role !== role) {
            await LogService.register({
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

    async removeMember({ boardId, userId, memberIdToRemove }) {
        await PermissionService.checkOwnerPermission(boardId, userId)

        if (memberIdToRemove === userId) throw new Error('O proprietário não pode remover a si mesmo do quadro!')

        const userToRemove = await prisma.user.findUnique({
            where: { id: memberIdToRemove },
            select: { name: true }
        })

        if (!userToRemove) throw new Error('Membro não encontrado!')

        const removedMember = await prisma.boardMember.delete({
            where: {
                user_id_board_id: {
                    user_id: memberIdToRemove,
                    board_id: boardId,
                },
            },
        })

        await LogService.register({
            userId,
            boardId,
            action: 'DELETE',
            entityType: 'MEMBER',
            entityId: memberIdToRemove,
            oldValue: userToRemove.name
        })

        return removedMember
    },

}

module.exports = BoardMemberService