 //---------------------------------------------------------------------
 // <copyright file="index.js">
 //    This code is licensed under the MIT License.
 //    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
 //    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
 //    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
 //    PARTICULAR PURPOSE AND NONINFRINGEMENT.
 // </copyright>
 // <summary>Route for index uri</summary>
 //---------------------------------------------------------------------

var express = require('express');
var router = express.Router();

/* GET Group button. */
router.get('/pomoTogglTimerSettings', function(req, res, next) {
  res.render('pomoTogglTimerSettings', { title: 'Express' });
});

router.get('/', function(req, res, next) {
  res.render('pomoTogglTimerSettings', { title: 'Express' });
});

/* GET pomo toggl settings. */
router.get('/pomoTogglTimerGroup', function (req, res, next) {
    res.render('pomoTogglTimerGroup', {});
});

module.exports = router;