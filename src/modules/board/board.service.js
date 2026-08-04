const { emitToRoom, appEventEmitter } = require('../../config')
const BoardMemberRepository = require('../board-member/board-member.repository')
const BoardRepository = require('./board.repository')
const ItemRepository = require('../item/item.repository')
const { NotFoundError, AuthorizationError, ConflictError } = require('../../shared/errors')
const { TransactionManager } = require('../../shared/database')
const { RESOURCE_TYPES, PERMISSION_LEVELS, ENTITY_TYPES } = require('../../shared/constants')
const { PermissionService } = require('../../shared/services')
const ERROR_CATALOG = require('../../shared/errors/error-catalog')
const { DOMAIN_EVENT } = require('../../shared/events/domain-event')

const BoardService = {

    async create({ user, workspaceId, name }) {
        await PermissionService.checkWorkspace(workspaceId, user, PERMISSION_LEVELS.ADMIN)
        const userId = user.id
        const nextOrder = await BoardMemberRepository.findMaxOrderByWorkspace(userId, workspaceId)
        const newBoard = await BoardRepository.create(name, workspaceId, userId, nextOrder)

        appEventEmitter.emit(DOMAIN_EVENT, {
            actor: user,
            workspaceId,
            boardId: newBoard.id,
            action: 'CREATE',
            entityType: ENTITY_TYPES.BOARD,
            entityId: newBoard.id,
            resource: { workspaceId, boardId: newBoard.id, board: { id: newBoard.id, name: newBoard.name } },
            changes: { before: null, after: newBoard.name },
            snapshot: {
                before: null,
                after: {
                    id: newBoard.id,
                    creator_id: newBoard.creator_id,
                    workspace_id: newBoard.workspace_id,
                    name: newBoard.name,
                    color: newBoard.color,
                    item_label_singular: newBoard.item_label_singular,
                    item_label_plural: newBoard.item_label_plural,
                    deleted_at: null,
                }
            }
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
        if (!board) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.BOARD)

        const { board_members, ...boardData } = board
        const isSystemAdmin = user.role === 'ADMIN'
        const membership = board_members[0]

        if (!isSystemAdmin && !membership) throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.NOT_MEMBER('BOARD'))

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
        if (!currentBoard) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.BOARD)

        const hasChanges = Object.keys(data).some(
            (key) => data[key] !== undefined && data[key] !== currentBoard[key]
        )

        if (!hasChanges) return currentBoard

        const FIELD_LABELS = {
            name: 'nome',
            color: 'cor',
            item_label_singular: 'rótulo de item (singular)',
            item_label_plural: 'rótulo de item (plural)',
        }

        const fields = Object.keys(FIELD_LABELS)
            .filter(key => data[key] !== undefined && data[key] !== currentBoard[key])
            .map(field => ({ field, label: FIELD_LABELS[field], before: currentBoard[field], after: data[field] }))

        const updatedBoard = await BoardRepository.update(boardId, data)

        appEventEmitter.emit(DOMAIN_EVENT, {
            actor: user,
            workspaceId,
            boardId,
            action: 'UPDATE',
            entityType: ENTITY_TYPES.BOARD,
            entityId: boardId,
            resource: { workspaceId, boardId, board: { id: updatedBoard.id, name: updatedBoard.name } },
            changes: { fields }
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

        if (!force && hasContent) {
            throw new ConflictError(
                ERROR_CATALOG.CONFLICT.RESOURCE_HAS_CONTENT('o quadro',
                    `${columnsCount} colunas, ${sectionsCount} seções e ${itemsCount} itens`
                )
            )
        }

        const result = await TransactionManager.run(async (tx) => {
            await BoardMemberRepository.decrementOrderAfterBoardDeletion(boardId, workspaceId, tx)

            return await BoardRepository.softDelete(boardId, tx)
        })

        appEventEmitter.emit(DOMAIN_EVENT, {
            actor: user,
            workspaceId,
            boardId,
            action: 'DELETE',
            entityType: ENTITY_TYPES.BOARD,
            entityId: boardId,
            resource: { workspaceId, boardId, board: { id: boardId, name: board.name } },
            changes: { before: board.name, after: null },
            snapshot: {
                before: {
                    id: board.id,
                    creator_id: board.creator_id,
                    workspace_id: workspaceId,
                    name: board.name,
                    color: board.color,
                    item_label_singular: board.item_label_singular,
                    item_label_plural: board.item_label_plural,
                    deleted_at: null,
                },
                after: null
            }
        })

        emitToRoom(`board:${boardId}`, 'board:deleted', { boardId })

        return result
    },

}

module.exports = BoardService