// ---------------------------------------------------------------------
// <copyright file="TogglButtonForm.ts">
//    this code is licensed under the MIT License.
//    tHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    aNY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    tO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    pARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>All logic inside TogglButtonForm</summary>
// ---------------------------------------------------------------------
/// <reference path='../ref/jquery.d.ts' />
/// <reference path='../ref/VSS.d.ts' />
/// <reference path='../ref/chosen.d.ts' />
var PomoTogglTimerGroup = (function () {
    function PomoTogglTimerGroup(WorkItemFormService, AuthenticationService, Controls, StatusIndicator, dataService, Dialogs) {
        this.apiKey = "";
        this.title = "";
        this.pomodoriSize = 25;
        this.pomodoriBreak = 5;
        this.pomodoriStreak = 0;
        this.STATE_FIELD = "System.State";
        this.REASON_FIELD = "System.Reason";
        this.authenticationService = AuthenticationService;
        this.workItemFormService = WorkItemFormService;
        this.controls = Controls;
        this.statusIndicator = StatusIndicator;
        this.dataService = dataService;
        this.dialogs = Dialogs;
        this.webContext = VSS.getWebContext();
        this.initializeForm();
    }
    PomoTogglTimerGroup.prototype.initializeForm = function () {
        var _this = this;
        // init buttons
        $("#btnStop").off().click(function () { return _this.stopCurrentTimer(); });
        $("#btnStart").off().click(function () { return _this.startTimer(); });
        $("#btnDiscard").off().click(function () { return _this.discardCurrentTimer(); });
        this.loadAPIKey().then(function () {
            if (_this.apiKey) {
                _this.fetchTogglInformation();
            }
            else {
                _this.hideInfosFromToggl();
            }
        });
    };
    
    PomoTogglTimerGroup.prototype.hideInfosFromToggl = function () {
        $("#startTimer").show();
    };
    PomoTogglTimerGroup.prototype.showInfosFromToggl = function () {
        $("#startTimer").show();
        $("#stopTimer").hide();
    };
    PomoTogglTimerGroup.prototype.fetchTogglInformation = function () {
        var _this = this;
        $.ajax({
            url: "./pomoTogglTimer/getUserData",
            data: { apikey: this.apiKey },
            success: function (data) {
                _this.errorMessage(null);
                var currentTimer = null;
                if (data.time_entries) {
                    currentTimer = data.time_entries.find(function (t) {
                        return t.duration < 0;
                    });
                }
                if (data.workspaces.length) {
                    _this.workspaceId = data.workspaces[0].id;
                }
                if (currentTimer) {
                    if (_this.currentTimerId !== currentTimer.id) {
                        _this.showCurrentTimer(currentTimer);
                    }
                }
                else {
                    _this.clearCurrentTimer();
                    _this.getDescriptionInfo();
                    _this.showInfosFromToggl();
                }
                _this.workItemFormService.getFieldValues([
                    "System.TeamProject",
                    "System.Tags",
                ]).then(function (fields) {
                    var projectName = fields["System.TeamProject"];
                    var togglProject = data.projects.find(function (p) {
                        return p.name === projectName;
                    });
                    if (togglProject) {
                        _this.project = togglProject.id;
                    }
                    else {
                        $.ajax({
                            url: "./pomoTogglTimer/createProject",
                            data: { apikey: _this.apiKey, projectName, workspaceId: _this.workspaceId },
                            success: function (p) {
                                _this.project = p.id;
                            }
                        });
                    }
                    _this.tags = [""];
                    if (fields["System.Tags"]) {
                        _this.tags = fields["System.Tags"].split(";");
                    }
                    
                });
            },
            error: function (data) {
                _this.errorMessage(data.status, data.statusText);
            }
        });
    };
    
    PomoTogglTimerGroup.prototype.updateCompletedTime = function () {
        var _this = this;
        console.log("Updating completed time");
        $.ajax({
            url: "./pomoTogglTimer/getUserData",
            data: { apikey: this.apiKey },
            success: function (data) {
                var COMPLETED_WORK = "Microsoft.VSTS.Scheduling.CompletedWork";
                _this.workItemFormService.getFieldValue(COMPLETED_WORK).then(function (completedWork) {
                    var lastTimeEntry = data.time_entries.pop();
                    var hours = lastTimeEntry.duration / 60 / 60; // duration is in seconds
                    completedWork += hours;
                    _this.workItemFormService.setFieldValue(COMPLETED_WORK, Number(completedWork).toFixed(2)).then(function (success) {
                        if (success) {
                            console.log("Updated completed time");
                        }
                        else {
                            console.log("could not update");
                        }
                    }, function (err) {
                        console.log("could not update", err);
                    });
                }, function (err) {
                    console.log("could not update", err);
                });
            },
            error: function (data) {
                _this.errorMessage(data.status, data.statusText);
            }
        });
    };
    PomoTogglTimerGroup.prototype.addPomodoriEntry = function () {
        var _this = this;
        this.dataService.getValue("pomodories").then(function (pomodories) {
            pomodories = pomodories ? pomodories : 0;
            return _this.dataService.setValue("pomodories", ++pomodories);
        });
        this.workItemFormService.getId().then(function (workItemID) {
            _this.dataService.getValue(workItemID + "-pomodories").then(function (pomodories) {
                pomodories = pomodories ? pomodories : 0;
                return _this.dataService.setValue(workItemID + "-pomodories", ++pomodories);
            });
            var authTokenManager = _this.authenticationService.authTokenManager;
            authTokenManager.getToken().then(function (token) {
                var header = authTokenManager.getAuthorizationHeader(token);
                $.ajaxSetup({
                    headers: {
                        "Authorization": header,
                        "Accept": "application/json; api-version=1.0;",
                    },
                });
                var postData = [{
                        "op": "add",
                        "path": "/fields/System.History",
                        "value": "Completed a pomodori"
                    }];
                _this.workItemFormService.getWorkItemResourceUrl(workItemID).then(function (apiURI) {
                    // var apiURI = this.webContext.collection.uri + "_apis/wit/workitems/" + workItemID + "?api-version=1.0";
                    $.ajax({
                        type: "PATCH",
                        url: apiURI,
                        contentType: "application/json-patch+json",
                        data: JSON.stringify(postData),
                        success: function () {
                            if (console) {
                                console.log("History updated successful");
                            }
                        },
                        error: function (error) {
                            if (console) {
                                console.log("Error " + error.status + ": " + error.statusText);
                            }
                        }
                    });
                });
            });
        });
    };
    PomoTogglTimerGroup.prototype.showCurrentTimer = function (currentTimer) {
        var _this = this;
        this.clearCurrentTimer();
        $("#startTimer").hide();
        $("#stopTimer").show();
        $("#activeActivityTitle").text(currentTimer.description);
        var start = new Date(currentTimer.start);
        var now = new Date();
        var milliseconds = Math.abs(Number(start) - Number(now));
        this.currentTimerId = currentTimer.id;
        this.timerInterval = setInterval(function () {
            milliseconds += 1000;
            var min = (milliseconds / 1000 / 60) << 0;
            var sec = (milliseconds / 1000) % 60;
            var secZero = sec < 10 ? "0" : "";
            $("#activeActivityStartTime").text(min.toFixed(0) + ":" + secZero + parseInt(String(sec), 10));
            // check if the timer is still on Toggl
            if (sec % 20 === 0) {
                _this.fetchTogglInformation();
            }
            if (min === _this.pomodoriSize) {
                _this.pomodoriStreak++;
                if (_this.pomodoriStreak === 4) {
                    _this.pomodoriBreak = 20;
                    // reset streak
                    _this.pomodoriStreak = 0;
                }
                else {
                    _this.pomodoriBreak = 5;
                }
                _this.addPomodoriEntry();
                _this.breakTime();
                _this.stopCurrentTimer();
                _this.notify("Take a break!", "You completed a pomodori. Take " + _this.pomodoriBreak + " minutes break.");
            }
        }, 1000);
    };
    PomoTogglTimerGroup.prototype.clearCurrentTimer = function () {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    };
    PomoTogglTimerGroup.prototype.startTimer = function () {
        var _this = this;
        this.workItemFormService.getId().then(function (workItemID) {
            var result = _this.getFormInputs();
            $.ajax({
                url: "./pomoTogglTimer/startTimer",
                type: "POST",
                data: result,
                success: function (data) {
                    _this.fetchTogglInformation();
                },
                error: function (err) {
                    alert("Not possible to start the timer. Error " + err.status + ": " + err.statusText);
                }
            });
        });
    };
    PomoTogglTimerGroup.prototype.stopCurrentTimer = function () {
        var _this = this;
        this.clearCurrentTimer();
        var settings = {
            url: "./pomoTogglTimer/stopTimer",
            type: "PUT",
            data: { timeEntryId: this.currentTimerId, apikey: this.apiKey },
            success: function (data, textStatus, jqXHR) {
                _this.initializeForm();
                _this.updateCompletedTime();
            },
            error: function (data) {
                _this.errorMessage(data.status, data.statusText);
                clearInterval(_this.timerInterval);
            }
        };
        $.ajax(settings);
    };
    
    PomoTogglTimerGroup.prototype.discardCurrentTimer = function () {
        var _this = this;
        if (!confirm("Do you want to delete this running time entry?")) {
            return;
        }
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        $.ajax({
            url: "./pomoTogglTimer/discardTimer",
            type: "DELETE",
            data: { timeEntryId: this.currentTimerId, apikey: this.apiKey },
            success: function (data) {
                _this.initializeForm();
            },
            error: function (data) {
                _this.errorMessage(data.status, data.statusText);
            }
        });
    };
    PomoTogglTimerGroup.prototype.loadAPIKey = function () {
        var _this = this;
        return this.dataService.getValue("apikey").then(function (currentKey) {
            return _this.apiKey = currentKey;
        });
    };
    PomoTogglTimerGroup.prototype.errorMessage = function (status, message) {
        if (status === void 0) { status = 200; }
        if (message === void 0) { message = ""; }
        var $errorDiv = $("#error");
        $errorDiv.html("");
        if (status != null && status !== 200) {
            $("#error").html("<p>Error " + status + ": " + message + "</p>");
        }
    };
    PomoTogglTimerGroup.prototype.getDescriptionInfo = function () {
        var _this = this;
        this.workItemFormService.getId().then(function (workItemID) {
            _this.workItemFormService.getFieldValue("System.Title").then(function (title) {
                _this.title = workItemID + " - " + title;
            });
        });
    };
    PomoTogglTimerGroup.prototype.getFormInputs = function () {
        return {
            activityDescription: this.title,
            project: String(this.project),
            tags: this.tags,
            apikey: this.apiKey
        };
    };
    
    PomoTogglTimerGroup.prototype.notify = function (title, body) {
        this.dialogs.show(this.dialogs.ModalDialog, {
            okText: "ok",
            title,
            contentText: body,
        });
    };
    PomoTogglTimerGroup.prototype.breakTime = function () {
        var _this = this;
        var container = $("#startTimer.section");
        var waitControlOptions = {
            cancellable: true,
            cancelTextFormat: this.pomodoriBreak + " minutes break! {0} to skip",
            cancelCallback: function () {
                _this.startTimer();
            }
        };
        var waitControl = this.controls.create(this.statusIndicator.WaitControl, container, waitControlOptions);
        waitControl.startWait();
        setTimeout(function () {
            _this.notify("Break is over!", "It is time to get back to work.");
            waitControl.endWait();
        }, this.pomodoriBreak * 60 * 1000);
    };
    PomoTogglTimerGroup.prototype.onFormChanged = function (callback) {
        if (this.formChangedCallbacks) {
            this.formChangedCallbacks.push(callback);
        }
    };
    
    return PomoTogglTimerGroup;
}());

