class BoardMemberPresenter {

    static format(membership) {
        return {
            id: membership.id,
            user_id: membership.user_id,
            board_id: membership.board_id,
            role: membership.role,
            order: membership.order,
            created_at: membership.created_at,
            updated_at: membership.updated_at
        }
    }

}

module.exports = BoardMemberPresenter