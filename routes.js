'use strict';

const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const Sequelize = require('sequelize');
//const Op = Sequelize.Op;
const Course = require("./models").Course;

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

//Set up the following routes (listed in the format HTTP METHOD Route HTTP Status Code)

//GET /api/courses 200 - Returns a list of courses (including the user that owns each course)
router.get('/courses', (req, res) => {
  Course.findAll().then(courses => {
    res.json(courses);
  }).catch( err => {
    res.render('error', err);
  });
});

//GET /api/courses/:id 200 - Returns a the course (including the user that owns the course) for the provided course ID
router.get('/courses/:id', (req, res) => {
  Course.findByPk(req.params.id).then(courses => {
    if(courses){
      res.status(200).json(courses);
    } else {
      res.status(400).json('problem with request');
    }
  });
});

//POST /api/courses 201 - Creates a course, sets the Location header to the URI for the course, and returns no content
router.post('/courses', (req, res) => {
  Course.create(req.body).then(() => {
    res.redirect("/");
  }).catch( err => {
    if(err.name === "SequelizeValidationError"){
      res.render('books/update-book', {
        book: Book.build(req.body),
        title: "Edit book",
        errors: err.errors
      });
    } else {
      throw err;
    }
  }).catch( err => {
    res.render('error', err);
  });
});

//PUT /api/courses/:id 204 - Updates a course and returns no content
router.put('/courses/:id', (req, res) => {

});

//DELETE /api/courses/:id 204 - Deletes a course and returns no content
router.delete('/courses', (req, res) => {

});



module.exports = router;
