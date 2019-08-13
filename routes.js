'use strict';

const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const Sequelize = require('sequelize');
//const Op = Sequelize.Op;
const Course = require("./models").Course;
const User = require("./models").User;
const { check, validationResult } = require('express-validator/check');
const bcryptjs = require('bcryptjs');
const auth = require('basic-auth');

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

const authenticateUser = async (req, res, next) => {
  let message = null;
  // Parse the user's credentials from the Authorization header.
  const credentials = auth(req);
  console.log(credentials);
  // If the user's credentials are available...
  if (credentials) {
    // Attempt to retrieve the user from the data store
    // by their username (i.e. the user's "key"
    // from the Authorization header).
    const user = await User.findOne({ where: {emailAddress: credentials.name} });
    // If a user was successfully retrieved from the data store...
    if (user) {
      // Use the bcryptjs npm package to compare the user's password
      // (from the Authorization header) to the user's password
      // that was retrieved from the data store.
      const authenticated = bcryptjs
        .compareSync(credentials.pass, user.password);
      console.log(authenticated, credentials.pass, user.password);
      // If the passwords match...
      if (authenticated) {
        // Then store the retrieved user object on the request object
        // so any middleware functions that follow this middleware function
        // will have access to the user's information.
        req.currentUser = user;
      } else {
        message = `Authentication failure for username: ${user.username}`;
      }
    } else {
      message = `User not found for username: ${credentials.name}`;
    }
  } else {
    message = 'Auth header not found';
  }

  // If user authentication failed...
  if (message) {
    console.warn(message);

    // Return a response with a 401 Unauthorized HTTP status code.
    res.status(401).json({ message: 'Access Denied' });
  } else {
    // Or if user authentication succeeded...
    // Call the next() method.
    next();
  }
};

//Set up the following routes (listed in the format HTTP METHOD Route HTTP Status Code):
//GET /api/users 200 - Returns the currently authenticated user
router.get('/users', authenticateUser, (req, res) => {
  console.log(req.currentUser)
  res.status(200).json({
    name: req.currentUser.firstName ,
    username: req.currentUser.emailAddress,
  });
});
/*Model.findAll({
  attributes: { exclude: ['baz'] }
});

*/
//POST /api/users 201 - Creates a user, sets the Location header to "/", and returns no content
router.post('/users', (req, res) => {
  req.body.password = bcryptjs.hashSync(req.body.password);
  User.create(req.body).then(() => {
    // Set the status to 201 Created and end the response.
    res.location('/').status(201).json(req.body).end();
  }).catch( err => {
    if(err.name === "SequelizeValidationError"){
      res.status(400).json(err);
    } else {
      throw err;
    }
  }).catch( err => {
    res.status(400).json(err);
  });
});

//Set up the following routes (listed in the format HTTP METHOD Route HTTP Status Code)
//GET /api/courses 200 - Returns a list of courses (including the user that owns each course)
router.get('/courses', (req, res) => {
  Course.findAll({
    attributes: { exclude: ['createdAt', 'updatedAt'] }
  }).then(courses => {
    res.json(courses);
  }).catch( err => {
    res.render('error', err);
  });
});

//GET /api/courses/:id 200 - Returns a the course (including the user that owns the course) for the provided course ID
router.get('/courses/:id', (req, res) => {
  Course.findByPk(req.params.id, {
    attributes: { exclude: ['createdAt', 'updatedAt'] }
  }).then(courses => {
    if(courses){
      res.status(200).json(courses);
    } else {
      res.status(400).json('problem with request');
    }
  });
});

//POST /api/courses 201 - Creates a course, sets the Location header to the URI for the course, and returns no content
router.post('/courses', authenticateUser, (req, res) => {
  Course.create(req.body).then( course => {
    //console.log(req.body.id);
    res.location(`/courses/:${course.id}`).status(201).json(req.body).end();
  }).catch( err => {
    if(err.name === "SequelizeValidationError"){
      res.status(400).json(err);
    } else {
      throw err;
    }
  }).catch( err => {
    res.status(400).json(err);
  });
});


//PUT /api/courses/:id 204 - Updates a course and returns no content

router.put('/courses/:id', authenticateUser, (req, res) => {
  Course.findByPk(req.params.id).then( course => {
    if(course.userId === req.currentUser.id){
      course.update(req.body);
    } else {
      res.status(403).json("Users are not allowed to edit courses other than their own.").end();
    }
}).then(() => {
    console.log(req.body);
    res.status(204).json(req.body).end();
  }).catch( err => {
    if(err.name === "SequelizeValidationError"){
      res.status(400).json(err);
    } else {
      throw err;
    }
  }).catch( err => {
    res.status(400).json(err);
  });
});
/*
*/
/*
router.put('/courses/:id', authenticateUser, (req, res) => {
  console.log(`${req.currentUser.id} is the id of the current user.`);
  Course.update(
    req.body,
    {
      where: {
        id: req.params.id,
        userId: req.currentUser.id
      }
    }
  )
  .then(() => {
    console.log(req.body);
    res.status(204).json(req.body).end();
  }).catch( err => {
    if(err.name === "SequelizeValidationError"){
      res.status(400).json(err);
    } else {
      throw err;
    }
  }).catch( err => {
    res.status(400).json(err);
  });
});*/

//DELETE /api/courses/:id 204 - Deletes a course and returns no content
router.delete('/courses/:id', authenticateUser, (req, res) => {
  Course.findByPk(req.params.id).then( course => {
      /*if(course){
        return course.destroy();
      } else {
        //res.render('books/page-not-found');
      }*/
      if(course && course.userId === req.currentUser.id){
        return course.destroy();
      } else {
        res.status(403).json("Users are not allowed to delete courses other than their own.").end();
      }
    }).then(()=>{
      res.status(204).end();
  });
});

/*
router.delete('/courses/:id', authenticateUser, (req, res) => {
  Course.findByPk(req.params.id).then( course => {
      if(course){
        return course.destroy();
      } else {
        //res.render('books/page-not-found');
      }
    }).then(()=>{
      res.status(204).end();
  });
});*/

module.exports = router;
