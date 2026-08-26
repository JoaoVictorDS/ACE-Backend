const { ENTITY_TYPES } = require('../../../shared/constants')
const LeafRestoreExecutor = require('./leaf-restore-executor')

const CommentRepository = require('../../comment/comment.repository')
const ItemUpdateRepository = require('../../item-update/item-update.repository')
const ColumnRepository = require('../../column/column.repository')

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
    })
}

module.exports = RESTORE_EXECUTORS
