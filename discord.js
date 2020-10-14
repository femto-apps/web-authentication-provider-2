const ClientOAuth2 = require('client-oauth2')

const discordClient = new ClientOAuth2({
    clientId: '764615973553963019',
    clientSecret: '123',
    accessTokenUri: 'https://discord.com/api/oauth2/token',
    authorizationUri: 'https://discord.com/api/oauth2/authorize',
    redirectUri: 'http://localhost:9432/oauth/discord',
    scopes: ['identify']
})


console.log(discordClient.code.getUri())


// https://discord.com/api/oauth2/authorize?client_id=764615973553963019&redirect_uri=localhost%3A9432&response_type=code&scope=identify