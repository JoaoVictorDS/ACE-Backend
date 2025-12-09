const prisma = require('../config/prisma')

const CommentService = {
    async createComment({ itemId, userId, content }) {
        if (!itemId || !userId || !content) {
            throw new Error('ID do Item, ID do Usuário e conteúdo são obrigatórios!')
        }

        const newComment = await prisma.comment.create({
            data: {
                item_id: itemId,
                user_id: userId,
                content: content,
            },
            include: {
                user: {
                    select: { id: true, name: true }
                }
            }
        })

        return newComment
    },

    async getCommentByItem(itemId) {
        if (!itemId) {
            throw new Error('ID do Item é obrigatório para listar comentários!')
        }

        const comments = await prisma.comment.findMany({
            where: { item_id: itemId },
            orderBy: { created_at: 'asc' },
            include: {
                user: {
                    select: { id: true, name: true }
                }
            }
        })

        return comments
    },

    async deleteComment(commentId) {
        if (!commentId) {
            throw new Error('ID do comentário é obrigatório para exclusão!')
        }

        const deleteComment = await prisma.comment.delete({
            where: { id: commentId }
        })

        return deleteComment
    }
}

module.exports = CommentService