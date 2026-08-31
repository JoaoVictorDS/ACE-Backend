const { z } = require('zod')
const { workspace_id, board_id, undo_action_id, limit, page } = require('../../shared/validators/common.fields')

const listWorkspaceUndoActionsSchema = {
    params: z.object({ workspace_id }),

    query: z.object({ limit, page })
}

const listBoardUndoActionsSchema = {
    params: z.object({ board_id }),
    query: z.object({ limit, page })
}

const restoreUndoActionSchema = {
    params: z.object({ undo_action_id })
}

module.exports = { listWorkspaceUndoActionsSchema, listBoardUndoActionsSchema, restoreUndoActionSchema }