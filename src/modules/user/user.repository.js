const prisma = require('../../config/prisma')

const UserRepository = {

    async findByIdPrivate(userId) {
        return prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, role: true, preferences: true }
        })
    },

    async findByIdPublic(userId) {
        return prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, role: true }
        })
    },

    async findByIdForAuth(userId) {
        return prisma.user.findFirst({
            where: { id: userId },
            select: {
                id: true,
                role: true,
                name: true,
                is_active: true,
            }
        })
    },

    async findByEmailWithPassword(email) {
        return prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: {
                id: true,
                name: true,
                email: true,
                password_hash: true,
                is_active: true,
                role: true,
                refresh_token: true,
            }
        })
    },

    async findByIds(userIds) {
        return prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true }
        })
    },

    async updateRefreshToken(userId, refreshToken) {
        return prisma.user.update({
            where: { id: userId },
            data: { refresh_token: refreshToken }
        })
    },

    async findRefreshToken(userId) {
        return prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                refresh_token: true,
                is_active: true,
            },
        })
    },

    async revokeAllSessions(userId) {
        return prisma.user.update({
            where: { id: userId },
            data: { refresh_token: null }
        })
    },

    async findByEmail(email) {
        return prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: { id: true, name: true, role: true }
        })
    },

    async validUsersForMention(usersIds, actorId, boardId) {
        return prisma.user.findMany({
            where: {
                id: {
                    in: usersIds,
                    not: actorId
                },
                is_active: true,
                board_members: {
                    some: { board_id: boardId }
                }
            },
            select: { id: true }
        })
    },

    async create(name, email, passwordHash, role = 'MEMBER', tx = null) {
        const client = tx || prisma

        return client.user.create({
            data: {
                name,
                email,
                password_hash: passwordHash,
                role
            }
        })
    },

    async findActiveUsers() {
        return prisma.user.findMany({
            where: { is_active: true },
            select: {
                id: true,
                name: true,
                email: true,
                role: true
            },
            orderBy: { role: 'asc' }
        })
    },

    async findUserDeletionContext(userId) {
        return prisma.user.findUnique({
            where: { id: userId },
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
    },

    async countActiveAdmins() {
        return prisma.user.count({
            where: { role: 'ADMIN', is_active: true }
        })
    },

    async update(userId, data) {
        return prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                preferences: true
            }
        })
    },

    async delete(userId, userName, tx = null) {
        const client = tx || prisma

        return client.user.update({
            where: { id: userId },
            data: {
                is_active: false,
                name: `Usuário Desativado (${userName})`
            }
        })
    },

}

module.exports = UserRepository