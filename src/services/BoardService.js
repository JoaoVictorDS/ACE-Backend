const prisma = require('../config/prisma')
const PermissionService = require('./PermissionService')
const LogService = require('./LogService')
const AppError = require('../utils/AppError')

const BoardService = {

    async createBoard({ user, workspaceId, name }) {
        await PermissionService.checkWorkspacePermission(workspaceId, user, PermissionService.LEVELS.ADMIN)

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

    async getBoardsByUser({ user }) {
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

    async updateBoard({ user, boardId, name }) {
        const { workspaceId } = await PermissionService.checkPermission(PermissionService.TYPES.BOARD, boardId, user, PermissionService.LEVELS.ADMIN)

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

        return updatedBoard
    },

    async deleteBoard({ user, boardId, force = false }) {
        const { workspaceId } = await PermissionService.checkPermission(PermissionService.TYPES.BOARD, boardId, user, PermissionService.LEVELS.OWNER)

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

        return result
    },

}

module.exports = BoardService