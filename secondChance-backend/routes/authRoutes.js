
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