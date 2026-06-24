class UserPresenter {

    static created(user) {
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            preferences: user.preferences
        }
    }
}

module.exports = UserPresenter