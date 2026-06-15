const { z } = require('zod')
const { name, workspace_id, force, new_order, limit, page, description, icon } = require('../../shared/validators/common.fields')

const createWorkspaceSchema = {
    body: z.object({ name })
}

const updateWorkspaceSchema = {
    params: z.object({ workspace_id }),

    body: z.object({
        name: z.string().min(1, 'Nome não pode estar vazio').max(100, 'Nome não pode exceder 100 caracteres').trim().optional(),

        description,

        icon
    }).strict().refine((data) => Object.keys(data).length > 0, { message: 'Ao menos um campo deve ser fornecido para atualizar.' })
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

    query: z.object({ limit, page })
}

module.exports = {
    createWorkspaceSchema,
    updateWorkspaceSchema,
    deleteWorkspaceSchema,
    movedWorkspaceSchema,
    getHistorySchema
}