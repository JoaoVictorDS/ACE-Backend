const { z } = require('zod')

const columnFields = {
    name: z.string({
        error: (issue) => issue.input === undefined
            ? 'O campo "name" é obrigatório'
            : 'O Nome deve ser string'
    })
        .trim()
        .min(1, 'O Nome não pode ser vazio'),

    data_type: z.enum(['TEXT', 'LONG_TEXT', 'SELECT', 'USER', 'DATE', 'NUMBER', 'FORMULA'], {
        error: (issue) => issue.input === undefined
            ? 'O campo "data_type" é obrigatório'
            : 'Tipo de Dado inválido. Use "TEXT", "LONG_TEXT", "SELECT", "USER", "DATE", "NUMBER" ou "FORMULA"'
    }),

    options: z.array(z.string())
        .optional(),

    formula_expression: z.string()
        .trim()
        .optional()
}

const createColumnSchema = z.object({
    ...columnFields,
    board_id: z.number({
        error: (issue) => issue.input === undefined
            ? 'O parâmetro "boardId" é obrigatório'
            : 'O ID do Quadro deve ser number'
    })
        .gt(0, 'O ID do Quadro não pode ser menor ou igual a 0'),
})
    .refine(data => {
        if (data.data_type === 'SELECT') return Array.isArray(data.options) && data.options.length > 0
        return true
    }, { error: 'O tipo SELECT exige um array de opções ("options") válidas', path: ['options'] })
    .refine(data => {
        if (data.data_type === 'FORMULA') return !!data.formula_expression
        return true
    }, { error: 'O tipo FORMULA exige uma expressão de cálculo ("formula_expression") válida', path: ['formula_expression'] })

const updateColumnSchema = z.object({
    ...columnFields
})
    .partial()
    .extend({
        column_id: z.number({
            error: (issue) => issue.input === undefined
                ? 'O parâmetro "columnId" é obrigatório'
                : 'O ID da Coluna deve ser number'
        })
            .gt(0, 'O ID da Coluna não pode ser menor ou igual a 0')
    })
    .refine(data => {
        if (data.data_type === 'SELECT') return Array.isArray(data.options) && data.options.length > 0
        return true
    }, { error: 'O tipo SELECT exige um array de opções ("options") válidas', path: ['options'] })
    .refine(data => {
        if (data.data_type === 'FORMULA') return !!data.formula_expression
        return true
    }, { error: 'O tipo FORMULA exige uma expressão de cálculo ("formula_expression") válida', path: ['formula_expression'] })

const moveColumnSchema = z.object({
    column_id: z.number({
        error: (issue) => issue.input === undefined
            ? 'O parâmetro "columnId" é obrigatório'
            : 'O ID da Coluna deve ser number'
    })
        .gt(0),

    new_order: z.number({
        error: (issue) => issue.input === undefined
            ? 'O campo "new_order" é obrigatório'
            : 'A Nova Ordem deve ser number'
    })
        .min(0)
})

module.exports = { createColumnSchema, updateColumnSchema, moveColumnSchema }