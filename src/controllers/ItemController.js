const ItemService = require('../services/ItemService')

const ItemController = {

    async create(req, res) {
        const sectionId = parseInt(req.params.sectionId)
        const userId = req.user.id
        const { title, values } = req.body

        if (!sectionId || !title) return res.status(400).json({ error: 'ID da Seção e Título da Tarefa são obrigatórios!' })

        try {
            const item = await ItemService.createItem({ sectionId, title, values, userId })
            return res.status(201).json({
                message: 'Tarefa criada com sucesso!',
                item
            })
        } catch (error) {
            console.error('Erro ao criar tarefa: ', error)
            const statusCode = error.message.includes('permissão') ? 403 : 400
            return res.status(statusCode).json({ error: error.message })
        }
    },

    async list(req, res) {
        const boardId = parseInt(req.params.boardId)
        const userId = req.user.id

        if (!boardId) return res.status(400).json({ error: 'ID do Quadro e ID do Usuário são obrigatórios para listar tarefas!' })

        try {
            const sectionsWithItems = await ItemService.getItemByBoard({ boardId, userId })
            return res.status(200).json(sectionsWithItems)
        } catch (error) {
            console.error('Erro ao criar tarefa: ', error)
            const statusCode = error.message.includes('permissão') ? 403 : 400
            return res.status(statusCode).json({ error: error.message })
        }

    },

    async update(req, res) {
        const itemId = parseInt(req.params.itemId)
        const userId = req.user.id
        const { title, section_id, values } = req.body

        if (!itemId) return res.status(400).json({ error: 'ID do Item e ID do Usuário são obrigatórios para atualização!' })

        try {
            const updateItem = await ItemService.updateItem({
                itemId,
                userId,
                title,
                sectionId: parseInt(section_id),
                values
            })
            return res.status(200).json({
                message: 'Tarefa atualizada com sucesso!',
                item: updateItem
            })
        } catch (error) {
            console.error('Erro ao atualizar tarefa!')
            const statusCode = error.message.includes('permissão') ? 403 : 400
            return res.status(statusCode).json({ error: error.message })
        }
    },

    async delete(req, res) {
        const itemId = parseInt(req.params.itemId)
        const userId = req.user.id

        if (!itemId) return res.status(400).json({ error: 'ID do Item é obrigatório para exclusão!' })

        try {
            await ItemService.deleteItem({ itemId, userId })
            return res.status(200).json({ message: 'Tarefa excluída com sucesso!' })
        } catch (error) {
            console.error('Erro ao deletar tarefa:', error)

            let statusCode = 500
            if (error.message.includes('permissão')) {
                statusCode = 403
            } else if (error.code === 'P2025' || error.message.includes('não encontrada')) {
                statusCode = 404
            }
            return res.status(statusCode).json({ error: error.message || 'Erro ao excluir tarefa!' })
        }
    },

    async move(req, res) {
        const itemId = parseInt(req.params.itemId)
        const userId = req.user.id
        const { newSectionId, newOrder } = req.body

        if (!itemId || !newSectionId || newOrder === undefined) return res.status(400).json({ error: 'ID do Item, ID da Nova Seção e Nova Ordem são obrigatórios para mover a tarefa!' })

        try {
            const movedItem = await ItemService.moveItem({
                itemId,
                userId,
                newSectionId: parseInt(newSectionId),
                newOrder: parseInt(newOrder)
            })
            return res.status(200).json({
                message: 'Tarefa movida e reordenada com sucesso!',
                item: movedItem
            })
        } catch (error) {
            console.error('Erro ao mover tarefa!', error)
            const statusCode = error.message.includes('permissão') ? 403 : 400
            return res.status(statusCode).json({ error: error.message })
        }
    },

}

module.exports = ItemController