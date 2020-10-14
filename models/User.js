const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: false },
    email: { type: String, required: false },
    oauth: {
        discord: {
            id: { type: String },
            username: { type: String },
            discriminator: { type: String }
        }
    }
}, {
    timestamps: true,
    strict: true,
    toJSON: {
        transform: function (doc, ret) {
            delete ret.password
        }
    }
})

UserSchema.pre('save', function(next) {
    const user = this

    if (!user.isModified('password')) return next()
    if (this.password === undefined) return next()

    bcrypt.hash(this.password, 12, (err, hash) => {
        if (err) return next('An unknown error occurred whilst hashing your password, sorry.')
        this.password = hash
        next()
    })
})

UserSchema.methods.compare = function (password, cb) {
    return bcrypt.compare(password, this.password)
}

const User = mongoose.model('User', UserSchema)

module.exports = User