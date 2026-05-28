const BoardMemberRepository = require('./board-member.repository')
const UserRepository = require('../user/user.repository')
const WorkspaceMemberRepository = require('../workspace-member/workspace-member.repository')
const PermissionService = require('../permission/permission.service')
const RESOURCE_TYPES = require('../../shared/constants/resourceTypes')
const PERMISSION_LEVELS = require('../../shared/constants/permissionLevels')
const LogService = require('../log/log.service')
const { emitToRoom } = require('../../config/socket')
const AppError = require('../../shared/errors/AppError')
const AuthorizationError = require('../../shared/errors/AuthorizationError')
const NotFoundError = require('../../shared/errors/NotFoundError')
const TransactionManager = require('../../shared/database/TransactionManager')

const BoardMemberService = {

    async _performRemoval(tx, { membership }) {
        const { role, order, user_id, id, board: { workspace_id, id: board_id } } = membership
        const isPrivilegedMember = PermissionService.isPrivileged(role)

        if (isPrivilegedMember) {
            const privilegedMembersCount = await BoardMemberRepository.countPrivilegedMembers(board_id, tx)
            if (privilegedMembersCount <= 1)
                throw new AppError('Não é possível remover o último membro privilegiado do quadro!', 400)
        }

        await BoardMemberRepository.decrementOrderAfter(user_id, workspace_id, order, tx)
        return await BoardMemberRepository.removeById(id, tx)
    },

    async upsert({ user, boardId, memberEmail, role }) {
        const { workspaceId, creatorId } = await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.ADMIN)
        const userId = user.id

        const targetUser = await UserRepository.findByEmail(memberEmail)
        if (!targetUser) throw new NotFoundError('Usuário com este e-mail')

        const { id: targetUserId, name: targetUserName } = targetUser
        const isWorkspaceMember = await WorkspaceMemberRepository.isWorkspaceMember(targetUserId, workspaceId)

        if (!isWorkspaceMember) throw new AuthorizationError('Este usuário não faz parte do workspace')
        if (targetUserId === userId) throw new AppError('Não é permitido alterar sua própria permissão!', 400)
        if (targetUserId === creatorId) throw new AuthorizationError('O proprietário do quadro não pode ter seu cargo alterado')

        const existingMember = await BoardMemberRepository.findMembership(targetUserId, boardId)
        const isDowngradingAdmin = existingMember?.role === 'ADMIN' && role !== 'ADMIN'

        if (isDowngradingAdmin) {
            const privilegedMembersCount = await BoardMemberRepository.countPrivilegedMembers(boardId)
            if (privilegedMembersCount <= 1)
                throw new AppError('Não é possível rebaixar o único administrador do Quadro!', 400)
        }

        let nextOrder = 0
        if (!existingMember) {
            const lastMemberEntry = await BoardMemberRepository.findLastMemberInWorkspace(targetUserId, workspaceId)
            nextOrder = lastMemberEntry ? lastMemberEntry.order + 1 : 0
        }

        const member = await BoardMemberRepository.upsertMember(targetUserId, boardId, role, nextOrder)

        if (!existingMember) {
            LogService.register({ userId, boardId, workspaceId, action: 'CREATE', entityType: 'MEMBER', entityId: targetUserId, newValue: `Membro adicionado: ${targetUserName} (${role})` })
        } else if (existingMember.role !== role) {
            LogService.register({ userId, boardId, workspaceId, action: 'UPDATE', entityType: 'MEMBER', entityId: targetUserId, oldValue: `Cargo: ${existingMember.role}`, newValue: `Cargo: ${role}` })
        }

        emitToRoom(`board:${boardId}`, 'board_member:changed', member)
        return member
    },

    async getByBoard({ user, boardId }) {
        await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.VIEW)
        return await BoardMemberRepository.findByBoard(boardId)
    },

    async remove({ user, boardId, memberIdToRemove }) {
        await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.ADMIN)

        if (memberIdToRemove === user.id)
            throw new AppError('Não é permitido remover a si mesmo do quadro!', 400)

        const membership = await BoardMemberRepository.findMembershipWithBoardAndUser(boardId, memberIdToRemove)
        if (!membership) throw new NotFoundError('Membro')

        if (membership.role === 'OWNER')
            throw new AppError('O proprietário do quadro não pode ser removido!', 400)

        const result = await TransactionManager.run(async (tx) => {
            return await this._performRemoval(tx, { membership })
        })

        LogService.register({ userId: user.id, boardId, workspaceId: membership.board.workspace_id, action: 'DELETE', entityType: 'MEMBER', entityId: memberIdToRemove, oldValue: `Membro removido: ${membership.user.name}` })
        emitToRoom(`board:${boardId}`, 'board_member:removed', { memberId: memberIdToRemove })

        return result
    },

    async move({ user, boardId, newOrder }) {
        const userId = user.id
        const currentMembership = await BoardMemberRepository.findMembershipWithBoard(userId, boardId)
        if (!currentMembership) throw new NotFoundError('Vínculo entre usuário e quadro')

        const { board: { workspace_id: workspaceId }, order: oldOrder } = currentMembership
        const totalBoards = await BoardMemberRepository.countBoardsByUserInWorkspace(userId, workspaceId)
        const finalOrder = Math.max(0, Math.min(newOrder, totalBoards - 1))

        if (oldOrder === finalOrder) return currentMembership

        return await TransactionManager.run(async (tx) => {
            const direction = finalOrder > oldOrder ? 'decrement' : 'increment'
            const range = finalOrder > oldOrder
                ? { gt: oldOrder, lte: finalOrder }
                : { gte: finalOrder, lt: oldOrder }

            await BoardMemberRepository.updateOrderInRange(userId, workspaceId, range, direction, tx)
            return await BoardMemberRepository.updateMemberOrder(userId, boardId, finalOrder, tx)
        })
    },

    async leave({ user, boardId }) {
        const userId = user.id
        const membership = await BoardMemberRepository.findMembershipWithBoardAndUser(boardId, userId)
        if (!membership) throw new NotFoundError('Membro')

        const result = await TransactionManager.run(async (tx) => {
            return await this._performRemoval(tx, { membership })
        })

        LogService.register({ userId, boardId, workspaceId: membership.board.workspace_id, action: 'DELETE', entityType: 'MEMBER', entityId: userId, oldValue: `${membership.user.name} saiu do quadro` })
        emitToRoom(`board:${boardId}`, 'board_member:leaved', { memberId: userId })

        return result
    },
}

module.exports = BoardMemberService