/// <reference path='../ref/jquery.d.ts' />
/// <reference path='../ref/VSS.d.ts' />
/// <reference path='../ref/chosen.d.ts' />
var PomoTogglTimerSettings = (function () {
    function PomoTogglTimerSettings(DataService) {
        var _this = this;
        this.STATE_FIELD = "System.State";
        this.REASON_FIELD = "System.Reason";
        this.dataService = DataService;
        this.webContext = VSS.getWebContext();
        this.loadAPIKey();
        $("#btnSave").click(function () { return _this.saveAPIKey(); });
    }
    PomoTogglTimerSettings.prototype.saveAPIKey = function () {
        var _this = this;
        var apiKey = $("#txtAPIKey").val();
        if (localStorage !== undefined) {
            this.dataService.getValue("apikey").then(function (currentKey) {
                if (currentKey === "" || currentKey !== apiKey) {
                    _this.dataService.setValue("apikey", apiKey).then(function () {
                        console.log("Set the api key");
                    });
                }
            });
        }
    };
    
    PomoTogglTimerSettings.prototype.loadAPIKey = function () {
        this.dataService.getValue("apikey").then(function (currentKey) {
            if (currentKey) {
                $("#txtAPIKey").val(currentKey);
            }
        });
    };
    PomoTogglTimerSettings.prototype.errorMessage = function (status, message) {
        if (status === void 0) { status = 200; }
        if (message === void 0) { message = ""; }
        var $errorDiv = $("#error");
        $errorDiv.html("");
        if (status != null && status !== 200) {
            $("#error").html("<p>Error " + status + ": " + message + "</p>");
        }
    };
    return PomoTogglTimerSettings;
}());

