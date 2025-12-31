const { response } = require('express')
const BoardService = require('../services/BoardService')

const BoardController = {

    async create(req, res) {
        const userId = req.user.id
        const { name } = req.body

        if (!name) return res.status(400).json({ error: 'Nome do quadro é obrigatório!' })

        try {
            const board = await BoardService.createBoard({
                name,
                userId
            })
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
        const userId = req.user.id

        try {
            const boards = await BoardService.getBoardsByUser(userId)
            return res.status(200).json(boards)
        } catch (error) {
            console.error(error)
            return res.status(500).json({ error: 'Erro ao listar quadros!' })
        }
    },

    async update(req, res) {
        const boardId = parseInt(req.params.boardId)
        const { name } = req.body
        const userId = req.user.id

        if (!boardId || !name) return res.status(400).json({ error: 'ID do Quadro e Nome são obrigatórios!' })

        try {
            const updatedBoard = await BoardService.updateBoard({
                boardId,
                name,
                userId
            })
            return res.status(200).json({
                message: 'Quadro atualizado com sucesso!',
                board: updatedBoard
            })
        } catch (error) {
            console.error('Erro ao atualizar quadro:', error)
            return res.status(400).json({ error: error.message })
        }
    },

    async delete(req, res) {
        const boardId = parseInt(req.params.boardId)
        const userId = req.user.id

        if (!boardId) return res.status(400).json({ error: 'ID do Quadro é obrigatório!' })

        try {
            await BoardService.deleteBoard({
                boardId,
                userId
            })
            return res.status(200).json({ message: 'Quadro excluído com sucesso!' })
        } catch (error) {
            console.error('Erro ao excluír o quadro:', error)
            return res.status(400).json({ error: error.message })
        }
    },

}

module.exports = BoardController