const { ENTITY_TYPES } = require('../../../shared/constants')
const LeafRestoreExecutor = require('./leaf-restore-executor')

const CommentRepository = require('../../comment/comment.repository')
const ItemUpdateRepository = require('../../item-update/item-update.repository')
const ColumnRepository = require('../../column/column.repository')
const SectionRepository = require('../../section/section.repository')

const SectionCascadeService = require('../../section/section-cascade.service')

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
        buildResource: async (record) => ({
            itemId: null,
            resource: { board: { id: record.board_id } },
        }),
        reassignOrder: async (columnId, snapshot, tx) => {
            const newOrder = await ColumnRepository.findMaxOrder(snapshot.before.board_id, tx)
            return await ColumnRepository.updateOrder(columnId, newOrder, tx)
        },
        compactOrderOnDelete: async (deletedColumn, tx) => {
            await ColumnRepository.decrementOrderAfter(deletedColumn.board_id, deletedColumn.order, tx)
        },
    }),
    [ENTITY_TYPES.SECTION]: new LeafRestoreExecutor({
        repository: SectionRepository,
        entityLabel: 'Seção',
        buildResource: async (record) => ({
            itemId: null,
            resource: { board: { id: record.board_id } }
        }),
        restoreCascade: SectionCascadeService.restoreCascade,
        reassignOrder: async (sectionId, snapshot, tx) => {
            const newOrder = await SectionRepository.findMaxOrder(snapshot.before.board_id, tx)
            return SectionRepository.updateOrder(sectionId, newOrder, tx)
        },
        compactOrderOnDelete: async (deletedSection, tx) => {
            await SectionRepository.decrementOrderAfter(deletedSection.board_id, deletedSection.order, tx)
        }
    })
}

module.exports = RESTORE_EXECUTORS
