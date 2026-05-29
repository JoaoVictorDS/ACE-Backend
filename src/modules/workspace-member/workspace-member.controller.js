const WorkspaceMemberService = require('./workspace-member.service')
const catchAsync = require('../../shared/utils/catchAsync')

const WorkspaceMemberController = {

    upsert: catchAsync(async (req, res, next) => {
        const { workspace_id: workspaceId } = req.params
        const { member_email: memberEmail, ...otherFields } = req.body

        const member = await WorkspaceMemberService.upsert({
            user: req.user,
            workspaceId,
            memberEmail,
            ...otherFields
        })

        return res.status(200).json(member)
    }),

    list: catchAsync(async (req, res, next) => {
        const { workspace_id: workspaceId } = req.params

        const members = await WorkspaceMemberService.getByWorkspace({
            user: req.user,
            workspaceId
        })

        return res.status(200).json(members)
    }),

    remove: catchAsync(async (req, res, next) => {
        const { workspace_id: workspaceId, member_id: memberIdToRemove } = req.params

        await WorkspaceMemberService.remove({
            user: req.user,
            workspaceId,
            memberIdToRemove
        })

        return res.status(204).send()
    }),

    leave: catchAsync(async (req, res, next) => {
        const { workspace_id: workspaceId } = req.params

        await WorkspaceMemberService.leave({
            user: req.user,
            workspaceId
        })

        return res.status(204).send()
    }),

}

module.exports = WorkspaceMemberController