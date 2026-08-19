const WorkspaceRepository = require('./workspace.repository')
const WorkspaceMemberRepository = require('../workspace-member/workspace-member.repository')
const ItemRepository = require('../item/item.repository')
const { TransactionManager } = require('../../shared/database')
const { NotFoundError, ConflictError } = require('../../shared/errors')
const { PermissionService } = require('../../shared/services')
const { PERMISSION_LEVELS, ENTITY_TYPES } = require('../../shared/constants')
const ERROR_CATALOG = require('../../shared/errors/error-catalog')
const { EventPublisher } = require('../../shared/events')

const WorkspaceService = {

    async create({ user, name }) {
        const userId = user.id
        const nextOrder = await WorkspaceMemberRepository.findMaxOrder(userId)
        const newWorkspace = await WorkspaceRepository.create(userId, name, nextOrder)

        EventPublisher.publish({
            actor: user,
            workspaceId: newWorkspace.id,
            entityType: ENTITY_TYPES.WORKSPACE,
            entityId: newWorkspace.id,
            action: 'CREATE',
            resource: { workspaceId: newWorkspace.id, workspace: { id: newWorkspace.id, name: newWorkspace.name } },
            changes: { before: null, after: newWorkspace.name },
            snapshot: {
                before: null,
                after: {
                    id: newWorkspace.id,
                    creator_id: newWorkspace.creator_id,
                    name: newWorkspace.name,
                    description: newWorkspace.description,
                    icon: newWorkspace.icon,
                    deleted_at: null
                }
            }
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
        if (!currentWorkspace) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.WORKSPACE)

        const hasChanges = Object.keys(data).some(
            (key) => data[key] !== undefined && data[key] !== currentWorkspace[key]
        )
        if (!hasChanges) return currentWorkspace

        const FIELD_LABELS = {
            name: 'nome',
            description: 'descrição',
            icon: 'ícone'
        }

        const fields = Object.keys(FIELD_LABELS)
            .filter(key => data[key] !== undefined && data[key] !== currentWorkspace[key])
            .map(field => ({ field, label: FIELD_LABELS[field], before: currentWorkspace[field], after: data[field] }))

        const updatedWorkspace = await WorkspaceRepository.update(workspaceId, data)

        EventPublisher.publish({
            actor: user,
            workspaceId,
            entityType: ENTITY_TYPES.WORKSPACE,
            entityId: updatedWorkspace.id,
            action: 'UPDATE',
            resource: { workspaceId, workspace: { id: updatedWorkspace.id, name: updatedWorkspace.name } },
            changes: { fields }
        })

        return updatedWorkspace
    },

    async delete({ user, workspaceId, force = false }) {
        const [workspace, itemsCount] = await Promise.all([
            WorkspaceRepository.findWorkspaceDeletionContext(workspaceId),
            ItemRepository.countByWorkspace(workspaceId)
        ])
        if (!workspace) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.WORKSPACE)

        const { boards: boardsCount, workspace_members: workspaceMembersCount } = workspace._count
        const hasContent = boardsCount > 0 || itemsCount > 0
        if (!force && hasContent) throw new ConflictError(ERROR_CATALOG.CONFLICT.RESOURCE_HAS_CONTENT('a área de trabalho', `${boardsCount} quadros, ${workspaceMembersCount} membros e ${itemsCount} itens.`))

        const result = await TransactionManager.run(async (tx) => {
            await WorkspaceMemberRepository.decrementOrderAfterWorkspaceDeletion(workspaceId, tx)

            return await WorkspaceRepository.softDelete(workspaceId, tx)
        })

        EventPublisher.publish({
            actor: user,
            workspaceId,
            entityType: ENTITY_TYPES.WORKSPACE,
            entityId: workspace.id,
            action: 'DELETE',
            resource: { workspaceId, workspace: { id: workspace.id, name: workspace.name } },
            changes: {
                before: {
                    id: workspace.id,
                    creator_id: workspace.creator_id,
                    name: workspace.name,
                    description: workspace.description,
                    icon: workspace.icon,
                    deleted_at: null
                },
                after: null
            }
        })

        return result
    }

}

module.exports = WorkspaceService