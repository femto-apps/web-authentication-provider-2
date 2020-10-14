const express = require('express')
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const config = require('@femto-apps/config')
const path = require('path')

const UserManager = require('./modules/UserManager')

const UserRoutes = require('./routes/UserRoutes')

mongoose.connect(`mongodb://localhost:27017/${config.get('mongoose.database')}`,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true
    }
)
 
const app = express()

app.set('view engine', 'pug')

app.use('/public/lib-style', express.static(path.join(__dirname, 'femto/lib-style/dist')))
app.use('/public/fonts', express.static(path.join(__dirname, 'femto/lib-style/static/fonts')))
app.use('/public/logos', express.static(path.join(__dirname, 'femto/lib-style/static/logos')))
app.use(session({
    secret: config.get('session.secret'),
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
    name: config.get('session.name'),
    store: new MongoStore({
        mongooseConnection: mongoose.connection,
        collection: 'session',
    }),
}))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(UserManager.middleware)

app.get('/', UserRoutes.getHomepage)

app.get('/login', UserRoutes.getLogin)
app.post('/login', UserRoutes.postLogin)

app.get('/register', UserRoutes.getRegister)
app.post('/register', UserRoutes.postRegister)

app.get('/switch', UserRoutes.getSwitch)

app.get('/logout', UserRoutes.getLogout)
app.get('/logoutAll', UserRoutes.getLogoutAll)

app.get('/oauth/discord', UserRoutes.getDiscordOAuth)
app.get('/oauth/discord/callback', UserRoutes.getDiscordOAuthCallback)

app.get('/discord', UserRoutes.getDiscord)

app.listen(9432, () => console.log('listening on port 9432'))