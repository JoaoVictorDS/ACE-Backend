const WorkspaceMemberService = require('../services/WorkspaceMemberService')
const catchAsync = require('../utils/catchAsync')
const { upsertMemberSchema, listMemberSchema, removeMemberSchema, leaveWorkspaceSchema } = require('../validators/workspaceMemberValidator')

const WorkspaceMemberController = {

    upsert: catchAsync(async (req, res, next) => {
        const { member_email: memberEmail, workspace_id: workspaceId, ...otherFields } = upsertMemberSchema.parse({
            ...req.body,
            ...req.params
        })

        const member = await WorkspaceMemberService.upsertMember({
            user: req.user,
            workspaceId,
            memberEmail,
            ...otherFields
        })

        return res.status(200).json({
            message: 'Permissão de membro atualizada/adicionada com sucesso!',
            member
        })
    }),

    list: catchAsync(async (req, res, next) => {
        const { workspace_id: workspaceId } = listMemberSchema.parse(req.params)

        const members = await WorkspaceMemberService.getMembersByWorkspace({
            user: req.user,
            workspaceId
        })

        return res.status(200).json(members)
    }),

    remove: catchAsync(async (req, res, next) => {
        const { workspace_id: workspaceId, member_id: memberIdToRemove } = removeMemberSchema.parse(req.params)

        await WorkspaceMemberService.removeMember({
            user: req.user,
            workspaceId,
            memberIdToRemove
        })

        return res.status(200).json({
            message: 'Membro removido com sucesso!'
        })
    }),

    leave: catchAsync(async (req, res, next) => {
        const { workspace_id: workspaceId } = leaveWorkspaceSchema.parse(req.params)

        await WorkspaceMemberService.leaveWorkspace({
            user: req.user,
            workspaceId
        })

        return res.status(200).json({
            message: 'Você saiu da área de trabalho com sucesso!'
        })
    }),

}

module.exports = WorkspaceMemberController