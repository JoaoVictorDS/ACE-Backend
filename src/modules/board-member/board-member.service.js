const { emitToRoom, appEventEmitter } = require('../../config')
const BoardMemberRepository = require('./board-member.repository')
const WorkspaceMemberRepository = require('../workspace-member/workspace-member.repository')
const UserRepository = require('../user/user.repository')
const { PermissionService } = require('../../shared/services')
const { TransactionManager } = require('../../shared/database')
const { AuthorizationError, NotFoundError, ConflictError, ValidationError } = require('../../shared/errors')
const { RESOURCE_TYPES, PERMISSION_LEVELS, ENTITY_TYPES } = require('../../shared/constants')
const ERROR_CATALOG = require('../../shared/errors/error-catalog')
const { DOMAIN_EVENT } = require('../../shared/events/domain-event')
const BoardRepository = require('../board/board.repository')

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

        if (!isWorkspaceMember) throw new ValidationError(ERROR_CATALOG.VALIDATION.USER_NOT_WORKSPACE_MEMBER)
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

        const isNewMember = !existingMember
        const isNoOp = existingMember && existingMember.role === role

        let nextOrder = 0
        if (isNewMember) {
            nextOrder = await BoardMemberRepository.findMaxOrderByWorkspace(userId, workspaceId)
        }

        const member = await BoardMemberRepository.upsertMember(targetUserId, boardId, role, nextOrder)

        if (!isNoOp) {
            const { name: boardName } = await BoardRepository.findBoardName(boardId)

            appEventEmitter.emit(DOMAIN_EVENT, {
                actor: user,
                workspaceId,
                boardId,
                entityType: ENTITY_TYPES.MEMBER,
                entityId: member.id,
                action: isNewMember ? 'CREATE' : 'UPDATE',
                resource: {
                    workspaceId,
                    boardId,
                    board: { id: boardId, name: boardName },
                    member: { userId: targetUserId, userName: targetUserName }
                },
                changes: { before: existingMember?.role ?? null, after: role },
                specificRecipients: [targetUserId],
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

        const { name: boardName } = await BoardRepository.findBoardName(boardId)

        appEventEmitter.emit(DOMAIN_EVENT, {
            actor: user,
            workspaceId: membership.board.workspace_id,
            boardId,
            entityType: ENTITY_TYPES.MEMBER,
            entityId: membership.id,
            action: 'DELETE',
            resource: {
                workspaceId: membership.board.workspace_id,
                boardId,
                board: { id: boardId, name: boardName },
                member: { userId: memberIdToRemove, userName: membership.user.name, selfInitiated: false }
            },
            changes: { before: membership.role, after: null },
            snapshot: {
                before: { id: membership.id, user_id: memberIdToRemove, board_id: boardId, role: membership.role, order: membership.order },
                after: null
            },
            specificRecipients: [memberIdToRemove]
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

        const [result, admins, { name: boardName }] = await Promise.all([
            TransactionManager.run(async (tx) => this._performRemoval(tx, { membership })),
            BoardMemberRepository.findByBoardAndRoles(boardId, ['ADMIN', 'OWNER']),
            BoardRepository.findBoardName(boardId),
        ])

        appEventEmitter.emit(DOMAIN_EVENT, {
            actor: user,
            workspaceId: membership.board.workspace_id,
            boardId,
            entityType: ENTITY_TYPES.MEMBER,
            entityId: membership.id,
            action: 'DELETE',
            resource: {
                workspaceId: membership.board.workspace_id,
                boardId,
                board: { id: boardId, name: boardName },
                member: { userId, userName: membership.user.name, selfInitiated: true },
            },
            changes: { before: membership.role, after: null },
            snapshot: {
                before: { id: membership.id, user_id: userId, board_id: boardId, role: membership.role, order: membership.order },
                after: null
            },
            specificRecipients: admins.map(a => a.user_id),
        })

        emitToRoom(`board:${boardId}`, 'board_member:leaved', { memberId: userId })

        return result
    },
}

module.exports = BoardMemberService