const prisma = require('../config/prisma')
const PermissionService = require('./PermissionService')
const LogService = require('./LogService')
const AppError = require('../utils/AppError')

const CommentService = {

    async createComment({ user, itemId, content }) {
        const { boardId, workspaceId } = await PermissionService.checkPermission(PermissionService.TYPES.ITEM, itemId, user, PermissionService.LEVELS.VIEW)
        const userId = user.id

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
            workspaceId,
            boardId,
            action: 'CREATE',
            entityType: 'COMMENT',
            entityId: itemId,
            newValue: `Comentário criado: ${content.substring(0, 50) + (content.length > 50 ? '...' : '')}`
        })

        return newComment
    },

    async getCommentsByItem({ user, itemId }) {
        await PermissionService.checkPermission(PermissionService.TYPES.ITEM, itemId, user, PermissionService.LEVELS.VIEW)

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

    async updateComment({ user, commentId, content }) {
        const userId = user.id
        const comment = await prisma.comment.findUnique({
            where: { id: commentId }
        })
        const isOnwer = comment.user_id !== userId

        if (!comment) throw new AppError('Comentário não encontrado!', 404)
        if (!isOnwer) throw new AppError('Você não tem permissão para editar este comentário!', 403)

        const { boardId, workspaceId } = await PermissionService._resolveBoardContext(PermissionService.TYPES.ITEM, comment.item_id)

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
            workspaceId,
            boardId,
            action: 'UPDATE',
            entityType: 'COMMENT',
            entityId: comment.item_id,
            oldValue: `Conteúdo: ${comment.content.substring(0, 50)}`,
            newValue: `Conteúdo: ${content.substring(0, 50)}`
        })

        return updatedComment
    },

    async deleteComment({ user, commentId }) {
        const comment = await prisma.comment.findUnique({
            where: { id: commentId }
        })
        if (!comment) throw new AppError('Comentário não encontrado!', 404)

        const { boardId, workspaceId, creatorId } = await PermissionService._resolveBoardContext(PermissionService.TYPES.ITEM, comment.item_id)
        const userId = user.id
        const isOwner = comment.user_id === userId
        const isBoardOwner = creatorId === userId
        const isSystemAdmin = user.role === 'ADMIN'

        if (!isOwner && !isBoardOwner && !isSystemAdmin) throw new AppError('Você não tem permissão para excluir este comentário!', 403)

        const deletedComment = await prisma.comment.delete({
            where: { id: commentId }
        })

        LogService.register({
            userId,
            workspaceId,
            boardId,
            action: 'DELETE',
            entityType: 'COMMENT',
            entityId: comment.item_id,
            oldValue: `Comentário removido: ${comment.content.substring(0, 50)}`
        })

        return deletedComment
    },
}

module.exports = CommentService