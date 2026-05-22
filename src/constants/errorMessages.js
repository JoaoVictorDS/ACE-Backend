const ERROR_MESSAGES = {
    // Auth
    TOKEN_NOT_PROVIDED: 'Token não fornecido!',
    TOKEN_INVALID: 'Token inválido!',
    TOKEN_EXPIRED: 'Token expirado!',
    INVALID_CREDENTIALS: 'Credenciais inválidas!',
    USER_INACTIVE: 'Usuário inativo ou não existe!',

    // General
    NOT_FOUND: 'Recurso não encontrado!',
    FORBIDDEN: 'Você não tem permissão para fazer isto!',
    INTERNAL_ERROR: 'Ocorreu um erro interno no servidor!',

    // Validation
    VALIDATION_ERROR: 'Erro na validação dos dados!',
}

module.exports = ERROR_MESSAGES