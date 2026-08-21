const prisma = require('../../config/prisma')

const CommentRepository = {

    async create(itemId, userId, content) {
        return prisma.comment.create({
            data: {
                item_id: itemId,
                user_id: userId,
                content,
            },
            include: {
                user: { select: { id: true, name: true } },
                item: { select: { id: true, title: true } }
            }
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
                item: { select: { id: true, title: true } },
                user: { select: { id: true, name: true } }
            }
        })
    },

    async update(commentId, content) {
        return prisma.comment.update({
            where: { id: commentId },
            data: { content },
            include: {
                user: { select: { id: true, name: true } },
                item: { select: { id: true, title: true } }
            }
        })
    },

    async findCommentIdsByItems(itemIds, tx = null) {
        const client = tx || prisma

        return client.comment.findMany({
            where: { item_id: { in: itemIds } },
            select: { id: true }
        })
    },

    async softDelete(commentId) {
        return prisma.comment.update({
            where: { id: commentId },
            data: { deleted_at: new Date() }
        })
    },

    async softDeleteByItems(itemIds, timestamp, tx = null) {
        const client = tx || prisma

        return client.comment.updateMany({
            where: {
                item_id: { in: itemIds },
                deleted_at: null
            },
            data: { deleted_at: timestamp }
        })
    },

    async delete(commentId) {
        return prisma.comment.delete({
            where: { id: commentId }
        })
    }

}

module.exports = CommentRepository