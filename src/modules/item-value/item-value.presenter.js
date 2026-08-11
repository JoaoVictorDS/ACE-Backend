class ItemValuePresenter {

    static format(itemValue) {
        return {
            id: itemValue.id || null,
            item_id: itemValue.item_id,
            column_id: itemValue.column_id,
            value: itemValue.value,
            created_at: itemValue.created_at || null,
            updated_at: itemValue.updated_at || null
        }
    }
}

module.exports = ItemValuePresenter