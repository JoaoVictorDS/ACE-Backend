const BoardRepository = require('../../modules/board/board.repository')
const ColumnRepository = require('../../modules/column/column.repository')
const SectionRepository = require('../../modules/section/section.repository')
const ItemRepository = require('../../modules/item/item.repository')
const WorkspaceRepository = require('../../modules/workspace/workspace.repository')
const { NotFoundError, AuthorizationError } = require('../errors')
const ErrorMessages = require('../errors/error-messages')
const { ROLES } = require('../constants')
const BoardMemberRepository = require('../../modules/board-member/board-member.repository')

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

        // 1. Busca dados do recurso via repository
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
                throw new Error(ErrorMessages.unsupportedResource(type))
        }

        if (!data) {
            throw new NotFoundError(type)
        }

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
        if (!role) {
            throw new AuthorizationError(ErrorMessages.unauthorized())
        }

        const allowedRoles = ROLES[permissionLevel.toUpperCase()]

        if (!allowedRoles) {
            throw new Error(`Nível de permissão "${permissionLevel}" não encontrado em ROLES`)
        }

        if (!allowedRoles.includes(role)) {
            throw new AuthorizationError(
                ErrorMessages.forbiddenAction('acessar este recurso')
            )
        }
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
            throw new Error('Parâmetros inválidos: resourceType, entityId e user são obrigatórios')
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
            throw new Error('Parâmetros inválidos: workspaceId e user são obrigatórios')
        }

        const userId = user.id
        const isSystemAdmin = user.role === 'ADMIN'

        const workspace = await WorkspaceRepository.findPermissionContext(workspaceId, userId)

        if (!workspace) {
            throw new NotFoundError('WORKSPACE')
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
    }
}

module.exports = PermissionService