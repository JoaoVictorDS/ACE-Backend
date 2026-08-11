class ColumnRestrictionMapper {

    static toPersistence(data, columnId = null) {

        return data.map(r => ({
            id: r.id || undefined,
            column_id: columnId || r.column_id,
            user_id: r.user_id || null,
            board_role: r.board_role || null,
            can_view: r.can_view ?? true,
            can_edit: r.can_edit ?? false
        }))

    }

}

module.exports = ColumnRestrictionMapper

