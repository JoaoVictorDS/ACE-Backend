const { z } = require('zod')
const { user_id, name, email, password } = require('../../shared/validators/common.fields')

const role = z.preprocess(
    (val) => (typeof val === 'string' ? val.toUpperCase() : val),
    z.enum(['ADMIN', 'MEMBER'], {
        error: () => 'Role inválida. Use "ADMIN" ou "MEMBER"'
    })
).optional()

const userBodyFields = { name, email, password, role }

const createUserSchema = {
    body: z.object(userBodyFields)
}

const updateUserSchema = {
    params: z.object({ user_id }),

    body: z.object(userBodyFields)
        .partial()
        .refine(
            data => Object.keys(data).length > 0,
            { message: 'Informe ao menos um campo para atualizar o usuário' }
        )
}

const deleteUserSchema = {
    params: z.object({ user_id })
}

module.exports = { createUserSchema, updateUserSchema, deleteUserSchema }