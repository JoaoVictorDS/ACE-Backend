const { z } = require('zod')

const board_id = z.coerce.number({
    error: (issue) => issue.input === undefined
        ? 'O parâmetro "board_id" é obrigatório'
        : 'O ID do Quadro deve ser number'
}).gt(0, 'O ID do Quadro não pode ser menor ou igual a 0')

const upsertMemberSchema = z.object({
    board_id,

    member_email: z.string({
        error: (issue) => issue.input === undefined
            ? 'O campo "member_email" é obrigatório'
            : 'O E-mail do Membro deve ser string'
    }).trim().toLowerCase().min(1, 'O E-mail do Membro não pode ser vazio').pipe(z.email('E-mail inválido')),

    role: z.enum(['ADMIN', 'EDITOR', 'VIEWER'], {
        error: (issue) => issue.input === undefined
            ? 'O campo "role" é obrigatório'
            : 'Role inválida. Use "ADMIN", "EDITOR" ou "VIEWER"'
    })
})

const listMembersSchema = z.object({
    board_id
})

const removeMemberSchema = z.object({
    board_id,

    member_id: z.coerce.number({
        error: (issue) => issue.input === undefined
            ? 'O parâmetro "member_id" é obrigatório'
            : 'O ID do Membro deve ser number'
    }).gt(0, 'O ID do Membro não pode ser menor ou igual a 0')
})

const leaveBoardSchema = z.object({
    board_id
})

module.exports = { upsertMemberSchema, listMembersSchema, removeMemberSchema, leaveBoardSchema }