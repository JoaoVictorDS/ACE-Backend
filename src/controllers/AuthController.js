const UserService = require('../services/UserService')

const AuthController = {

    async login(req, res) {
        const { email, password } = req.body
        if (!email || !password) return res.status(400).json({ error: 'E-mail e Senha são obrigatórios!' })

        try {
            const result = await UserService.authenticateUser({ email, password })
            return res.status(200).json(result)
        } catch (error) {
            if (error.message.includes('Credenciais inválidas')) return res.status(401).json({ error: 'E-email ou Senha incorretos!' })
            console.error(error)
            return res.status(500).json({ error: 'Erro interno do servidor durante o login!' })
        }
    }
}

module.exports = AuthController