const { appEventEmitter, emitToRoom } = require('../../config')
const LogService = require('../log/log.service')
const MentionService = require('../notification/mention.service')
const ItemRepository = require('../item/item.repository')
const CommentRepository = require('./comment.repository')
const { NotFoundError, AuthorizationError } = require('../../shared/errors')
const { NOTIFICATION_TYPES, RESOURCE_TYPES, PERMISSION_LEVELS } = require('../../shared/constants')
const { PermissionService } = require('../../shared/services')
const ERROR_CATALOG = require('../../shared/errors/error-catalog')

const CommentService = {

    async create({ user, itemId, content }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.ITEM, itemId, user, PERMISSION_LEVELS.VIEW)
        const userId = user.id
        const { title: itemTitle } = await ItemRepository.findItemTitle(itemId)

        const newComment = await CommentRepository.create(itemId, userId, content)

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
            itemTitle,
            text: content,
            context: 'comment'
        })

        appEventEmitter.emit('item.action', {
            actor: user,
            boardId,
            itemId,
            action: NOTIFICATION_TYPES.COMMENT_CREATED,
            content: { itemTitle }
        })

        emitToRoom(`board:${boardId}`, 'comment:created', newComment)

        return newComment
    },

    async getByItem({ user, itemId }) {
        await PermissionService.check(RESOURCE_TYPES.ITEM, itemId, user, PERMISSION_LEVELS.VIEW)

        return await CommentRepository.findByItem(itemId)
    },

    async update({ user, commentId, content }) {
        const userId = user.id
        const comment = await CommentRepository.findById(commentId)
        if (!comment) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.COMMENT)

        const isOwner = comment.user_id === userId
        if (!isOwner) throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('editar', 'COMMENT'))

        const { boardId, workspaceId } = await PermissionService._resolveResourceContext(RESOURCE_TYPES.ITEM, comment.item_id)

        const updatedComment = await CommentRepository.update(commentId, content)

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
        const comment = await CommentRepository.findById(commentId)
        if (!comment) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.COMMENT)

        const { boardId, workspaceId, creatorId } = await PermissionService._resolveResourceContext(RESOURCE_TYPES.ITEM, comment.item_id)
        const userId = user.id
        const isOwner = comment.user_id === userId
        const isBoardOwner = creatorId === userId
        const isSystemAdmin = user.role === 'ADMIN'

        if (!isOwner && !isBoardOwner && !isSystemAdmin) throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('excluir', 'COMMENT'))

        const deletedComment = await CommentRepository.delete(commentId)

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