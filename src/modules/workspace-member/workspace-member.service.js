const LogService = require('../log/log.service')
const WorkspaceMemberRepository = require('./workspace-member.repository')
const BoardMemberRepository = require('../board-member/board-member.repository')
const UserRepository = require('../user/user.repository')
const { TransactionManager } = require('../../shared/database')
const { NotFoundError, AuthorizationError, ConflictError } = require('../../shared/errors')
const { PermissionService } = require('../../shared/services')
const { PERMISSION_LEVELS } = require('../../shared/constants')
const ERROR_CATALOG = require('../../shared/errors/error-catalog')

const WorkspaceMemberService = {

    async _performRemoval(tx, { membership }) {
        const { role, order, user_id, id, workspace_id } = membership
        const isPrivilegedMember = PermissionService.isPrivileged(role)

        if (isPrivilegedMember) {
            const privilegedMembersCount = await WorkspaceMemberRepository.countPrivilegedMembers(workspace_id, tx)
            if (privilegedMembersCount <= 1)
                throw new ConflictError(ERROR_CATALOG.CONFLICT.RESOURCE_HAS_CONTENT(
                    'a área de trabalho',
                    'é necessário manter pelo menos um membro com permissões administrativas'
                ))
        }
        const boardsWhereIsPrivilegedMember = await BoardMemberRepository.findBoardsWhereUserIsPrivilegedMemberByWorkspace(user_id, workspace_id, tx)
        const isLastPrivilegedMemberSomewhere = boardsWhereIsPrivilegedMember.some(b => b.board.board_members.length <= 1)
        if (isLastPrivilegedMemberSomewhere) throw new ConflictError(ERROR_CATALOG.CONFLICT.RESOURCE_HAS_CONTENT(
            'a área de trabalho',
            `usuário é responsável por um ou mais quadros`
        ))

        await WorkspaceMemberRepository.decrementOrderAfter(user_id, order, tx)
        await BoardMemberRepository.removeByUserAndWorkspace(user_id, workspace_id, tx)
        return await WorkspaceMemberRepository.removeById(id, tx)
    },

    async upsert({ user, workspaceId, memberEmail, role }) {
        const { creatorId } = await PermissionService.checkWorkspace(workspaceId, user, PERMISSION_LEVELS.ADMIN)
        const userId = user.id

        const targetUser = await UserRepository.findByEmail(memberEmail)
        if (!targetUser) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.USER)

        const { id: targetUserId, name: targetUserName } = targetUser
        const isSelf = targetUserId === userId
        const isTargetOwner = targetUserId === creatorId

        if (isSelf) throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('alterar sua própria permissão'))
        if (isTargetOwner) throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('alterar o cargo do proprietário'))

        const existingMember = await WorkspaceMemberRepository.findMembership(targetUserId, workspaceId)
        const isDowngradingAdmin = existingMember && existingMember.role === 'ADMIN' && role !== 'ADMIN'

        if (isDowngradingAdmin) {
            const privilegedMembersCount = await WorkspaceMemberRepository.countPrivilegedMembers(workspaceId)
            if (privilegedMembersCount <= 1) throw new ConflictError(ERROR_CATALOG.CONFLICT.RESOURCE_HAS_CONTENT(
                'a área de trabalho',
                'é necessário manter pelo menos um administrador'
            ))
        }

        let nextOrder = 0
        if (!existingMember) {
            nextOrder = await WorkspaceMemberRepository.findMaxOrder(targetUserId)
        }

        const member = await WorkspaceMemberRepository.upsertMember(targetUserId, workspaceId, role, nextOrder)

        if (!existingMember) {
            LogService.register({
                userId,
                workspaceId,
                action: 'CREATE',
                entityType: 'MEMBER',
                entityId: targetUserId,
                newValue: `Membro adicionado: ${targetUserName} (${role})`
            })
        } else if (existingMember.role !== role) {
            LogService.register({
                userId,
                workspaceId,
                action: 'UPDATE',
                entityType: 'MEMBER',
                entityId: targetUserId,
                oldValue: `Cargo: ${existingMember.role}`,
                newValue: `Cargo: ${role}`
            })
        }

        return member
    },

    async getByWorkspace({ user, workspaceId }) {
        await PermissionService.checkWorkspace(workspaceId, user, PERMISSION_LEVELS.VIEW)

        return await WorkspaceMemberRepository.findByWorkspace(workspaceId)
    },

    async remove({ user, workspaceId, memberIdToRemove }) {
        await PermissionService.checkWorkspace(workspaceId, user, PERMISSION_LEVELS.ADMIN)

        const userId = user.id
        const isSelf = memberIdToRemove === userId
        if (isSelf)
            throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('remover a si mesmo'))

        const membership = await WorkspaceMemberRepository.findMembershipWithUserName(memberIdToRemove, workspaceId)
        if (!membership)
            throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.WORKSPACE_MEMBER)

        const { role, user: { name: targetUserName } } = membership
        const isTargetOwner = role === 'OWNER'
        if (isTargetOwner)
            throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('remover o proprietário da área de trabalho'))

        const result = await TransactionManager.run(async (tx) => {
            return await this._performRemoval(tx, { membership })
        })

        LogService.register({
            userId,
            workspaceId,
            action: 'DELETE',
            entityType: 'MEMBER',
            entityId: memberIdToRemove,
            oldValue: `Membro removido: ${targetUserName}`
        })

        return result
    },

    async move({ user, workspaceId, newOrder }) {
        const userId = user.id
        const currentMembership = await WorkspaceMemberRepository.findMembership(userId, workspaceId)
        if (!currentMembership) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.WORKSPACE_MEMBER)

        const totalWorkspaces = await WorkspaceMemberRepository.countWorkspaceByUser(userId)
        const finalOrder = Math.max(0, Math.min(newOrder, totalWorkspaces - 1))
        const oldOrder = currentMembership.order
        const isSamePosition = oldOrder === newOrder || oldOrder === finalOrder
        if (isSamePosition) return currentMembership

        const result = await TransactionManager.run(async (tx) => {
            const direction = finalOrder > oldOrder ? 'decrement' : 'increment'
            const range = finalOrder > oldOrder
                ? { gt: oldOrder, lte: finalOrder }
                : { gte: finalOrder, lt: oldOrder }

            await WorkspaceMemberRepository.updateOrderInRange(userId, range, direction, tx)
            return await WorkspaceMemberRepository.updateMemberOrder(userId, workspaceId, finalOrder, tx)
        })

        return result
    },

    async leave({ user, workspaceId }) {
        const userId = user.id
        const membership = await WorkspaceMemberRepository.findMembershipWithUserName(userId, workspaceId)
        if (!membership) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.WORKSPACE_MEMBER)

        const result = await TransactionManager.run(async (tx) => {
            return await this._performRemoval(tx, { membership })
        })

        LogService.register({
            userId,
            workspaceId,
            action: 'DELETE',
            entityType: 'MEMBER',
            entityId: userId,
            oldValue: `${membership.user.name} saiu da área de trabalho`
        })

        return result
    },

}

module.exports = WorkspaceMemberService