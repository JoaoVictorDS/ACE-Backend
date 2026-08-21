const SectionRepository = require('../section/section.repository')
const ColumnRepository = require('../column/column.repository')
const ItemRepository = require('../item/item.repository')
const ItemCascadeService = require('../item/item-cascade.service')

const BoardCascadeService = {

    async cascadeDelete(boardIds, timestamp, tx) {
        const ids = Array.isArray(boardIds) ? boardIds : [boardIds]

        const [affectedSections, affectedColumns, affectedItems] = await Promise.all([
            SectionRepository.findSectionIdsByBoards(ids, tx),
            ColumnRepository.findColumnIdsByBoards(ids, tx),
            ItemRepository.findItemIdsByBoards(ids, tx)
        ])

        const itemIds = affectedItems.map(i => i.id)

        await Promise.all([
            SectionRepository.softDeleteByBoards(ids, timestamp, tx),
            ColumnRepository.softDeleteByBoards(ids, timestamp, tx),
            ItemRepository.softDeleteByBoards(ids, timestamp, tx)
        ])

        const { commentIds, itemUpdateIds } = await ItemCascadeService.cascadeDelete(itemIds, timestamp, tx)

        return {
            sectionIds: affectedSections.map(s => s.id),
            columnIds: affectedColumns.map(c => c.id),
            itemIds,
            commentIds,
            itemUpdateIds,
        }
    }
}

module.exports = BoardCascadeService