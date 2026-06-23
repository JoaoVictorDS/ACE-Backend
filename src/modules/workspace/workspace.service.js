const LogService = require('../log/log.service')
const WorkspaceRepository = require('./workspace.repository')
const WorkspaceMemberRepository = require('../workspace-member/workspace-member.repository')
const ItemRepository = require('../item/item.repository')
const { PermissionService, TransactionManager, AppError, NotFoundError, PERMISSION_LEVELS } = require('../../shared')

const WorkspaceService = {

    async create({ user, name }) {
        const userId = user.id
        const nextOrder = await WorkspaceMemberRepository.findMaxOrder(userId)
        const newWorkspace = await WorkspaceRepository.create(userId, name, nextOrder)

        LogService.register({
            userId,
            workspaceId: newWorkspace.id,
            action: 'CREATE',
            entityType: 'WORKSPACE',
            entityId: newWorkspace.id,
            newValue: `Área de trabalho criada: ${name}`
        })

        return newWorkspace
    },

    async getByUser({ user }) {
        const memberships = await WorkspaceMemberRepository.findMemberships(user.id)

        return memberships.map(m => ({
            ...m.workspace,
            user_role: m.role,
            personal_order: m.order
        }))
    },

    async update({ user, workspaceId, data }) {
        await PermissionService.checkWorkspace(workspaceId, user, PERMISSION_LEVELS.ADMIN)

        const currentWorkspace = await WorkspaceRepository.findById(workspaceId)
        if (!currentWorkspace) throw new NotFoundError('Área de Trabalho não encontrada.')

        const hasChanges = Object.keys(data).some(
            (key) => data[key] !== undefined && data[key] !== currentWorkspace[key]
        )

        if (!hasChanges) {
            return currentWorkspace
        }

        const changes = []
        if (data.name && data.name !== currentWorkspace.name) {
            changes.push({
                field: 'name',
                old: currentWorkspace.name,
                new: data.name
            })
        }
        if (data.description && data.description !== currentWorkspace.description) {
            changes.push({
                field: 'description',
                old: currentWorkspace.description,
                new: data.description
            })
        }
        if (data.icon && data.icon !== currentWorkspace.icon) {
            changes.push({
                field: 'icon',
                old: currentWorkspace.icon,
                new: data.icon
            })
        }

        const updatedWorkspace = await WorkspaceRepository.update(workspaceId, data)

        LogService.register({
            userId: user.id,
            workspaceId,
            action: 'UPDATE',
            entityType: 'WORKSPACE',
            entityId: workspaceId,
            oldValue: changes.map(c => `${c.field}: "${c.old}"`).join(' | '),
            newValue: changes.map(c => `${c.field}: "${c.new}"`).join(' | ')
        })

        return updatedWorkspace
    },

    async delete({ user, workspaceId, force = false }) {
        const [workspace, itemsCount] = await Promise.all([
            WorkspaceRepository.findWorkspaceDeletionContext(workspaceId),
            ItemRepository.countByWorkspace(workspaceId)
        ])
        if (!workspace) throw new NotFoundError('Área de Trabalho não encontrada.')

        const { boards: boardsCount, workspace_members: workspaceMembersCount } = workspace._count
        const hasContent = boardsCount > 0 || itemsCount > 0
        if (!force && hasContent) throw new AppError(`Não é possível excluir a área de trabalho: existem ${boardsCount} quadros, ${workspaceMembersCount} membros e ${itemsCount} itens vinculados. A exclusão removerá permanentemente esses dados. Use "force=true" para prosseguir!`, 409)

        const result = await TransactionManager.run(async (tx) => {
            await WorkspaceMemberRepository.decrementOrderAfterWorkspaceDeletion(workspaceId, tx)

            await LogService.register({
                userId: user.id,
                workspaceId: workspaceId,
                action: 'DELETE',
                entityType: 'WORKSPACE',
                entityId: workspaceId,
                oldValue: `Área de trabalho removida: ${workspace.name}`,
                tx
            })

            return await WorkspaceRepository.delete(workspaceId, tx)
        })

        return result
    }

}

module.exports = WorkspaceService