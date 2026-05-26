const ROLES = {
    VIEW: ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'],
    EDIT: ['OWNER', 'ADMIN', 'EDITOR'],
    ADMIN: ['OWNER', 'ADMIN'],
    OWNER: ['OWNER']
}

module.exports = ROLES