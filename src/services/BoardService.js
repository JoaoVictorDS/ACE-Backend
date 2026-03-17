const prisma = require('../config/prisma')
const PermissionService = require('./PermissionService')
const LogService = require('./LogService')
const AppError = require('../utils/AppError')

const BoardService = {

    async createBoard({ name, workspaceId, userId }) {
        await PermissionService.checkWorkspacePermission(workspaceId, userId, PermissionService.LEVELS.ADMIN)

        const result = await prisma.$transaction(async (tx) => {
            const lastMemberEntry = await tx.boardMember.findFirst({
                where: { user_id: userId },
                orderBy: { order: 'desc' },
                select: { order: true }
            })

            const nextOrder = lastMemberEntry ? lastMemberEntry.order + 1 : 0

            const newBoard = await tx.board.create({
                data: {
                    name,
                    workspace_id: workspaceId,
                    creator_id: userId
                }
            })

            await tx.boardMember.create({
                data: {
                    board_id: newBoard.id,
                    user_id: userId,
                    role: 'OWNER',
                    order: nextOrder
                }
            })

            return newBoard
        })

        LogService.register({
            userId,
            workspaceId,
            boardId: result.id,
            action: 'CREATE',
            entityType: 'BOARD',
            entityId: result.id,
            newValue: name
        })

        return result
    },

    async getBoardsByUser({ userId }) {
        const memberships = await prisma.boardMember.findMany({
            where: { user_id: userId },
            include: {
                board: {
                    select: {
                        id: true,
                        name: true,
                        creator_id: true
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

    async updateBoard({ boardId, name, userId }) {
        const { workspaceId } = await PermissionService.checkPermission(PermissionService.TYPES.BOARD, boardId, userId, PermissionService.LEVELS.ADMIN)

        const currentBoard = await prisma.board.findUnique({
            where: { id: boardId }
        })
        if (!currentBoard) throw new AppError('Quadro não encontrado!', 404)
        if (currentBoard.name === name) return currentBoard

        const updatedBoard = await prisma.board.update({
            where: { id: boardId },
            data: { name }
        })

        LogService.register({
            userId,
            boardId,
            workspaceId,
            action: 'UPDATE',
            entityType: 'BOARD',
            entityId: boardId,
            oldValue: currentBoard.name,
            newValue: name
        })

        return updatedBoard
    },

    async deleteBoard({ boardId, userId, force = false }) {
        const { workspaceId } = await PermissionService.checkPermission(PermissionService.TYPES.BOARD, boardId, userId, PermissionService.LEVELS.OWNER)

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
        const hasContent = columns > 0 || sections > 0 || itemCount > 0
        if (!force && hasContent) throw new AppError(`Não é possível excluir o quadro: existem ${columns} colunas, ${sections} seções e ${items} itens vinculados. A exclusão removerá permanentemente esses dados. Use "force=true" para prosseguir.`, 409)

        await LogService.register({
            userId,
            boardId,
            workspaceId,
            action: 'DELETE',
            entityType: 'BOARD',
            entityId: boardId,
            oldValue: board.name
        })

        const deleted = await prisma.board.delete({
            where: { id: boardId }
        })

        return deleted
    },

}

module.exports = BoardService