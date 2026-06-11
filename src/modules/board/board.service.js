const { emitToRoom } = require('../../config')
const PermissionService = require('../../shared/services/permission.service')
const LogService = require('../log/log.service')
const BoardMemberRepository = require('../board-member/board-member.repository')
const BoardRepository = require('./board.repository')
const ItemRepository = require('../item/item.repository')
const { RESOURCE_TYPES, PERMISSION_LEVELS } = require('../../shared/constants')
const { AppError, NotFoundError, AuthorizationError } = require('../../shared/errors')
const TransactionManager = require('../../shared/database/TransactionManager')

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

    async getByUserAndWorkspace({ user, workspaceId }) {
        await PermissionService.checkWorkspace(workspaceId, user, PERMISSION_LEVELS.VIEW)

        const membership = await BoardMemberRepository.findMembershipsInWorkspace(user.id, workspaceId)

        return membership.map(m => ({
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
        const [board, itemsCount] = await Promise.all([
            BoardRepository.findBoardDeletionContext(boardId),
            ItemRepository.countByBoard(boardId)
        ])
        const { columns: columnsCount, sections: sectionsCount } = board._count
        const hasContent = columnsCount > 0 || sectionsCount > 0 || itemsCount > 0
        if (!force && hasContent) throw new AppError(`Não é possível excluir o quadro: existem ${columnsCount} colunas, ${sectionsCount} seções e ${itemsCount} itens vinculados. A exclusão removerá permanentemente esses dados. Use "force=true" para prosseguir.`, 409)

        const result = await TransactionManager.run(async (tx) => {
            await BoardMemberRepository.decrementOrderAfterBoardDeletion(boardId, workspaceId, tx)

            await LogService.register({
                userId: user.id,
                boardId: boardId,
                workspaceId: workspaceId,
                action: 'DELETE',
                entityType: 'BOARD',
                entityId: boardId,
                oldValue: `Quadro removido: ${board.name}`,
                tx
            })

            return await BoardRepository.delete(boardId, tx)
        })

        emitToRoom(`board:${boardId}`, 'board:deleted', { boardId })

        return result
    },

}

module.exports = BoardService