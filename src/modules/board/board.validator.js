const { z } = require('zod')
const { board_id, color, name, item_label_singular, item_label_plural, workspace_id, force, new_order } = require('../../shared/validators/common.fields')

const createBoardSchema = {
    params: z.object({ workspace_id }),

    body: z.object({ name })
}

const showBoardSchema = {
    params: z.object({ board_id })
}

const updateBoardSchema = {
    params: z.object({ board_id }),

    body: z.object({
        name: z.string().min(1, 'Nome não pode estar vazio').max(100, 'Nome não pode exceder 100 caracteres').trim().optional(),

        color,

        item_label_singular,

        item_label_plural
    }).strict().refine((data) => Object.keys(data).length > 0, { message: 'Ao menos um campo deve ser fornecido para atualizar.' })
}

const deleteBoardSchema = {
    params: z.object({ board_id }),

    query: z.object({ force })
}

const moveBoardSchema = {
    params: z.object({ board_id }),

    body: z.object({})
}

const getHistorySchema = {
    params: z.object({ board_id })
}

module.exports = {
    createBoardSchema,
    showBoardSchema,
    updateBoardSchema,
    moveBoardSchema,
    deleteBoardSchema,
    getHistorySchema
}