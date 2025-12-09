function adminMiddleware(req, res, next) {
    if(req.userRole !== 'ADMIN'){
        return res.status(403).json({error: 'Acesso negado. Apenas administradores podem realizar esta operação!'})
    }

    next()
}

module.exports = adminMiddleware