class ItemValuePresenter {

    static upsert({ id = null, item_id, column_id, value, created_at = null, updated_at = null }) {
        return {
            id,
            item_id,
            column_id,
            value,
            created_at,
            updated_at
        }
    }

}

module.exports = ItemValuePresenter