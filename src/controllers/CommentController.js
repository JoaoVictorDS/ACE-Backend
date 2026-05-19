const CommentService = require('../services/CommentService')
const catchAsync = require('../utils/catchAsync')
const { createCommentSchema, updateCommentSchema, deleteCommentSchema, listCommentsSchema } = require('../validators/commentValidator')

const CommentController = {

    create: catchAsync(async (req, res, next) => {
        const { item_id: itemId, ...otherFields } = createCommentSchema.parse({
            ...req.body,
            ...req.params
        })

        const comment = await CommentService.create({
            user: req.user,
            itemId,
            ...otherFields
        })

        return res.status(201).json(comment)
    }),

    list: catchAsync(async (req, res, next) => {
        const { item_id: itemId } = listCommentsSchema.parse(req.params)

        const comments = await CommentService.getByItem({
            user: req.user,
            itemId
        })

        return res.status(200).json(comments)
    }),

    update: catchAsync(async (req, res, next) => {
        const { comment_id: commentId, ...otherFields } = updateCommentSchema.parse({
            ...req.body,
            ...req.params
        })

        const updatedComment = await CommentService.update({
            user: req.user,
            commentId,
            ...otherFields
        })

        return res.status(200).json(updatedComment)
    }),

    delete: catchAsync(async (req, res, next) => {
        const { comment_id: commentId } = deleteCommentSchema.parse(req.params)

        await CommentService.delete({
            user: req.user,
            commentId
        })

        return res.status(204).send()
    }),

}

module.exports = CommentController