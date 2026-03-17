const { z } = require('zod')

const name = z.string({
    error: (issue) => issue.input === undefined
        ? 'O campo "name" é obrigatório'
        : 'O Nome deve ser string'
}).trim().min(1, 'O Nome não pode ser vazio')

const workspace_id = z.coerce.number({
    error: (issue) => issue.input === undefined
        ? 'O parâmetro "workspace_id" é obrigatório'
        : 'O ID da Área de Trabalho deve ser number'
}).gt(0, 'O ID da Área de Trabalho não pode ser menor ou igual a 0')

const createWorkspaceSchema = z.object({
    name
})

const updateWorkspaceSchema = z.object({
    workspace_id,
    name
})

const deleteWorkspaceSchema = z.object({
    workspace_id,

    force: z.preprocess(
        (val) => val === 'true' || val === true,
        z.boolean().default(false)
    )
})

const movedWorkspaceSchema = z.object({
    workspace_id,

    new_order: z.coerce.number({
        error: (issue) => issue.input === undefined
            ? 'O campo "new_order" é obrigatório'
            : 'A Nova Ordem deve ser number'
    }).min(0, 'A Nova Ordem não pode ser negativa')
})

const getHistorySchema = z.object({
    workspace_id
})

module.exports = {
    createWorkspaceSchema,
    updateWorkspaceSchema,
    deleteWorkspaceSchema,
    movedWorkspaceSchema,
    getHistorySchema
}