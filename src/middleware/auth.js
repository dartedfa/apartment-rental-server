const jwt = require('jsonwebtoken')
const User = require('../models/user')

const axios = require('axios')

async function verifyGoogleToken(accessToken) {
  const url = `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`
  const response = await axios.get(url)
  return response.data.user_id
}

async function verifyFacebookToken(accessToken) {
  const url = `https://graph.facebook.com/me?access_token=${accessToken}`
  const response = await axios.get(url)
  return response.data.id
}

const auth = async (req, res, next) => {
  try {
    const tokenWithData = req.header('Authorization').replace('Bearer ', '')
    let user
    const [token, type] = tokenWithData.split('type=')

    if (type === 'google') {
      const externalId = await verifyGoogleToken(token)
      user = await User.findOne({externalId, 'tokens.token': token})
    } else if (type === 'facebook') {
      const externalId = await verifyFacebookToken(token)
      user = await User.findOne({externalId, 'tokens.token': token})
    } else {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      user = await User.findOne({_id: decoded._id, 'tokens.token': token})
    }

    if (!user) {
      throw new Error()
    }

    req.token = token
    req.user = user
    next()
  } catch (e) {
    const isVerify = req.url === '/verify'
    if (isVerify) return res.status(404).send({error: 'Provide correct token.'})
    res.status(401).send({error: 'Please authenticate.'})
  }
}

const handleBasicAuth = async (req, res, next) => {
  try {
    const basicString = req.header('Authorization').replace('Basic ', '')
    const basicBuffer = new Buffer.from(basicString, 'base64')

    const asciiString = basicBuffer.toString('ascii')

    const [email, password] = asciiString.split(':')

    req.body = {
      ...req.body,
      email,
      password,
    }

    next()
  } catch (error) {
    console.log(error)
  }
}

module.exports = {auth, handleBasicAuth}
