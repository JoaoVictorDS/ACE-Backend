const { z } = require('zod')

const loginSchema = z.object({
    email: z.string({
        error: (issue) => issue.input === undefined
            ? 'O campo "email" é obrigatório'
            : 'O E-mail deve ser string'
    })
        .trim()
        .toLowerCase()
        .min(1, 'O E-mail não pode ser vazio')
        .pipe(z.email('E-mail inválido')),

    password: z.string({
        error: (issue) => issue.input === undefined
            ? 'O campo "password" é obrigatório'
            : 'A Senha deve ser string'
    })
        .min(6, 'A Senha deve ter pelo menos 6 caracteres')
})

module.exports = { loginSchema }