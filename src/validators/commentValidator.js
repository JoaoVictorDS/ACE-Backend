const { z } = require('zod')

const createCommentSchema = z.object({
    item_id: z.number({
        error: (issue) => issue.input === undefined
            ? 'O parâmetro "item_id" é obrigatório'
            : 'O ID do Item deve ser number'
    })
        .gt(0, 'O ID do Item não pode ser menor ou igual a 0'),

    content: z.string({
        error: (issue) => issue.input === undefined
            ? 'O campo "content" é obrigatório'
            : 'O Conteúdo deve ser string'
    })
        .trim()
        .min(1, 'O Conteúdo não pode ser vazio')
})

const updateCommentSchema = z.object({
    comment_id: z.number({
        error: (issue) => issue.input === undefined
            ? 'O parâmetro "commentId" é obrigatório'
            : 'O ID do Comentário deve ser number'
    })
        .gt(0, 'O ID do Comentário não pode ser menor ou igual a 0'),

    content: z.string({
        error: (issue) => issue.input === undefined
            ? 'O campo "content" é obrigatório'
            : 'O Conteúdo deve ser string'
    })
        .trim()
        .min(1, 'O Conteúdo não pode ser vazio')
})

module.exports = { createCommentSchema, updateCommentSchema }