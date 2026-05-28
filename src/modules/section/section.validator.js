const { z } = require('zod')
const { section_id, board_id, name, new_order, force } = require('../../shared/validators/common.fields')

const createSectionSchema = {
    params: z.object({ board_id }),

    body: z.object({ name })
}

const updateSectionSchema = {
    params: z.object({ section_id }),

    body: z.object({ name })
}

const moveSectionSchema = {
    params: z.object({ section_id }),

    body: z.object({ new_order })
}

const listSectionsSchema = {
    params: z.object({ board_id })
}

const deleteSectionSchema = {
    params: z.object({ section_id }),

    query: z.object({ force })
}

module.exports = {
    createSectionSchema,
    updateSectionSchema,
    moveSectionSchema,
    listSectionsSchema,
    deleteSectionSchema
}