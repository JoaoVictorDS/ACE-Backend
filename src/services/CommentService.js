const prisma = require('../config/prisma')
const PermissionService = require('./PermissionService')
const { NOTIFICATION_TYPES, RESOURCE_TYPES, PERMISSION_LEVELS } = require('../constants')
const LogService = require('./LogService')
const MentionService = require('./MentionService')
const appEventEmitter = require('../config/events')
const { emitToRoom } = require('../config/socket')
const AppError = require('../errors/AppError')

const CommentService = {

    async create({ user, itemId, content }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.ITEM, itemId, user, PERMISSION_LEVELS.VIEW)
        const userId = user.id

        const item = await prisma.item.findUnique({
            where: { id: itemId },
            select: { title: true }
        })

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
            newValue: `Comentário criado: ${MentionService.sanitize(content, 50)}`
        })

        MentionService.process({
            actor: user,
            boardId,
            itemId,
            itemTitle: item.title,
            text: content,
            context: 'comment'
        })

        appEventEmitter.emit('item.action', {
            actor: user,
            boardId,
            itemId,
            action: NOTIFICATION_TYPES.COMMENT_CREATED,
            content: { itemTitle: item.title }
        })

        emitToRoom(`board:${boardId}`, 'comment:created', newComment)

        return newComment
    },

    async getByItem({ user, itemId }) {
        await PermissionService.check(RESOURCE_TYPES.ITEM, itemId, user, PERMISSION_LEVELS.VIEW)

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

    async update({ user, commentId, content }) {
        const userId = user.id
        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
            include: { item: { select: { title: true } } }
        })
        if (!comment) throw new AppError('Comentário não encontrado!', 404)

        const isOwner = comment.user_id === userId
        if (!isOwner) throw new AppError('Você não tem permissão para editar este comentário.', 403)

        const { boardId, workspaceId } = await PermissionService._resolveBoardContext(RESOURCE_TYPES.ITEM, comment.item_id)

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
            oldValue: `Conteúdo: ${MentionService.sanitize(comment.content, 50)}`,
            newValue: `Conteúdo: ${MentionService.sanitize(content, 50)}`
        })

        MentionService.process({
            actor: user,
            boardId,
            itemId: comment.item_id,
            itemTitle: comment.item.title,
            text: content,
            oldText: comment.content,
            context: 'comment'
        })

        appEventEmitter.emit('item.action', {
            actor: user,
            boardId,
            itemId: comment.item_id,
            action: NOTIFICATION_TYPES.COMMENT_UPDATED,
            content: { itemTitle: comment.item.title }
        })

        emitToRoom(`board:${boardId}`, 'comment:updated', updatedComment)

        return updatedComment
    },

    async delete({ user, commentId }) {
        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
            include: { item: { select: { title: true } } }
        })
        if (!comment) throw new AppError('Comentário não encontrado!', 404)

        const { boardId, workspaceId, creatorId } = await PermissionService._resolveBoardContext(RESOURCE_TYPES.ITEM, comment.item_id)
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
            oldValue: `Comentário removido: ${MentionService.sanitize(comment.content, 50)}`
        })

        appEventEmitter.emit('item.action', {
            actor: user,
            boardId,
            itemId: comment.item_id,
            action: NOTIFICATION_TYPES.COMMENT_DELETED,
            content: { itemTitle: comment.item.title }
        })

        emitToRoom(`board:${boardId}`, 'comment:deleted', { commentId })

        return deletedComment
    },
}

module.exports = CommentService