VSS.init({
    explicitNotifyLoaded: true,
    usePlatformScripts: true,
    usePlatformStyles: true
});
VSS.require([
    "TFS/WorkItemTracking/Services",
    "VSS/Authentication/Services",
    "VSS/Controls",
    "VSS/Controls/StatusIndicator",
    "VSS/Controls/Dialogs"
], function (_WorkItemServices, AuthenticationService, Controls, StatusIndicator, Dialogs) {
    // get the WorkItemFormService. 
    // this service allows you to get/set fields/links on the 'active' work item (the work item
    // that currently is displayed in the UI).
    function getWorkItemFormService() {
        return _WorkItemServices.WorkItemFormService.getService();
    }
    getWorkItemFormService().then(function (WorkItemFormService) {
        VSS.getService(VSS.ServiceIds.ExtensionData).then(function (dataService) {
            var pomoTogglTimerGroup = new PomoTogglTimerGroup(WorkItemFormService, AuthenticationService, Controls, StatusIndicator, dataService, Dialogs);
            VSS.register("pomoTogglTimerGroup", pomoTogglTimerGroup);
        });
    });
});
// ready
VSS.ready(function () {
    // get the data service
    VSS.getService(VSS.ServiceIds.ExtensionData).then(function (dataService) {
        var pomoTogglTimerSettings = new PomoTogglTimerSettings(dataService);
        VSS.register("PomoTogglTimerSettings", pomoTogglTimerSettings);
    });
    // notify loaded
    VSS.notifyLoadSucceeded();
});
