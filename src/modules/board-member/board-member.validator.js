const { z } = require('zod')
const { board_id, member_email, role, member_id } = require('../../shared/validators/common.fields')

const column_widths = z.record(
    z.string().regex(/^\d+$/),
    z.number().positive()
)

const item_width = z.number().positive()

const hidden_sections = z.record(
    z.string().regex(/^\d+$/),
    z.boolean()
)

const sidebar_collapsed = z.boolean()

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
            column_widths,
            item_width,
            hidden_sections,
            sidebar_collapsed
        }).partial()
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