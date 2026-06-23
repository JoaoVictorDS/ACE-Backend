const { z } = require('zod')
const { board_id, column_id, name, force, new_order } = require('../../shared/validators/common.fields')

const ColumnTypesEnum = z.enum(['TEXT', 'LONG_TEXT', 'SELECT', 'USER', 'DATE', 'NUMBER', 'FORMULA'], {
    error: (issue) => issue.input === undefined
        ? 'O campo "data_type" é obrigatório'
        : 'Tipo inválido em "data_type". Use "TEXT", "LONG_TEXT", "SELECT", "USER", "DATE", "NUMBER" ou "FORMULA"'
})

const BoardRolesEnum = z.enum(['VIEWER', 'EDITOR'])

const columnBodyFields = {
    name,

    data_type: z.preprocess(
        (val) => (typeof val === 'string' ? val.toUpperCase() : val),
        ColumnTypesEnum
    ),

    options: z.array(z.string()).optional(),

    formula_expression: z.string().trim().optional()
}

const applyColumnRefinements = (schema) =>
    schema
        .refine(data => {
            if (data.data_type === 'SELECT') return Array.isArray(data.options) && data.options.length > 0
            return true
        }, { message: 'O tipo SELECT exige um array de opções ("options") válidas', path: ['options'] })
        .refine(data => {
            if (data.data_type === 'FORMULA') return !!data.formula_expression
            return true
        }, { message: 'O tipo FORMULA exige uma expressão ("formula_expression") válida', path: ['formula_expression'] })

const createColumnSchema = {
    params: z.object({ board_id }),

    body: applyColumnRefinements(z.object({ ...columnBodyFields }))
}

const updateColumnSchema = {
    params: z.object({ column_id }),

    body: applyColumnRefinements(z.object({ ...columnBodyFields }).partial())
}

const moveColumnSchema = {
    params: z.object({ column_id }),

    body: z.object({ new_order })
}

const listColumnsSchema = {
    params: z.object({ board_id })
}

const deleteColumnSchema = {
    params: z.object({ column_id }),
    query: z.object({ force })
}

const restrictionItemSchema = z.object({
    user_id: z.preprocess(
        (val) => (val === 'null' || val === '' ? null : val),
        z.number().int().positive().nullable()
    ).optional(),

    board_role: z.preprocess(
        (val) => typeof val === 'string' ? (val === 'null' || val === '' ? null : val.toUpperCase()) : val,
        BoardRolesEnum.nullable()
    ).optional(),

    can_view: z.boolean().default(true),

    can_edit: z.boolean().default(false),
}).refine(data => {
    const hasUser = data.user_id !== undefined && data.user_id !== null
    const hasRole = data.board_role !== undefined && data.board_role !== null
    return (hasUser && !hasRole) || (!hasUser && hasRole)
}, { message: 'A restrição deve ser aplicada a um usuário ou a um cargo, nunca a ambos ou a nenhum.' })

const updateColumnRestrictionsSchema = {
    params: z.object({ column_id }),

    body: z.object({ restrictions: z.array(restrictionItemSchema) })
}

module.exports = {
    createColumnSchema,
    updateColumnSchema,
    moveColumnSchema,
    listColumnsSchema,
    deleteColumnSchema,
    updateColumnRestrictionsSchema
}