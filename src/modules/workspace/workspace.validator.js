const { z } = require('zod')
const { name, workspace_id, force, new_order } = require('../../shared/validators/common.fields')

const createWorkspaceSchema = {
    body: z.object({ name })
}

const updateWorkspaceSchema = {
    params: z.object({ workspace_id }),

    body: z.object({ name })
}

const deleteWorkspaceSchema = {
    params: z.object({ workspace_id }),

    query: z.object({ force })
}

const movedWorkspaceSchema = {
    params: z.object({ workspace_id }),

    body: z.object({ new_order })
}

const getHistorySchema = {
    params: z.object({ workspace_id }),
}

module.exports = {
    createWorkspaceSchema,
    updateWorkspaceSchema,
    deleteWorkspaceSchema,
    movedWorkspaceSchema,
    getHistorySchema
}