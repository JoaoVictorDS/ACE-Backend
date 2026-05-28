const { z } = require('zod')
const { item_id, comment_id, content } = require('../../shared/validators/common.fields')

const createCommentSchema = {
    params: z.object({ item_id }),

    body: z.object({ content })
}

const updateCommentSchema = {
    params: z.object({ comment_id }),

    body: z.object({ content })
}

const listCommentsSchema = {
    params: z.object({ item_id })
}

const deleteCommentSchema = {
    params: z.object({ comment_id })
}

module.exports = { createCommentSchema, updateCommentSchema, listCommentsSchema, deleteCommentSchema }