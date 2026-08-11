const { emitToRoom } = require('../../config')
const CommentRepository = require('./comment.repository')
const CommentPresenter = require('./comment.presenter')
const { NotFoundError, AuthorizationError } = require('../../shared/errors')
const { RESOURCE_TYPES, PERMISSION_LEVELS, ENTITY_TYPES } = require('../../shared/constants')
const { PermissionService } = require('../../shared/services')
const ERROR_CATALOG = require('../../shared/errors/error-catalog')
const { EventPublisher } = require('../../shared/events')

const CommentService = {

    async create({ user, itemId, content }) {
        const { boardId, workspaceId } = await PermissionService.check(RESOURCE_TYPES.ITEM, itemId, user, PERMISSION_LEVELS.VIEW)

        const newComment = await CommentRepository.create(itemId, user.id, content)

        EventPublisher.publish({
            actor: user,
            workspaceId,
            boardId,
            itemId,
            entityType: ENTITY_TYPES.COMMENT,
            entityId: newComment.id,
            action: 'CREATE',
            resource: { workspaceId, boardId, item: { id: newComment.item_id, title: newComment.item.title }, commentId: newComment.id },
            changes: { before: null, after: newComment.content },
            snapshot: {
                before: null,
                after: {
                    id: newComment.id,
                    item_id: newComment.item_id,
                    user_id: newComment.user_id,
                    parent_id: newComment.parent_id,
                    content: newComment.content,
                    deleted_at: null
                }
            }
        })

        emitToRoom(`board:${boardId}`, 'comment:created', newComment)

        return newComment
    },

    async getByItem({ user, itemId }) {
        await PermissionService.check(RESOURCE_TYPES.ITEM, itemId, user, PERMISSION_LEVELS.VIEW)

        return await CommentRepository.findByItem(itemId)
    },

    async update({ user, commentId, content }) {
        const current = await CommentRepository.findById(commentId)
        if (!current) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.COMMENT)

        const isOwner = current.user_id === user.id
        if (!isOwner) throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('editar', 'COMMENT'))

        const { boardId, workspaceId } = await PermissionService._resolveResourceContext(RESOURCE_TYPES.ITEM, current.item_id)
        if (current.content === content) return CommentPresenter.format(current)

        const updatedComment = await CommentRepository.update(commentId, content)

        EventPublisher.publish({
            actor: user,
            workspaceId,
            boardId,
            itemId: updatedComment.item_id,
            entityType: ENTITY_TYPES.COMMENT,
            entityId: updatedComment.id,
            action: 'UPDATE',
            resource: { workspaceId, boardId, item: { id: updatedComment.item_id, title: updatedComment.item.title }, commentId },
            changes: { before: current.content, after: updatedComment.content }
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

        EventPublisher.publish({
            actor: user,
            workspaceId,
            boardId,
            itemId: comment.item_id,
            entityType: ENTITY_TYPES.COMMENT,
            entityId: comment.id,
            action: 'CREATE',
            resource: { workspaceId, boardId, item: { id: comment.id, title: comment.item.title }, commentId },
            changes: { before: comment.content, after: null },
            snapshot: {
                before: {
                    id: comment.id,
                    item_id: comment.item_id,
                    user_id: comment.user_id,
                    parent_id: comment.parent_id,
                    content: comment.content,
                    deleted_at: null
                },
                after: null
            }
        })

        emitToRoom(`board:${boardId}`, 'comment:deleted', { commentId })

        return deletedComment
    },
}

module.exports = CommentService