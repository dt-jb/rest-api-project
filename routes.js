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

//Middleware authenticating user
const authenticateUser = async (req, res, next) => {
  let message = null;
  // Parse the user's credentials from the Authorization header.
  const credentials = auth(req);
  console.log(credentials);
  // If the user's credentials are available...
  if (credentials) {
    const user = await User.findOne({ where: {emailAddress: credentials.name} });
    if (user) {
      const authenticated = bcryptjs
        .compareSync(credentials.pass, user.password);
      //console.log(authenticated, credentials.pass, user.password);
      if (authenticated) {
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

  if (message) {
    console.warn(message);
    res.status(401).json({ message: 'Access Denied' });
  } else {
    next();
  }
};

//Set up the following routes (listed in the format HTTP METHOD Route HTTP Status Code):
//GET /api/users 200 - Returns the currently authenticated user
router.get('/users', authenticateUser, (req, res) => {
  //console.log(req.currentUser)
  res.status(200).json({
    name: req.currentUser.firstName ,
    username: req.currentUser.emailAddress,
  });
});

//POST /api/users 201 - Creates a user, sets the Location header to "/", and returns no content
router.post('/users', (req, res) => {
  if (JSON.stringify(req.body) === '{}') {
    console.log('req body is empty object');
    const err = new Error;
    err.status = 400;
    err.message = 'No empty objects'
    throw err;
  }
  req.body.password = bcryptjs.hashSync(req.body.password);
  User.create(req.body).then(() => {
    // Set the status to 201 Created and end the response.
    res.location('/').status(201).end();
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
    res.location(`/courses/${course.id}`).status(201).end();
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
  if (JSON.stringify(req.body) === '{}') {
    console.log('req body is empty object');
    const err = new Error;
    err.status = 400;
    err.message = 'No empty objects'
    throw err;
  }
  Course.findByPk(req.params.id).then( course => {
    if(course.userId === req.currentUser.id){
      course.update(req.body);
      res.status(204).end();
    } else {
      res.status(403).json("Users are not allowed to edit courses other than their own.").end();
    }
})/*.then(() => {
    //console.log(req.body);
    res.status(204).end();
  })*/.catch( err => {
    if(err.name === "SequelizeValidationError"){
      res.status(400).json(err);
    } else {
      throw err;
    }
  }).catch( err => {
    res.status(400).json(err);
  });
});

//DELETE /api/courses/:id 204 - Deletes a course and returns no content
router.delete('/courses/:id', authenticateUser, (req, res) => {
  Course.findByPk(req.params.id).then( course => {
      if(course && course.userId === req.currentUser.id){
        return course.destroy();
      } else {
        res.status(403).json("Users are not allowed to delete courses other than their own.").end();
      }
    }).then(()=>{
      res.status(204).end();
  });
});

module.exports = router;
