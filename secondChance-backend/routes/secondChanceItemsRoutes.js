const express = require('express')
const multer = require('multer')
const path = require('path')
const router = express.Router()
const connectToDatabase = require('../models/db')
const logger = require('../logger')

// Define the upload directory path
const directoryPath = 'public/images'

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination (req, file, cb) {
    cb(null, directoryPath) // Specify the upload directory
  },
  filename (req, file, cb) {
    cb(null, file.originalname) // Use the original file name
  }
})

const upload = multer({ storage })

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
    // Task 1: Retrieve the database connection
    const db = await connectToDatabase()

    // Task 2: Retrieve the secondChanceItems collection
    const collection = db.collection('secondChanceItems')

    // Task 3: Create a new secondChanceItem from the request body
    let secondChanceItem = req.body

    // Task 4: Get the last id, increment it by 1, and set it to the new secondChanceItem
    const lastItemQuery = await collection.find().sort({ id: -1 }).limit(1)
    await lastItemQuery.forEach(item => {
      secondChanceItem.id = (parseInt(item.id) + 1).toString()
    })

    // Task 5: Set the current date in the new item
    secondChanceItem.date_added = Math.floor(new Date().getTime() / 1000)

    // Task 6: Add the secondChanceItem to the database
    secondChanceItem = await collection.insertOne(secondChanceItem)

    // Task 7: Upload its image to the images directory
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
    // Task 1: Retrieve the database connection
    const db = await connectToDatabase()

    // Task 2: Retrieve the secondChanceItems collection
    const collection = db.collection('secondChanceItems')

    // Task 3: Find a specific secondChanceItem by its ID
    const id = req.params.id
    const secondChanceItem = await collection.findOne({ id })

    // Task 4: Return the secondChanceItem or an error message if not found
    if (!secondChanceItem) return res.status(404).send('secondChanceItem not found')

    res.json(secondChanceItem)
  } catch (e) {
    logger.error('Error fetching the secondChanceItem by ID', e)
    next(e)
  }
})

// Update an existing item
router.put('/:id', async (req, res, next) => {
  try {
    // Task 1: Retrieve the database connection
    const db = await connectToDatabase()

    // Task 2: Retrieve the secondChanceItems collection
    const collection = db.collection('secondChanceItems')

    // Task 3: Check if the secondChanceItem exists
    const id = req.params.id
    const secondChanceItem = await collection.findOne({ id })
    if (!secondChanceItem) {
      logger.error('secondChanceItem not found')
      return res.status(404).json({ error: 'secondChanceItem not found' })
    }

    // Task 4: Update the item's attributes
    secondChanceItem.category = req.body.category || secondChanceItem.category
    secondChanceItem.condition = req.body.condition || secondChanceItem.condition
    secondChanceItem.age_days = req.body.age_days || secondChanceItem.age_days
    secondChanceItem.description = req.body.description || secondChanceItem.description
    secondChanceItem.age_years = Number((secondChanceItem.age_days / 365).toFixed(1))
    secondChanceItem.updatedAt = new Date()

    // Update the item in the database
    const updateResult = await collection.findOneAndUpdate(
      { id },
      { $set: secondChanceItem },
      { returnDocument: 'after' }
    )

    // Task 5: Send confirmation
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
    // Task 1: Retrieve the database connection
    const db = await connectToDatabase()

    // Task 2: Retrieve the secondChanceItems collection
    const collection = db.collection('secondChanceItems')

    // Task 3: Find the secondChanceItem by ID
    const id = req.params.id
    const secondChanceItem = await collection.findOne({ id })
    if (!secondChanceItem) {
      logger.error('secondChanceItem not found')
      return res.status(404).json({ error: 'secondChanceItem not found' })
    }

    // Task 4: Delete the item from the database
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
