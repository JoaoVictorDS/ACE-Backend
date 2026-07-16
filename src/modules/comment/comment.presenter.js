class CommentPresenter {

    static update(comment) {
        return {
            id: comment.id,
            item_id: comment.item_id,
            user_id: comment.user_id,
            content: comment.content,
            created_at: comment.created_at,
            updated_at: comment.updated_at,
            user: {
                id: comment.user.id,
                name: comment.user.name
            }
        }
    }
}

module.exports = CommentPresenter