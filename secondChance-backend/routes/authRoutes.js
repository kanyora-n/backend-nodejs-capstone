const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const connectToDatabase = require('../models/db');
const router = express.Router();
const dotenv = require('dotenv');
const pino = require('pino');  // Import Pino logger
const { body, validationResult } = require('express-validator')
dotenv.config();

const logger = pino();  // Create a Pino logger instance

//Create JWT secret
const JWT_SECRET = process.env.JWT_SECRET;

router.post('/register', async (req, res) => {
    try {
      //Connect to `secondChance` in MongoDB through `connectToDatabase` in `db.js`.
      const db = await connectToDatabase();
      const collection = db.collection("users");
      const existingEmail = await collection.findOne({ email: req.body.email });

        if (existingEmail) {
            logger.error('Email id already exists');
            return res.status(400).json({ error: 'Email id already exists' });
        }

        const salt = await bcryptjs.genSalt(10);
        const hash = await bcryptjs.hash(req.body.password, salt);
        const email=req.body.email;
        const newUser = await collection.insertOne({
            email: req.body.email,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            password: hash,
            createdAt: new Date(),
        });

        const payload = {
            user: {
                id: newUser.insertedId,
            },
        };

        const authtoken = jwt.sign(payload, JWT_SECRET);
        logger.info('User registered successfully');
        res.json({ authtoken,email });
    } catch (e) {
        logger.error(e);
        return res.status(500).send('Internal server error');
    }
});

// Login Endpoint
router.post('/login', async (req, res) => {
    try {
        const db = await connectToDatabase();

        const collection = db.collection('users');

        const theUser = await collection.findOne({ email: req.body.email });
        if (!theUser) {
            logger.error('User not found');
            return res.status(404).json({ error: 'User not found' });
        }
        const passwordMatch = await bcryptjs.compare(req.body.password, theUser.password);
        if (!passwordMatch) {
            logger.error('Passwords do not match');
            return res.status(401).json({ error: 'Wrong password' });
        }

        const userName = theUser.firstName;
        const userEmail = theUser.email;

        const payload = {
            user: {
                id: theUser._id.toString(),
            },
        };
        const authtoken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        // Respond with user details and token
        logger.info('User logged in successfully');
        res.json({ authtoken, userName, userEmail });
    } catch (e) {
        logger.error(`Internal server error: ${e.message}`);
        return res.status(500).send('Internal server error');
    }
});    

// Update
router.put('/update', [
    body('email').isEmail().withMessage('Invalid email format'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.error('Validation errors:', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }

        const emailFromHeader = req.headers['email'];
        if (!emailFromHeader) {
            logger.error('Email missing in the request header');
            return res.status(400).json({ error: 'Email is required in the request header' });
        }

        const db = await connectToDatabase();
        const collection = db.collection("users");

        const existingUser = await collection.findOne({ email: emailFromHeader });
        if (!existingUser) {
            logger.error(`User with email ${emailFromHeader} not found`);
            return res.status(404).json({ error: `User with email ${emailFromHeader} not found` });
        }

        const salt = await bcryptjs.genSalt(10);
        const hash = await bcryptjs.hash(req.body.password, salt);

        const updatedFields = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            password: hash,
            updatedAt: new Date(),
        };

        const result = await collection.updateOne(
            { _id: existingUser._id },
            { $set: updatedFields }
        );

        if (result.modifiedCount === 0) {
            logger.info(`User with email ${emailFromHeader} details were not updated`);
            return res.status(200).json({ message: 'User details were not updated' });
        }

        const payload = {
            user: {
                id: existingUser._id,
            },
        };
        const authtoken = jwt.sign(payload, JWT_SECRET);
        logger.info(`User with email ${emailFromHeader} updated successfully`);
        res.json({ authtoken });

    } catch (e) {
        logger.error('Error during user update:', e);
        return res.status(500).send('Internal server error');
    }
});

module.exports = router;