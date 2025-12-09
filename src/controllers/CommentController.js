const CommentService = require('../services/CommentService')

const CommentController = {
    async create(req, res) {
        const itemId = parseInt(req.params.itemId)

        const userId = req.userId
        const { content } = req.body

        try {
            const comment = await CommentService.createComment({ itemId, userId, content })
            return res.status(201).json({
                message: 'Comentário criado com sucesso!',
                comment
            })
        } catch (error) {
            console.error('Erro ao criar comentário:', error)
            return res.status(400).json({ error: error.message })
        }
    },

    async list(req, res) {
        const itemId = parseInt(req.params.itemId)

        try {
            const comments = await CommentService.getCommentByItem(itemId)
            return res.status(200).json(comments)
        } catch (error) {
            console.error('Erro ao listar comentários:', error)
            return res.status(500).json({ error: 'Erro ao listar comentários!' })
        }
    },

    async delete(req, res) {
        const commentId = parseInt(req.params.commentId)

        try {
            await CommentService.deleteComment(commentId)
            return res.status(200).json({ message: 'Comentário excluído com sucesso!' })
        } catch (error) {
            console.error('Erro ao excluir comentário:', error)
            return res.status(400).json({ error: error.message })
        }
    }

}

module.exports = CommentController