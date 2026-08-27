const { ENTITY_TYPES } = require('../../../shared/constants')
const LeafRestoreExecutor = require('./leaf-restore-executor')

const CommentRepository = require('../../comment/comment.repository')
const ItemUpdateRepository = require('../../item-update/item-update.repository')
const ColumnRepository = require('../../column/column.repository')
const SectionRepository = require('../../section/section.repository')
const ItemRepository = require('../../item/item.repository')
const BoardRepository = require('../../board/board.repository')
const BoardMemberRepository = require('../../board-member/board-member.repository')

const SectionCascadeService = require('../../section/section-cascade.service')
const ItemCascadeService = require('../../item/item-cascade.service')
const BoardCascadeService = require('../../board/board-cascade.service')

const RESTORE_EXECUTORS = {
    [ENTITY_TYPES.COMMENT]: new LeafRestoreExecutor({
        repository: CommentRepository,
        entityLabel: 'Comentário'
    }),
    [ENTITY_TYPES.ITEM_UPDATE]: new LeafRestoreExecutor({
        repository: ItemUpdateRepository,
        entityLabel: 'Atualização de item'
    }),
    [ENTITY_TYPES.COLUMN]: new LeafRestoreExecutor({
        repository: ColumnRepository,
        entityLabel: 'Coluna',
        buildUpdateData: (snapshot) => Object.fromEntries(snapshot.fields.map(f => [f.field, f.before])),
        buildResource: (record) => ({ itemId: null, resource: { board: { id: record.board_id } } }),
        reassignOrder: async (columnId, snapshot, tx) => {
            const newOrder = await ColumnRepository.findMaxOrder(snapshot.before.board_id, tx)
            return ColumnRepository.updateOrder(columnId, newOrder, tx)
        },
        compactOrderOnDelete: (deletedColumn, tx) => ColumnRepository.decrementOrderAfter(deletedColumn.board_id, deletedColumn.order, tx),
    }),
    [ENTITY_TYPES.SECTION]: new LeafRestoreExecutor({
        repository: SectionRepository,
        entityLabel: 'Seção',
        buildResource: (record) => ({ itemId: null, resource: { board: { id: record.board_id } } }),
        restoreCascade: (_, snapshot, tx) => SectionCascadeService.restoreCascade(snapshot, tx),
        reassignOrder: async (sectionId, snapshot, tx) => {
            const newOrder = await SectionRepository.findMaxOrder(snapshot.before.board_id, tx)
            return SectionRepository.updateOrder(sectionId, newOrder, tx)
        },
        compactOrderOnDelete: (deletedSection, tx) => SectionRepository.decrementOrderAfter(deletedSection.board_id, deletedSection.order, tx),
        cascadeOnUndoCreate: (deletedSection, timestamp, tx) => SectionCascadeService.cascadeDelete(deletedSection.id, timestamp, tx)
    }),
    [ENTITY_TYPES.ITEM]: new LeafRestoreExecutor({
        repository: ItemRepository,
        entityLabel: 'Item',
        buildResource: (record) => ({ itemId: record.id, resource: { item: { id: record.id, title: record.title } } }),
        restoreCascade: (_, snapshot, tx) => ItemCascadeService.restoreFromSnapshot(snapshot.cascaded ?? {}, tx),
        reassignOrder: async (itemId, snapshot, tx) => {
            const newOrder = await ItemRepository.findMaxOrder(snapshot.before.section_id, tx)
            return ItemRepository.updateSectionAndOrder(itemId, snapshot.before.section_id, newOrder, tx)
        },
        compactOrderOnDelete: (deletedItem, tx) => ItemRepository.decrementOrderAfter(deletedItem.section_id, deletedItem.order, tx),
        cascadeOnUndoCreate: (deletedItem, timestamp, tx) => ItemCascadeService.cascadeDelete(deletedItem.id, timestamp, tx)
    }),
    [ENTITY_TYPES.BOARD]: new LeafRestoreExecutor({
        repository: BoardRepository,
        entityLabel: 'Quadro',
        buildResource: (record) => ({ itemId: null, resource: { board: { id: record.id, name: record.name } } }),
        restoreCascade: async (boardId, snapshot, tx) => {
            const { promotedCount } = await BoardCascadeService.restoreCascade(boardId, snapshot, tx)

            return promotedCount
        },
        compactOrderOnDelete: (deletedBoard, tx) => BoardMemberRepository.decrementOrderAfterBoardDeletion(deletedBoard.board_id, deletedBoard.workspace_id, tx),
        cascadeOnUndoCreate: (deletedBoard, timestamp, tx) => BoardCascadeService.cascadeDelete(deletedBoard.id, timestamp, tx),
        buildDeleteSummary: (cascadeResult, entityLabel) => cascadeResult > 0
            ? `${entityLabel} restaurado(a) — ${cascadeResult} administrador(es) adicionado(s)`
            : `${entityLabel} restaurado(a)`,
    }),
}

module.exports = RESTORE_EXECUTORS
