const { z } = require('zod')

const createItemSchema = z.object({
    title: z.string({
        error: (issue) => issue.input === undefined
            ? 'O campo "title" é obrigatório'
            : 'O Título deve ser string'
    })
        .trim()
        .min(1, 'O Título não pode ser vazio'),

    section_id: z.number({
        error: (issue) => issue.input === undefined
            ? 'O parâmetro "sectionId" é obrigatório'
            : 'O ID da Seção deve ser number'
    })
        .gt(0, 'O ID da Seção não pode ser menor ou igual a 0')
})

const updateItemSchema = z.object({
    item_id: z.number({
        error: (issue) => issue.input === undefined
            ? 'O parâmetro "itemId" é obrigatório'
            : 'O ID do Item deve ser number'
    })
        .gt(0, 'O ID do Item não pode ser menor ou igual a 0'),

    title: z.string()
        .min(1, 'O Título não pode ser vazio')
        .optional(),

    values: z.record(
        z.string()
            .min(1, 'O ID da Coluna não pode ser vazio'),
        z.any()
    ).optional()
}).refine(data => data.title !== undefined || (data.values !== undefined && Object.keys(data.values).length > 0), {
    error: 'Você deve informar ao menos o "title" ou "values" para atualizar o item'
})

const moveItemSchema = z.object({
    item_id: z.number({
        error: (issue) => issue.input === undefined
            ? 'O parâmetro "itemId" é obrigatório'
            : 'O ID do Item deve ser number'
    })
        .gt(0, 'O ID do Item não pode ser menor ou igual a 0'),

    new_section_id: z.number()
        .gt(0, 'O ID da Nova Seção não pode ser menor ou igual a 0')
        .optional(),

    new_order: z.number()
        .min(0, 'A Nova Ordem não pode ser negativa')
        .optional()
}).refine(data => data.new_section_id !== undefined || data.new_order !== undefined, {
    error: 'Você deve informar ao menos a "new_section_id" ou a "new_order" para mover o item'
})

module.exports = {
    createItemSchema,
    updateItemSchema,
    moveItemSchema
}