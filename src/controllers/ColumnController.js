const ColumnService = require('../services/ColumnService')

const ColumnController = {
    async create(req, res) {
        const boardId = parseInt(req.params.boardId)
        const { name, data_type, options, formula_expression } = req.body

        try {
            const column = await ColumnService.createColumn({
                boardId,
                name,
                dataType: data_type,
                options,
                formulaExpression: formula_expression
            })

            return res.status(201).json({
                message: 'Coluna customizada criada com sucesso!',
                column
            })

        } catch (error) {
            console.error('Erro ao criar coluna!', error)
            return res.status(400).json({ error: error.message })
        }
    },

    async list(req, res) {
        const boardId = parseInt(req.params.boardId)

        try {
            const columns = await ColumnService.getColumnsByBoard(boardId)
            return res.status(200).json(columns)
        } catch (error) {
            console.error('Erro ao listar colunas!', error)
            return res.status(500).json({ error: 'Erro ao listar colunas!' })
        }
    },

    async update(req, res) {
        const columnId = parseInt(req.params.columnId)
        const ownerId = req.userId
        const { name, dataType, options, formulaExpression } = req.body

        try {
            const updatedColumn = await ColumnService.updateColumn({
                columnId,
                ownerId,
                name,
                dataType,
                options,
                formulaExpression,
            })
            return res.status(200).json({
                message: 'Coluna atualizada com sucesso!',
                column: updatedColumn
            })
        } catch (error) {
            console.error('Erro ao atualizar coluna:', error)
            return res.status(403).json({ error: error.message })
        }
    },

    async delete(req, res) {
        const columnId = parseInt(req.params.columnId)
        const ownerId = req.userId

        try {
            await ColumnService.deleteColumn({
                columnId, ownerId
            })
            return res.status(200).json({ message: 'Coluna excluída com sucesso.' })
        } catch (error) {
            console.error('Erro ao excluir coluna:', error)
            return res.status(403).json({ error: error.message })
        }
    }
}

module.exports = ColumnController