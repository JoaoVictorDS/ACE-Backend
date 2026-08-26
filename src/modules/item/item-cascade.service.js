const CommentRepository = require('../comment/comment.repository')
const ItemUpdateRepository = require('../item-update/item-update.repository')

const ItemCascadeService = {

    async cascadeDelete(itemIds, timestamp, tx) {
        if (itemIds.length === 0) return { commentIds: [], itemUpdateIds: [] }

        const [affectedComments, affectedItemUpdates] = await Promise.all([
            CommentRepository.findCommentIdsByItems(itemIds, tx),
            ItemUpdateRepository.findItemUpdateIdsByItems(itemIds, tx),
        ])

        await Promise.all([
            CommentRepository.softDeleteByItems(itemIds, timestamp, tx),
            ItemUpdateRepository.softDeleteByItems(itemIds, timestamp, tx),
        ])

        return {
            commentIds: affectedComments.map(c => c.id),
            itemUpdateIds: affectedItemUpdates.map(iu => iu.id),
        }
    },

    async restoreFromSnapshot({ commentIds = [], itemUpdateIds = [] }, tx) {
        await Promise.all([
            commentIds.length ? CommentRepository.restoreMany(commentIds, tx) : null,
            itemUpdateIds.length ? ItemUpdateRepository.restoreMany(itemUpdateIds, tx) : null,
        ])
    },

}

module.exports = ItemCascadeService