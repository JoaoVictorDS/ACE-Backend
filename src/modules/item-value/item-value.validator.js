const { z } = require('zod')

const upsertItemValueSchema = z.object({
    item_id: z.coerce.number({
        error: (issue) => issue.input === undefined
            ? 'O parâmetro "item_id" é obrigatório'
            : 'O ID do Item deve ser number'
    }).gt(0, 'O ID do Item não pode ser menor ou igual a 0'),

    column_id: z.coerce.number({
        error: (issue) => issue.input === undefined
            ? 'O parâmetro "column_id" é obrigatório'
            : 'O ID da Coluna deve ser number'
    }).gt(0, 'O ID da Coluna não pode ser menor ou igual a 0'),

    value: z.union([
        z.string(),
        z.number(),
        z.array(z.union([z.string(), z.number()])),
        z.null(),
        z.undefined()
    ])
})

module.exports = { upsertItemValueSchema }