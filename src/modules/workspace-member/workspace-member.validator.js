const { z } = require('zod')
const { workspace_id, member_email, role, member_id } = require('../../shared/validators/common.fields')

const upsertMemberSchema = {
    params: z.object({ workspace_id }),

    body: z.object({
        member_email,

        role
    })
}

const listMemberSchema = {
    params: z.object({ workspace_id }),
}

const removeMemberSchema = {
    params: z.object({
        workspace_id,
        member_id
    }),
}

const leaveWorkspaceSchema = {
    params: z.object({ workspace_id }),
}

module.exports = {
    upsertMemberSchema,
    listMemberSchema,
    removeMemberSchema,
    leaveWorkspaceSchema
}