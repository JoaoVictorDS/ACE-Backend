const BoardRepository = require('../../modules/board/board.repository')
const ColumnRepository = require('../../modules/column/column.repository')
const SectionRepository = require('../../modules/section/section.repository')
const ItemRepository = require('../../modules/item/item.repository')
const WorkspaceRepository = require('../../modules/workspace/workspace.repository')
const { NotFoundError, AuthorizationError, AppError } = require('../errors')
const { ROLES } = require('../constants')

const PermissionService = {

    isPrivileged(role) {
        if (!role) return false
        return ROLES.ADMIN.includes(role.toUpperCase())
    },

    _normalizeResourceContext(type, data) {
        if (type === 'BOARD') {
            return {
                boardId: data.id,
                workspaceId: data.workspace_id,
                creatorId: data.creator_id
            }
        }

        if (type === 'ITEM') {
            return {
                boardId: data.section.board_id,
                workspaceId: data.section.board.workspace_id,
                creatorId: data.section.board.creator_id
            }
        }

        return {
            boardId: data.board_id,
            workspaceId: data.board.workspace_id,
            creatorId: data.board.creator_id
        }
    },

    _determineUserRole(isSystemAdmin, userId, creatorId, member) {
        if (isSystemAdmin) return 'ADMIN'
        if (userId === creatorId) return 'OWNER'
        return member?.role || null
    },

    _validatePermission(role, permissionLevel) {
        if (!role) {
            throw new AuthorizationError()
        }

        const allowedRoles = ROLES[permissionLevel.toUpperCase()]

        if (!allowedRoles || !allowedRoles.includes(role)) {
            throw new AuthorizationError()
        }

        return true
    },

    async _resolveResourceContext(type, entityId) {
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

        return this._normalizeResourceContext(type, data)
    },

    async check(resourceType, entityId, user, permissionLevel = 'EDIT') {
        if (!resourceType || !entityId || !user) {
            throw new AppError()
        }

        const userId = user.id
        const isSystemAdmin = user.role === 'ADMIN'

        const context = await this._resolveResourceContext(resourceType, entityId)

        if (isSystemAdmin) {
            return {
                ...context,
                role: 'ADMIN'
            }
        }

        const member = await BoardRepository.findUserRoleInBoard(context.boardId, userId)

        const role = this._determineUserRole(isSystemAdmin, userId, context.creatorId, member)

        this._validatePermission(role, permissionLevel)

        return {
            ...context,
            role
        }
    },

    async checkWorkspace(workspaceId, user, permissionLevel = 'VIEW') {
        if (!workspaceId || !user) {
            throw new AppError()
        }

        const userId = user.id
        const isSystemAdmin = user.role === 'ADMIN'

        const workspace = await WorkspaceRepository.findPermissionContext(workspaceId, userId)

        if (!workspace) {
            throw new NotFoundError()
        }

        if (isSystemAdmin) {
            return {
                workspaceId: workspace.id,
                creatorId: workspace.creator_id,
                role: 'ADMIN',
                boardId: null
            }
        }

        const member = workspace.workspace_members?.[0] || null
        const role = this._determineUserRole(isSystemAdmin, userId, workspace.creator_id, member)

        this._validatePermission(role, permissionLevel)

        return {
            workspaceId: workspace.id,
            creatorId: workspace.creator_id,
            role,
            boardId: null
        }
    },

}

module.exports = PermissionService