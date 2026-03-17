const WorkspaceService = require('../services/WorkspaceService')
const WorkspaceMemberService = require('../services/WorkspaceMemberService')
const LogService = require('../services/LogService')
const catchAsync = require('../utils/catchAsync')
const { createWorkspaceSchema, deleteWorkspaceSchema, updateWorkspaceSchema, movedWorkspaceSchema, getHistorySchema } = require('../validators/workspaceValidator')

const WorkspaceController = {

    create: catchAsync(async (req, res, next) => {
        const { name } = createWorkspaceSchema.parse(req.body)

        const workspace = await WorkspaceService.createWorkspace({
            userId: req.user.id,
            name
        })

        return res.status(201).json({
            message: 'Área de Trabalho criada com sucesso!',
            workspace
        })
    }),

    list: catchAsync(async (req, res, next) => {
        const workspace = await WorkspaceService.getWorkspaceByUser({
            userId: req.user.id
        })

        return res.status(200).json(workspace)
    }),

    update: catchAsync(async (req, res, next) => {
        const { workspace_id: workspaceId, ...otherFields } = updateWorkspaceSchema.parse({
            ...req.body,
            ...req.params
        })

        const updatedWorkspace = await WorkspaceService.updateWorkspace({
            userId: req.user.id,
            workspaceId,
            ...otherFields
        })

        return res.status(200).json({
            message: 'Área de Trabalho atualizada com sucesso!',
            updatedWorkspace
        })
    }),

    delete: catchAsync(async (req, res, next) => {
        const { workspace_id: workspaceId, force } = deleteWorkspaceSchema.parse({
            ...req.params,
            ...req.query
        })

        await WorkspaceService.deleteWorkspace({
            userId: req.user.id,
            workspaceId,
            force
        })

        return res.status(200).json({
            message: 'Área de Trabalhado excluída com sucesso!'
        })
    }),

    move: catchAsync(async (req, res, next) => {
        const { workspace_id: workspaceId, new_order: newOrder } = movedWorkspaceSchema.parse({
            ...req.body,
            ...req.params
        })

        const movedWorkspaceship = await WorkspaceMemberService.moveWorkspace({
            workspaceId,
            userId: req.user.id,
            newOrder,
        })

        return res.status(200).json({
            message: 'Ordem da Área de Trabalho atualizada com sucesso!',
            movedWorkspaceship
        })
    }),

    getHistory: catchAsync(async (req, res, next) => {
        const { workspace_id: workspaceId } = getHistorySchema.parse(req.params)

        const logs = await LogService.getLogsByWorkspace({
            workspaceId,
            userId: req.user.id
        })

        return res.status(200).json(logs)
    })

}

module.exports = WorkspaceController
