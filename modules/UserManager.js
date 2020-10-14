const UserModel = require('../models/User')

class UserManager {
    constructor(session) {
        this.session = session

        this.users = {}
    }

    static async middleware(req, res, next) {
        req.users = new UserManager(req.session)
        res.locals.users = req.users

        if (!req.session.users) {
            req.session.users = {
                main: undefined,
                others: []
            }
        }

        await req.users.hydrate()
        next()
    }

    async hydrate() {
        // for every id, we should fetch details about it...
        for (let id of this.session.users.others) {
            const user = await UserModel.findOne({ _id: id })

            // and store it in a cache
            this.users[user._id] = user
        }
    }

    current() {
        return this.users[this.session.users.main]
    }

    all() {
        return this.session.users.others.map(id => this.users[id])
    }

    isAuthenticated(req, res, next) {
        if (this.current()) return next()
        else {
            return res.redirect('/login')
        }
    }

    async serialise(user) {
        return String(user._id)
    }

    async login(user) {
        const id = await this.serialise(user)

        this.session.users.main = id

        if (this.session.users.others.indexOf(id) === -1) {
            this.session.users.others = this.session.users.others.concat(id)
        }
    }

    async isAuthenticatedAs(user) {
        const id = await this.serialise(user)

        return this.session.users.others.includes(id)
    }

    async switch(user) {
        const id = await this.serialise(user)

        this.session.users.main = id
    }

    async logout(user) {
        const id = await this.serialise(user)

        this.session.users.others = this.session.users.others.filter(person => person !== id)

        if (this.session.users.main === id) {
            this.session.users.main = this.session.users.others[0]
        }
    }

    async logoutAll() {
        this.session.users = undefined
    }
}
//UwU
module.exports = UserManager