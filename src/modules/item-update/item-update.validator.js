const { z } = require('zod')
const { item_id, content, item_update_id } = require('../../shared/validators/common.fields')

const createItemUpdateSchema = {
    params: z.object({ item_id }),

    body: z.object({ content })
}

const listItemUpdateSchema = {
    params: z.object({ item_id })
}

const updateItemUpdateSchema = {
    params: z.object({ item_update_id }),

    body: z.object({ content })
}

const deleteItemUpdateSchema = {
    params: z.object({ item_update_id })
}

module.exports = {
    createItemUpdateSchema,
    listItemUpdateSchema,
    updateItemUpdateSchema,
    deleteItemUpdateSchema
}