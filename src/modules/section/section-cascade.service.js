const ItemRepository = require('../item/item.repository')
const ItemCascadeService = require('../item/item-cascade.service')

const SectionCascadeService = {

    async cascadeDelete(sectionIds, timestamp, tx) {
        const ids = Array.isArray(sectionIds) ? sectionIds : [sectionIds]

        const affectedItems = await ItemRepository.findItemIdsBySections(ids, tx)
        const itemIds = affectedItems.map(i => i.id)

        await ItemRepository.softDeleteBySections(ids, timestamp, tx)

        const { commentIds, itemUpdateIds } = await ItemCascadeService.cascadeDelete(itemIds, timestamp, tx)

        return { itemIds, commentIds, itemUpdateIds }
    },

    async restoreCascade(snapshot, tx) {
        const { itemIds = [], commentIds = [], itemUpdateIds = [] } = snapshot.cascaded ?? {}

        if (itemIds.length) await ItemRepository.restoreMany(itemIds, tx)
        await ItemCascadeService.restoreCascade({ commentIds, itemUpdateIds }, tx)
    },

}

module.exports = SectionCascadeService