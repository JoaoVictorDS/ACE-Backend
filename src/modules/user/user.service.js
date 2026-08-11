const bcrypt = require('bcryptjs')
const UserRepository = require('./user.repository')
const UserNotificationSettingRepository = require('../user-notification-setting/user-notification-setting.repository')
const BoardMemberRepository = require('../board-member/board-member.repository')
const WorkspaceMemberRepository = require('../workspace-member/workspace-member.repository')
const { AuthorizationError, NotFoundError, ConflictError } = require('../../shared/errors')
const { TransactionManager } = require('../../shared/database')
const { NOTIFICATION_TYPES } = require('../../shared/constants')
const UserPresenter = require('./user.presenter')
const ERROR_CATALOG = require('../../shared/errors/error-catalog')

const UserService = {

    async setupDefaults(userId, tx) {
        const defaultNotificationSettings = [
            { user_id: userId, action_type: NOTIFICATION_TYPES.ITEM_CREATED, enabled: true },
            { user_id: userId, action_type: NOTIFICATION_TYPES.ITEM_DELETED, enabled: true },
            { user_id: userId, action_type: NOTIFICATION_TYPES.ITEM_UPDATED, enabled: true },
            { user_id: userId, action_type: NOTIFICATION_TYPES.COMMENT_CREATED, enabled: true },
            { user_id: userId, action_type: NOTIFICATION_TYPES.COMMENT_UPDATED, enabled: true },
            { user_id: userId, action_type: NOTIFICATION_TYPES.COMMENT_DELETED, enabled: true },
            { user_id: userId, action_type: NOTIFICATION_TYPES.ITEM_UPDATE_CREATED, enabled: true },
            { user_id: userId, action_type: NOTIFICATION_TYPES.ITEM_UPDATE_DELETED, enabled: true },
            { user_id: userId, action_type: NOTIFICATION_TYPES.ITEM_UPDATE_UPDATED, enabled: true },
        ]

        await UserNotificationSettingRepository.create(defaultNotificationSettings, tx)
    },

    async create({ data }) {
        const { name, email, password, role, preferences } = data
        const existingUser = await UserRepository.findByEmail(email)
        if (existingUser) throw new ConflictError(ERROR_CATALOG.CONFLICT.DUPLICATE_EMAIL)

        const password_hash = await bcrypt.hash(password, 10)

        const result = await TransactionManager.run(async (tx) => {
            const user = await UserRepository.create(name, email, password_hash, role, tx)
            await this.setupDefaults(user.id, tx)

            return UserPresenter.format(user)
        })

        return result
    },

    async getAll() {
        return await UserRepository.findActiveUsers()
    },

    async getProfile({ user }) {
        return await UserRepository.findByIdPrivate(user.id)
    },

    async getUserProfile({ requesterUser, targetUserId }) {
        const isAdmin = requesterUser.role === 'ADMIN'
        const isOwner = requesterUser.id === targetUserId

        const repoMethod = (isOwner || isAdmin)
            ? 'findByIdPrivate'
            : 'findByIdPublic'

        const userProfile = await UserRepository[repoMethod](targetUserId)
        if (!userProfile) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.USER)

        return userProfile
    },

    async update({ user, data }) {
        const { id: userId, role: userRole } = user
        const { name, email, password, role, preferences } = data

        const current = await UserRepository.findByIdPrivate(userId)
        if (!current) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.USER)

        const isAdmin = userRole === 'ADMIN'

        const dataToUpdate = {}
        const hasNameChanged = name && name !== current.name
        const hasEmailChanged = email && email !== current.email
        const hasRoleChanged = role && role !== current.role
        const hasPreferencesChanged = preferences && preferences !== current.preferences

        if (hasNameChanged) dataToUpdate.name = name
        if (hasEmailChanged) {
            const emailExists = await UserRepository.findByEmail(email)
            if (emailExists) throw new ConflictError(ERROR_CATALOG.CONFLICT.DUPLICATE_EMAIL)
            dataToUpdate.email = email
        }
        if (password) dataToUpdate.password_hash = await bcrypt.hash(password, 10)
        if (hasRoleChanged) {
            if (!isAdmin) throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('alterar', 'ROLE'))
            if (isAdmin && role !== 'ADMIN') {
                const totalActiveAdmins = await UserRepository.countActiveAdmins()
                if (totalActiveAdmins <= 1) throw new ConflictError(ERROR_CATALOG.CONFLICT.LAST_SYSTEM_ADMIN)
            }
            dataToUpdate.role = role
        }
        if (hasPreferencesChanged) dataToUpdate.preferences = preferences

        if (Object.keys(dataToUpdate).length === 0) return current

        return await UserRepository.update(userId, dataToUpdate)
    },

    async updateUser({ requesterUser, targetUserId, data }) {
        const { name, email, password, role, preferences } = data

        const user = await UserRepository.findByIdPrivate(targetUserId)
        if (!user) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.USER)

        const dataToUpdate = {}
        const hasNameChanged = name && name !== user.name
        const hasEmailChanged = email && email !== user.email
        const hasRoleChanged = role && role !== user.role
        const hasPreferencesChanged = preferences && preferences !== user.preferences

        if (hasNameChanged) dataToUpdate.name = name
        if (hasEmailChanged) {
            const emailExists = await UserRepository.findByEmail(email)
            if (emailExists) throw new ConflictError(ERROR_CATALOG.CONFLICT.DUPLICATE_EMAIL)
            dataToUpdate.email = email
        }
        if (password) dataToUpdate.password_hash = await bcrypt.hash(password, 10)
        if (hasRoleChanged) {
            if (user.role === 'ADMIN' && role !== 'ADMIN') {
                const totalActiveAdmins = await UserRepository.countActiveAdmins()
                const isLastAdmin = totalActiveAdmins <= 1
                if (isLastAdmin) throw new ConflictError(ERROR_CATALOG.CONFLICT.LAST_SYSTEM_ADMIN)
            }
            dataToUpdate.role = role
        }
        if (hasPreferencesChanged) dataToUpdate.preferences = preferences

        if (Object.keys(dataToUpdate).length === 0) return user

        return await UserRepository.update(targetUserId, dataToUpdate)
    },

    async delete({ requesterUser, targetUserId }) {
        const isSelf = targetUserId === requesterUser.id
        if (isSelf) throw new AuthorizationError(ERROR_CATALOG.AUTHORIZATION.FORBIDDEN_ACTION('desativar sua própria conta'))

        const user = await UserRepository.findUserDeletionContext(targetUserId)
        if (!user) throw new NotFoundError(ERROR_CATALOG.NOT_FOUND.USER)
        if (user.is_active === false) throw new ConflictError(ERROR_CATALOG.CONFLICT.ALREADY_IN_STATE('Usuário', 'desativado'))

        const isTargetSystemAdmin = user.role === 'ADMIN'
        const orphanWorkspaces = user.workspace_members.filter(m => m.workspace._count.workspace_members <= 1)
        const orphanBoards = user.board_members.filter(m => m.board._count.board_members <= 1)

        if (isTargetSystemAdmin) {
            const totalActiveAdmins = await UserRepository.countActiveAdmins()
            const isLastAdmin = totalActiveAdmins <= 1
            if (isLastAdmin) throw new ConflictError(ERROR_CATALOG.CONFLICT.LAST_SYSTEM_ADMIN)
        }
        if (orphanWorkspaces.length > 0) {
            const workspaceNames = orphanWorkspaces.map(m => m.workspace.name).join(', ')
            throw new ConflictError(ERROR_CATALOG.CONFLICT.SOLE_RESPONSIBLE('as seguintes áreas de trabalho', workspaceNames))
        }
        if (orphanBoards.length > 0) {
            const boardNames = orphanBoards.map(m => m.board.name).join(', ')
            throw new ConflictError(ERROR_CATALOG.CONFLICT.SOLE_RESPONSIBLE('os seguintes quadros', boardNames))
        }

        return await TransactionManager.run(async (tx) => {
            await BoardMemberRepository.removeByUser(targetUserId, tx)
            await WorkspaceMemberRepository.removeByUser(targetUserId, tx)
            await UserRepository.revokeAllSessions(targetUserId)

            return await UserRepository.delete(targetUserId, user.name, tx)
        })
    },

}

module.exports = UserService