const BoardRepository = require('../board/board.repository')
const ColumnRepository = require('../column/column.repository')
const SectionRepository = require('../section/section.repository')
const ItemRepository = require('../item/item.repository')
const WorkspaceRepository = require('../workspace/workspace.repository')
const { NotFoundError, AuthorizationError } = require('../../shared/errors')
const { ROLES } = require('../../shared/constants')

const PermissionService = {

    isPrivileged(role) {
        if (!role) return false

        return ROLES.ADMIN.includes(role.toUpperCase())
    },

    async _resolveBoardContext(type, entityId) {
        let data

        switch (type.toUpperCase()) {
            case 'BOARD':
                data = await BoardRepository.findPermissionContext(entityId)
                break
            case 'SECTION':
                data = await SectionRepository.findPermissionContext(entityId)
                break
            case 'COLUMN':
                data = await ColumnRepository.findPermissionContext(entityId)
                break
            case 'ITEM':
                data = await ItemRepository.findPermissionContext(entityId)
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

        const member = await BoardRepository.findUserRoleInBoard(context.boardId, userId)
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
        const workspace = await WorkspaceRepository.findPermissionContext(workspaceId, userId)

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