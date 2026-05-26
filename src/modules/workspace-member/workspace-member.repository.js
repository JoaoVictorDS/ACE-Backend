const WorkspaceMemberRepository = {

    async isWorkspaceMember(userId, workspaceId) {
        return await this.findById({
            user_id_workspace_id: { user_id: userId, workspace_id: workspaceId }
        })
    }
}

module.exports = WorkspaceMemberRepository