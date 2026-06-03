const { prisma, emitToRoom } = require('../../config')
const PermissionService = require('../permission/permission.service')
const { RESOURCE_TYPES, PERMISSION_LEVELS } = require('../../shared/constants')
const LogService = require('../log/log.service')
const { AppError, NotFoundError, AuthorizationError } = require('../../shared/errors')
const BoardMemberRepository = require('../board-member/board-member.repository')
const BoardRepository = require('./board.repository')

const BoardService = {

    async create({ user, workspaceId, name }) {
        await PermissionService.checkWorkspace(workspaceId, user, PERMISSION_LEVELS.ADMIN)
        const userId = user.id

        const lastMemberEntry = await BoardMemberRepository.findLastMemberInWorkspace(userId, workspaceId)
        const nextOrder = lastMemberEntry ? lastMemberEntry.order + 1 : 0

        const newBoard = await BoardRepository.create(name, workspaceId, userId, nextOrder)

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
        const memberships = await BoardMemberRepository.findMemberships(user.id)

        return memberships.map(m => ({
            ...m.board,
            user_role: m.role,
            personal_order: m.order
        }))
    },

    async getFull({ user, boardId }) {
        const board = await BoardRepository.findByIdWithStructure(boardId, user.id)
        if (!board) throw new NotFoundError('Quadro')

        const { board_members, ...boardData } = board
        const isSystemAdmin = user.role === 'ADMIN'
        const membership = board_members[0]

        if (!isSystemAdmin && !membership) throw new AuthorizationError('Acesso negado: usuário não é membro deste quadro.')

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

    async update({ user, boardId, data }) {
        const { workspaceId } = await PermissionService.check(RESOURCE_TYPES.BOARD, boardId, user, PERMISSION_LEVELS.ADMIN)

        const currentBoard = await BoardRepository.findById(boardId)
        if (!currentBoard) throw new AppError('Quadro não encontrado!', 404)

        const hasChanges = Object.keys(data).some(
            (key) => data[key] !== undefined && data[key] !== currentBoard[key]
        )

        if (!hasChanges) {
            return currentBoard
        }

        const changes = []
        if (data.name && data.name !== currentBoard.name) {
            changes.push({
                field: 'name',
                old: currentBoard.name,
                new: data.name
            })
        }
        if (data.color && data.color !== currentBoard.color) {
            changes.push({
                field: 'color',
                old: currentBoard.color,
                new: data.color
            })
        }
        if (data.item_label_singular && data.item_label_singular !== currentBoard.item_label_singular) {
            changes.push({
                field: 'item_label_singular',
                old: currentBoard.item_label_singular,
                new: data.item_label_singular
            })
        }
        if (data.item_label_plural && data.item_label_plural !== currentBoard.item_label_plural) {
            changes.push({
                field: 'item_label_plural',
                old: currentBoard.item_label_plural,
                new: data.item_label_plural
            })
        }

        const updatedBoard = await BoardRepository.update(boardId, data)

        LogService.register({
            userId: user.id,
            boardId,
            workspaceId,
            action: 'UPDATE',
            entityType: 'BOARD',
            entityId: boardId,
            oldValue: changes.map(c => `${c.field}: "${c.old}"`).join(' | '),
            newValue: changes.map(c => `${c.field}: "${c.new}"`).join(' | ')
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