const prisma = require('../config/prisma')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const UserService = {

    async createUser({ name, email, password, role }) {
        const existingUser = await prisma.user.findUnique({
            where: {
                email
            }
        })
        if (existingUser) throw new Error('Usuário com este e-mail já existe!')

        const password_hash = await bcrypt.hash(password, 10)

        return await prisma.user.create({
            data: {
                name,
                email,
                password_hash,
                role: role || 'MEMBER'
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true
            }
        })
    },

    async authenticateUser({ email, password }) {
        const user = await prisma.user.findUnique({
            where: {
                email
            }
        })
        if (!user || user.is_active === false) throw new Error('Credenciais inválidas ou conta desativada!')

        const isValidPassword = await bcrypt.compare(password, user.password_hash)
        if (!isValidPassword) throw new Error('Credenciais inválidas!')

        const secret = process.env.JWT_SECRET
        if (!secret) throw new Error('Erro interno: Chave de segurança não configurada!')
        const expiry = process.env.JWT_EXPIRY || '8h'

        const token = jwt.sign(
            { id: user.id, role: user.role },
            secret,
            { expiresIn: expiry }
        )

        return {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        }
    },

    async getUsers() {
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

    async updateUser(targetUserId, { name, email, password, role }, requesterId, requesterRole) {
        const user = await prisma.user.findUnique({
            where: { id: targetUserId }
        })
        if (!user) throw new Error('Usuário não encontrado!')

        if (requesterRole !== 'ADMIN' && requesterId !== targetUserId) throw new Error('Você não tem permissão para alterar este perfil!')

        const dataToUpdate = {}

        if (name) dataToUpdate.name = name

        if (email) {
            const emailOwner = await prisma.user.findUnique({
                where: { email }
            })
            if (emailOwner && emailOwner.id !== targetUserId) throw new Error('Este e-mail já está em uso!')
            dataToUpdate.email = email
        }

        if (password) dataToUpdate.password_hash = await bcrypt.hash(password, 10)

        if (role && role !== user.role) {
            if (requesterRole !== 'ADMIN') throw new Error('Apenas administradores podem alterar cargos de usuários!')
            dataToUpdate.role = role
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

    async deleteUser(targetUserId, requesterId, requesterRole) {
        if (requesterRole !== 'ADMIN') throw new Error('Apenas administradores podem desativar contas!')
        if (targetUserId === requesterId) throw new Error('Você não pode desativar sua própria conta!')

        const user = await prisma.user.findUnique({
            where: { id: targetUserId }
        })
        if (!user) throw new Error('Usuário não encontrado!')

        await prisma.user.update({
            where: { id: targetUserId },
            data: {
                is_active: false,
                name: `Usuário Desativado (${user.name})`
            }
        })
    },

}

module.exports = UserService