const { z } = require('zod')
const { item_id, column_id } = require('../../shared/validators/common.fields')

const upsertItemValueSchema = {
    params: z.object({
        item_id,

        column_id
    }),

    body: z.object({
        value: z.union([
            z.string(),
            z.number(),
            z.array(z.union([z.string(), z.number()])),
            z.null(),
            z.undefined()
        ]).nonoptional('O campo "value" é obrigatório')
    })
}

module.exports = { upsertItemValueSchema }