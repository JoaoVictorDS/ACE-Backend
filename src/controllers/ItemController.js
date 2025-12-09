const ItemService = require('../services/ItemService')

const ItemController = {
    async create(req, res) {
        const sectionId = parseInt(req.params.sectionId)
        const { title, values } = req.body

        try {
            const item = await ItemService.createItem({ sectionId, title, values })
            return res.status(201).json({
                message: 'Tarefa criada com sucesso!',
                item
            })
        } catch (error) {
            console.error('Erro ao criar tarefa: ', error)
            return res.status(400).json({ error: error.message })
        }
    },

    async list(req, res) {
        const boardId = parseInt(req.params.boardId)

        try {
            const sectionsWithItems = await ItemService.getItemByBoard(boardId)
            return res.status(200).json(sectionsWithItems)
        } catch (error) {
            console.error('Erro ao listar tarefas com valores customizados:', error)
            return res.status(500).json({ error: error.message || 'Erro ao listar tarefas' })
        }

    },

    async update(req, res) {
        const itemId = parseInt(req.params.itemId)
        const { title, section_id, values } = req.body

        try {
            const updateItem = await ItemService.updateItem({
                itemId,
                title,
                sectionId: section_id,
                values
            })
            return res.status(200).json({
                message: 'Tarefa atualizada com sucesso!',
                item: updateItem
            })
        } catch (error) {
            console.error('Erro ao atualizar tarefa!')
            return res.status(400).json({ error: error.message })
        }
    },

    async delete(req, res) {
        const itemId = parseInt(req.params.itemId)

        try {
            await ItemService.deleteItem(itemId)
            return res.status(200).json({ message: 'Tarefa excluída com sucesso!' })
        } catch (error) {
            console.error('Erro ao deletar tarefa:', error)
            if (error.code === 'P2025') {
                return res.status(404).json({ error: 'Tarefa não encontrada!' })
            }
            return res.status(500).json({ error: 'Erro ao excluir tarefa!' })
        }
    },

    async move(req, res) {
        const itemId = parseInt(req.params.itemId)

        const { newSectionId, newOrder } = req.body

        try {
            const movedItem = await ItemService.moveItem({
                itemId,
                newSectionId,
                newOrder
            })
            return res.status(200).json({
                message: 'Tarefa movida e reordenada com sucesso!',
                item: movedItem
            })
        } catch (error) {
            console.error('Erro ao mover tarefa!', error)
            return res.status(400).json({ error: error.message })
        }
    }

}

module.exports = ItemController