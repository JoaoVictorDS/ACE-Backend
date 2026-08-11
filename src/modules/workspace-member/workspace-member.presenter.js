class WorkspaceMemberPresenter {

    static format(membership) {
        return {
            id: membership.id,
            user_id: membership.user_id,
            workspace_id: membership.workspace_id,
            role: membership.role,
            order: membership.order,
            created_at: membership.created_at,
            updated_at: membership.updated_at
        }
    }
}

module.exports = WorkspaceMemberPresenter