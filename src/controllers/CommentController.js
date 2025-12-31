const CommentService = require('../services/CommentService')

const CommentController = {

    async create(req, res) {
        const itemId = parseInt(req.params.itemId)
        const userId = req.user.id
        const { content } = req.body

        if (!itemId || !content?.trim()) return res.status(400).json({ error: 'ID do Item e Conteúdo são obrigatórios!' })

        try {
            const comment = await CommentService.createComment({ itemId, userId, content })
            return res.status(201).json({
                message: 'Comentário criado com sucesso!',
                comment
            })
        } catch (error) {
            const statusCode = error.message.includes('permissão') ? 403 : 400
            return res.status(statusCode).json({ error: error.message })
        }
    },

    async list(req, res) {
        const itemId = parseInt(req.params.itemId)
        const userId = req.user.id

        if (!itemId) return res.status(400).json({ error: 'ID do Item é obrigatório para listar comentários!' })

        try {
            const comments = await CommentService.getCommentByItem({ itemId, userId })
            return res.status(200).json(comments)
        } catch (error) {
            const statusCode = error.message.includes('permissão') ? 403 : 500
            return res.status(statusCode).json({ error: error.message })
        }
    },

    async delete(req, res) {
        const commentId = parseInt(req.params.commentId)
        const userId = req.user.id

        if (!commentId) return res.status(400).json({ error: 'ID do comentário é obrigatório para exclusão!' })

        try {
            await CommentService.deleteComment({ commentId, userId })
            return res.status(200).json({ message: 'Comentário excluído com sucesso!' })
        } catch (error) {
            const statusCode = error.message.includes('permissão') ? 403 : 404
            return res.status(statusCode).json({ error: error.message })
        }
    },

}

module.exports = CommentController