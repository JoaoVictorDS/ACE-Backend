const CommentRepository = require('../comment/comment.repository')
const ItemUpdateRepository = require('../item-update/item-update.repository')

const ItemCascadeService = {

    async cascadeDelete(itemIds, timestamp, tx) {
        if (itemIds.length === 0) return { commentIds: [], itemUpdateIds: [] }

        const ids = Array.isArray(itemIds) ? itemIds : [itemIds]

        const [affectedComments, affectedItemUpdates] = await Promise.all([
            CommentRepository.findCommentIdsByItems(ids, tx),
            ItemUpdateRepository.findItemUpdateIdsByItems(ids, tx),
        ])

        await Promise.all([
            CommentRepository.softDeleteByItems(ids, timestamp, tx),
            ItemUpdateRepository.softDeleteByItems(ids, timestamp, tx),
        ])

        return {
            commentIds: affectedComments.map(c => c.id),
            itemUpdateIds: affectedItemUpdates.map(iu => iu.id),
        }
    },

    async restoreCascade({ commentIds = [], itemUpdateIds = [] }, tx) {
        await Promise.all([
            commentIds.length ? CommentRepository.restoreMany(commentIds, tx) : null,
            itemUpdateIds.length ? ItemUpdateRepository.restoreMany(itemUpdateIds, tx) : null,
        ])
    },

}

module.exports = ItemCascadeService