const prisma = require('../config/prisma')
const bcrypt = require('bcryptjs')
const { NOTIFICATION_TYPES } = require('../utils/constants')
const AppError = require('../utils/AppError')

const UserService = {

    async setupDefaults(userId, tx = prisma) {
        const defaultNotificationSettings = [
            { user_id: userId, action_type: NOTIFICATION_TYPES.ITEM_CREATED, enabled: true },
            { user_id: userId, action_type: NOTIFICATION_TYPES.ITEM_DELETED, enabled: true },
            { user_id: userId, action_type: NOTIFICATION_TYPES.ITEM_UPDATED, enabled: true },
            { user_id: userId, action_type: NOTIFICATION_TYPES.COMMENT_ADDED, enabled: true }
        ]

        await tx.userNotificationSetting.createMany({
            data: defaultNotificationSettings
        })

        await tx.userPreference.create({
            data: {
                user_id: userId,
                settings: { theme: 'light' }
            }
        })
    },

    async create({ name, email, password, role }) {
        const existingUser = await prisma.user.findUnique({
            where: { email }
        })
        if (existingUser) throw new AppError('Usuário com este e-mail já existe!', 409)

        const password_hash = await bcrypt.hash(password, 10)

        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    password_hash,
                    role: role || 'MEMBER'
                },
            })

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
        return await prisma.user.findMany({
            where: { is_active: true },
            select: {
                id: true,
                name: true,
                email: true,
                role: true
            },
            orderBy: { name: 'asc' }
        })
    },

    async update({ requesterUser, targetUserId, name, email, password, role }) {
        const user = await prisma.user.findUnique({
            where: { id: targetUserId }
        })

        if (!user) throw new AppError('Usuário não encontrado!', 404)

        const { id: requesterId, role: requesterRole } = requesterUser
        const isOwner = requesterId === targetUserId
        const isAdmin = requesterRole === 'ADMIN'

        if (!isOwner && !isAdmin) throw new AppError('Você não tem permissão para alterar este perfil!', 403)

        const dataToUpdate = {}
        const hasNameChanged = name && name !== user.name
        const hasEmailChanged = email && email !== user.email
        const hasRoleChanged = role && role !== user.role

        if (hasNameChanged) dataToUpdate.name = name
        if (hasEmailChanged) {
            const emailExists = await prisma.user.findUnique({
                where: { email }
            })
            if (emailExists) throw new AppError('Este e-mail já está em uso!', 409)
            dataToUpdate.email = email
        }
        if (password) dataToUpdate.password_hash = await bcrypt.hash(password, 10)
        if (hasRoleChanged) {
            if (requesterRole !== 'ADMIN') throw new AppError('Apenas administradores do sistema podem alterar cargos de usuários!', 403)
            if (user.role === 'ADMIN' && role !== 'ADMIN') {
                const totalActiveAdmins = await prisma.user.count({
                    where: { role: 'ADMIN', is_active: true }
                })
                if (totalActiveAdmins <= 1) throw new AppError('Operação negada: Usuário é o único administrador ativo do sistema!', 400)
            }
            dataToUpdate.role = role
        }

        if (Object.keys(dataToUpdate).length === 0) return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        }

        return await prisma.user.update({
            where: { id: targetUserId },
            data: dataToUpdate,
            select: {
                id: true,
                name: true,
                email: true,
                role: true
            }
        })
    },

    async delete({ requesterUser, targetUserId }) {
        const isSelf = targetUserId === requesterUser.id
        if (isSelf) throw new AppError('Você não pode desativar sua própria conta!', 403)

        const user = await prisma.user.findUnique({
            where: { id: targetUserId },
            include: {
                workspace_members: {
                    where: { role: { in: ['ADMIN', 'OWNER'] } },
                    include: { workspace: { include: { _count: { select: { workspace_members: { where: { role: { in: ['ADMIN', 'OWNER'] } } } } } } } }
                },
                board_members: {
                    where: { role: { in: ['ADMIN', 'OWNER'] } },
                    include: { board: { include: { _count: { select: { board_members: { where: { role: { in: ['ADMIN', 'OWNER'] } } } } } } } }
                }
            }
        })
        if (!user) throw new AppError('Usuário não encontrado!', 404)

        const isTargetSystemAdmin = user.role === 'ADMIN'
        const orphanWorkspaces = user.workspace_members.filter(m => m.workspace._count.workspace_members <= 1)
        const orphanBoards = user.board_members.filter(m => m.board._count.board_members <= 1)

        if (isTargetSystemAdmin) {
            const totalActiveSystemAdmins = await prisma.user.count({
                where: { role: 'ADMIN', is_active: true }
            })
            const isLastSystemAdmin = totalActiveSystemAdmins <= 1

            if (isLastSystemAdmin) throw new AppError('Operação negada: Usuário é o único administrador ativo do sistema!', 400)
        }
        if (orphanWorkspaces.length > 0) {
            const workspaceNames = orphanWorkspaces.map(m => m.workspace.name).join(', ')
            throw new AppError(`Operação negada: Usuário é o único responsável pelas seguintes áreas de trabalho: ${workspaceNames}.`, 400)
        }
        if (orphanBoards.length > 0) {
            const boardNames = orphanBoards.map(m => m.board.name).join(', ')
            throw new AppError(`Operação negada: Usuário é o único responsável pelos seguintes quadros: ${boardNames}.`, 400)
        }

        return await prisma.$transaction(async (tx) => {
            await tx.boardMember.deleteMany({ where: { user_id: targetUserId } })
            await tx.workspaceMember.deleteMany({ where: { user_id: targetUserId } })

            return await tx.user.update({
                where: { id: targetUserId },
                data: {
                    is_active: false,
                    name: `Usuário Desativado (${user.name})`
                }
            })
        })
    },

}

module.exports = UserService