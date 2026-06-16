const UserRepository = require('./user.repository')
const UserNotificationSettingRepository = require('../user-notification-setting/user-notification-setting.repository')
const BoardMemberRepository = require('../board-member/board-member.repository')
const WorkspaceMemberRepository = require('../workspace-member/workspace-member.repository')
const bcrypt = require('bcryptjs')
const { AppError, AuthorizationError, NotFoundError } = require('../../shared/errors')
const TransactionManager = require('../../shared/database/TransactionManager')
const { NOTIFICATION_TYPES } = require('../../shared/constants')

const UserService = {

    async setupDefaults(userId, tx) {
        const defaultNotificationSettings = [
            { user_id: userId, action_type: NOTIFICATION_TYPES.ITEM_CREATED, enabled: true },
            { user_id: userId, action_type: NOTIFICATION_TYPES.ITEM_DELETED, enabled: true },
            { user_id: userId, action_type: NOTIFICATION_TYPES.ITEM_UPDATED, enabled: true },
            { user_id: userId, action_type: NOTIFICATION_TYPES.COMMENT_CREATED, enabled: true },
            { user_id: userId, action_type: NOTIFICATION_TYPES.COMMENT_UPDATED, enabled: true },
            { user_id: userId, action_type: NOTIFICATION_TYPES.COMMENT_DELETED, enabled: true },
        ]

        await UserNotificationSettingRepository.create(defaultNotificationSettings, tx)
        await UserRepository.createUserPreference(userId, { theme: 'light' }, tx)
    },

    async create({ name, email, password, role }) {
        const existingUser = await UserRepository.findByEmail(email)
        if (existingUser) throw new AppError('Usuário com este e-mail já existe.', 409)

        const password_hash = await bcrypt.hash(password, 10)

        const result = await TransactionManager.run(async (tx) => {
            const user = await UserRepository.create(name, email, password_hash, role, tx)
            await this.setupDefaults(user.id, tx)

            return {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        })

        return result
    },

    async getAll() {
        return await UserRepository.findActiveUsers()
    },

    async update({ requesterUser, targetUserId, name, email, password, role }) {
        const user = await UserRepository.findById(targetUserId)
        if (!user) throw new NotFoundError('Usuário não encontrado.')

        const { id: requesterId, role: requesterRole } = requesterUser
        const isOwner = requesterId === targetUserId
        const isAdmin = requesterRole === 'ADMIN'

        if (!isOwner && !isAdmin) throw new AuthorizationError('Você não tem permissão para alterar este perfil.')

        const dataToUpdate = {}
        const hasNameChanged = name && name !== user.name
        const hasEmailChanged = email && email !== user.email
        const hasRoleChanged = role && role !== user.role

        if (hasNameChanged) dataToUpdate.name = name
        if (hasEmailChanged) {
            const emailExists = await UserRepository.findByEmail(email)
            if (emailExists) throw new AppError('Este e-mail já está em uso.', 409)
            dataToUpdate.email = email
        }
        if (password) dataToUpdate.password_hash = await bcrypt.hash(password, 10)
        if (hasRoleChanged) {
            if (!isAdmin) throw new AuthorizationError('Apenas administradores do sistema podem alterar cargos de usuários.')
            if (user.role === 'ADMIN' && role !== 'ADMIN') {
                const totalActiveAdmins = await UserRepository.countActiveAdmins()
                const isLastAdmin = totalActiveAdmins <= 1
                if (isLastAdmin) throw new AppError('Operação negada: Usuário é o único administrador ativo do sistema.', 400)
            }
            dataToUpdate.role = role
        }

        if (Object.keys(dataToUpdate).length === 0) return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        }

        return await UserRepository.update(targetUserId, dataToUpdate)
    },

    async delete({ requesterUser, targetUserId }) {
        const isSelf = targetUserId === requesterUser.id
        if (isSelf) throw new AuthorizationError('Você não pode desativar sua própria conta.', 403)

        const user = await UserRepository.findUserDeletionContext(targetUserId)
        if (!user) throw new NotFoundError('Usuário não encontrado.')
        if (user.is_active === false) throw new AppError('Usuário já está desativado.', 400)

        const isTargetSystemAdmin = user.role === 'ADMIN'
        const orphanWorkspaces = user.workspace_members.filter(m => m.workspace._count.workspace_members <= 1)
        const orphanBoards = user.board_members.filter(m => m.board._count.board_members <= 1)

        if (isTargetSystemAdmin) {
            const totalActiveAdmins = await UserRepository.countActiveAdmins()
            const isLastAdmin = totalActiveAdmins <= 1
            if (isLastAdmin) throw new AppError('Operação negada: Usuário é o único administrador ativo do sistema!', 400)
        }
        if (orphanWorkspaces.length > 0) {
            const workspaceNames = orphanWorkspaces.map(m => m.workspace.name).join(', ')
            throw new AppError(`Operação negada: Usuário é o único responsável pelas seguintes áreas de trabalho: ${workspaceNames}.`, 400)
        }
        if (orphanBoards.length > 0) {
            const boardNames = orphanBoards.map(m => m.board.name).join(', ')
            throw new AppError(`Operação negada: Usuário é o único responsável pelos seguintes quadros: ${boardNames}.`, 400)
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