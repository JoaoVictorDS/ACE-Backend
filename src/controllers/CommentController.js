const CommentService = require('../services/CommentService')
const catchAsync = require('../utils/catchAsync')
const { createCommentSchema, updateCommentSchema, deleteCommentSchema, listCommentsSchema } = require('../validators/commentValidator')

const CommentController = {

    create: catchAsync(async (req, res, next) => {
        const { item_id: itemId, ...otherFields } = createCommentSchema.parse({
            ...req.body,
            ...req.params
        })

        const comment = await CommentService.createComment({
            itemId,
            userId: req.user.id,
            ...otherFields
        })

        return res.status(201).json({
            message: 'Comentário criado com sucesso!',
            comment
        })
    }),

    list: catchAsync(async (req, res, next) => {
        const { item_id: itemId } = listCommentsSchema.parse(req.params)

        const comments = await CommentService.getCommentsByItem({
            itemId,
            userId: req.user.id
        })

        return res.status(200).json(comments)
    }),

    update: catchAsync(async (req, res, next) => {
        const { comment_id: commentId, ...otherFields } = updateCommentSchema.parse({
            ...req.body,
            ...req.params
        })

        const updatedComment = await CommentService.updateComment({
            commentId,
            userId: req.user.id,
            ...otherFields
        })

        return res.status(200).json({
            message: 'Comentário atualizado com sucesso!',
            updatedComment
        })
    }),

    delete: catchAsync(async (req, res, next) => {
        const { comment_id: commentId } = deleteCommentSchema.parse(req.params)

        await CommentService.deleteComment({
            commentId,
            userId: req.user.id
        })

        return res.status(200).json({
            message: 'Comentário excluído com sucesso!'
        })
    }),

}

module.exports = CommentController