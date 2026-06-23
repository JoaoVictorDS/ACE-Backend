const { z } = require('zod')
const { board_id: board_id_required } = require('../../shared/validators/common.fields')

const ACTION_TYPES = ['ITEM_CREATED', 'ITEM_DELETED', 'ITEM_UPDATED', 'COMMENT_CREATED', 'COMMENT_UPDATED', 'COMMENT_DELETED']
const ACTION_TYPES_LABEL = '"ITEM_CREATED", "ITEM_UPDATED", "ITEM_DELETED", "COMMENT_CREATED", "COMMENT_UPDATED" ou "COMMENT_DELETED"'
const actionTypeEnum = (context = 'body') => z.preprocess(
    (val) => (typeof val === 'string' ? val.toUpperCase() : val),
    z.enum(ACTION_TYPES, {
        error: (issue) => issue.input === undefined
            ? `O ${context === 'body' ? 'campo' : 'parâmetro'} é obrigatório`
            : `Tipo inválido em "action_type". Use ${ACTION_TYPES_LABEL}`
    })
)

const board_id = z.coerce.number().gt(0, 'O ID do quadro não pode ser menor ou igual a 0').nullable().default(null)

const updateUserNotificationSettingSchema = {
    params: z.object({
        board_id
    }),

    body: z.object({
        settings: z.array(z.object({
            action_type: actionTypeEnum('body'),

            enabled: z.boolean({
                error: (issue) => issue.input === undefined
                    ? 'O campo "enabled" é obrigatório'
                    : 'Tipo inválido em "enabled". Use "true" ou "false"'
            })
        }))
            .min(1, 'Informe ao menos uma configuração')
            .refine(
                (arr) => new Set(arr.map(s => s.action_type)).size === arr.length,
                { message: 'Não pode haver "action_type" duplicado' }
            )
    })
}

const listUserNotificationSettingSchema = {
    params: z.object({
        board_id
    })
}

const deleteUserNotificationSettingSchema = {
    params: z.object({
        board_id: board_id_required,
        action_type: actionTypeEnum('param')
    })
}

const resetUserNotificationSettingSchema = {
    params: z.object({
        board_id: board_id_required
    })
}

module.exports = {
    listUserNotificationSettingSchema,
    updateUserNotificationSettingSchema,
    deleteUserNotificationSettingSchema,
    resetUserNotificationSettingSchema
}