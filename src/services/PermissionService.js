const { BoardRepository, ColumnRepository, SectionRepository, ItemRepository, WorkspaceRepository } = require('../repositories')
const { NotFoundError, AuthorizationError } = require('../errors')
const { ROLES } = require('../constants')

const PermissionService = {
    boardRepository: new BoardRepository(),
    columnRepository: new ColumnRepository(),
    sectionRepository: new SectionRepository(),
    itemRepository: new ItemRepository(),
    workspaceRepository: new WorkspaceRepository(),

    isPrivileged(role) {
        if (!role) return false

        return ROLES.ADMIN.includes(role.toUpperCase())
    },

    async _resolveBoardContext(type, entityId) {
        let data

        switch (type.toUpperCase()) {
            case 'BOARD':
                data = await this.boardRepository.findPermissionContext(entityId)
                break
            case 'SECTION':
                data = await this.sectionRepository.findPermissionContext(entityId)
                break
            case 'COLUMN':
                data = await this.columnRepository.findPermissionContext(entityId)
                break
            case 'ITEM':
                data = await this.itemRepository.findPermissionContext(entityId)
                break
        }

        if (!data) throw new NotFoundError(type)

        if (type === 'BOARD') return {
            boardId: data.id,
            workspaceId: data.workspace_id,
            creatorId: data.creator_id
        }
        if (type === 'ITEM') return {
            boardId: data.section.board_id,
            workspaceId: data.section.board.workspace_id,
            creatorId: data.section.board.creator_id
        }

        return {
            boardId: data.board_id,
            workspaceId: data.board.workspace_id,
            creatorId: data.board.creator_id
        };
    },

    async check(type, entityId, user, actionLevel = 'EDIT') {
        const userId = user.id
        const isSystemAdmin = user.role === 'ADMIN'
        const context = await this._resolveBoardContext(type, entityId)

        if (isSystemAdmin) return { ...context, role: 'OWNER' }

        const member = await this.boardRepository.findUserRoleInBoard(context.boardId, userId)
        const role = context.creatorId === userId ? 'OWNER' : (member?.role || null)
        const allowedRoles = ROLES[actionLevel.toUpperCase()]

        if (!role || !allowedRoles.includes(role)) throw new AuthorizationError()

        return {
            ...context,
            role,
        }
    },

    async checkWorkspace(workspaceId, user, actionLevel = 'VIEW') {
        const userId = user.id
        const isSystemAdmin = user.role === 'ADMIN'
        const workspace = await this.workspaceRepository.findPermissionContext(workspaceId, userId)

        if (!workspace) throw new NotFoundError()
        if (isSystemAdmin) return {
            boardId: null,
            workspaceId: workspace.id,
            creatorId: workspace.creator_id,
            role: 'OWNER'
        }

        const role = workspace.creator_id === userId ? 'OWNER' : (workspace.workspace_members[0]?.role || null)
        const allowedRoles = ROLES[actionLevel.toUpperCase()]

        if (!role || !allowedRoles.includes(role)) throw new AuthorizationError()

        return {
            creatorId: workspace.creator_id,
            role,
            workspaceId: workspace.id,
            boardId: null
        }
    }

}

module.exports = PermissionService