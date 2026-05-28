const { z } = require('zod')
const { page, limit, notification_id, } = require('../../shared/validators/common.fields')

const listNotificationsSchema = {
    query: z.object({
        page,
        limit
    })
}

const markAsReadSchema = {
    params: z.object({ notification_id })
}

module.exports = {
    listNotificationsSchema,
    markAsReadSchema
}