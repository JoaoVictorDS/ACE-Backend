const { appEventEmitter, emitToRoom } = require('../../config')
const LogService = require('../log/log.service')
const MentionService = require('../notification/mention.service')
const ItemRepository = require('../item/item.repository')
const CommentRepository = require('./comment.repository')
const CommentPresenter = require('./comment.presenter')
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
            entityType: 'COMMENT',
            entityId: newComment.id,
            action: NOTIFICATION_TYPES.COMMENT_CREATED,
            content: { text: MentionService.sanitize(content, 50) }
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

        const current = await CommentRepository.findById(commentId)
        if (!current)
            throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.COMMENT)

        const isOwner = current.user_id === userId
        if (!isOwner)
            throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('editar', 'COMMENT'))

        const { boardId, workspaceId } = await PermissionService._resolveResourceContext(RESOURCE_TYPES.ITEM, current.item_id)

        if (current.content === content) return CommentPresenter.update(current)

        const updatedComment = await CommentRepository.update(commentId, content)

        LogService.register({
            userId,
            workspaceId,
            boardId,
            action: 'UPDATE',
            entityType: 'COMMENT',
            entityId: commentId,
            oldValue: MentionService.sanitize(current.content, 50),
            newValue: MentionService.sanitize(content, 50)
        })

        MentionService.process({
            actor: user,
            boardId,
            itemId: current.item_id,
            itemTitle: current.item.title,
            text: content,
            oldText: current.content,
            context: 'comment'
        })

        appEventEmitter.emit('item.action', {
            actor: user,
            boardId,
            itemId: current.item_id,
            entityType: 'COMMENT',
            entityId: commentId,
            action: NOTIFICATION_TYPES.COMMENT_UPDATED,
            content: null
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

        if (!isOwner && !isBoardOwner && !isSystemAdmin)
            throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('excluir', 'COMMENT'))

        const deletedComment = await CommentRepository.delete(commentId)

        LogService.register({
            userId,
            workspaceId,
            boardId,
            action: 'DELETE',
            entityType: 'COMMENT',
            entityId: commentId,
            oldValue: comment.content
        })

        appEventEmitter.emit('item.action', {
            actor: user,
            boardId,
            itemId: comment.item_id,
            entityType: 'COMMENT',
            entityId: commentId,
            action: NOTIFICATION_TYPES.COMMENT_DELETED,
            content: null
        })

        emitToRoom(`board:${boardId}`, 'comment:deleted', { commentId })

        return deletedComment
    },
}

module.exports = CommentService