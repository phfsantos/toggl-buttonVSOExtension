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
var Notification = window.Notification;
var PomoTogglTimerGroup = (function () {
    function PomoTogglTimerGroup(WorkItemFormService, AuthenticationService, Controls, StatusIndicator, dataService) {
        this.apiKey = "";
        this.pomodoriSize = 25;
        this.pomodoriBreak = 5;
        this.STATE_FIELD = "System.State";
        this.REASON_FIELD = "System.Reason";
        this.authenticationService = AuthenticationService;
        this.workItemFormService = WorkItemFormService;
        this.controls = Controls;
        this.statusIndicator = StatusIndicator;
        this.dataService = dataService;
        this.webContext = VSS.getWebContext();
        this.initializeForm();
    }
    PomoTogglTimerGroup.prototype.initializeForm = function () {
        var _this = this;
        var self = this;
        $("#btnStop").click(function () {
            self.stopCurrentTimer();
        });
        $("#btnStart").click(function () {
            self.startTimer();
        });
        $("#btnDiscard").click(function () {
            self.discardCurrentTimer();
        });
        this.loadAPIKey().then(function () {
            if (_this.apiKey) {
                _this.fetchTogglInformations();
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
    PomoTogglTimerGroup.prototype.fetchTogglInformations = function () {
        var self = this;
        $.ajax({
            url: "./pomoTogglTimer/getUserData",
            data: { apikey: this.apiKey },
            success: function (data) {
                var _this = this;
                self.errorMessage(null);
                var currentTimer = null;
                if (data.time_entries) {
                    currentTimer = data.time_entries.find(function (t) {
                        return t.duration < 0;
                    });
                }
                if (currentTimer) {
                    self.showCurrentTimer(currentTimer);
                }
                else {
                    self.fillDescriptionInfo();
                    self.showInfosFromToggl();
                }
                this.workItemFormService.getFieldValues([
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
                            data: { apikey: _this.apiKey, projectName },
                            success: function (p) {
                                console.log("new project", p);
                                _this.project = p.id;
                            }
                        });
                    }
                    console.log(projectName, togglProject);
                    _this.tags = fields["System.Tags"];
                    console.log(_this.tags);
                });
            },
            error: function (data) {
                self.errorMessage(data.status, data.statusText);
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
                    _this.workItemFormService.setFieldValue(COMPLETED_WORK, completedWork).then(function (success) {
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
    
    PomoTogglTimerGroup.prototype.showCurrentTimer = function (currentTimer) {
        var _this = this;
        $("#startTimer").hide();
        $("#stopTimer").show();
        $("#activeActivityTitle").text(currentTimer.description);
        var start = new Date(currentTimer.start);
        var now = new Date();
        var milliseconds = Math.abs(Number(start) - Number(now));
        $("#activeActivityStartTime").attr("data-timeentryid", currentTimer.id);
        this.timerInterval = setInterval(function () {
            milliseconds += 1000;
            var min = (milliseconds / 1000 / 60) << 0;
            var sec = (milliseconds / 1000) % 60;
            var secZero = sec < 9 ? "0" : "";
            $("#activeActivityStartTime").text(min.toFixed(0) + ":" + secZero + sec.toFixed(0));
            if (min === _this.pomodoriSize) {
                _this.notify("Take a break!", "You completed a pomodori. Take a five minutes break.");
                _this.stopCurrentTimer();
                _this.breakTime();
            }
        }, 1000);
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
                    _this.fetchTogglInformations();
                    $("li[command=\"TogglButton\"]").find("img").attr("src", "https://localhost:43000/images/active-16.png");
                    var authTokenManager = _this.authenticationService.authTokenManager;
                    authTokenManager.getToken().then(function (token) {
                        var header = authTokenManager.getAuthorizationHeader(token);
                        $.ajaxSetup({ headers: { "Authorization": header } });
                        var postData = [{
                                "op": "add",
                                "path": "/fields/System.History",
                                "value": "Toggl.com timer started"
                            }];
                        if (result.nextState) {
                            postData = postData.concat([{
                                    "op": "add",
                                    "path": "/fields/System.State",
                                    "value": result.nextState
                                }]);
                        }
                        this.workItemFormService.getWorkItemResourceUrl(workItemID).then(function (apiURI) {
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
                },
                error: function (err) {
                    alert("Not possible to start the timer. Error " + err.status + ": " + err.statusText);
                }
            });
        });
    };
    PomoTogglTimerGroup.prototype.stopCurrentTimer = function () {
        var _this = this;
        clearInterval(this.timerInterval);
        var settings = {
            url: "./pomoTogglTimer/stopTimer",
            type: "PUT",
            data: { timeEntryId: $("#activeActivityStartTime").data("timeentryid"), apikey: this.apiKey },
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
        $.ajax({
            url: "./pomoTogglTimer/discardTimer",
            type: "DELETE",
            data: { timeEntryId: $("#activeActivityStartTime").data("timeentryid"), apikey: this.apiKey },
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
        this.dataService.getValue("apikey").then(function (currentKey) {
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
    PomoTogglTimerGroup.prototype.fillDescriptionInfo = function () {
        var _this = this;
        this.workItemFormService.getId().then(function (workItemID) {
            _this.workItemFormService.getFieldValue("System.Title").then(function (title) {
                $("#txtDescription").text(title + " (id: " + workItemID + ")");
            });
        });
    };
    PomoTogglTimerGroup.prototype.getFormInputs = function () {
        return {
            activityDescription: $("#txtDescription").text(),
            project: String(this.project),
            tags: this.tags,
            apikey: this.apiKey,
            nextState: $("#chkChangeState").prop("checked") === false ? "" : $("#nextState").html()
        };
    };
    
    PomoTogglTimerGroup.prototype.notify = function (title, body) {
        var options = {
            body,
            badge: "https://vso-toggl-pomo.azurewebsites.net/images/active-16.png",
            icon: "https://vso-toggl-pomo.azurewebsites.net/images/toggl_wide.png",
            vibrate: [200, 100, 200],
            renotify: true,
            requireInteraction: true,
        };
        var notification;
        // let's check if the browser supports notifications
        if (!("Notification" in window)) {
            return false;
        }
        else if (Notification.permission === "granted") {
            // if it's okay let's create a notification
            notification = new Notification(title, options);
        }
        else if (Notification.permission !== "denied") {
            Notification.requestPermission(function (permission) {
                // if the user accepts, let's create a notification
                if (permission === "granted") {
                    notification = new Notification(title, options);
                }
            });
        }
        // finally, if the user has denied notifications and you 
        // want to be respectful there is no need to bother them any more.
        return notification;
    };
    PomoTogglTimerGroup.prototype.breakTime = function () {
        var _this = this;
        var container = $("#startTimer.section");
        var waitControlOptions = {
            cancellable: true,
            cancelTextFormat: "{0} to cancel",
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

//---------------------------------------------------------------------
// <copyright file="TogglButtonForm.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>All logic inside TogglButtonForm</summary>
// ---------------------------------------------------------------------
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
    "VSS/Controls/StatusIndicator"
], function (_WorkItemServices, AuthenticationService, Controls, StatusIndicator) {
    // get the WorkItemFormService. 
    // this service allows you to get/set fields/links on the 'active' work item (the work item
    // that currently is displayed in the UI).
    function getWorkItemFormService() {
        return _WorkItemServices.WorkItemFormService.getService();
    }
    getWorkItemFormService().then(function (WorkItemFormService) {
        VSS.getService(VSS.ServiceIds.ExtensionData).then(function (dataService) {
            var pomoTogglTimerGroup = new PomoTogglTimerGroup(WorkItemFormService, AuthenticationService, Controls, StatusIndicator, dataService);
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

//# sourceMappingURL=pomoTogglTimer.js.map