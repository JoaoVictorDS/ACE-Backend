const { emitToRoom } = require('../../config')
const LogService = require('../log/log.service')
const BoardMemberRepository = require('./board-member.repository')
const WorkspaceMemberRepository = require('../workspace-member/workspace-member.repository')
const UserRepository = require('../user/user.repository')
const { PermissionService } = require('../../shared/services')
const { TransactionManager } = require('../../shared/database')
const { AuthorizationError, NotFoundError, ConflictError } = require('../../shared/errors')
const { RESOURCE_TYPES, PERMISSION_LEVELS } = require('../../shared/constants')
const ERROR_CATALOG = require('../../shared/errors/error-catalog')

const BoardMemberService = {

    async _performRemoval(tx, { membership }) {
        const { role, order, user_id, id, board: { workspace_id, id: board_id } } = membership
        const isPrivilegedMember = PermissionService.isPrivileged(role)

        if (isPrivilegedMember) {
            const privilegedMembersCount = await BoardMemberRepository.countPrivilegedMembers(board_id, tx)
            if (privilegedMembersCount <= 1)
                throw new ConflictError(ERROR_CATALOG.CONFLICT.RESOURCE_HAS_CONTENT(
                    'o quadro',
                    'é necessário manter pelo menos um membro com permissões administrativas'
                ))
        }

        await BoardMemberRepository.decrementOrderAfter(user_id, workspace_id, order, tx)
        return await BoardMemberRepository.removeById(id, tx)
    },

    async upsert({ user, boardId, memberEmail, role }) {
        const { workspaceId, creatorId } = await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.ADMIN)
        const userId = user.id

        const targetUser = await UserRepository.findByEmail(memberEmail)
        if (!targetUser) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.USER)

        const { id: targetUserId, name: targetUserName } = targetUser
        const isWorkspaceMember = await WorkspaceMemberRepository.isWorkspaceMember(targetUserId, workspaceId)

        if (!isWorkspaceMember) throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.NOT_MEMBER('WORKSPACE'))
        if (targetUserId === userId) throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('alterar sua própria permissão'))
        if (targetUserId === creatorId) throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('alterar o cargo do proprietário'))

        const existingMember = await BoardMemberRepository.findMembership(targetUserId, boardId)
        const isDowngradingAdmin = existingMember?.role === 'ADMIN' && role !== 'ADMIN'

        if (isDowngradingAdmin) {
            const privilegedMembersCount = await BoardMemberRepository.countPrivilegedMembers(boardId)
            if (privilegedMembersCount <= 1)
                throw new ConflictError(ERROR_CATALOG.CONFLICT.RESOURCE_HAS_CONTENT(
                    'o quadro',
                    'é necessário manter pelo menos um administrador'
                ))
        }

        let nextOrder = 0
        if (!existingMember) {
            nextOrder = await BoardMemberRepository.findMaxOrderByWorkspace(userId, workspaceId)
        }

        const member = await BoardMemberRepository.upsertMember(targetUserId, boardId, role, nextOrder)

        if (!existingMember) {
            LogService.register({
                userId,
                boardId,
                workspaceId,
                action: 'CREATE',
                entityType: 'MEMBER',
                entityId: targetUserId,
                newValue: { role }
            })
        } else if (existingMember.role !== role) {
            LogService.register({
                userId,
                boardId,
                workspaceId,
                action: 'UPDATE',
                entityType: 'MEMBER',
                entityId: targetUserId,
                oldValue: { role: existingMember.role },
                newValue: { role }
            })
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

        const userId = user.id
        const isSelf = memberIdToRemove === userId
        if (isSelf)
            throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('remover a si mesmo'))

        const membership = await BoardMemberRepository.findMembershipWithBoardAndUser(boardId, memberIdToRemove)
        if (!membership)
            throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.BOARD_MEMBER)

        if (membership.role === 'OWNER')
            throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('remover o proprietário do quadro'))

        const result = await TransactionManager.run(async (tx) => {
            return await this._performRemoval(tx, { membership })
        })

        LogService.register({
            userId,
            boardId,
            workspaceId: membership.board.workspace_id,
            action: 'DELETE',
            entityType: 'MEMBER',
            entityId: memberIdToRemove,
            oldValue: { role: membership.role }
        })
        emitToRoom(`board:${boardId}`, 'board_member:removed', { memberId: memberIdToRemove })

        return result
    },

    async move({ user, boardId, newOrder }) {
        const userId = user.id
        const currentMembership = await BoardMemberRepository.findMembershipWithBoard(userId, boardId)
        if (!currentMembership) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.BOARD_MEMBER)

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
        if (!membership) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.BOARD_MEMBER)

        const result = await TransactionManager.run(async (tx) => {
            return await this._performRemoval(tx, { membership })
        })

        LogService.register({
            userId,
            boardId,
            workspaceId: membership.board.workspace_id,
            action: 'DELETE',
            entityType: 'MEMBER',
            entityId: userId,
            oldValue: { role: membership.role }
        })
        emitToRoom(`board:${boardId}`, 'board_member:leaved', { memberId: userId })

        return result
    },
}

module.exports = BoardMemberService