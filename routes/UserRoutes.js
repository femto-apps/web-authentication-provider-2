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
            return res.send('user not found')
        }
        
        if (!(await user.compare(password))) {
            return res.send('incorrect password')
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
            return res.send('username already exists')
        }
    
        if (username.startsWith('discord://')) {
            return res.send('cannot start username with discord://')
        }
    
        if (email && email !== '') {
            // if email is undefined, don't check it!
            if (!emailValidator.validate(email)) {
                return res.send('email validation failed')
            }
        }
    
        let passwordVerification = verify('Password', password, [
            verify.string.minLength(4),
            verify.string.maxLength(1024)
        ])
    
        if (passwordVerification) {
            return res.send('password verification failed')
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
            return res.send('not logged in as that user.')
        }
    
        await req.users.switch(user)
    
        res.redirect('/')
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