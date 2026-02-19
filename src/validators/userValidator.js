const { z } = require('zod')

const user_id = z.coerce.number({
    error: (issue) => issue.input === undefined
        ? 'O parâmetro "user_id" é obrigatório'
        : 'O ID do Usuário deve ser number'
}).gt(0, 'O ID do Usuário não pode ser menor ou igual a 0')

const userFields = {
    name: z.string({
        error: (issue) => issue.input === undefined
            ? 'O campo "name" é obrigatório'
            : 'O Nome deve ser string'
    }).trim().min(1, 'O Nome não pode ser vazio'),

    email: z.string({
        error: (issue) => issue.input === undefined
            ? 'O campo "email" é obrigatório'
            : 'O E-mail deve ser string'
    }).trim().toLowerCase().pipe(z.email('E-mail inválido')),

    password: z.string({
        error: (issue) => issue.input === undefined
            ? 'O campo "password" é obrigatório'
            : 'A Senha deve ser string'
    }).min(6, 'A Senha deve ter pelo menos 6 caracteres'),

    role: z.preprocess(
        (val) => (typeof val === 'string' ? val.toUpperCase() : val),

        z.enum(['ADMIN', 'MEMBER'], {
            error: (issue) => 'Role inválida. Use "ADMIN" ou "MEMBER"'
        }).optional()
    )
}

const createUserSchema = z.object(userFields)

const updateUserSchema = z.object(userFields).partial().extend({
    user_id
}).refine(data => {
    const { user_id, ...updates } = data
    return Object.keys(updates).length > 0
}, {
    error: 'Você deve informar ao menos o "name", "email", "password" ou "role" para atualizar o usuário'
})

const deleteUserSchema = z.object({
    user_id
})

module.exports = {
    createUserSchema,
    updateUserSchema,
    deleteUserSchema
}