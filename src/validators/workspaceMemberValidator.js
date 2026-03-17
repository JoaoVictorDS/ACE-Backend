const { z } = require('zod')

const workspace_id = z.coerce.number({
    error: (issue) => issue.input === undefined
        ? 'O parâmetro "workspace_id" é obrigatório'
        : 'O ID da Área de Trabalho deve ser number'
}).gt(0, 'O ID da Área de Trabalho não pode ser menor ou igual a 0')

const upsertMemberSchema = z.object({
    workspace_id,

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

const listMemberSchema = z.object({
    workspace_id
})

const removeMemberSchema = z.object({
    workspace_id,

    member_id: z.coerce.number({
        error: (issue) => issue.input === undefined
            ? 'O parâmetro "member_id" é obrigatório'
            : 'O ID do Membro deve ser number'
    }).gt(0, 'O ID do Membro não pode ser menor ou igual a 0')
})

module.exports = {
    upsertMemberSchema,
    listMemberSchema,
    removeMemberSchema
}