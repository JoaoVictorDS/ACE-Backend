const SectionRepository = require('../section/section.repository')
const ColumnRepository = require('../column/column.repository')
const ItemRepository = require('../item/item.repository')
const CommentRepository = require('../comment/comment.repository')
const ItemUpdateRespository = require('../item-update/item-update.repository')

const BoardCascadeService = {

    async cascadeDelete(boardIds, timestamp, tx) {
        const ids = Array.isArray(boardIds) ? boardIds : [boardIds]

        const [affectedSections, affectedColumns, affectedItems, affectedComments, affectedItemUpdates] = await Promise.all([
            SectionRepository.findSectionIdsForSoftDeleteByBoards(ids, tx),
            ColumnRepository.findColumnIdsForSoftDeleteByBoards(ids, tx),
            ItemRepository.findItemIdsForSoftDeleteByBoards(ids, tx),
            CommentRepository.findCommentIdsForSoftDeleteByBoards(ids, tx),
            ItemUpdateRespository.findItemUpdateIdsForSoftDeleteByBoards(ids, tx)
        ])

        await Promise.all([
            SectionRepository.softDeleteByBoards(ids, timestamp, tx),
            ColumnRepository.softDeleteByBoards(ids, timestamp, tx),
            ItemRepository.softDeleteByBoards(ids, timestamp, tx),
            CommentRepository.softDeleteByBoards(ids, timestamp, tx),
            ItemUpdateRespository.softDeleteByBoards(ids, timestamp, tx)
        ])

        return {
            sectionIds: affectedSections.map(s => s.id),
            columnIds: affectedColumns.map(c => c.id),
            itemIds: affectedItems.map(i => i.id),
            commentIds: affectedComments.map(c => c.id),
            itemUpdateIds: affectedItemUpdates.map(iu => iu.id),
        }
    }
}

module.exports = BoardCascadeService