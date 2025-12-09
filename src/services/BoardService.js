const prisma = require('../config/prisma')

const BoardService = {
    async createBoard({ name, userId }) {
        if (!name || !userId) {
            throw new Error('Nome do quadro e ID do proprietário são obrigatórios.')
        }

        const newBoard = await prisma.board.create({
            data: {
                name,
                owner_id: userId,
            }
        })

        return newBoard
    },

    async getBoardsByOwner(userId) {
        const boards = await prisma.board.findMany({
            where: {
                owner_id: userId,
            },
            select: {
                id: true,
                name: true,
                owner_id: true,
            }
        })

        return boards
    },

    async verifyBoardOwnership(boardId, ownerId) {
        const board = await prisma.board.findUnique({
            where: { id: boardId },
            select: { owner_id: true }
        })

        if (!board) {
            throw new Error('Quadro não encontrado!')
        }

        if (board.owner_id !== ownerId) {
            throw new Error('Você não tem permissão para editar/deletar este quadro!')
        }

        return board
    },

    async updateBoard({ boardId, name, ownerId }) {
        if (!boardId || !name || !ownerId) {
            throw new Error('ID do Quadro, Nome e ID do Proprietário são obrigatórios!')
        }

        await this.verifyBoardOwnership(boardId, ownerId)

        const updatedBoard = await prisma.board.update({
            where: { id: boardId },
            data: { name }
        })

        return updatedBoard
    },

    async deleteBoard({ boardId, ownerId }) {
        if (!boardId || !ownerId) {
            throw new Error('ID do Quadro e ID do Proprietário são obrigatórios!')
        }

        await this.verifyBoardOwnership(boardId, ownerId)

        const deletedBoard = await prisma.board.delete({
            where: { id: boardId }
        })

        return deletedBoard
    }

}

module.exports = BoardService