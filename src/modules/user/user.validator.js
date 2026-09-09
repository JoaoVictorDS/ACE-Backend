const { z } = require('zod')
const { user_id, name, email, password } = require('../../shared/validators/common.fields')

const role = z.preprocess(
    (val) => (typeof val === 'string' ? val.toUpperCase() : val),
    z.enum(['ADMIN', 'MEMBER'], {
        error: () => 'Role inválida. Use "ADMIN" ou "MEMBER"'
    })
).optional()

const theme = z.preprocess(
    (val) => (typeof val === 'string' ? val.toUpperCase() : val),
    z.enum(['LIGHT', 'DARK'], {
        error: () => 'Theme inválido. Use "LIGHT" ou "DARK"'
    })
).optional()

const preferences = z.object({
    theme
}).optional()

const userBodyFields = {
    name,
    email,
    password,
    role,
    preferences
}

const createUserSchema = {
    body: z.object(userBodyFields)
}

const showUserSchema = {
    params: z.object({ user_id })
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

const updateMeSchema = {
    body: z.object({
        name,
        email,
        preferences
    })
        .partial()
        .refine(
            data => Object.keys(data).length > 0,
            { message: 'Informe ao menos um campo para atualizar o usuário' }
        )
}

const updatePasswordSchema = {
    body: z.object({
        currentPassword: password,
        newPassword: password
    })
}

const deleteUserSchema = {
    params: z.object({ user_id })
}

module.exports = { createUserSchema, showUserSchema, updateMeSchema, updatePasswordSchema, updateUserSchema, deleteUserSchema }