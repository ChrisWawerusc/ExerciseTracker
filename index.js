const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const crypto = require('crypto'); // For generating _id

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true })); // Handles form data
app.use(express.json());
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

let users = [];

// --- API Endpoints ---

// 2. Create a New User
// POST /api/users with form data username
// Response: { username: string, _id: string }
app.post('/api/users', (req, res) => {
  const username = req.body.username;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const _id = crypto.randomBytes(12).toString('hex');
  const newUser = {
    username: username,
    _id: _id,
    exercises: [] // Initialize exercises for the new user
  };
  users.push(newUser);
  res.json({ username: newUser.username, _id: newUser._id });
});

// 4. Get a list of all users
// GET /api/users
// Response: Array of users, each { username: string, _id: string }
app.get('/api/users', (req, res) => {
  const userList = users.map(user => ({
    username: user.username,
    _id: user._id
  }));
  res.json(userList);
});

// 7. Add exercises
// POST /api/users/:_id/exercises with form data description, duration, and optionally date.
// If no date is supplied, the current date will be used.
// Response: User object with exercise fields added { username, _id, description, duration, date }
app.post('/api/users/:_id/exercises', (req, res) => {
  const userId = req.params._id;
  const { description, duration } = req.body;
  let dateInput = req.body.date; // Date from form (string)

  if (!description || !duration) {
    return res.status(400).json({ error: 'Description and duration are required' });
  }

  const durationNum = parseInt(duration);
  if (isNaN(durationNum)) {
    return res.status(400).json({ error: 'Duration must be a number' });
  }

  const user = users.find(u => u._id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  let exerciseDate;
  if (dateInput) {
    exerciseDate = new Date(dateInput);
    // Check if the parsed date is valid. Date("yyyy-mm-dd") is parsed as UTC midnight.
    if (isNaN(exerciseDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Please use yyyy-mm-dd.' });
    }
  } else {
    exerciseDate = new Date(); // Use current date if not supplied
  }

  const newExercise = {
    description: String(description),
    duration: durationNum,
    date: exerciseDate // Store as a Date object
  };

  user.exercises.push(newExercise);

  // Respond with the user object along with the details of the added exercise
  res.json({
    username: user.username,
    description: newExercise.description,
    duration: newExercise.duration,
    date: newExercise.date.toDateString(), // Format date using toDateString()
    _id: user._id
  });
});

// 9. Get user's exercise log
// GET /api/users/:_id/logs?[from][&to][&limit]
// Response: User object with count and log array.
app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id;
  const user = users.find(u => u._id === userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  let exercisesToLog = [...user.exercises]; // Start with a copy of all user exercises

  const { from, to, limit } = req.query;

  if (from) {
    const fromDate = new Date(from);
    if (!isNaN(fromDate.getTime())) {
      exercisesToLog = exercisesToLog.filter(ex => ex.date >= fromDate);
    } // Silently ignore invalid 'from' date for now, or you could return an error
  }

  if (to) {
    const toDate = new Date(to);
    if (!isNaN(toDate.getTime())) {
      // Set toDate to the end of the day to include all exercises on that day
      toDate.setHours(23, 59, 59, 999);
      exercisesToLog = exercisesToLog.filter(ex => ex.date <= toDate);
    } // Silently ignore invalid 'to' date
  }

  if (limit) {
    const limitNum = parseInt(limit);
    if (!isNaN(limitNum) && limitNum > 0) {
      exercisesToLog = exercisesToLog.slice(0, limitNum);
    }
  }

  const formattedLog = exercisesToLog.map(ex => ({
    description: ex.description,
    duration: ex.duration,
    date: ex.date.toDateString() // Format date using toDateString()
  }));

  res.json({
    username: user.username,
    count: formattedLog.length, // Number of exercises in the returned log
    _id: user._id,
    log: formattedLog
  });
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
