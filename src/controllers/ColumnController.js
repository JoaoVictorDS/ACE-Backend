const ColumnService = require('../services/ColumnService')

const ColumnController = {

    async create(req, res) {
        const boardId = parseInt(req.params.boardId)
        const userId = req.user.id
        const { name, data_type, options, formula_expression } = req.body

        if (!boardId || !name || !data_type) return res.status(400).json({ error: 'Id do Quadro, Nome e Tipo de Dado são obrigatórios!' })

        const upperCaseDataType = data_type.toUpperCase()

        if (upperCaseDataType === 'FORMULA' && !formula_expression?.trim()) return res.status(400).json({ error: 'O tipo FORMULA exige uma expressão de cálculo (formula_expression)!' })
        if (upperCaseDataType === 'SELECT' && (!Array.isArray(options) || options.length === 0)) return res.status(400).json({ error: 'O tipo SELECT exige um array de opções válidas!' })

        try {
            const column = await ColumnService.createColumn({
                boardId,
                name,
                dataType: upperCaseDataType,
                options,
                formulaExpression: formula_expression,
                userId
            })
            return res.status(201).json({
                message: 'Coluna customizada criada com sucesso!',
                column
            })
        } catch (error) {
            console.error('Erro ao criar coluna!', error)
            const statusCode = error.message.includes('permissão') ? 403 : 400
            return res.status(statusCode).json({ error: error.message })
        }
    },

    async list(req, res) {
        const boardId = parseInt(req.params.boardId)
        const userId = req.user.id

        if (!boardId) return res.status(400).json({ error: 'ID do Quadro é obrigatório para listar colunas!' })

        try {
            const columns = await ColumnService.getColumnsByBoard({ boardId, userId })
            return res.status(200).json(columns)
        } catch (error) {
            console.error('Erro ao listar colunas!', error)
            const statusCode = error.message.includes('permissão') ? 403 : 500
            return res.status(statusCode).json({ error: error.message || 'Erro ao listar colunas!' })
        }
    },

    async update(req, res) {
        const columnId = parseInt(req.params.columnId)
        const userId = req.user.id
        const { name, data_type, options, formula_expression } = req.body

        if (!columnId) return res.status(400).json({ error: 'ID da Coluna é obrigatório!' })

        const upperCaseDataType = data_type?.toUpperCase()

        if (upperCaseDataType === 'FORMULA' && (!formula_expression || formula_expression.trim() === '')) return res.status(400).json({ error: 'O tipo FORMULA exige uma expressão de cálculo (formulaExpression)!' })
        if (upperCaseDataType === 'SELECT' && (!Array.isArray(options) || options.length === 0)) return res.status(400).json({ error: 'O tipo SELECT exige um array de opções válidas!' })

        try {
            const updatedColumn = await ColumnService.updateColumn({
                columnId,
                userId,
                name,
                dataType: upperCaseDataType,
                options,
                formulaExpression: formula_expression,
            })
            return res.status(200).json({
                message: 'Coluna atualizada com sucesso!',
                column: updatedColumn
            })
        } catch (error) {
            console.error('Erro ao atualizar coluna:', error)
            const status = error.message.includes('encontrada') ? 404 : 403;
            return res.status(status).json({ error: error.message })
        }
    },

    async delete(req, res) {
        const columnId = parseInt(req.params.columnId)
        const userId = req.user.id

        if (!columnId) return res.status(400).json({ error: 'ID da Coluna é obrigatório!' })

        try {
            await ColumnService.deleteColumn({
                columnId,
                userId
            })
            return res.status(200).json({ message: 'Coluna excluída com sucesso.' })
        } catch (error) {
            console.error('Erro ao excluir coluna:', error)
            return res.status(403).json({ error: error.message })
        }
    },

    async move(req, res) {
        const columnId = parseInt(req.params.columnId)
        const userId = req.user.id
        const { newOrder } = req.body
        const orderValue = parseInt(newOrder)

        if (!columnId || orderValue === undefined) return res.status(400).json({ error: 'ID da Coluna e Nova Ordem são obrigatórios!' })
        if (isNaN(orderValue)) return res.status(400).json({ error: 'newOrder é obrigatório e deve ser um número inteiro!' })

        try {
            const updatedColumn = await ColumnService.moveColumn({ columnId, userId, newOrder: orderValue })
            return res.status(200).json(updatedColumn)
        } catch (error) {
            console.error('Erro ao mover coluna:', error)
            return res.status(error.message.includes('permissão') ? 403 : 500).json({ error: error.message })
        }
    },

}

module.exports = ColumnController