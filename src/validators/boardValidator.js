const { z } = require('zod')

const board_id = z.coerce.number({
    error: (issue) => issue.input === undefined
        ? 'O parâmetro "board_id" é obrigatório'
        : 'O ID do Quadro deve ser number'
}).gt(0, 'O ID do Quadro não pode ser menor ou igual a 0')

const name = z.string({
    error: (issue) => issue.input === undefined
        ? 'O campo "name" é obrigatório'
        : 'O Nome deve ser string'
}).trim().min(1, 'O Nome não pode ser vazio')

const createBoardSchema = z.object({
    name,

    workspace_id: z.coerce.number({
        error: (issue) => issue.input === undefined
            ? 'O parâmetro "workspace_id" é obrigatório'
            : 'O ID da Área de Trabalho deve ser number'
    }).gt(0, 'O ID da Área de Trabalho não pode ser menor ou igual a 0')
})

const updateBoardSchema = z.object({
    board_id,
    name
})

const deleteBoardSchema = z.object({
    board_id,

    force: z.preprocess(
        (val) => val === 'true' || val === true,
        z.boolean().default(false)
    )
})

const moveBoardSchema = z.object({
    board_id,

    new_order: z.coerce.number({
        error: (issue) => issue.input === undefined
            ? 'O campo "new_order" é obrigatório'
            : 'A Nova Ordem deve ser number'
    }).min(0, 'A Nova Ordem não pode ser negativa')
})

const getHistorySchema = z.object({
    board_id
})

module.exports = {
    createBoardSchema,
    updateBoardSchema,
    moveBoardSchema,
    deleteBoardSchema,
    getHistorySchema
}