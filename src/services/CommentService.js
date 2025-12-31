const prisma = require('../config/prisma')
const PermissionService = require('./PermissionService')
const LogService = require('./LogService')
const BoardContextService = require('./BoardContextService')

const CommentService = {

    async createComment({ itemId, userId, content }) {
        const boardId = await BoardContextService.getBoardId(itemId, 'ITEM')
        await PermissionService.checkViewPermission(boardId, userId)

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

        await LogService.register({
            userId,
            boardId,
            action: 'CREATE',
            entityType: 'COMMENT',
            entityId: itemId,
            newValue: content.substring(0, 50) + (content.length > 50 ? '...' : '')
        })

        return newComment
    },

    async getCommentByItem(itemId, userId) {
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

    async deleteComment(commentId, userId) {
        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
            include: { item: { select: { section: { select: { board_id: true } } } } }
        })

        if (!comment) throw new Error('Comentário não encontrado!')

        const boardId = comment.item.section.board_id
        const userRole = await PermissionService.getRole(boardId, userId)

        const isOwnerOfComment = comment.user_id === userId
        const isBoardOwner = userRole === 'OWNER'

        if (!isOwnerOfComment && !isBoardOwner) throw new Error('Você não tem permissão para excluir este comentário!')

        const deleted = prisma.comment.delete({
            where: { id: commentId }
        })

        await LogService.register({
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