const { z } = require('zod')

const item_id = z.coerce.number({
    error: (issue) => issue.input === undefined
        ? 'O parâmetro "item_id" é obrigatório'
        : 'O ID do Item deve ser number'
}).gt(0, 'O ID do Item não pode ser menor ou igual a 0')

const comment_id = z.coerce.number({
    error: (issue) => issue.input === undefined
        ? 'O parâmetro "comment_id" é obrigatório'
        : 'O ID do Comentário deve ser number'
}).gt(0, 'O ID do Comentário não pode ser menor ou igual a 0')

const createCommentSchema = z.object({
    item_id,

    content: z.string({
        error: (issue) => issue.input === undefined
            ? 'O campo "content" é obrigatório'
            : 'O Conteúdo deve ser string'
    }).trim().min(1, 'O Conteúdo não pode ser vazio')
})

const updateCommentSchema = z.object({
    comment_id,

    content: z.string({
        error: (issue) => issue.input === undefined
            ? 'O campo "content" é obrigatório'
            : 'O Conteúdo deve ser string'
    }).trim().min(1, 'O Conteúdo não pode ser vazio')
})

const listCommentsSchema = z.object({
    item_id
})

const deleteCommentSchema = z.object({
    comment_id
})

module.exports = { createCommentSchema, updateCommentSchema, listCommentsSchema, deleteCommentSchema }