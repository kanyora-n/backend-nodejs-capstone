const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../logger'); // Assuming you have a logger set up
const connectToDatabase = require('../models/db'); // Assuming db.js exports the function
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'; // Replace with actual secret from env variables

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        // Task 1: Connect to `secondChance` in MongoDB
        const db = await connectToDatabase();

        // Task 2: Access the `users` collection
        const collection = db.collection('users');

        // Task 3: Check if user credentials already exist
        const existingEmail = await collection.findOne({ email: req.body.email });
        if (existingEmail) {
            logger.error('Email ID already exists');
            return res.status(400).json({ error: 'Email ID already exists' });
        }

        // Task 4: Create a hash to encrypt the password
        const salt = await bcryptjs.genSalt(10);
        const hash = await bcryptjs.hash(req.body.password, salt);

        // Task 5: Insert the user into the database
        const newUser = await collection.insertOne({
            email: req.body.email,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            password: hash,
            createdAt: new Date(),
        });

        // Task 6: Create JWT authentication with `user._id` as the payload
        const payload = {
            user: {
                id: newUser.insertedId,
            },
        };
        const authtoken = jwt.sign(payload, JWT_SECRET);

        // Task 7: Log the successful registration
        logger.info('User registered successfully');

        // Task 8: Return the user email and token as JSON
        res.json({ email: req.body.email, authtoken });
    } catch (e) {
        logger.error(`Internal server error: ${e.message}`);
        return res.status(500).send('Internal server error');
    }
});

// Login Endpoint
router.post('/login', async (req, res) => {
    try {
        // Task 1: Connect to `secondChance` in MongoDB through `connectToDatabase` in `db.js`.
        const db = await connectToDatabase();

        // Task 2: Access MongoDB `users` collection
        const collection = db.collection('users');

        // Task 3: Check for user credentials in database
        const theUser = await collection.findOne({ email: req.body.email });
        if (!theUser) {
            logger.error('User not found');
            return res.status(404).json({ error: 'User not found' });
        }

        // Task 4: Check if the password matches the encrypted password
        const passwordMatch = await bcryptjs.compare(req.body.password, theUser.password);
        if (!passwordMatch) {
            logger.error('Passwords do not match');
            return res.status(401).json({ error: 'Wrong password' });
        }

        // Task 5: Fetch user details
        const userName = theUser.firstName;
        const userEmail = theUser.email;

        // Task 6: Create JWT authentication with `user._id` as payload
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




module.exports = router;
