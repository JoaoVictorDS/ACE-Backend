const { z } = require('zod')
const { board_id, name, workspace_id, force, new_order } = require('../../shared/validators/common.fields')

const createBoardSchema = {
    params: z.object({ workspace_id }),

    body: z.object({ name })
}

const showBoardSchema = {
    params: z.object({ board_id })
}

const updateBoardSchema = {
    params: z.object({ board_id }),

    body: z.object({ name })
}

const deleteBoardSchema = {
    params: z.object({ board_id }),

    query: z.object({ force })
}

const moveBoardSchema = {
    params: z.object({ board_id }),

    body: z.object({})
}

const getHistorySchema = {
    params: z.object({ board_id })
}

module.exports = {
    createBoardSchema,
    showBoardSchema,
    updateBoardSchema,
    moveBoardSchema,
    deleteBoardSchema,
    getHistorySchema
}