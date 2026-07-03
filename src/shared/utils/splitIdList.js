/**
 * Divide um valor em uma lista de tokens de texto, aceitando tanto
 * array quanto string separada por vírgula. Não faz parsing numérico
 * nem validação — cada chamador decide sua própria política de erro.
 * @param {string|array|null|undefined} value
 * @returns {string[]}
 */
module.exports = (value) => {
    if (!value) return []
    const raw = Array.isArray(value) ? value : String(value).split(',')
    return raw.map(token => String(token).trim())
}