const CommentService = require('./comment.service')
const { catchAsync } = require('../../shared/utils')

const CommentController = {

    create: catchAsync(async (req, res, next) => {
        const { item_id: itemId } = req.validated.params
        const { content } = req.validated.body

        const comment = await CommentService.create({
            user: req.user,
            itemId,
            content
        })

        return res.status(201).json(comment)
    }),

    list: catchAsync(async (req, res, next) => {
        const { item_id: itemId } = req.validated.params

        const comments = await CommentService.getByItem({
            user: req.user,
            itemId
        })

        return res.status(200).json(comments)
    }),

    update: catchAsync(async (req, res, next) => {
        const { comment_id: commentId } = req.validated.params
        const { content } = req.validated.body

        const updatedComment = await CommentService.update({
            user: req.user,
            commentId,
            content
        })

        return res.status(200).json(updatedComment)
    }),

    delete: catchAsync(async (req, res, next) => {
        const { comment_id: commentId } = req.validated.params

        await CommentService.delete({
            user: req.user,
            commentId
        })

        return res.status(204).send()
    }),

}

module.exports = CommentController