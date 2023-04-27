const express = require('express')
const User = require('../models/user')
const Apartment = require('../models/apartment')
const {permission} = require('../middleware/permission')
const {sendActivationEmail} = require('../emails/account')
const {handleBasicAuth, auth} = require('../middleware/auth')
const router = new express.Router()

const CLIENT_URL = process.env.CLIENT_URL

router.post('/register', handleBasicAuth, async (req, res) => {
  let user = new User(req.body)
  try {
    await user.save()

    const token = await user.generateAuthToken()
    sendActivationEmail(
      user.email,
      user.firstName,
      `${CLIENT_URL}/verify/${token}`,
    )

    res.status(201).send({invitation_sent: true})
  } catch (error) {
    if (error.code) {
      return res.status(400).send({error: 'Email is already taken.'})
    }
    return res.status(400).send(error)
  }
})

router.post('/third-party-auth', handleBasicAuth, async (req, res) => {
  try {
    let user = await User.findOne({email: req.body.email})

    if (user && user.userType === 'regular') {
      return res.status(400).send({error: `Can't create account.`})
    }

    if (user) user['avatar'] = req.body.avatar

    if (!user) {
      const externalId = req.body.externalId

      user = new User({
        ...req.body,
        userType: req.body.userType,
        externalId,
        verified: true,
      })
    }

    await user.save()

    let token = await user.generateAuthToken(req.body.accessToken)
    token += `type=${req.body.userType}`

    res.status(201).send({user, token})
  } catch (error) {
    return res.status(400).send(error)
  }
})

router.post('/login', handleBasicAuth, async (req, res) => {
  try {
    const user = await User.findByCredentials(req.body.email, req.body.password)

    if (!user.verified) {
      return res.status(400).send({error: 'Account is not activated.'})
    }

    const token = await user.generateAuthToken()

    res.status(200).send({user, token})
  } catch (error) {
    res.status(400).send({
      error: "User with provided email doesn't exist or password is incorrect.",
    })
  }
})

router.post('/logout', auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter(token => {
      return token.token !== req.token
    })
    await req.user.save()

    res.send({success: true})
  } catch (error) {
    res.status(500).send(error)
  }
})

router.get('/me', auth, async (req, res) => {
  try {
    const user = req.user

    res.status(200).send({user})
  } catch (e) {
    res.status(401).send({error: 'Please authenticate.'})
  }
})

router.post('/verify', auth, async (req, res) => {
  try {
    req.user.tokens = []
    req.user.verified = true
    await req.user.save()

    res.status(200).send({verified: true})
  } catch (error) {
    res.status(400).send(error)
  }
})

router.post('/users', auth, permission, async (req, res) => {
  const user = new User({
    ...req.body,
  })

  try {
    await user.save()
    const token = await user.generateAuthToken()

    sendActivationEmail(
      user.email,
      user.firstName,
      `${CLIENT_URL}/verify/${token}`,
    )
    res.status(201).send(user)
  } catch (error) {
    res.status(400).send(error)
  }
})

router.get('/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 2) {
      return res.status(403).send({error: `Insufficient permission.`})
    }

    const users = await User.find({
      _id: {$ne: req.user._id},
    }).sort({_id: -1})
    res.status(200).send(users)
  } catch (error) {
    res.status(500).send(error)
  }
})

router.get('/users/:id', auth, permission, async (req, res) => {
  const _id = req.params.id

  try {
    const user = await User.findById({_id})

    res.status(200).send({user})
  } catch (error) {
    res.status(500).send(error)
  }
})

router.patch('/users/:id', auth, permission, async (req, res) => {
  try {
    const updates = Object.keys(req.body)
    const user = req.user

    const oldUser = await User.findById({_id: req.user._id})

    let shouldDeleteToken = false

    updates.forEach(update => {
      if (req.body[update] && req.body[update] !== user[update]) {
        user[update] = req.body[update]
      }
    })

    if (oldUser['email'] !== user['email'] && user['userType'] !== 'regular') {
      throw new Error(`Can't change user email for ${user['userType']} users.`)
    }

    if (
      (updates.includes('password') && !!req.body.password) ||
      oldUser['email'] !== user['email'] ||
      oldUser['role'] !== user['role']
    ) {
      shouldDeleteToken = !req.target
      console.log(shouldDeleteToken)
      user.tokens = []
    }
    await user.save()
    delete user['password']

    res.send({user, shouldDeleteToken})
  } catch (error) {
    res.status(400).send(error)
  }
})

router.delete('/users/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    await Apartment.deleteMany({realtor: user._id})
    await user.remove()

    res.send({success: true})
  } catch (error) {
    res.status(500).send(error)
  }
})

module.exports = router
