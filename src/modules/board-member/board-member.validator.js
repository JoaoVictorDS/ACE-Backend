const { z } = require('zod')
const { board_id, member_email, role, member_id } = require('../../shared/validators/common.fields')

const column_widths = z.record(
    z.string().regex(/^\d+$/),
    z.number().int().positive()
)

const upsertMemberSchema = {
    params: z.object({ board_id }),

    body: z.object({
        member_email,

        role
    })
}

const updatePreferencesSchema = {
    params: z.object({ board_id }),

    body: z.object({
        preferences: z.object({
            column_widths
        })
    })
}

const listMembersSchema = {
    params: z.object({ board_id })
}

const removeMemberSchema = {
    params: z.object({
        board_id,

        member_id
    })
}

const leaveBoardSchema = {
    params: z.object({ board_id })
}

module.exports = { upsertMemberSchema, updatePreferencesSchema, listMembersSchema, removeMemberSchema, leaveBoardSchema }