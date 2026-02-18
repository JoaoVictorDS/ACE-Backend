const { z } = require('zod')

const createBoardSchema = z.object({
    name: z.string({
        error: (issue) => issue.input === undefined
            ? 'O campo "name" é obrigatório'
            : 'O Nome deve ser string'
    })
        .trim()
        .min(1, 'O Nome não pode ser vazio')
});

const updateBoardSchema = z.object({
    board_id: z.number({
        error: (issue) => issue.input === undefined
            ? 'O parâmetro "boardId" é obrigatório'
            : 'O ID do Quadro deve ser number'
    })
        .gt(0, 'O ID do Quadro não pode ser menor ou igual a 0'),

    name: z.string({
        error: (issue) => issue.input === undefined
            ? 'O campo "name" é obrigatório'
            : 'O Nome deve ser string'
    })
        .trim()
        .min(1, 'O Nome não pode ser vazio')
});

const moveBoardSchema = z.object({
    board_id: z.number({
        error: (issue) => issue.input === undefined
            ? 'O parâmetro "boardId" é obrigatório'
            : 'O ID do Quadro deve ser number'
    })
        .gt(0, 'O ID do Quadro não pode ser menor ou igual a 0'),

    new_order: z.number({
        error: (issue) => issue.input === undefined
            ? 'O campo "new_order" é obrigatório'
            : 'A Nova Ordem deve ser number'
    })
        .min(0, 'A Nova Ordem não pode ser negativa')
});

module.exports = {
    createBoardSchema,
    updateBoardSchema,
    moveBoardSchema
}