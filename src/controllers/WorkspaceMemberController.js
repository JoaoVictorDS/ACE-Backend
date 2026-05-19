const WorkspaceMemberService = require('../services/WorkspaceMemberService')
const catchAsync = require('../utils/catchAsync')
const { upsertMemberSchema, listMemberSchema, removeMemberSchema, leaveWorkspaceSchema } = require('../validators/workspaceMemberValidator')

const WorkspaceMemberController = {

    upsert: catchAsync(async (req, res, next) => {
        const { member_email: memberEmail, workspace_id: workspaceId, ...otherFields } = upsertMemberSchema.parse({
            ...req.body,
            ...req.params
        })

        const member = await WorkspaceMemberService.upsert({
            user: req.user,
            workspaceId,
            memberEmail,
            ...otherFields
        })

        return res.status(200).json(member)
    }),

    list: catchAsync(async (req, res, next) => {
        const { workspace_id: workspaceId } = listMemberSchema.parse(req.params)

        const members = await WorkspaceMemberService.getByWorkspace({
            user: req.user,
            workspaceId
        })

        return res.status(200).json(members)
    }),

    remove: catchAsync(async (req, res, next) => {
        const { workspace_id: workspaceId, member_id: memberIdToRemove } = removeMemberSchema.parse(req.params)

        await WorkspaceMemberService.remove({
            user: req.user,
            workspaceId,
            memberIdToRemove
        })

        return res.status(204).send()
    }),

    leave: catchAsync(async (req, res, next) => {
        const { workspace_id: workspaceId } = leaveWorkspaceSchema.parse(req.params)

        await WorkspaceMemberService.leave({
            user: req.user,
            workspaceId
        })

        return res.status(204).send()
    }),

}

module.exports = WorkspaceMemberController