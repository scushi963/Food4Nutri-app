const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();


// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));


// Token and rate limit configurations
const tokenLifetime = 30 * 60 * 1000; // 30 minutes in milliseconds
const rateLimitTime = 15 * 60 * 1000; // 15 minutes in milliseconds
let lastTokenCreationTime = {}; // Store last token creation time for users

// Function to delete expired tokens every 15 minutes
const deleteExpiredTokens = () => {
    const expirationTime = new Date(Date.now() - tokenLifetime).toISOString().slice(0, 19).replace('T', ' ');

    db.query('DELETE FROM tokens WHERE created_at < ?', [expirationTime], (err) => {
        if (err) {
            console.error('Error deleting expired tokens:', err);
        } else {
            console.log('Expired tokens deleted successfully');
        }
    });
};

// Run the deletion function every 15 minutes
setInterval(deleteExpiredTokens, 15 * 60 * 1000); // 15 minutes interval

// Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, // Corrected this variable name
    database: process.env.DB_NAME
});

// Connect to database
db.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Connected to MySQL database');
        
        // Create tables
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`;
          
            const createTokensTable = `
            CREATE TABLE IF NOT EXISTS tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                token VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`;    

        const createFoodSharesTable = `
            CREATE TABLE IF NOT EXISTS food_shares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                foodItem VARCHAR(100) NOT NULL,
                quantity INT NOT NULL,
                location VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`;

        const createNutritionLogsTable = `
            CREATE TABLE IF NOT EXISTS nutrition_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                date DATE NOT NULL,
                meal VARCHAR(100) NOT NULL,
                calories INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`;

        const createMealPlansTable = `
            CREATE TABLE IF NOT EXISTS meal_plans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                mealDate DATE NOT NULL,
                mealType VARCHAR(50) NOT NULL,
                mealPlan TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`;

        // Execute table creation queries
        db.query(createUsersTable, (err) => {
            if (err) {
                console.error('Error creating users table:', err);
            } else {
                console.log('Users table created or already exists');
            }
        });

        db.query(createTokensTable, (err) => {
            if (err) {
                console.error('Error creating tokens table:', err);
            } else {
                console.log('Tokens table created or already exists');
            }
        });


        db.query(createFoodSharesTable, (err) => {
            if (err) {
                console.error('Error creating food_shares table:', err);
            } else {
                console.log('Food shares table created or already exists');
            }
        });

        db.query(createNutritionLogsTable, (err) => {
            if (err) {
                console.error('Error creating nutrition_logs table:', err);
            } else {
                console.log('Nutrition logs table created or already exists');
            }
        });


        db.query(createMealPlansTable, (err) => {
            if (err) {
                console.error('Error creating meal_plans table:', err);
            } else {
                console.log('Meal plans table created or already exists');
            }
        });
    }
});

// JWT authentication middleware
const authenticateJWT = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) {
        return res.status(403).json({ message: 'Token missing' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error registering user' });
        res.status(201).json({ message: 'User registered successfully' });
    });
});

// Modify the login route to include rate limiting
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const userId = req.body.userId; // Ensure this is fetched or passed correctly

    // Rate limiting check
    if (lastTokenCreationTime[userId] && (Date.now() - lastTokenCreationTime[userId]) < rateLimitTime) {
        return res.status(429).json({ message: 'Please wait before trying again' });
    }

    // Fetch user from the database
    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, result) => {
        if (err || result.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = result[0];
        const match = await bcrypt.compare(password, user.password);

        // Handle incorrect password
        if (!match) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        // Create JWT token
        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '25m' });

        // Store token in database, ensuring unique constraint on the token
        db.query('INSERT INTO tokens (user_id, token) VALUES (?, ?)', [user.id, token], (err) => {
            if (err) {
                console.error('Error storing token:', err);
                return res.status(500).json({ message: 'Login successful, but error storing token' });
            }

            lastTokenCreationTime[userId] = Date.now(); // Update last token creation time
            res.status(200).json({ token }); // Return the token to the client
        });
    });
});




// Middleware to check token validity on routes
const checkTokenValidity = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) {
        return res.status(403).json({ message: 'Token missing' });
    }

    // Check if the token exists in the database
    db.query('SELECT * FROM tokens WHERE token = ?', [token], (err, results) => {
        if (err || results.length === 0) {
            return res.status(403).json({ message: 'Token is invalid' });
        }
        next();
    });
};

// Logout Route
app.post('/api/auth/logout', authenticateJWT, (req, res) => {
    const token = req.token; // The token is extracted in the `authenticateToken` middleware

    // Remove token from the database
    db.query('DELETE FROM tokens WHERE token = ?', [token], (err, result) => {
        if (err) {
            console.error('Error during logout:', err);
            return res.status(500).json({ message: 'Logout failed. Please try again.' });
        }

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: 'Token not found or already invalidated.' });
        }

        res.status(200).json({ message: 'Logout successful. Token invalidated.' });
    });
});


// Food Sharing Routes
app.post('/api/food/share', authenticateJWT, (req, res) => {
    const { foodItem, quantity, location } = req.body;
    const userId = req.user.id; // Get from JWT payload

    db.query('INSERT INTO food_shares (user_id, foodItem, quantity, location) VALUES (?, ?, ?, ?)', [userId, foodItem, quantity, location], (err) => {
        if (err) return res.status(500).json({ message: 'Error sharing food' });
        res.status(201).json({ message: 'Food shared successfully' });
    });
});

app.get('/api/food/available', authenticateJWT, (req, res) => {
    db.query('SELECT * FROM food_shares', (err, results) => {
        if (err) return res.status(500).json({ message: 'Error retrieving available food' });
        res.status(200).json(results);
    });
});

// Nutrition Routes
app.post('/api/nutrition/log', authenticateJWT, (req, res) => {
    const { date, meal, calories } = req.body;
    const userId = req.user.id;

    db.query('INSERT INTO nutrition_logs (user_id, date, meal, calories) VALUES (?, ?, ?, ?)', [userId, date, meal, calories], (err) => {
        if (err) return res.status(500).json({ message: 'Error logging nutrition' });
        res.status(201).json({ message: 'Nutrition logged successfully' });
    });
});

app.get('/api/nutrition/logs', authenticateJWT, (req, res) => {
    const userId = req.user.id;

    db.query('SELECT * FROM nutrition_logs WHERE user_id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ message: 'Error retrieving logs' });
        res.status(200).json(results);
    });
});

// Meal Plan Routes
app.post('/api/meal-plan/save', authenticateJWT, (req, res) => {
    const { mealDate, mealType, mealPlan } = req.body;
    const userId = req.user.id;

    db.query('INSERT INTO meal_plans (user_id, mealDate, mealType, mealPlan) VALUES (?, ?, ?, ?)', [userId, mealDate, mealType, mealPlan], (err) => {
        if (err) return res.status(500).json({ message: 'Error saving meal plan' });
        res.status(201).json({ message: 'Meal plan saved successfully' });
    });
});

app.get('/api/meal-plan/list', authenticateJWT, (req, res) => {
    const userId = req.user.id;

    db.query('SELECT * FROM meal_plans WHERE user_id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ message: 'Error retrieving meal plans' });
        res.status(200).json(results);
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});