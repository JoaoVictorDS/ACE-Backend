const prisma = require('../../config/prisma')

const WorkspaceMemberRepository = {

    async isWorkspaceMember(userId, workspaceId) {
        const member = await prisma.workspaceMember.findUnique({
            where: { user_id_workspace_id: { user_id: userId, workspace_id: workspaceId } }
        })
        return !!member
    }
}

module.exports = WorkspaceMemberRepository