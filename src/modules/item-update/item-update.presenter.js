class ItemUpdatePresenter {

    static update(ItemUpdate) {
        return {
            id: ItemUpdate.id,
            item_id: ItemUpdate.item_id,
            user_id: ItemUpdate.user_id,
            content: ItemUpdate.content,
            parent_id: ItemUpdate.parent_id,
            created_at: ItemUpdate.created_at,
            updated_at: ItemUpdate.updated_at,
            user: {
                id: ItemUpdate.user.id,
                name: ItemUpdate.user.name
            }
        }
    }
}

module.exports = ItemUpdatePresenter