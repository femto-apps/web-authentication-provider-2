const config = require('@femto-apps/config')
const ClientOAuth2 = require('client-oauth2')

const discordClient = new ClientOAuth2({
    clientId: config.get('discord.clientId'),
    clientSecret: config.get('discord.clientSecret'),
    accessTokenUri: 'https://discord.com/api/oauth2/token',
    authorizationUri: 'https://discord.com/api/oauth2/authorize',
    redirectUri: config.get('discord.redirectUri'),
    scopes: ['identify']
})

class DiscordOAuth {
    constructor() {

    }

    static getUri() {
        return discordClient.code.getUri()
    }

    static getToken(originalUrl) {
        return discordClient.code.getToken(originalUrl)
    }
}

module.exports = DiscordOAuth