const prisma = require('../config/prisma')
const PermissionService = require('./PermissionService')
const LogService = require('./LogService')

const BoardService = {

    async createBoard({ name, userId }) {
        const newBoard = await prisma.$transaction(async (tx) => {
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
                    role: 'OWNER'
                }
            })

            return board
        })

        await LogService.register({
            userId,
            boardId: newBoard.id,
            action: 'CREATE',
            entityType: 'BOARD',
            entityId: newBoard.id,
            newValue: name
        })

        return newBoard
    },

    async getBoardsByUser(userId) {
        const boards = await prisma.board.findMany({
            where: {
                OR: [
                    { owner_id: userId },
                    {
                        board_members: {
                            some: {
                                user_id: userId,
                            }
                        }
                    }
                ]
            },
            select: {
                id: true,
                name: true,
                owner_id: true,
            }
        })

        return boards
    },

    async updateBoard({ boardId, name, userId }) {
        await PermissionService.checkEditPermission(boardId, userId)

        const currentBoard = await prisma.board.findUnique({ where: { id: boardId } })
        if (!currentBoard) throw new Error('Quadro não encontrado!')

        if (name === currentBoard.name) return currentBoard

        const updatedBoard = await prisma.board.update({
            where: { id: boardId },
            data: { name }
        })

        await LogService.register({
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

        const boardToDelete = await prisma.board.findUnique({
            where: { id: boardId },
            select: { name: true }
        })
        if (!boardToDelete) throw new Error('Quadro não encontrado!')

        const deletedBoard = await prisma.board.delete({
            where: { id: boardId }
        })

        await LogService.register({
            userId,
            boardId,
            action: 'DELETE',
            entityType: 'BOARD',
            entityId: boardId,
            oldValue: boardToDelete.name
        })

        return deletedBoard
    },

}

module.exports = BoardService