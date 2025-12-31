const SectionService = require('../services/SectionService')

const SectionController = {

    async create(req, res) {
        const boardId = parseInt(req.params.boardId)
        const userId = req.user.id
        const { name } = req.body

        if (!boardId || !name) return res.status(400).json({ error: 'ID do Quadro e Nome da Seção são obrigatórios!' })

        try {
            const section = await SectionService.createSection({ boardId, name, userId })
            return res.status(201).json({
                message: 'Seção criada com sucesso!',
                section
            })
        } catch (error) {
            console.error('Erro ao criar seção!', error)
            const statusCode = error.message.includes('permissão') ? 403 : 400
            return res.status(statusCode).json({ error: error.message })
        }
    },

    async list(req, res) {
        const boardId = parseInt(req.params.boardId)
        const userId = req.user.id

        if (!boardId) return res.status(400).json({ error: 'ID do Quadro é obrigatório para listar seções!' })

        try {
            const sections = await SectionService.getSectionsByBoard({ boardId, userId })
            return res.status(200).json(sections)
        } catch (error) {
            console.error('Erro ao listar seções:', error)
            const statusCode = error.message.includes('permissão') ? 403 : 500
            return res.status(statusCode).json({ error: 'Erro ao listar seções!' })
        }
    },

    async update(req, res) {
        const sectionId = parseInt(req.params.sectionId)
        const userId = req.user.id
        const { name } = req.body

        if (!sectionId || !name) return res.status(400).json({ error: 'ID da Seção e Nome são obrigatórios!' })

        try {
            const updatedSection = await SectionService.updateSection({ sectionId, userId, name })
            return res.status(200).json({
                message: 'Seção atualizada com sucesso!',
                updatedSection
            })
        } catch (error) {
            console.error('Erro ao atualizar seção:', error)
            const statusCode = error.message.includes('permissão') ? 403 : 500
            return res.status(statusCode).json({ error: error.message })
        }
    },

    async delete(req, res) {
        const sectionId = parseInt(req.params.sectionId)
        const userId = req.user.id

        if (!sectionId) return res.status(400).json({ error: 'ID da Seção é obrigatório para exclusão!' })

        try {
            const result = await SectionService.deleteSection({ sectionId, userId })
            return res.status(200).json(result)
        } catch (error) {
            console.error('Erro ao deletar seção:', error)
            const statusCode = error.message.includes('permissão') ? 403 : 400
            return res.status(statusCode).json({ error: error.message })
        }
    },

    async move(req, res) {
        const sectionId = parseInt(req.params.sectionId)
        const userId = req.user.id
        const { newOrder } = req.body
        const orderValue = parseInt(newOrder)

        if (!sectionId || orderValue === undefined) return res.status(400).json({ error: 'ID da Seção e Nova Ordem são obrigatórios!' })
        if (isNaN(orderValue)) return res.status(400).json({ error: 'newOrder é obrigatório e deve ser um número inteiro!' })

        try {
            const updatedSection = await SectionService.moveSection({
                sectionId,
                userId,
                newOrder: orderValue
            })
            return res.status(200).json(updatedSection)
        } catch (error) {
            console.error('Erro ao mover seção:', error)
            const statusCode = error.message.includes('permissão') ? 403 : 400
            return res.status(statusCode).json({ error: error.message })
        }
    },

}

module.exports = SectionController