const BoardRepository = require('../../modules/board/board.repository')
const BoardMemberRepository = require('../../modules/board-member/board-member.repository')
const ColumnRepository = require('../../modules/column/column.repository')
const SectionRepository = require('../../modules/section/section.repository')
const ItemRepository = require('../../modules/item/item.repository')
const WorkspaceRepository = require('../../modules/workspace/workspace.repository')
const { NotFoundError, AuthorizationError, AppError } = require('../errors')
const { ROLES } = require('../constants')
const ERROR_CATALOG = require('../errors/error-catalog')

const PermissionService = {

    /**
     * Verifica se role tem privilégios administrativos no quadro
     * @param {string} role - Role do usuário (ex: 'ADMIN', 'EDITOR')
     * @returns {boolean} True se role é ADMIN
     */
    isPrivileged(role) {
        if (!role) return false
        return ROLES.ADMIN.includes(role.toUpperCase())
    },

    /**
     * Resolve contexto de um recurso (Board, Section, Column, Item)
     * @private
     * @param {string} resourceType - Tipo do recurso (BOARD, SECTION, COLUMN, ITEM)
     * @param {number} entityId - ID do recurso
     * @returns {Promise<object>} { boardId, workspaceId, creatorId }
     * @throws {NotFoundError} Se recurso não existe
     */
    async _resolveResourceContext(resourceType, entityId) {
        const type = resourceType.toUpperCase()

        let data
        switch (type) {
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
            default:
                throw new AppError(
                    ERROR_CATALOG.INTERNAL.UNSUPPORTED_RESOURCE(type).message,
                    500,
                    {
                        code: ERROR_CATALOG.INTERNAL.UNSUPPORTED_RESOURCE(type).code,
                        isOperational: false
                    }
                )
        }

        if (!data) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.RESOURCE(type))

        return this._normalizeResourceContext(type, data)
    },

    /**
     * Transforma resposta do repository em contexto padrão
     * @private
     * @param {string} type - Tipo do recurso
     * @param {object} data - Dados do recurso
     * @returns {object} { boardId, workspaceId, creatorId }
     */
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

    /**
     * Determina role final do usuário (OWNER, ADMIN, EDITOR, VIEWER)
     * Considera: admin do sistema > criador > membro do quadro
     * @private
     * @param {boolean} isSystemAdmin - É admin do sistema?
     * @param {number} userId - ID do usuário
     * @param {number} creatorId - ID do criador do recurso
     * @param {object} member - Dados do membro do quadro (ou null)
     * @returns {string|null} Role final ou null se não autorizado
     */
    _determineUserRole(isSystemAdmin, userId, creatorId, member) {
        if (isSystemAdmin) return 'ADMIN'
        if (userId === creatorId) return 'OWNER'
        return member?.role || null
    },

    /**
     * Valida se role tem permissão para ação
     * @private
     * @param {string} role - Role do usuário
     * @param {string} permissionLevel - Nível de permissão (VIEW, EDIT, ADMIN)
     * @throws {AuthorizationError} Se role não tem permissão
     */
    _validatePermission(role, permissionLevel) {
        if (!role) throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN)

        const allowedRoles = ROLES[permissionLevel.toUpperCase()]

        if (!allowedRoles) {
            throw new AppError(
                ERROR_CATALOG.INTERNAL.INVALID_PERMISSION_LEVEL.message,
                500,
                {
                    code: ERROR_CATALOG.INTERNAL.INVALID_PERMISSION_LEVEL.code,
                    isOperational: false
                }
            )
        }

        if (!allowedRoles.includes(role)) throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN)
    },

    /**
     * Verifica permissão de usuário em um recurso específico
     * @param {string} resourceType - Tipo do recurso (BOARD, SECTION, COLUMN, ITEM)
     * @param {number} entityId - ID do recurso
     * @param {object} user - Usuário { id, role }
     * @param {string} permissionLevel - Nível necessário (VIEW, EDIT, ADMIN) — default: EDIT
     * @returns {Promise<object>} { boardId, workspaceId, creatorId, role }
     * @throws {NotFoundError} Se recurso não existe
     * @throws {AuthorizationError} Se usuário não tem permissão
     */
    async check(resourceType, entityId, user, permissionLevel = 'EDIT') {
        if (!resourceType || !entityId || !user) {
            throw new AppError(
                ERROR_CATALOG.INTERNAL.MISSING_PERMISSION_PARAMS('resourceType, entityId e user').message,
                500,
                {
                    code: ERROR_CATALOG.INTERNAL.MISSING_PERMISSION_PARAMS('resourceType, entityId e user').code,
                    isOperational: false
                }
            )
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

        const member = await BoardMemberRepository.findUserRoleInBoard(context.boardId, userId)
        const role = this._determineUserRole(isSystemAdmin, userId, context.creatorId, member)
        this._validatePermission(role, permissionLevel)

        return {
            ...context,
            role
        }
    },

    /**
     * Verifica permissão de usuário em um workspace
     * @param {number} workspaceId - ID do workspace
     * @param {object} user - Usuário { id, role }
     * @param {string} permissionLevel - Nível necessário (VIEW, EDIT, ADMIN) — default: VIEW
     * @returns {Promise<object>} { workspaceId, creatorId, role, boardId: null }
     * @throws {NotFoundError} Se workspace não existe
     * @throws {AuthorizationError} Se usuário não tem permissão
     */
    async checkWorkspace(workspaceId, user, permissionLevel = 'VIEW') {
        if (!workspaceId || !user) {
            throw new AppError(
                ERROR_CATALOG.INTERNAL.MISSING_PERMISSION_PARAMS('workspaceId e user').message,
                500,
                {
                    code: ERROR_CATALOG.INTERNAL.MISSING_PERMISSION_PARAMS('workspaceId e user').code,
                    isOperational: false
                }
            )
        }

        const userId = user.id
        const isSystemAdmin = user.role === 'ADMIN'

        const workspace = await WorkspaceRepository.findPermissionContext(workspaceId, userId)

        if (!workspace) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.WORKSPACE)

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
    }
}

module.exports = PermissionService
