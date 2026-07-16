const prisma = require('../../config/prisma')

const CommentRepository = {

    async create(itemId, userId, content) {
        return prisma.comment.create({
            data: {
                item_id: itemId,
                user_id: userId,
                content,
            },
            include: { user: { select: { id: true, name: true } } }
        })
    },

    async findByItem(itemId) {
        return prisma.comment.findMany({
            where: { item_id: itemId },
            orderBy: { created_at: 'asc' },
            include: { user: { select: { id: true, name: true } } }
        })
    },

    async findById(commentId) {
        return prisma.comment.findUnique({
            where: { id: commentId },
            include: {
                item: { select: { title: true } },
                user: { select: { id: true, name: true } }
            }
        })
    },

    async update(commentId, content) {
        return prisma.comment.update({
            where: { id: commentId },
            data: { content },
            include: { user: { select: { id: true, name: true } } }
        })
    },

    async delete(commentId) {
        return prisma.comment.delete({
            where: { id: commentId }
        })
    }

}

module.exports = CommentRepository