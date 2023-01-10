const mongoose = require('mongoose');
const Models = require('./models.js');

const Movies = Models.Movie;
const Users = Models.User;

const { check, validationResult } = require('express-validator');

// mongoose.connect('mongodb://localhost:27017/test', { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connect(process.env.CONNECTION_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const express = require('express'),
  morgan = require('morgan'),
  bodyParser = require('body-parser'),
  uuid = require('uuid');

const app = express();

app.use(bodyParser.json());



app.use(bodyParser.urlencoded({ extended: true }));

const cors = require('cors');
let allowedOrigins = ['http://localhost:1234', 'http://localhost:4200', 'https://adamsmyflix.netlify.app/register', 'https://willowy-sorbet-614005.netlify.app', "https://631fd4b9cf967200098320ef--adamsmyflix.netlify.app"];


app.use(cors())
// app.use(cors({
//   origin: (origin, callback) => {
//     if (!origin) return callback(null, true);
//     if (allowedOrigins.indexOf(origin) === -1) { // If a specific origin isn’t found on the list of allowed origins
//       let message = 'The CORS policy for this application doesn’t allow access from origin ' + origin;
//       return callback(new Error(message), false);
//     }
//     return callback(null, true);
//   }
// }));

app.options('*', cors())


app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Expose-Headers", "Authorization");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  next();
});

let auth = require('./auth')(app);

const passport = require('passport');
require('./passport');

app.use(morgan('common'));

app.use(express.static('public'));

let users = [
  {
    id: 1,
    name: 'Adam',
    favoriteMovies: []
  },
  {
    id: 2,
    name: 'John',
    favoriteMovies: ["Shawshank Redemption"]
  }
];

let movies = [
  {
    Title: 'Shawshank Redemption',
    Year: '1994',
    Director: {
      Name: 'Frank Darabont',
      Birth: '1959'
    },
    Genre: 'Drama'
  },
  {
    Title: 'The Godfather',
    Year: '1972',
    Director: {
      Name: 'Francis Coppola',
      Birth: '1939'
    },
    Genre: 'Drama'
  }
];

app.get('/', (req, res) => {
  res.send('Welcome to my myFlix app! You\'ll find my top 10 movies here :D');
});

/**
 * POST: Allows new users to register; Username, Password & Email are required fields!
 * Request body: Bearer token, JSON with user information
 * @returns user object
 */
app.post('/users',
  // Validation logic here for request
  [
    check('Username', 'Username is required').isLength({ min: 5 }),
    check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail()
  ], (req, res) => {

    // check the validation object for errors
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
    Users.findOne({ Username: req.body.Username }) // Search to see if a user with the requested username already exists
      .then((user) => {
        if (user) {
          //If the user is found, send a response that it already exists
          return res.status(400).send(req.body.Username + ' already exists');
        } else {
          Users
            .create({
              Username: req.body.Username,
              Password: hashedPassword,
              Email: req.body.Email,
              Birthday: req.body.Birthday
            })
            .then((user) => { res.status(201).json(user) })
            .catch((error) => {
              console.error(error);
              res.status(500).send('Error: ' + error);
            });
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send('Error: ' + error);
      });
  });

/**
 * GET: Returns a list of ALL users
 * Request body: Bearer token
 * @returns array of user objects
 * @requires passport
 */
app.get('/users', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.find()
    .then((users) => {
      res.status(201).json(users);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

/**
 * GET: Returns data on a single user by username
 * Request body: Bearer token
 * @param Username
 * @returns user object
 * @requires passport
 */
app.get('/users/:Username', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOne({ Username: req.params.Username })
    .then((user) => {
      res.json(user);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

/**
 * PUT: Allow users to update their user info (find by username)
 * Request body: Bearer token, updated user info
 * @param Username
 * @returns user object with updates
 * @requires passport
 */
app.put('/users/:Username', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOneAndUpdate({ Username: req.params.Username }, {
    $set:
    {
      Username: req.body.Username,
      Password: req.body.Password,
      Email: req.body.Email,
      Birthday: req.body.Birthday
    }
  },
    { new: true }, // This line makes sure that the updated document is returned
    (err, updatedUser) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error: ' + err);
      } else {
        res.json(updatedUser);
      }
    });
});

app.get('/users/:Username/movies', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOne({ Username: req.params.Username })
    .then((user) => {
      if (user) { // If a user with the corresponding username was found, return user info
        res.status(200).json(user.FavoriteMovies);
      } else {
        res.status(400).send('Could not find favorite movies for this user');
      };
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});


/**
 * POST: Allows users to add a movie to their favorites list
 * Request body: Bearer token
 * @param username
 * @param movieId
 * @returns user object
 * @requires passport
 */
app.post('/users/:Username/movies/:MovieID', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOneAndUpdate({ Username: req.params.Username }, {
    $push: { FavoriteMovies: req.params.MovieID }
  },
    { new: true }, // This line makes sure that the updated document is returned
    (err, updatedUser) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error: ' + err);
      } else {
        res.json(updatedUser);
      }
    });
});

/**
 * DELETE: Allows users to remove a movie from their list of favorites
 * Request body: Bearer token
 * @param Username
 * @param movieId
 * @returns user object
 * @requires passport
 */
app.delete('/users/:Username/movies/:MovieID', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOneAndUpdate({ Username: req.params.Username },
    {
      $pull: { FavoriteMovies: req.params.MovieID }
    },
    { new: true },
    (err, updatedUser) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error: ' + err);
      } else {
        res.json(updatedUser);
      }
    });
});


