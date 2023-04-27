const mongoose = require('mongoose')

const apartmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: 'Number',
      required: true,
    },
    price: {
      type: 'Number',
      required: true,
    },
    rooms: {
      type: 'Number',
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    longitude: {
      type: String,
      required: true,
    },
    latitude: {
      type: String,
      required: true,
    },
    realtor: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  },
)

const Apartment = mongoose.model('Apartment', apartmentSchema)

module.exports = Apartment
