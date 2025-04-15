const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const router = express.Router()
const connectToDatabase = require('../models/db')
const logger = require('../logger')

// Define the upload directory path
const directoryPath = 'public/images'

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, directoryPath) // Specify the upload directory
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname) // Use the original file name
  }
})

const upload = multer({ storage })

// Get all secondChanceItems
// Get all secondChanceItems
router.get('/', async (req, res, next) => {
  logger.info('/ called')
  try {
    const db = await connectToDatabase()
    const collection = db.collection('secondChanceItems')
    const secondChanceItems = await collection.find({}).toArray()
    res.json(secondChanceItems)
  } catch (e) {
    logger.error('oops something went wrong', e)
    next(e)
  }
})

// Add a new item
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    const db = await connectToDatabase()

    const collection = db.collection('secondChanceItems')

    let secondChanceItem = req.body

    const lastItemQuery = await collection.find().sort({ id: -1 }).limit(1)
    await lastItemQuery.forEach(item => {
      secondChanceItem.id = (parseInt(item.id) + 1).toString()
    })

    secondChanceItem.date_added = Math.floor(new Date().getTime() / 1000)

    secondChanceItem = await collection.insertOne(secondChanceItem)

    if (req.file) {
      const filePath = path.join(directoryPath, req.file.originalname)
      logger.info(`File uploaded successfully to ${filePath}`)
    }

    // Respond with the created item
    res.status(201).json(secondChanceItem.ops[0])
  } catch (e) {
    logger.error('Error adding a new secondChanceItem', e)
    next(e)
  }
})

// Get a single secondChanceItem by ID
router.get('/:id', async (req, res, next) => {
  try {
    const db = await connectToDatabase()
  
    const collection = db.collection('secondChanceItems')

    const id = req.params.id
    const secondChanceItem = await collection.findOne({ id })

    if (!secondChanceItem) return res.status(404).send('secondChanceItem not found')

    res.json(secondChanceItem)
  } catch (e) {
    logger.error('Error fetching the secondChanceItem by ID', e)
    next(e)
  }
})

// Update and existing item
router.put('/:id', async (req, res, next) => {
  try {
    const db = await connectToDatabase()

    const collection = db.collection('secondChanceItems')

    const id = req.params.id
    const secondChanceItem = await collection.findOne({ id })
    if (!secondChanceItem) {
      logger.error('secondChanceItem not found')
     return res.status(404).json({ error: 'secondChanceItem not found' })
 }

    secondChanceItem.category = req.body.category || secondChanceItem.category
    secondChanceItem.condition = req.body.condition || secondChanceItem.condition
    secondChanceItem.age_days = req.body.age_days || secondChanceItem.age_days
    secondChanceItem.description = req.body.description || secondChanceItem.description
    secondChanceItem.age_years = Number((secondChanceItem.age_days / 365).toFixed(1))
    secondChanceItem.updatedAt = new Date()

    const updateResult = await collection.findOneAndUpdate(
      { id },
      { $set: secondChanceItem },
      { returnDocument: 'after' }
    )

    if (updateResult.value) {
      res.json({ message: 'Update successful', updatedItem: updateResult.value })
    } else {
      res.status(500).json({ error: 'Update failed' })
    }
  } catch (e) {
    logger.error('Error updating the secondChanceItem', e)
    next(e)
  }
})

// Delete an existing item
router.delete('/:id', async (req, res, next) => {
  try {
    const db = await connectToDatabase()

    const collection = db.collection('secondChanceItems')

    const id = req.params.id
    const secondChanceItem = await collection.findOne({ id })
    if (!secondChanceItem) {
      logger.error('secondChanceItem not found')
      return res.status(404).json({ error: 'secondChanceItem not found' })
    }

    const deleteResult = await collection.deleteOne({ id })
    if (deleteResult.deletedCount === 1) {
      logger.info(`secondChanceItem with ID ${id} deleted successfully`)
      res.json({ message: 'Delete successful' })
    } else {
      logger.error(`Failed to delete secondChanceItem with ID ${id}`)
      res.status(500).json({ error: 'Delete failed' })
    }
  } catch (e) {
    logger.error('Error deleting the secondChanceItem', e)
    next(e)
  }
})

module.exports = router
