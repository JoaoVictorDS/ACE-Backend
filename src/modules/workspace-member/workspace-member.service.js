const PermissionService = require('../../shared/services/permission.service')
const LogService = require('../log/log.service')
const WorkspaceMemberRepository = require('./workspace-member.repository')
const BoardMemberRepository = require('../board-member/board-member.repository')
const UserRepository = require('../user/user.repository')
const { AppError, NotFoundError, AuthorizationError } = require('../../shared/errors')
const TransactionManager = require('../../shared/database/TransactionManager')
const { PERMISSION_LEVELS } = require('../../shared/constants')

const WorkspaceMemberService = {

    async _performRemoval(tx, { membership }) {
        const { role, order, user_id, id, workspace_id } = membership
        const isPrivilegedMember = PermissionService.isPrivileged(role)

        if (isPrivilegedMember) {
            const privilegedMembersCount = await WorkspaceMemberRepository.countPrivilegedMembers(workspace_id, tx)
            if (privilegedMembersCount <= 1)
                throw new AppError('Não é possível remover o último membro privilegiado!', 400)
        }
        const boardsWhereIsPrivilegedMember = await BoardMemberRepository.findBoardsWhereUserIsPrivilegedMemberByWorkspace(user_id, workspace_id, tx)
        const isLastPrivilegedMemberSomewhere = boardsWhereIsPrivilegedMember.some(b => b.board.board_members.length <= 1)
        if (isLastPrivilegedMemberSomewhere) throw new AppError('Não é possível remover o último membro privilegiado de um ou mais quadros!', 400)

        await WorkspaceMemberRepository.decrementOrderAfter(user_id, order, tx)
        await BoardMemberRepository.removeByUserAndWorkspace(user_id, workspace_id, tx)
        return await WorkspaceMemberRepository.removeById(id, tx)
    },

    async upsert({ user, workspaceId, memberEmail, role }) {
        const { creatorId } = await PermissionService.checkWorkspace(workspaceId, user, PERMISSION_LEVELS.ADMIN)
        const userId = user.id

        const targetUser = await UserRepository.findByEmail(memberEmail)
        if (!targetUser) throw new NotFoundError('Usuário com este e-mail não encontrado.')

        const { id: targetUserId, name: targetUserName } = targetUser
        const isSelf = targetUserId === userId
        const isTargetOwner = targetUserId === creatorId

        if (isSelf) throw new AppError('Não é permitido alterar sua própria permissão de membro.', 400)
        if (isTargetOwner) throw new AuthorizationError('O proprietário da área de trabalho não pode ter seu cargo alterado.')

        const existingMember = await WorkspaceMemberRepository.findMembership(targetUserId, workspaceId)
        const isDowngradingAdmin = existingMember && existingMember.role === 'ADMIN' && role !== 'ADMIN'

        if (isDowngradingAdmin) {
            const privilegedMembersCount = await WorkspaceMemberRepository.countPrivilegedMembers(workspaceId)
            if (privilegedMembersCount <= 1) throw new AppError('Não é possível rebaixar o único administrador da área de trabalho.', 400)
        }

        let nextOrder = 0
        if (!existingMember) {
            nextOrder = await WorkspaceMemberRepository.findMaxOrder(targetUser)
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
        if (isSelf) throw new AppError('Não é possível remover a si mesmo da área de trabalho.', 400)

        const membership = await WorkspaceMemberRepository.findMembershipWithUserName(memberIdToRemove, workspaceId)
        if (!membership) throw new NotFoundError('Membro não encontrado nesta área de trabalho.')

        const { role, user: { name: targetUserName } } = membership
        const isTargetOwner = role === 'OWNER'
        if (isTargetOwner) throw new AppError('Não é possível remover o proprietário da área de trabalho.', 400)

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
        if (!currentMembership) throw new NotFoundError('Vínculo entre usuário e área de trabalho não encontrado.')

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
        if (!membership) throw new NotFoundError('Vínculo entre usuário e área de trabalho não encontrada.')

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