class ItemUpdatePresenter {

    static format(ItemUpdate) {
        return {
            id: ItemUpdate.id,
            item_id: ItemUpdate.item_id,
            user_id: ItemUpdate.user_id,
            parent_id: ItemUpdate.parent_id,
            content: ItemUpdate.content,
            created_at: ItemUpdate.created_at,
            updated_at: ItemUpdate.updated_at,
            deleted_at: ItemUpdate.deleted_at,
            user: {
                id: ItemUpdate.user.id,
                name: ItemUpdate.user.name
            }
        }
    }
}

module.exports = ItemUpdatePresenter