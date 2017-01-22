 //---------------------------------------------------------------------
 // <copyright file="togglButtonForm.js">
 //    This code is licensed under the MIT License.
 //    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
 //    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
 //    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
 //    PARTICULAR PURPOSE AND NONINFRINGEMENT.
 // </copyright>
 // <summary>Routes and some logic for togglButtonForm server actions</summary>
 //---------------------------------------------------------------------

var express = require('express');
var TogglClient = require('toggl-api');
var router = express.Router();

router.get('/getUserData', function (req, res, next) {
    var https = require('https');
    var options = {
        host: 'toggl.com',
        path: '/api/v8/me?with_related_data=true',
        headers: { 'Authorization': 'Basic ' + new Buffer(req.query['apikey'] + ':api_token').toString('base64') },
    };

    var togglReq = https.request(options, function (response) {
        var str = '';

        response.on('data', function (chunk) {
            str += chunk;
        });

        response.on('end', function () {
            console.log('status: ' + this.statusCode + ' - ' + this.statusMessage);
            //console.log(str);
            if (this.statusCode === 200) {
				res.send(JSON.parse(str).data);
            }
            else
                res.sendStatus(this.statusCode);
        })
    }).end();
});

router.put('/stopTimer', function(req, res, next){
    var https = require('https');

    var options = {
        host: 'toggl.com',
        path: '/api/v8/time_entries/' + req.body.timeEntryId + '/stop',
        headers: { 'Authorization': 'Basic ' + new Buffer(req.body.apikey + ':api_token').toString('base64'),
                   'Content-Type': 'application/json' },
        method: 'PUT'
    };
    
    var togglReq = https.request(options, function(response){
        var str = '';
        
        response.on('data', function(chunk){ 
            str += chunk;
        });
        
        response.on('end', function(){
            res.sendStatus(this.statusCode);
        }); 
    });
    
    togglReq.end();    
});

router.delete('/discardTimer', function(req, res, next){
    var https = require('https');
    
    var options = {
        host: 'toggl.com',
        path: '/api/v8/time_entries/' + req.body.timeEntryId,
        headers: { 'Authorization': 'Basic ' + new Buffer(req.body.apikey + ':api_token').toString('base64'),
                   'Content-Type': 'application/json' },
        method: 'DELETE'
    };
    
    var togglReq = https.request(options, function(response){
        var str = '';
        
        response.on('data', function(chunk){ 
            str += chunk;
        });

        response.on('end', function(){
            console.log('end');
            res.sendStatus(this.statusCode);
        }); 
    });
    
    togglReq.end();    
});



router.post('/startTimer', function (req, res, next) {
    var toggl = new TogglClient({apiToken: req.body.apikey});
    var tags = req.body["tags[]"] || req.body.tags || [];
    if(typeof tags === "string"){
        tags = tags.split(",");
    }
    toggl.startTimeEntry({
        "description": req.body.activityDescription,
        "tags": tags,
        "pid": req.body.project,
        "created_with": "PomoToggl Timer"
    }, function(err, timeEntry) {
        // handle error
        if (err) {
            res.status(406).send(err, 500);
        } else {
            res.sendStatus(200);
        }
    });
});
router.get('/createProject', function (req, res, next) {
    var toggl = new TogglClient({apiToken: req.body.apikey});

    toggl.createProject({
        "name": req.body.projectName,
        "created_with": "PomoToggl Timer"
    }, function(err, projectData) {
        // handle error
        if (err) {
            res.status(406).send(err);
        } else {
            res.send(projectData);
        }
    });
});

module.exports = router;