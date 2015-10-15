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

/* GET home page. */
router.get('/togglButton', function(req, res, next) {
  res.render('togglButton', { title: 'Express' });
});

module.exports = router;