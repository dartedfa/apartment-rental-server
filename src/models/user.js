const mongoose = require('mongoose')
const validator = require('validator')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate(value) {
      if (!validator.isEmail(value)) {
        throw new Error('Please provide correct E-mail address.')
      }
    },
  },
  password: {
    type: String,
    trim: true,
    required: function () {
      return this.userType === 'regular'
    },
    validate(value) {
      if (
        value.toLowerCase().includes('password') ||
        (value.length < 7 && this.userType === 'regular')
      ) {
        throw new Error('Please provide a strong password.')
      }
    },
  },
  tokens: [
    {
      token: {
        type: String,
        required: true,
      },
    },
  ],
  role: {
    type: 'Number',
    default: 0,
  },
  userType: {
    type: String,
    default: 'regular',
  },
  externalId: {
    type: String,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  avatar: {
    type: String,
  },
})

userSchema.methods.toJSON = function () {
  const user = this
  const userObject = user.toObject()

  delete userObject.password
  delete userObject.tokens

  return userObject
}

userSchema.statics.findByCredentials = async function (email, password) {
  const user = await User.findOne({email})

  if (!user) {
    throw new Error('Unable to login.')
  }

  const isMatch = await bcrypt.compare(password, user.password)

  if (!isMatch) {
    throw new Error('Unable to login')
  }

  return user
}

userSchema.pre('save', async function (next) {
  const user = this

  if (user.isModified('password') && user.userType === 'regular') {
    user.password = await bcrypt.hash(user.password, 8)
  }
  next()
})

userSchema.methods.generateAuthToken = async function (accessToken) {
  const user = this

  const token =
    user.userType === 'regular'
      ? jwt.sign({_id: user._id.toString()}, process.env.JWT_SECRET)
      : accessToken

  user.tokens = user.tokens.concat({token})
  await user.save()

  return token
}

const User = mongoose.model('User', userSchema)

module.exports = User
