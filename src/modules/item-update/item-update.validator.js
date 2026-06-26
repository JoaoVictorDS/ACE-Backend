const { z } = require('zod')
const { item_id, content } = require('../../shared/validators/common.fields')

const createItemUpdateSchema = {
    params: z.object({ item_id }),

    body: z.object({ content })
}

module.exports = {
    createItemUpdateSchema
}