/**
 * DELETE: Allows existing users to deregister
 * Request body: Bearer token
 * @param Username
 * @returns success message
 * @requires passport
 */
app.delete('/users/:Username', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findOneAndRemove({ Username: req.params.Username })
    .then((user) => {
      if (!user) {
        res.status(400).send(req.params.Username + ' was not found');
      } else {
        res.status(200).send(req.params.Username + ' was deleted.');
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

/**
 * GET: Returns a list of ALL movies to the user
 * Request body: Bearer token
 * @returns array of movie objects
 * @requires passport
 */
app.get('/movies', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.find().then((movies) => {
    res.status(200).json(movies);
  }).catch((err) => {
    res.status(500).send('Error: ' + error);
  });
});

/**
 * GET: Returns data (description, genre, director, image URL, whether it’s featured or not) about a single movie by title to the user
 * Request body: Bearer token
 * @param Title of movie
 * @returns movie object
 * @requires passport
 */
app.get('/movies/:Title', passport.authenticate('jwt', { session: false }), (req, res) => {
  Movies.findOne({ Title: req.params.Title })
    .then((movie) => {
      res.status(200).json(movie)
    })
    .catch((err) => {
      res.status(500).send('Error: ' + err)
    });
});

/**
 * GET: Returns data about a genre (description) by name/title
 * Request body: Bearer token
 * @param Name (of genre)
 * @returns genre object
 * @requires passport
 */
app.get('/movies/genre/:genreName', passport.authenticate('jwt', { session: false }), (req, res) => {
  const { genreName } = req.params;
  const genre = movies.find(movie => movie.Genre === genreName).Genre;

  if (genre) {
    res.status(200).json(genre);
  } else {
    res.status(400).send('no such genre');
  }
});

/**
 * GET: Returns data about a director (bio, birth year, death year) by name
 * Request body: Bearer token
 * @param Name of director
 * @returns director object
 * @requires passport
 */
app.get('/movies/directors/:directorName', passport.authenticate('jwt', { session: false }), (req, res) => {
  const { directorName } = req.params;
  const director = movies.find(movie => movie.Director.Name === directorName).Director;

  if (director) {
    res.status(200).json(director);
  } else {
    res.status(400).send('no such director');
  }
});

/**
 * Static Files
 *  
 */
app.use(express.static("public"));

/**
 * error handling
 */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

/**
 * defines port, listening to port 8080
 */
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log('Listening on Port ' + port);
});
