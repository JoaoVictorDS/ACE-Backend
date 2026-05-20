const { z } = require('zod')

const listNotificationsSchema = z.object({
    page: z.coerce.number().gt(0, 'A página não pode ser menor ou igual a 0').default(1),
    limit: z.coerce.number().gt(0, 'O limite não pode ser menor ou igual a 0').max(100).default(20)
})

const markAsReadSchema = z.object({
    notification_id: z.coerce.number({
        error: (issue) => issue.input === undefined
            ? 'O parâmetro "notification_id" é obrigatório'
            : 'O ID da notificação deve ser number'
    }).gt(0, 'O ID da notificação não pode ser menor ou igual a 0')
})

module.exports = {
    listNotificationsSchema,
    markAsReadSchema
}