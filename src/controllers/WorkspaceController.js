const WorkspaceService = require('../services/WorkspaceService')
const WorkspaceMemberService = require('../services/WorkspaceMemberService')
const LogService = require('../services/LogService')
const catchAsync = require('../utils/catchAsync')
const { createWorkspaceSchema, deleteWorkspaceSchema, updateWorkspaceSchema, movedWorkspaceSchema, getHistorySchema } = require('../validators/workspaceValidator')

const WorkspaceController = {

    create: catchAsync(async (req, res, next) => {
        const { name } = createWorkspaceSchema.parse(req.body)

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
        const { workspace_id: workspaceId, ...otherFields } = updateWorkspaceSchema.parse({
            ...req.body,
            ...req.params
        })

        const updatedWorkspace = await WorkspaceService.update({
            user: req.user,
            workspaceId,
            ...otherFields
        })

        return res.status(200).json(updatedWorkspace)
    }),

    delete: catchAsync(async (req, res, next) => {
        const { workspace_id: workspaceId, force } = deleteWorkspaceSchema.parse({
            ...req.params,
            ...req.query
        })

        await WorkspaceService.delete({
            user: req.user,
            workspaceId,
            force
        })

        return res.status(204).send()
    }),

    move: catchAsync(async (req, res, next) => {
        const { workspace_id: workspaceId, new_order: newOrder } = movedWorkspaceSchema.parse({
            ...req.body,
            ...req.params
        })

        const movedWorkspaceship = await WorkspaceMemberService.move({
            user: req.user,
            workspaceId,
            newOrder,
        })

        return res.status(200).json(movedWorkspaceship)
    }),

    getHistory: catchAsync(async (req, res, next) => {
        const { workspace_id: workspaceId } = getHistorySchema.parse(req.params)

        const logs = await LogService.getLogsByWorkspace({
            user: req.user,
            workspaceId
        })

        return res.status(200).json(logs)
    })

}

module.exports = WorkspaceController
