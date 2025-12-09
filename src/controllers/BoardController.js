const BoardService = require('../services/BoardService')
const { update } = require('./ItemController')

const BoardController = {
    async create(req, res) {
        const userId = req.userId
        const { name } = req.body

        try {
            const board = await BoardService.createBoard({ name, userId })
            return res.status(201).json({
                message: 'Quadro criado com sucesso!',
                board
            })
        } catch (error) {
            console.error(error)
            return res.status(400).json({ error: error.message })
        }
    },

    async list(req, res) {
        const userId = req.userId

        try {
            const boards = await BoardService.getBoardsByOwner(userId)
            return res.status(200).json(boards)
        } catch (error) {
            console.error(error)
            return res.status(500).json({ error: 'Erro ao listar quadros.' })
        }
    },

    async update(req, res) {
        const boardId = parseInt(req.params.boardId)
        const { name } = req.body
        const ownerId = req.userId

        try {
            const updatedBoard = await BoardService.updateBoard({ boardId, name, ownerId })
            return res.status(200).json({
                message: 'Quadro atualizado com sucesso!',
                board: updatedBoard
            })
        } catch (error) {
            console.error('Erro ao atualizar quadro:', error)
            return res.status(403).json({ error: error.message })
        }
    },

    async delete(req, res) {
        const boardId = parseInt(req.params.boardId)
        const ownerId = req.userId

        try {
            await BoardService.deleteBoard({ boardId, ownerId })
            return res.status(200).json({ message: 'Quadro excluído com sucesso!' })
        } catch (error) {
            console.error('Erro ao excluír o quadro:', error)
            return res.status(403).json({ error: error.message })
        }
    }

}

module.exports = BoardController