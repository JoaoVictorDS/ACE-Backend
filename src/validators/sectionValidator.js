const { z } = require('zod')

const section_id = z.coerce.number({
    error: (issue) => issue.input === undefined
        ? 'O parâmetro "section_id" é obrigatório'
        : 'O ID da Seção deve ser number'
}).gt(0, 'O ID da Seção não pode ser menor ou igual a 0')

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

const createSectionSchema = z.object({
    board_id,

    name
})

const updateSectionSchema = z.object({
    section_id,

    name
})

const moveSectionSchema = z.object({
    section_id,

    new_order: z.coerce.number({
        error: (issue) => issue.input === undefined
            ? 'O campo "new_order" é obrigatório'
            : 'A Nova Ordem deve ser number'
    }).min(0, 'A Nova Ordem não pode ser negativa')
})

const listSectionsSchema = z.object({
    board_id
})

const deleteSectionSchema = z.object({
    section_id
})

module.exports = {
    createSectionSchema,
    updateSectionSchema,
    moveSectionSchema,
    listSectionsSchema,
    deleteSectionSchema
}