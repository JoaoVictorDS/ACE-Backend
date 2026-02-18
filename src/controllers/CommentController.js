const CommentService = require('../services/CommentService')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/AppError')
const { createCommentSchema, updateCommentSchema } = require('../validators/commentValidator')

const CommentController = {

    create: catchAsync(async (req, res, next) => {
        const result = createCommentSchema.safeParse({
            ...req.body,
            item_id: parseInt(req.params.itemId)
        })
        if (!result.success) return next(new AppError(result.error.issues[0].message, 400))

        const { content, item_id } = result.data

        const comment = await CommentService.createComment({
            itemId: item_id,
            userId: req.user.id,
            content
        })
        return res.status(201).json({
            message: 'Comentário criado com sucesso!',
            comment
        })
    }),

    list: catchAsync(async (req, res, next) => {
        const itemId = parseInt(req.params.itemId)
        if (!itemId || isNaN(itemId)) return next(new AppError('O parâmetro "itemId" é obrigatório e deve ser number', 400))

        const comments = await CommentService.getCommentByItem(
            itemId, req.user.id)
        return res.status(200).json(comments)
    }),

    update: catchAsync(async (req, res, next) => {
        const result = updateCommentSchema.safeParse({
            ...req.body,
            comment_id: parseInt(req.params.commentId)
        })
        if (!result.success) return next(new AppError(result.error.issues[0].message, 400))

        const { comment_id, content } = result.data

        const updatedComment = await CommentService.updateComment({
            commentId: comment_id,
            userId: req.user.id,
            content
        })

        return res.status(200).json({
            message: 'Comentário atualizado com sucesso!',
            comment: updatedComment
        })

    }),

    delete: catchAsync(async (req, res, next) => {
        const commentId = parseInt(req.params.commentId)
        if (!commentId || isNaN(commentId)) return next(new AppError('O parâmetro "commentId" é obrigatório e deve ser number', 400))

        await CommentService.deleteComment(
            commentId,
            req.user.id
        )
        return res.status(200).json({ message: 'Comentário excluído com sucesso!' })
    }),

}

module.exports = CommentController