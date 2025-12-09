const UserService = require('../services/UserService')

const UserController = {
    async create(req, res) {
        try {
            const { name, email, password, role } = req.body

            if (!email || !password || !name) {
                return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios!' })
            }

            const user = await UserService.createUser({ name, email, password, role })

            return res.status(201).json({
                message: 'Usuário criado com sucesso!',
                user
            })

        } catch (error) {
            if (error.message.includes('e-mail já existe')) {
                return res.status(409).json({ error: error.message })
            }
            console.error(error)
            return res.status(500).sjon({ error: 'Erro interno do servidor ao criar usuário.' })
        }
    }
}

module.exports = UserController