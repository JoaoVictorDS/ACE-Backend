const prisma = require('../../config/prisma')

const UserRepository = {

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

    // atualizar

    async findByIdForProfile(userId) {
        return prisma.user.findUnique(userId, {
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                is_active: true,
                created_at: true,
            },
        })
    },

    async findActive(limit = 10) {
        return prisma.user.findMany(
            { is_active: true },
            {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                },
                take: limit,
            }
        )
    },

    async deactivate(userId) {
        return prisma.user.update(userId, {
            is_active: false,
            refresh_token: null,
        })
    }

}

module.exports = UserRepository