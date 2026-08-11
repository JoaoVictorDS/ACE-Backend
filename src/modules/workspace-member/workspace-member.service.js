const WorkspaceMemberRepository = require('./workspace-member.repository')
const WorkspaceRepository = require('../workspace/workspace.repository')
const BoardMemberRepository = require('../board-member/board-member.repository')
const UserRepository = require('../user/user.repository')
const { TransactionManager } = require('../../shared/database')
const { NotFoundError, AuthorizationError, ConflictError } = require('../../shared/errors')
const { PermissionService } = require('../../shared/services')
const { PERMISSION_LEVELS, ENTITY_TYPES } = require('../../shared/constants')
const ERROR_CATALOG = require('../../shared/errors/error-catalog')
const { EventPublisher } = require('../../shared/events')
const WorkspaceMemberPresenter = require('./workspace-member.presenter')

const WorkspaceMemberService = {

    async _performRemoval(tx, { membership }) {
        const { role, order, user_id, id, workspace_id } = membership
        const isPrivilegedMember = PermissionService.isPrivileged(role)

        if (isPrivilegedMember) {
            const privilegedMembersCount = await WorkspaceMemberRepository.countPrivilegedMembers(workspace_id, tx)
            if (privilegedMembersCount <= 1)
                throw new ConflictError(ERROR_CATALOG.CONFLICT.RESOURCE_HAS_CONTENT(
                    'o membro da área de trabalho',
                    'é necessário manter pelo menos um membro com permissões administrativas'
                ))
        }
        const boardsWhereIsPrivilegedMember = await BoardMemberRepository.findBoardsWhereUserIsPrivilegedMemberByWorkspace(user_id, workspace_id, tx)
        const isLastPrivilegedMemberSomewhere = boardsWhereIsPrivilegedMember.some(b => b.board.board_members.length <= 1)
        if (isLastPrivilegedMemberSomewhere) throw new ConflictError(ERROR_CATALOG.CONFLICT.RESOURCE_HAS_CONTENT(
            'o membro da área de trabalho',
            `usuário é responsável por um ou mais quadros`
        ))

        await WorkspaceMemberRepository.decrementOrderAfter(user_id, order, tx)
        await BoardMemberRepository.removeByUserAndWorkspace(user_id, workspace_id, tx)
        return await WorkspaceMemberRepository.removeById(id, tx)
    },

    async upsert({ user, workspaceId, memberEmail, role }) {
        await PermissionService.checkWorkspace(workspaceId, user, PERMISSION_LEVELS.ADMIN)

        const targetUser = await UserRepository.findByEmail(memberEmail)
        if (!targetUser) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.USER)

        const { id: targetUserId, name: targetUserName } = targetUser
        const isSelf = targetUserId === user.id
        if (isSelf) throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('alterar sua própria permissão'))

        const existingMember = await WorkspaceMemberRepository.findMembership(targetUserId, workspaceId)

        const isTargetOwner = existingMember?.role === 'OWNER'
        if (isTargetOwner) throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('alterar o cargo do proprietário'))

        const isSameRole = existingMember?.role === role
        if (isSameRole) return WorkspaceMemberPresenter.format(existingMember)

        const isDowngradingAdmin = existingMember && existingMember.role === 'ADMIN' && role !== 'ADMIN'

        if (isDowngradingAdmin) {
            const privilegedMembersCount = await WorkspaceMemberRepository.countPrivilegedMembers(workspaceId)
            if (privilegedMembersCount <= 1) throw new ConflictError(ERROR_CATALOG.CONFLICT.RESOURCE_HAS_CONTENT(
                'o membro da área de trabalho',
                'é necessário manter pelo menos um administrador'
            ))
        }

        let nextOrder = 0

        const isNewMember = !existingMember
        if (isNewMember) nextOrder = await WorkspaceMemberRepository.findMaxOrder(targetUserId)

        const member = await WorkspaceMemberRepository.upsertMember(targetUserId, workspaceId, role, nextOrder)

        const { name: workspaceName } = await WorkspaceRepository.findWorkspaceName(workspaceId)

        EventPublisher.publish({
            actor: user,
            workspaceId,
            entityType: ENTITY_TYPES.MEMBER,
            entityId: member.id,
            action: isNewMember ? 'CREATE' : 'UPDATE',
            resource: {
                workspaceId,
                workspace: { id: workspaceId, name: workspaceName },
                member: { id: targetUserId, name: targetUserName }
            },
            changes: { before: existingMember?.role ?? null, after: role },
            specificRecipients: [targetUserId]
        })

        return WorkspaceMemberPresenter.format(member)
    },

    async getByWorkspace({ user, workspaceId }) {
        await PermissionService.checkWorkspace(workspaceId, user, PERMISSION_LEVELS.VIEW)

        return await WorkspaceMemberRepository.findByWorkspace(workspaceId)
    },

    async remove({ user, workspaceId, memberIdToRemove }) {
        await PermissionService.checkWorkspace(workspaceId, user, PERMISSION_LEVELS.ADMIN)

        const isSelf = memberIdToRemove === user.id
        if (isSelf) throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('remover a si mesmo'))

        const membership = await WorkspaceMemberRepository.findMembershipWithUserAndWorkspace(memberIdToRemove, workspaceId)
        if (!membership) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.WORKSPACE_MEMBER)

        const isTargetOwner = membership.role === 'OWNER'
        if (isTargetOwner) throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('remover o proprietário da área de trabalho'))

        const result = await TransactionManager.run(async (tx) => {
            return await this._performRemoval(tx, { membership })
        })

        EventPublisher.publish({
            actor: user,
            workspaceId,
            entityType: ENTITY_TYPES.MEMBER,
            entityId: membership.id,
            action: 'DELETE',
            resource: {
                workspaceId,
                workspace: { id: membership.workspace_id, name: membership.workspace.name },
                member: { id: membership.user_id, name: membership.user.name, selfInitiated: false }
            },
            changes: { before: membership.role, after: null },
            snapshot: {
                before: {
                    id: membership.id,
                    user_id: membership.user_id,
                    workspace_id: membership.workspace_id,
                    role: membership.role,
                    order: membership.order
                },
                after: null
            },
            specificRecipients: [memberIdToRemove]
        })

        return result
    },

    async move({ user, workspaceId, newOrder }) {
        const userId = user.id

        const membership = await WorkspaceMemberRepository.findMembership(userId, workspaceId)
        if (!membership) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.WORKSPACE_MEMBER)

        const totalWorkspaces = await WorkspaceMemberRepository.countWorkspaceByUser(userId)
        const finalOrder = Math.max(0, Math.min(newOrder, totalWorkspaces - 1))
        const oldOrder = membership.order
        const isSamePosition = oldOrder === newOrder || oldOrder === finalOrder
        if (isSamePosition) return WorkspaceMemberPresenter.format(membership)

        return await TransactionManager.run(async (tx) => {
            const direction = finalOrder > oldOrder ? 'decrement' : 'increment'
            const range = finalOrder > oldOrder
                ? { gt: oldOrder, lte: finalOrder }
                : { gte: finalOrder, lt: oldOrder }

            await WorkspaceMemberRepository.updateOrderInRange(userId, range, direction, tx)
            return await WorkspaceMemberRepository.updateMemberOrder(userId, workspaceId, finalOrder, tx)
        })
    },

    async leave({ user, workspaceId }) {
        const membership = await WorkspaceMemberRepository.findMembershipWithUserAndWorkspace(user.id, workspaceId)
        if (!membership) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.WORKSPACE_MEMBER)

        const [result, admins] = await Promise.all([
            TransactionManager.run(async (tx) => await this._performRemoval(tx, { membership })),
            WorkspaceMemberRepository.findByWorkspaceAndRoles(workspaceId, ['ADMIN', 'OWNER'])
        ])

        EventPublisher.publish({
            actor: user,
            workspaceId,
            entityType: ENTITY_TYPES.MEMBER,
            entityId: membership.id,
            action: 'DELETE',
            resource: {
                workspaceId,
                workspace: { id: membership.workspace_id, name: membership.workspace.name },
                member: { id: membership.user_id, name: membership.user.name }
            },
            changes: { before: membership.role, after: null },
            snapshot: {
                before: {
                    id: membership.id,
                    workspace_id: membership.workspace_id,
                    user_id: membership.user_id,
                    role: membership.role,
                    order: membership.order
                },
                after: null
            },
            specificRecipients: admins.map(a => a.user_id),
        })

        return result
    },

}

module.exports = WorkspaceMemberService