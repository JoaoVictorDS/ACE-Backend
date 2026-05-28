const { z } = require('zod')
const { item_id, section_id } = require('../../shared/validators/common.fields')

const title = z.string({
    error: (issue) => issue.input === undefined
        ? 'O campo "title" é obrigatório'
        : 'O título deve ser string'
}).trim().min(1, 'O título não pode ser vazio')

const createItemSchema = {
    params: z.object({ section_id }),

    body: z.object({ title })
}

const showItemSchema = {
    params: z.object({ item_id })
}

const updateItemSchema = {
    params: z.object({ item_id }),

    body: z.object({ title })
}

const moveItemSchema = {
    params: z.object({ item_id }),

    body: z.object({
        new_section_id: z.coerce.number()
            .gt(0, 'O ID da nova seção não pode ser menor ou igual a 0')
            .optional(),

        new_order: z.coerce.number()
            .min(0, 'A nova ordem não pode ser negativa')
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