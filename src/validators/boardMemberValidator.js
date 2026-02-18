const { z } = require('zod')

const upsertMemberSchema = z.object({
    member_email: z.string({
        error: (issue) => issue.input === undefined
            ? 'O campo "member_email" é obrigatório'
            : 'O E-mail do Membro deve ser string'
    })
        .trim()
        .toLowerCase()
        .min(1, 'O E-mail do Membro não pode ser vazio')
        .pipe(z.email('E-mail inválido')),

    role: z.enum(['ADMIN', 'EDITOR', 'VIEWER'], {
        error: (issue) => issue.input === undefined
            ? 'O campo "role" é obrigatório'
            : 'Role inválida. Use "ADMIN", "EDITOR" ou "VIEWER"'
    }),

    board_id: z.number({
        error: (issue) => issue.input === undefined
            ? 'O parâmetro "boardId" é obrigatório'
            : 'O ID do Quadro deve ser number'
    })
        .gt(0, 'O ID do Quadro não pode ser menor ou igual a 0')
})

module.exports = { upsertMemberSchema }