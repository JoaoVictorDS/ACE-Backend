const SectionService = require('../services/SectionService')

const SectionController = {
    async create(req, res) {
        const boardId = parseInt(req.params.boardId)
        const ownerId = req.userId
        const { name } = req.body

        try {
            const section = await SectionService.createSection({ boardId, name, ownerId })
            return res.status(201).json({
                message: 'Seção criada com sucesso!',
                section
            })
        } catch (error) {
            console.error('Erro ao criar seção!', error)
            return res.status(400).json({ error: error.message })
        }
    },

    async list(req, res) {
        const boardId = parseInt(req.params.boardId)

        try {
            const sections = await SectionService.getSectionsByBoard(boardId)
            return res.status(200).json(sections)
        } catch (error) {
            console.error('Erro ao listar seções:', error)
            return res.status(500).json({ error: 'Erro ao listar seções!' })
        }
    }
}

module.exports = SectionController