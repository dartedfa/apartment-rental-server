const express = require('express')
const Apartment = require('../models/apartment')
const User = require('../models/user')
const {canCrudApartment} = require('../middleware/permission')
const {auth} = require('../middleware/auth')
const router = new express.Router()

router.post('/apartments', auth, canCrudApartment, async (req, res) => {
  const apartment = new Apartment({
    ...req.body,
  })

  try {
    await apartment.save()
    res.status(201).send(apartment)
  } catch (error) {
    res.status(400).send(error)
  }
})

router.get('/apartments', auth, async (req, res) => {
  const isRealtor = req.user.role >= 1
  const filters = isRealtor ? {} : {isAvailable: true}

  const match = {...filters} // will use later to filter by floor etc.

  const apartments = await Apartment.find(match).sort({_id: -1})
  try {
    res.status(200).send(apartments)
  } catch (error) {
    res.status(500).send(error)
  }
})

router.get('/apartments/:id', auth, async (req, res) => {
  const _id = req.params.id
  const isClient = req.user.role === 0

  try {
    const apartment = await Apartment.findOne({_id})
    const {firstName, lastName, email} = await User.findById(apartment.realtor)

    if (!apartment) {
      return res.status(404).send({error: 'Apartment not found'})
    }

    if (!apartment.isAvailable && isClient) {
      return res.status(403).send({error: `Insufficient permission.`})
    }

    res.send({apartment, realtor: {firstName, lastName, email}})
  } catch (error) {
    res.status(500).send(error)
  }
})

router.patch('/apartments/:id', auth, canCrudApartment, async (req, res) => {
  const updates = Object.keys(req.body)

  try {
    const apartment = await Apartment.findOne({_id: req.params.id})

    if (!apartment) {
      return res.status(404).send({error: 'Apartment not found'})
    }

    updates.forEach(update => (apartment[update] = req.body[update]))

    await apartment.save()
    res.send(apartment)
  } catch (error) {
    res.status(400).send(error)
  }
})

router.delete('/apartments/:id', auth, canCrudApartment, async (req, res) => {
  try {
    const apartment = await Apartment.findOneAndDelete({_id: req.params.id})

    if (!apartment) {
      res.status(404).send({error: 'Apartment not found'})
    }

    res.status(200).send(apartment)
  } catch (error) {
    res.status(500).send(error)
  }
})

module.exports = router
