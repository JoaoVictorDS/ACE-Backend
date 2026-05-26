const prisma = require('../../config/prisma')
const PermissionService = require('../permission/permission.service')
const RESOURCE_TYPES = require('../../shared/constants/resourceTypes')
const PERMISSION_LEVELS = require('../../shared/constants/permissionLevels')
const LogService = require('../log/log.service')
const { emitToRoom } = require('../../config/socket')
const AppError = require('../../shared/errors/AppError')

const BoardService = {

    async create({ user, workspaceId, name }) {
        await PermissionService.checkWorkspace(workspaceId, user, PERMISSION_LEVELS.ADMIN)

        const userId = user.id

        const lastMemberEntry = await prisma.boardMember.findFirst({
            where: {
                user_id: userId,
                board: { workspace_id: workspaceId }
            },
            orderBy: { order: 'desc' },
            select: { order: true }
        })

        const nextOrder = lastMemberEntry ? lastMemberEntry.order + 1 : 0

        const newBoard = await prisma.board.create({
            data: {
                name,
                workspace_id: workspaceId,
                creator_id: userId,
                board_members: {
                    create: {
                        user_id: userId,
                        role: 'OWNER',
                        order: nextOrder
                    }
                }
            }
        })

        LogService.register({
            userId,
            workspaceId,
            boardId: newBoard.id,
            action: 'CREATE',
            entityType: 'BOARD',
            entityId: newBoard.id,
            newValue: `Quadro criado: ${name}`
        })

        return newBoard
    },

    async getByUser({ user }) {
        const memberships = await prisma.boardMember.findMany({
            where: { user_id: user.id },
            include: {
                board: {
                    select: {
                        id: true,
                        name: true,
                        creator_id: true,
                        workspace_id: true
                    }
                }
            },
            orderBy: {
                order: 'asc'
            }
        })

        return memberships.map(m => ({
            ...m.board,
            user_role: m.role,
            personal_order: m.order
        }))
    },

    async getFull({ user, boardId }) {
        const board = await prisma.board.findUnique({
            where: { id: boardId },
            include: {
                board_members: {
                    where: { user_id: user.id }
                },
                columns: {
                    orderBy: [{ order: 'asc' }, { id: 'asc' }],
                    include: { restrictions: true }
                },
                sections: {
                    orderBy: [{ order: 'asc' }, { id: 'asc' }],
                    include: {
                        items: {
                            orderBy: [{ order: 'asc' }, { id: 'asc' }],
                            include: { item_values: true }
                        }
                    }
                },
            }
        })
        if (!board) throw new AppError('Quadro não encontrado', 404)

        const { board_members, ...boardData } = board
        const isSystemAdmin = user.role === 'ADMIN'
        const membership = board_members[0]

        if (!isSystemAdmin && !membership) throw new AppError('Acesso negado: usuário não é membro deste quadro.', 403)

        const userBoardRole = membership?.role
        const isPrivilegedMember = isSystemAdmin || PermissionService.isPrivileged(userBoardRole)

        const visibleColumns = boardData.columns.filter(col => {
            if (isPrivilegedMember) return true

            const restriction = col.restrictions.find(r => r.user_id === user.id || r.board_role === userBoardRole)

            return !(restriction && restriction.can_view === false)
        })

        const visibleColumnIds = new Set(visibleColumns.map(c => c.id))

        const cleanSections = boardData.sections.map(section => ({
            ...section,
            items: section.items.map(item => ({
                ...item,
                item_values: item.item_values.filter(val =>
                    visibleColumnIds.has(val.column_id)
                )
            }))
        }))

        return {
            ...boardData,
            columns: visibleColumns,
            sections: cleanSections
        }
    },

    async update({ user, boardId, name }) {
        const { workspaceId } = await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.ADMIN)

        const currentBoard = await prisma.board.findUnique({
            where: { id: boardId },
            select: { name: true }
        })
        if (!currentBoard) throw new AppError('Quadro não encontrado!', 404)

        const isSameName = currentBoard.name === name
        if (isSameName) return currentBoard

        const updatedBoard = await prisma.board.update({
            where: { id: boardId },
            data: { name }
        })

        LogService.register({
            userId: user.id,
            boardId,
            workspaceId,
            action: 'UPDATE',
            entityType: 'BOARD',
            entityId: boardId,
            oldValue: `Nome: ${currentBoard.name}`,
            newValue: `Nome: ${name}`
        })

        emitToRoom(`board:${boardId}`, 'board:updated', updatedBoard)

        return updatedBoard
    },

    async delete({ user, boardId, force = false }) {
        const { workspaceId } = await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.OWNER)

        const [board, items] = await Promise.all([
            prisma.board.findUnique({
                where: { id: boardId },
                select: {
                    name: true,
                    _count: { select: { columns: true, sections: true } }
                }
            }),

            prisma.item.count({
                where: { section: { board_id: boardId } }
            })
        ])
        if (!board) throw new AppError('Quadro não encontrado!', 404)

        const { columns, sections } = board._count
        const hasContent = columns > 0 || sections > 0 || items > 0
        if (!force && hasContent) throw new AppError(`Não é possível excluir o quadro: existem ${columns} colunas, ${sections} seções e ${items} itens vinculados. A exclusão removerá permanentemente esses dados. Use "force=true" para prosseguir.`, 409)

        const result = await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`
                UPDATE "board_members" AS bm
                SET "order" = bm."order" - 1
                FROM "board_members" AS deleted_bm, "boards" AS b
                WHERE bm.user_id = deleted_bm.user_id
                AND deleted_bm.board_id = ${boardId}
                AND bm.board_id = b.id
                AND b.workspace_id = ${workspaceId}
                AND bm."order" > deleted_bm."order"
            `

            await tx.activityLog.create({
                data: {
                    user_id: user.id,
                    board_id: boardId,
                    workspace_id: workspaceId,
                    action: 'DELETE',
                    entity_type: 'BOARD',
                    entity_id: boardId,
                    old_value: `Quadro removido: ${board.name}`
                }
            })

            return await tx.board.delete({
                where: { id: boardId }
            })

        })

        emitToRoom(`board:${boardId}`, 'board:deleted', { boardId })

        return result
    },

}

module.exports = BoardService