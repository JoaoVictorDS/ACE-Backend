const prisma = require('../config/prisma')
const PermissionService = require('./PermissionService')
const LogService = require('./LogService')

const BoardService = {

    async createBoard({ name, userId }) {
        const result = await prisma.$transaction(async (tx) => {
            const lastMemberEntry = await tx.boardMember.findFirst({
                where: { user_id: userId },
                orderBy: { order: 'desc' },
                select: { order: true }
            })

            const nextOrder = lastMemberEntry ? lastMemberEntry.order + 1 : 0

            const board = await tx.board.create({
                data: {
                    name,
                    owner_id: userId,
                }
            })

            await tx.boardMember.create({
                data: {
                    board_id: board.id,
                    user_id: userId,
                    role: 'OWNER',
                    order: nextOrder
                }
            })

            return board
        })

        LogService.register({
            userId,
            boardId: result.id,
            action: 'CREATE',
            entityType: 'BOARD',
            entityId: result.id,
            newValue: name
        })

        return result
    },

    async getBoardsByUser(userId) {
        const memberships = await prisma.boardMember.findMany({
            where: { user_id: userId },
            include: {
                board: {
                    select: {
                        id: true,
                        name: true,
                        owner_id: true,
                    }
                }
            },
            orderBy: {
                order: 'asc'
            }
        })

        return memberships.map(m => ({
            ...m.board,
            user_role: m.role,
            personal_order: m.order
        }))
    },

    async updateBoard({ boardId, name, userId }) {
        await PermissionService.checkEditPermission(boardId, userId)

        const currentBoard = await prisma.board.findUnique({
            where: {
                id: boardId
            }
        })
        if (!currentBoard) throw new Error('Quadro não encontrado!')

        if (currentBoard.name === name) return currentBoard

        const updatedBoard = await prisma.board.update({
            where: { id: boardId },
            data: { name }
        })

        LogService.register({
            userId,
            boardId,
            action: 'UPDATE',
            entityType: 'BOARD',
            entityId: boardId,
            oldValue: currentBoard.name,
            newValue: name
        })

        return updatedBoard
    },

    async deleteBoard({ boardId, userId }) {
        await PermissionService.checkOwnerPermission(boardId, userId)

        return await prisma.board.delete({
            where: { id: boardId }
        })
    },

}

module.exports = BoardService