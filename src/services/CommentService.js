const prisma = require('../config/prisma')
const PermissionService = require('./PermissionService')
const LogService = require('./LogService')
const BoardContextService = require('./BoardContextService')

const CommentService = {

    async createComment({ itemId, userId, content }) {
        const boardId = await BoardContextService.getBoardId(itemId, 'ITEM')
        await PermissionService.checkEditPermission(boardId, userId)

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

        LogService.register({
            userId,
            boardId,
            action: 'CREATE',
            entityType: 'COMMENT',
            entityId: itemId,
            newValue: content.substring(0, 50) + (content.length > 50 ? '...' : '')
        })

        return newComment
    },

    async getCommentsByItem({ itemId, userId }) {
        const boardId = await BoardContextService.getBoardId(itemId, 'ITEM')
        await PermissionService.checkViewPermission(boardId, userId)

        return await prisma.comment.findMany({
            where: { item_id: itemId },
            orderBy: { created_at: 'asc' },
            include: {
                user: {
                    select: { id: true, name: true }
                }
            }
        })
    },

    async updateComment({ commentId, userId, content }) {
        const comment = await prisma.comment.findUnique({
            where: { id: commentId }
        })

        if (!comment) throw new Error('Comentário não encontrado!')
        if (comment.user_id !== userId) throw new Error('Você não tem permissão para editar este comentário!')

        const boardId = await BoardContextService.getBoardId(comment.item_id, 'ITEM')

        const updatedComment = await prisma.comment.update({
            where: { id: commentId },
            data: { content },
            include: {
                user: {
                    select: { id: true, name: true }
                }
            }
        })

        LogService.register({
            userId,
            boardId,
            action: 'UPDATE',
            entityType: 'COMMENT',
            entityId: comment.item_id,
            oldValue: comment.content.substring(0, 50),
            newValue: content.substring(0, 50)
        })

        return updatedComment
    },

    async deleteComment({ commentId, userId }) {
        const comment = await prisma.comment.findUnique({
            where: { id: commentId }
        })
        if (!comment) throw new Error('Comentário não encontrado!')

        const boardId = await BoardContextService.getBoardId(comment.item_id, 'ITEM')
        const userRole = await PermissionService.getRole(boardId, userId)

        const isOwnerOfComment = comment.user_id === userId
        const isBoardOwner = userRole === 'OWNER'

        if (!isOwnerOfComment && !isBoardOwner) throw new Error('Você não tem permissão para excluir este comentário!')

        const deleted = await prisma.comment.delete({
            where: { id: commentId }
        })

        LogService.register({
            userId,
            boardId,
            action: 'DELETE',
            entityType: 'COMMENT',
            entityId: comment.item_id,
            oldValue: comment.content.substring(0, 50)
        })

        return deleted
    },
}

module.exports = CommentService