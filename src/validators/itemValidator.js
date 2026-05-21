const { z } = require('zod')

const item_id = z.coerce.number({
    error: (issue) => issue.input === undefined
        ? 'O parâmetro "item_id" é obrigatório'
        : 'O ID do Item deve ser number'
}).gt(0, 'O ID do Item não pode ser menor ou igual a 0')

const title = z.string({
    error: (issue) => issue.input === undefined
        ? 'O campo "title" é obrigatório'
        : 'O Título deve ser string'
}).trim().min(1, 'O Título não pode ser vazio')

const createItemSchema = {
    params: z.object({
        section_id: z.coerce.number({
            error: (issue) => issue.input === undefined
                ? 'O parâmetro "section_id" é obrigatório'
                : 'O ID da Seção deve ser number'
        }).gt(0, 'O ID da Seção não pode ser menor ou igual a 0'),
    }),

    body: z.object({ title })
}

const showItemSchema = {
    params: z.object({ item_id })
}

const updateItemSchema = {
    params: z.object({ item_id }),

    body: z.object({
        title
    })
}

const moveItemSchema = {
    params: z.object({ item_id }),

    body: z.object({
        new_section_id: z.coerce.number()
            .gt(0, 'O ID da Nova Seção não pode ser menor ou igual a 0')
            .optional(),

        new_order: z.coerce.number()
            .min(0, 'A Nova Ordem não pode ser negativa')
            .optional()
    }).refine(data => data.new_section_id !== undefined || data.new_order !== undefined, {
        error: 'Você deve informar ao menos a "new_section_id" ou a "new_order" para mover o item'
    })
}

const deleteItemSchema = {
    params: z.object({ item_id })
}

module.exports = {
    createItemSchema,
    showItemSchema,
    updateItemSchema,
    moveItemSchema,
    deleteItemSchema
}