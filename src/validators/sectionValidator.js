const { z } = require('zod')

const createSectionSchema = z.object({
    name: z.string({
        error: (issue) => issue.input === undefined
            ? 'O campo "name" é obrigatório'
            : 'O Nome deve ser string'
    })
        .trim()
        .min(1, 'O Nome não pode ser vazio'),

    board_id: z.number({
        error: (issue) => issue.input === undefined
            ? 'O campo "board_id" é obrigatório'
            : 'O ID do Quadro deve ser number'
    })
        .gt(0, 'O ID do Quadro não pode ser menor ou igual a 0')
})

const updateSectionSchema = z.object({
    name: z.string({
        error: (issue) => issue.input === undefined
            ? 'O campo "name" é obrigatório'
            : 'O Nome deve ser string'
    })
        .trim()
        .min(1, 'O Nome não pode ser vazio')
})

const moveSectionSchema = z.object({
    new_order: z.number({
        error: (issue) => issue.input === undefined
            ? 'O campo "new_order" é obrigatório'
            : 'A Nova Ordem deve ser number'
    })
        .min(0, 'A Nova Ordem não pode ser negativa')
})

module.exports = {
    createSectionSchema,
    updateSectionSchema,
    moveSectionSchema
}