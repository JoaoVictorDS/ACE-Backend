const { z } = require('zod')
const { sanitizeHTML } = require('../utils')

// ─── Factories (internas) ─────────────────────────────────────────

const makeIdField = (fieldName, label) =>
    z.coerce.number({
        error: (issue) => issue.input === undefined
            ? `O parâmetro "${fieldName}" é obrigatório`
            : `O ID ${label} deve ser number`
    }).gt(0, `O ID ${label} não pode ser menor ou igual a 0`)

const makeEmailField = (fieldName, label) =>
    z.string({
        error: (issue) => issue.input === undefined
            ? `O campo "${fieldName}" é obrigatório`
            : `O ${label} deve ser string`
    }).trim().toLowerCase().min(1, `O ${label} não pode ser vazio`).pipe(z.email('E-mail inválido'))

const makeStringField = (fieldName, label, { min = 1, transform } = {}) => {
    let field = z.string({
        error: (issue) => issue.input === undefined
            ? `O campo "${fieldName}" é obrigatório`
            : `O ${label} deve ser string`
    }).trim().min(min, min === 1
        ? `O ${label} não pode ser vazio`
        : `O ${label} deve ter pelo menos ${min} caracteres`
    )

    if (transform) field = field.transform(transform)
    return field
}

// ─── IDs ──────────────────────────────────────────────────────────

exports.board_id = makeIdField('board_id', 'do quadro')
exports.workspace_id = makeIdField('workspace_id', 'da área de trabalho')
exports.column_id = makeIdField('column_id', 'da coluna')
exports.section_id = makeIdField('section_id', 'da seção')
exports.item_id = makeIdField('item_id', 'do item')
exports.comment_id = makeIdField('comment_id', 'do comentário')
exports.user_id = makeIdField('user_id', 'do usuário')
exports.notification_id = makeIdField('notification_id', 'da notificação')
exports.member_id = makeIdField('member_id', 'do membro')

// ─── Emails ───────────────────────────────────────────────────────

exports.email = makeEmailField('email', 'e-mail')
exports.member_email = makeEmailField('member_email', 'e-mail do membro')

// ─── Strings ──────────────────────────────────────────────────────

exports.name = makeStringField('name', 'nome')
exports.password = makeStringField('password', 'senha', { min: 6 })
exports.content = makeStringField('content', 'conteúdo', { transform: sanitizeHTML })
exports.color = z.string().regex(/^#[0-9A-F]{6}$/i).optional()
exports.item_label_singular = z.string().min(1, 'Label não pode estar vazio').max(50, 'Label não pode exceder 50 caracteres').trim().optional()
exports.item_label_plural = z.string().min(1, 'Label não pode estar vazio').max(50, 'Label não pode exceder 50 caracteres').trim().optional()
exports.description = z.string().trim().optional()
exports.icon = z.string().trim().optional()

// ─── Numbers ──────────────────────────────────────────────────────

exports.new_order = z.coerce.number({
    error: (issue) => issue.input === undefined
        ? 'O campo "new_order" é obrigatório'
        : 'A nova ordem deve ser number'
}).min(0, 'A nova ordem não pode ser negativa')

// ─── Booleans ─────────────────────────────────────────────────────

exports.force = z.preprocess(
    (val) => val === 'true' || val === true,
    z.boolean().default(false)
)

// ─── Paginação ────────────────────────────────────────────────────

exports.page = z.coerce.number().gt(0, 'A página não pode ser menor ou igual a 0').default(1)
exports.limit = z.coerce.number().gt(0, 'O limite não pode ser menor ou igual a 0').max(100).default(20)

// ─── Enums ────────────────────────────────────────────────────────

exports.role = z.enum(['ADMIN', 'EDITOR', 'VIEWER'], {
    error: (issue) => issue.input === undefined
        ? 'O campo "role" é obrigatório'
        : 'Role inválida. Use "ADMIN", "EDITOR" ou "VIEWER"'
})