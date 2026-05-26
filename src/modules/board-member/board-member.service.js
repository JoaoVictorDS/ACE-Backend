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

const BoardMemberService = {

    async _performRemoval(tx, { membership }) {
        const { role, order, user_id, id, board: { workspace_id, id: board_id } } = membership
        const isPrivilegedMember = PermissionService.isPrivileged(role)

        if (isPrivilegedMember) {
            const privilegedMembersCount = await this.boardMemberRepository.countPrivilegedMembers(board_id, tx)
            const isLastPrivilegedMember = privilegedMembersCount <= 1

            if (isLastPrivilegedMember) throw new AppError('Não é possível remover o último membro privilegiado do quadro!', 400)
        }

        await this.boardMemberRepository.decrementOrderAfter(user_id, workspace_id, order, tx)

        return await this.boardMemberRepository.removeById(id, tx)
    },

    async upsert({ user, boardId, memberEmail, role }) {
        const { workspaceId, creatorId } = await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.ADMIN)
        const userId = user.id

        const targetUser = await this.userRepository.findByEmail(memberEmail, { select: { id: true, name: true } })
        if (!targetUser) throw new NotFoundError('Usuário com este e-mail')

        const { id: targetUserId, name: targetUserName } = targetUser
        const isWorkspaceMember = await this.workspaceMemberRepository.isWorkspaceMember(targetUserId, workspaceId)
        const isSelf = targetUserId === userId
        const isTargetOwner = targetUserId === creatorId

        if (!isWorkspaceMember) throw new AuthorizationError('Este usuário não faz parte do workspace')
        if (isSelf) throw new AppError('Não é permitido alterar sua própria permissão!', 400)
        if (isTargetOwner) throw new AuthorizationError('O proprietário do quadro não pode ter seu cargo alterado')

        const existingMember = await prisma.boardMember.findUnique({
            where: {
                user_id_board_id: {
                    user_id: targetUserId,
                    board_id: boardId
                }
            }
        })

        const isDowngradingAdmin = existingMember && existingMember.role === 'ADMIN' && role !== 'ADMIN'

        if (isDowngradingAdmin) {
            const privilegedMembersCount = await prisma.boardMember.count({
                where: {
                    board_id: boardId,
                    role: { in: ['ADMIN', 'OWNER'] }
                }
            })
            const isLastAdmin = privilegedMembersCount <= 1

            if (isLastAdmin) throw new AppError('Não é possível rebaixar o único administrador do Quadro!', 400)
        }

        let nextOrder = 0
        if (!existingMember) {
            const lastMemberEntry = await prisma.boardMember.findFirst({
                where: {
                    user_id: targetUserId,
                    board: { workspace_id: workspaceId }
                },
                orderBy: { order: 'desc' },
                select: { order: true }
            })

            nextOrder = lastMemberEntry ? lastMemberEntry.order + 1 : 0
        }

        const member = await prisma.boardMember.upsert({
            where: { user_id_board_id: { user_id: targetUserId, board_id: boardId } },
            update: { role },
            create: {
                user_id: targetUserId,
                board_id: boardId,
                role,
                order: nextOrder
            },
            include: { user: { select: { id: true, name: true, email: true } } }
        })

        if (!existingMember) {
            LogService.register({
                userId,
                boardId,
                workspaceId,
                action: 'CREATE',
                entityType: 'MEMBER',
                entityId: targetUserId,
                newValue: `Membro adicionado: ${targetUserName} (${role})`
            })
        } else if (existingMember.role !== role) {
            LogService.register({
                userId,
                boardId,
                workspaceId,
                action: 'UPDATE',
                entityType: 'MEMBER',
                entityId: targetUserId,
                oldValue: `Cargo: ${existingMember.role}`,
                newValue: `Cargo: ${role}`
            })
        }

        emitToRoom(`board:${boardId}`, 'board_member:changed', member)

        return member
    },

    async getByBoard({ user, boardId }) {
        await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.VIEW)

        return await this.boardMemberRepository.isBoardMember(user.id, boardId)

        return await this.boardMemberRepository.findByBoard(boardId)
    },

    async remove({ user, boardId, memberIdToRemove }) {
        await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.ADMIN)

        const userId = user.id
        const isSelf = memberIdToRemove === userId

        if (isSelf) throw new AppError('Não é permitido remover a si mesmo do quadro!', 400)

        const membership = await prisma.boardMember.findUnique({
            where: { user_id_board_id: { user_id: memberIdToRemove, board_id: boardId } },
            select: {
                id: true,
                user_id: true,
                role: true,
                order: true,
                board: { select: { workspace_id: true, id: true } },
                user: { select: { name: true } }
            }
        })
        if (!membership) throw new AppError('Membro não encontrado neste quadro!', 404)

        const { role, user: { name: targetUserName }, board: { workspace_id } } = membership
        const isTargetOwner = role === 'OWNER'

        if (isTargetOwner) throw new AppError('O proprietário do quadro não pode ser removido!', 400)

        const result = await prisma.$transaction(async (tx) => {
            return await this._performRemoval(tx, { membership })
        })

        LogService.register({
            userId,
            boardId,
            workspaceId: workspace_id,
            action: 'DELETE',
            entityType: 'MEMBER',
            entityId: memberIdToRemove,
            oldValue: `Membro removido: ${targetUserName}`
        })

        emitToRoom(`board:${boardId}`, 'board_member:removed', { memberId: memberIdToRemove })

        return result
    },

    async move({ user, boardId, newOrder }) {
        const userId = user.id

        const currentMembership = await prisma.boardMember.findUnique({
            where: { user_id_board_id: { user_id: userId, board_id: boardId } },
            include: { board: { select: { workspace_id: true } } }
        })
        if (!currentMembership) throw new AppError('Vínculo entre usuário e quadro não encontrado!', 404)

        const { board: { workspace_id: workspaceId }, order: oldOrder } = currentMembership
        const totalBoards = await prisma.boardMember.count({
            where: {
                user_id: userId,
                board: { workspace_id: workspaceId }
            }
        })
        const maxOrder = totalBoards - 1
        const finalOrder = Math.max(0, Math.min(newOrder, maxOrder))
        const isSamePosition = oldOrder === newOrder || oldOrder === finalOrder

        if (isSamePosition) return currentMembership

        const result = await prisma.$transaction(async (tx) => {
            if (finalOrder > oldOrder) {
                await tx.boardMember.updateMany({
                    where: {
                        user_id: userId,
                        board: { workspace_id: workspaceId },
                        order: { gt: oldOrder, lte: finalOrder }
                    },
                    data: { order: { decrement: 1 } }
                })
            } else {
                await tx.boardMember.updateMany({
                    where: {
                        user_id: userId,
                        board: { workspace_id: workspaceId },
                        order: { gte: finalOrder, lt: oldOrder }
                    },
                    data: { order: { increment: 1 } }
                })
            }

            return await tx.boardMember.update({
                where: {
                    user_id_board_id:
                        { user_id: userId, board_id: boardId }
                },
                data: { order: finalOrder }
            })
        })

        return result
    },

    async leave({ user, boardId }) {
        const userId = user.id
        const membership = await prisma.boardMember.findUnique({
            where: { user_id_board_id: { user_id: userId, board_id: boardId } },
            select: {
                id: true,
                user_id: true,
                role: true,
                order: true,
                board: { select: { workspace_id: true, id: true } },
                user: { select: { name: true } }
            }
        })

        if (!membership) throw new AppError('Membro não encontrado neste quadro!', 404)

        const result = await prisma.$transaction(async (tx) => {
            return await this._performRemoval(tx, { membership })
        })

        LogService.register({
            userId,
            boardId,
            workspaceId: membership.board.workspace_id,
            action: 'DELETE',
            entityType: 'MEMBER',
            entityId: userId,
            oldValue: `${membership.user.name} saiu do quadro`
        })

        emitToRoom(`board:${boardId}`, 'board_member:leaved', { memberId: userId })

        return result
    },

}

module.exports = BoardMemberService