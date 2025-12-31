const prisma = require('../config/prisma')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const UserService = {

    async createUser({ name, email, password, role }) {
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) throw new Error('Usuário com este e-mail já existe!')

        const password_hash = await bcrypt.hash(password, 10)

        const newUser = await prisma.user.create({
            data: {
                name,
                email: email.toLowerCase(),
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

        return newUser
    },

    async authenticateUser({ email, password }) {
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
        if (!user) throw new Error('Credenciais inválidas!')

        const isValidPassword = await bcrypt.compare(password, user.password_hash)
        if (!isValidPassword) throw new Error('Credenciais inválidas!')

        const secret = process.env.JWT_SECRET || 'Fallback_Secret_Seguro_AlphaCentroEmpresarial2511'
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
                where: { email: email.toLowerCase() }
            })
            if (emailOwner && emailOwner.id !== targetUserId) throw new Error('Este e-mail já está em uso!')
            dataToUpdate.email = email.toLowerCase()

        }

        if (password) dataToUpdate.password_hash = await bcrypt.hash(password, 10)

        if (role && role !== user.role) {
            if (requesterRole !== 'ADMIN') throw new Error('Apenas administradores podem alterar cargos de usuários!')
            dataToUpdate.role = role
        }

        const updatedUser = await prisma.user.update({
            where: { id: targetUserId },
            data: dataToUpdate,
            select: {
                id: true,
                name: true,
                email: true,
                role: true
            }
        })

        return updatedUser
    },

    async deleteUser(targetUserId) {
        const user = await prisma.user.findUnique({
            where: { id: targetUserId }
        })
        if (!user) throw new Error('Usuário não encontrado!')

        return await prisma.user.update({
            where: { id: targetUserId },
            data: {
                is_active: false,
                name: `Usuário Desativado (${user.name})`
            }
        })
    },

}

module.exports = UserService