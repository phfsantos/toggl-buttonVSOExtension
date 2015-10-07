var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/togglButton', function(req, res, next) {
  res.render('togglButton', { title: 'Express' });
});

module.exports = router;