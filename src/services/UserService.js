const prisma = require('../config/prisma')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const AppError = require('../utils/AppError')

const UserService = {

    async createUser({ name, email, password, role }) {
        const existingUser = await prisma.user.findUnique({
            where: {
                email
            }
        })
        if (existingUser) throw new AppError('Usuário com este e-mail já existe!', 409)

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
        if (!user || !user.is_active) throw new AppError('Credenciais inválidas!', 401)

        const isValidPassword = await bcrypt.compare(password, user.password_hash)
        if (!isValidPassword) throw new AppError('Credenciais inválidas!', 401)

        const secret = process.env.JWT_SECRET
        if (!secret) throw new AppError('Erro interno: Chave de segurança não configurada!', 500)
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

    async updateUser({ targetUserId, name, email, password, role, requesterId, requesterRole }) {
        const user = await prisma.user.findUnique({
            where: { id: targetUserId }
        })
        if (!user) throw new AppError('Usuário não encontrado!', 404)

        if (requesterRole !== 'ADMIN' && requesterId !== targetUserId) throw new AppError('Você não tem permissão para alterar este perfil!', 403)

        const dataToUpdate = {}
        if (name) dataToUpdate.name = name

        if (email && email !== user.email) {
            const emailExists = await prisma.user.findUnique({
                where: { email }
            })
            if (emailExists) throw new AppError('Este e-mail já está em uso!', 409)
            dataToUpdate.email = email
        }

        if (password) dataToUpdate.password_hash = await bcrypt.hash(password, 10)

        if (role && role !== user.role) {
            if (requesterRole !== 'ADMIN') throw new AppError('Apenas administradores do sistema podem alterar cargos de usuários!', 403)
            if (user.role === 'ADMIN' && role !== 'ADMIN') {
                const totalActiveAdmins = await prisma.user.count({
                    where: { role: 'ADMIN', is_active: true }
                })
                if (totalActiveAdmins <= 1) throw new AppError('Operação negada: Usuário é o único administrador ativo do sistema!', 400)
            }
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

    async deleteUser({ targetUserId, requesterId }) {
        if (targetUserId === requesterId) throw new AppError('Você não pode desativar sua própria conta!', 403)

        const user = await prisma.user.findUnique({
            where: { id: targetUserId },
            include: {
                board_members: {
                    where: { role: { in: ['ADMIN', 'OWNER'] } },
                    include: {
                        board: {
                            include: {
                                _count: {
                                    select: {
                                        board_members: { where: { role: { in: ['ADMIN', 'OWNER'] } } }
                                    }
                                }
                            }
                        }
                    }
                },

            }
        })
        if (!user) throw new AppError('Usuário não encontrado!', 404)

        if (user.role === 'ADMIN') {
            const totalActiveAdmins = await prisma.user.count({
                where: { role: 'ADMIN', is_active: true }
            })
            if (totalActiveAdmins <= 1) throw new AppError('Operação negada: Usuário é o único administrador ativo do sistema!', 400)
        }

        const orphanBoards = user.board_members.filter(m => m.board._count.board_members <= 1)
        if (orphanBoards.length > 0) {
            const boardNames = orphanBoards.map(m => m.board.name).join(', ')
            throw new AppError(`Operação negada: Usuário é o único responsável pelos seguintes quadros: ${boardNames}.`, 400)
        }

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