const WorkspaceService = require('./workspace.service')
const WorkspaceMemberService = require('../workspace-member/workspace-member.service')
const LogService = require('../log/log.service')
const catchAsync = require('../../shared/utils/catchAsync')

const WorkspaceController = {

    create: catchAsync(async (req, res, next) => {
        const { name } = req.validated.body

        const workspace = await WorkspaceService.create({
            user: req.user,
            name
        })

        return res.status(201).json(workspace)
    }),

    list: catchAsync(async (req, res, next) => {
        const workspace = await WorkspaceService.getByUser({
            user: req.user
        })

        return res.status(200).json(workspace)
    }),

    update: catchAsync(async (req, res, next) => {
        const { workspace_id: workspaceId } = req.validated.params
        const { ...otherFields } = req.validated.body

        const updatedWorkspace = await WorkspaceService.update({
            user: req.user,
            workspaceId,
            ...otherFields
        })

        return res.status(200).json(updatedWorkspace)
    }),

    delete: catchAsync(async (req, res, next) => {
        const { workspace_id: workspaceId } = req.validated.params
        const { force } = req.validated.query

        await WorkspaceService.delete({
            user: req.user,
            workspaceId,
            force
        })

        return res.status(204).send()
    }),

    move: catchAsync(async (req, res, next) => {
        const { workspace_id: workspaceId } = req.validated.params
        const { new_order: newOrder } = req.validated.body

        const movedWorkspaceship = await WorkspaceMemberService.move({
            user: req.user,
            workspaceId,
            newOrder,
        })

        return res.status(200).json(movedWorkspaceship)
    }),

    getHistory: catchAsync(async (req, res, next) => {
        const { workspace_id: workspaceId } = req.validated.params

        const logs = await LogService.getByWorkspace({
            user: req.user,
            workspaceId
        })

        return res.status(200).json(logs)
    })

}

module.exports = WorkspaceController
