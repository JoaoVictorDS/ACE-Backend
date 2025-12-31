const UserService = require('../services/UserService')

const UserController = {

    async create(req, res) {
        const { name, email, password, role } = req.body
        if (!name || !email || !password) return res.status(400).json({ error: 'Nome, E-mail e Senha são obrigatórios!' })

        try {
            const user = await UserService.createUser({ name, email, password, role })
            return res.status(201).json({
                message: 'Usuário criado com sucesso!',
                user
            })
        } catch (error) {
            if (error.message.includes('e-mail já existe')) return res.status(409).json({ error: error.message })
            console.error(error)
            return res.status(500).json({ error: 'Erro interno do servidor ao criar usuário!' })
        }
    },

    async list(req, res) {
        try {
            const users = await UserService.getUsers()
            return res.json(users)
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao listar usuário!' })
        }
    },

    async update(req, res) {
        const { userId: targetUserId } = req.params
        const requesterId = req.user.id
        const requesterRole = req.user.role

        if (Object.keys(req.body).length === 0) return res.status(400).json({ error: 'Dados para atualizar o perfil não foram fornecidos!' })

        try {
            const updatedUser = await UserService.updateUser(
                parseInt(targetUserId),
                req.body,
                requesterId,
                requesterRole
            )
            return res.json({ message: 'Perfil atualizado!', user: updatedUser })
        } catch (error) {
            return res.status(403).json({ error: error.message })
        }
    },

    async delete(req, res) {
        const { userId: targetUserId } = req.params

        try {
            await UserService.deleteUser(parseInt(targetUserId))
            return res.json({ message: 'Usuário desativado com sucesso!' })
        } catch (error) {
            return res.status(403).json({ error: error.message })
        }
    },

}

module.exports = UserController