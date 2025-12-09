const prisma = require('../config/prisma')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const UserService = {
    async createUser({ name, email, password, role }) {
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) {
            throw new Error('Usuário com este e-mail já existe.')
        }

        const password_hash = await bcrypt.hash(password, 10)

        const newUser = await prisma.user.create({
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

        return newUser
    },

    async authenticateUser({ email, password }) {
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
            throw new Error('Credenciais inválidas!')
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash)
        if (!isValidPassword) {
            throw new Error('Credenciais inválidas!')
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRY }
        )

        return {
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        }
    },
}

module.exports = UserService