const { error } = require('console')
const { z } = require('zod')

const board_id = z.coerce.number({
    error: (issue) => issue.input === undefined
        ? 'O parâmetro "board_id" é obrigatório'
        : 'O ID do Quadro deve ser number'
}).gt(0, 'O ID do Quadro não pode ser menor ou igual a 0')

const column_id = z.coerce.number({
    error: (issue) => issue.input === undefined
        ? 'O parâmetro "column_id" é obrigatório'
        : 'O ID da Coluna deve ser number'
}).gt(0, 'O ID da Coluna não pode ser menor ou igual a 0')

const columnFields = {
    name: z.string({
        error: (issue) => issue.input === undefined
            ? 'O campo "name" é obrigatório'
            : 'O Nome deve ser string'
    }).trim().min(1, 'O Nome não pode ser vazio'),

    data_type: z.preprocess(
        (val) => (typeof val === 'string' ? val.toUpperCase() : val),

        z.enum(['TEXT', 'LONG_TEXT', 'SELECT', 'USER', 'DATE', 'NUMBER', 'FORMULA'], {
            error: (issue) => issue.input === undefined
                ? 'O campo "data_type" é obrigatório'
                : 'Tipo de Dado inválido. Use "TEXT", "LONG_TEXT", "SELECT", "USER", "DATE", "NUMBER" ou "FORMULA"'
        })),

    options: z.array(z.string()).optional(),

    formula_expression: z.string().trim().optional()
}

const applyColumnRefinements = (schema) => {
    return schema
        .refine(data => {
            if (data.data_type === 'SELECT') return Array.isArray(data.options) && data.options.length > 0
            return true
        }, { error: 'O tipo SELECT exige um array de opções ("options") válidas', path: ['options'] })
        .refine(data => {
            if (data.data_type === 'FORMULA') return !!data.formula_expression
            return true
        }, { error: 'O tipo FORMULA exige uma expressão de cálculo ("formula_expression") válida', path: ['formula_expression'] })
}

const createColumnSchema = applyColumnRefinements(
    z.object({
        board_id,

        ...columnFields
    }))

const updateColumnSchema = applyColumnRefinements(
    z.object({
        ...columnFields
    }).partial().extend({
        column_id
    }))

const moveColumnSchema = z.object({
    column_id,

    new_order: z.coerce.number({
        error: (issue) => issue.input === undefined
            ? 'O campo "new_order" é obrigatório'
            : 'A Nova Ordem deve ser number'
    }).min(0)
})

const listColumnsSchema = z.object({
    board_id
})

const deleteColumnSchema = z.object({
    column_id,

    force: z.preprocess(
        (val) => val === 'true' || val === true,
        z.boolean().default(false)
    )
})

module.exports = { createColumnSchema, updateColumnSchema, moveColumnSchema, listColumnsSchema, deleteColumnSchema }