const express = require('express'),
  morgan = require('morgan'),
  bodyParser = require('body-parser'),
  uuid = require ('uuid');

const app = express();

app.use(bodyParser.json());


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
        title: 'Shawshank Redemption',
        year: '1994',
        director: 'Frank Darabont',
        genre: 'Drama'
    },
    {
        title: 'The Godfather',
        year: '1972',
        director: 'Francis Coppola',
        genre: 'Drama'
    }
];

// CREATE
// Allow new users to register
app.post('/users', (req, res) =>{
  const newUser = req.body;

  if(newUser.name){
    newUser.id = uuid.v4();
    users.push(newUser);
    res.status(201).json(newUser)
  }else{
    res.status(400).send('users need names')
  }
})

// UPDATE
// Allow users to update their user info (username)
app.put('/users/:id', (req, res) =>{
  const { id } = req.params;

  const updatedUser = req.body;

  let user = users.find( user => user.id == id ); /* used two '=' signs because id from the request will be string so 3 '=' signs wont wokr because not same data type */

  if(user) {
    user.name = updatedUser.name;
    res.status(200).json(user);
  }else{
    res.status(400).send('No such user')
  }
})

// CREATE
// Allow users to add a movie to their list of favorites
app.post('/users/:id/:movieTitle', (req, res) =>{
  const { id, movieTitle } = req.params;


  let user = users.find( user => user.id == id ); /* used two '=' signs because id from the request will be string so 3 '=' signs wont wokr because not same data type */

  if(user) {
    user.favoriteMovies.push(movieTitle);
    res.status(200).send(`${movieTitle} has been added to user ${id}'s array`);
  }else{
    res.status(400).send('No such user')
  }
})

// DELETE
// Allow users to remove a movie from their list of favorites
app.delete('/users/:id/:movieTitle', (req, res) =>{
  const { id, movieTitle } = req.params;

  let user = users.find( user => user.id == id ); /* used two '=' signs because id from the request will be string so 3 '=' signs wont wokr because not same data type */

  if(user) {
    user.favoriteMovies = user.favoriteMovies.filter( title => title !== movieTitle);
    res.status(200).send(`${movieTitle} has been removed from user ${id}'s array`);
  } else {
    res.status(400).send('No such user')
  }
})

// DELETE
// Allow existing users to deregister
app.delete('/users/:id', (req, res) =>{
  const { id } = req.params;

  let user = users.find( user => user.id == id );

  if(user) {
    users = users.filter( user => user.id != id); /* dont use strict equality becuase comparing to a string */
    res.status(200).send(`user ${id} has been deleted`);
  } else {
    res.status(400).send('No such user')
  }
})

// READ
// Return a list of ALL movies to the user
app.get('/movies', (req, res) => {
  res.status(200).json(movies);
});

// READ
// Return data about a single movie by title to the user
app.get('/movies/:title', (req, res) => {
  const { title } = req.params;
  const movie = movies.find( movie => movie.Title === title );

  if(movie) {
    res.status(200).json(movie);
  } else {
    res.status(400).send('no such movie');
  }
});

// READ
// Return data about a genre by name/title
app.get('/movies/genre/:genreName', (req, res) => {
  const { genreName } = req.params;
  const genre = movies.find( movie => movie.Genre.Name === genreName ).Genre;

  if(genre) {
    res.status(200).json(genre);
  } else {
    res.status(400).send('no such genre');
  }
});

// READ
// Return data about a director by name
app.get('/movies/directors/:directorName', (req, res) => {
  const { directorName } = req.params;
  const director = movies.find( movie => movie.Director.Name === directorName ).Director;

  if(director) {
    res.status(200).json(director);
  } else {
    res.status(400).send('no such director');
  }
});

// Static Files
app.use(express.static("public"));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(8080, () => {
  console.log('Your app is listening on port 8080.');
});
