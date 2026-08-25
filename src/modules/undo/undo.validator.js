const { z } = require('zod')
const { board_id, undo_action_id, limit, page } = require('../../shared/validators/common.fields')

const listUndoActionsSchema = {
    params: z.object({ board_id }),
    
    query: z.object({ limit, page })
}

const restoreUndoActionSchema = {
    params: z.object({ undo_action_id })
}

module.exports = { listUndoActionsSchema, restoreUndoActionSchema }