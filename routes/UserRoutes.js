const config = require('@femto-apps/config')
const { verify } = require('@femto-apps/verify')
const emailValidator = require('email-validator')
const fetch = require('node-fetch')

const DiscordOAuth = require('../modules/DiscordOAuth')
const UserModel = require('../models/User')

function defaultProps(req, others) {
    const navItems = []

    if (req.users.current()) {
        navItems.push({ type: 'user_selector' })
    } else {
        navItems.push({ name: 'Register', href: '/register' })
        navItems.push({ name: 'Login', href: '/login' })
    }

    return Object.assign({
        navItems,
        name: config.get('name'),
        footer: [
            { href: 'https://github.com/femto-apps/web-authentication-provider', name: 'Source' },
            { href: '/discord', name: 'Discord' }
        ]
    }, others)
}

class UserRoutes {
    constructor() {
        
    }

    static getHomepage(req, res) {
        if (!req.users.current()) {
            return res.redirect('/register')
        }

        res.render('index', {
            props: defaultProps(req)
        })
    }

    static getLogin(req, res) {
        res.render('login', {
            props: defaultProps(req)
        })
    }

    static async postLogin(req, res) {
        const { username, password } = req.body

        const user = await UserModel.findOne({ username })
    
        if (!user) {
            res.locals.errors.push({ display: 'no user with that username' })
            return UserRoutes.getLogin(req, res)
        }
        
        if (!(await user.compare(password))) {
            res.locals.errors.push({ display: 'incorrect password' })
            return UserRoutes.getLogin(req, res)
        }
    
        await req.users.login(user)
    
        res.redirect('/')
    }

    static getRegister(req, res) {
        res.render('register', {
            props: defaultProps(req)
        })
    }

    static async postRegister(req, res) {
        const { username, email, password } = req.body

        const existingUser = await UserModel.findOne({ username })
        if (existingUser) {
            res.locals.errors.push({ display: 'username already exists' })
            return UserRoutes.getRegister(req, res)
        }
    
        if (username.startsWith('discord://')) {
            res.locals.errors.push({ display: 'usernames cannot begin with discord://' })
            return UserRoutes.getRegister(req, res)
        }
    
        if (email && email !== '') {
            // if email is undefined, don't check it!
            if (!emailValidator.validate(email)) {
                res.locals.errors.push({ display: 'email is invalid, must be either valid or blank' })
                return UserRoutes.getRegister(req, res)
            }
        }
    
        let passwordVerification = verify('Password', password, [
            verify.string.minLength(4),
            verify.string.maxLength(1024)
        ])
    
        if (passwordVerification) {
            res.locals.errors.push({ display: 'password verification failed' })
            return UserRoutes.getRegister(req, res)
        }
    
        const user = new UserModel({
            username, password, email
        })
        await user.save()
    
        await req.users.login(user)
    
        return res.redirect('/')
    }

    static async getSwitch(req, res) {
        const { id } = req.query

        const user = await UserModel.findOne({ _id: id })
        
        if (!(await req.users.isAuthenticatedAs(user))) {
            res.locals.errors.push({ display: 'you are not authenticated as that user' })
            return UserRoutes.getHomepage(req, res)
        }
    
        await req.users.switch(user)
    
        res.redirect('/')
    }

    static async putUser(req, res) {
        const { username, email, password, new_password } = req.body

        const user = req.users.current()
        if (username) { user.username = username }
        if (email && email !== '') { user.email = email }
        if (new_password) {
            if (await user.compare(password)) {
                user.password = password
            } else {
                res.locals.errors.push({ display: 'invalid current password' })
                return UserRoutes.getHomepage(req, res)
            }
        }

        try {
            await user.save()
        } catch(e) {
            if (e.code === 11000 && e.keyPattern.username) {
                res.locals.errors.push({ display: 'cannot update user to a username that already exists' })
                return UserRoutes.getHomepage(req, res)
            }

            res.locals.errors.push({ display: 'failed to save user record to database' })
            return UserRoutes.getHomepage(req, res)
        }

        return res.redirect('/')
    }

    static async getLogout(req, res) {
        const { id } = req.body

        const user = await UserModel.findOne({ _id: id })
    
        await req.users.logout(user)
    
        return res.redirect('/')
    }

    static async getLogoutAll(req, res) {
        req.users.logoutAll()

        return res.redirect('/')
    }

    static async getDiscordOAuth(req, res) {
        res.redirect(DiscordOAuth.getUri())
    }

    static async getDiscordOAuthCallback(req, res) {
        const discordUser = await DiscordOAuth.getToken(req.originalUrl)
        const discordRes = await fetch('https://discord.com/api/users/@me', {
            headers: {
                'Authorization': `Bearer ${discordUser.accessToken}`
            }
        })
            .then(res => res.json())
    
        let user = await UserModel.findOne({
            'oauth.discord.id': discordRes.id
        })
    
        if (!user) {
            // create a user
            user = new UserModel({
                username: `discord://${discordRes.username}:${discordRes.discriminator}`,
                password: undefined,
                oauth: {
                    discord: {
                        id: discordRes.id,
                        username: discordRes.username,
                        discriminator: discordRes.discriminator
                    }
                }
            })
            await user.save()
        }
    
        await req.users.login(user)
    
        return res.redirect('/')
    }

    static getDiscord(req, res) {
        return res.redirect('https://discord.gg/e8keSUN')
    }
}

module.exports = UserRoutes