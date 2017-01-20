//---------------------------------------------------------------------
// <copyright file="TogglButtonForm.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>All logic inside TogglButtonForm</summary>
//---------------------------------------------------------------------
/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />
/// <reference path='ref/chosen.d.ts' />
var Notification = window.Notification;
var PomoTogglTimerGroup = (function () {
    function PomoTogglTimerGroup(WorkItemFormService, AuthenticationService, Controls, StatusIndicator) {
        this.apiKey = "";
        this.pomodoriSize = 25;
        this.pomodoriBreak = 5;
        this.STATE_FIELD = "System.State";
        this.REASON_FIELD = "System.Reason";
        this.authenticationService = AuthenticationService;
        this.workItemFormService = WorkItemFormService;
        this.controls = Controls;
        this.statusIndicator = StatusIndicator;
        this.webContext = VSS.getWebContext();
        this.togglApiTokenKey = this.webContext.user.uniqueName + "_togglAPIKey";
        this.initializeForm();
    }
    PomoTogglTimerGroup.prototype.initializeForm = function () {
        var self = this;
        $('#btnRefresh').click(function () {
            self.fetchTogglInformations();
        });
        $('#btnStop').click(function () {
            self.stopCurrentTimer();
        });
        $('#btnStart').click(function () {
            self.startTimer();
        });
        $('#btnDiscard').click(function () {
            self.discardCurrentTimer();
        });
        this.loadAPIKey();
        if (this.apiKey) {
            this.fetchTogglInformations();
        }
        else {
            this.hideInfosFromToggl();
        }
    };
    ;
    PomoTogglTimerGroup.prototype.setNextState = function () {
        var _this = this;
        var nextState = "";
        this.workItemFormService.getFieldValues([
            this.STATE_FIELD,
            this.REASON_FIELD,
            "System.WorkItemType",
        ]).then(function (fields) {
            var currentState = fields[_this.STATE_FIELD];
            switch (fields["System.WorkItemType"]) {
                case 'Product Backlog Item':
                    if (currentState === "Approved") {
                        nextState = "Committed";
                    }
                    break;
                case 'User Story':
                case 'Requirement':
                    if (currentState === "New") {
                        nextState = "Active";
                    }
                    break;
                case 'Bug':
                    if (currentState === "New") {
                        var reason = fields[_this.REASON_FIELD];
                        if (reason === "New" || reason === "Investigation Complete")
                            nextState = "Active";
                    }
                    else if (currentState === "Proposed") {
                        nextState = "Active";
                    }
                    else if (currentState === "Approved") {
                        nextState = "Committed";
                    }
                    break;
                case 'Task':
                    if (currentState === "To Do") {
                        nextState = "In Progress";
                    }
                    else if (currentState === "New" || currentState === "Proposed") {
                        nextState = "Active";
                    }
                    break;
            }
            if (nextState) {
                $('#nextState').html(nextState);
                $('#changeWIState').show();
            }
        });
    };
    PomoTogglTimerGroup.prototype.hideInfosFromToggl = function () {
        $('#startTimer').show();
        $('#project').hide();
        $('#tags').hide();
        $('#changeWIState').hide();
        $('#btnRefresh').show();
    };
    PomoTogglTimerGroup.prototype.showInfosFromToggl = function () {
        $('#startTimer').show();
        $('#stopTimer').hide();
        $('#project').show();
        $('#tags').show();
        $('#tagsSelect').chosen();
        $('#btnRefresh').hide();
        this.setNextState();
    };
    PomoTogglTimerGroup.prototype.fetchTogglInformations = function () {
        var self = this;
        $.ajax({
            url: './pomoTogglTimer/getUserData',
            data: { apikey: this.apiKey },
            success: function (data) {
                self.errorMessage(null);
                var currentTimer = null;
                if (data.time_entries) {
                    currentTimer = data.time_entries.find(function (t) { return t.duration < 0; });
                }
                if (currentTimer) {
                    self.showCurrentTimer(currentTimer);
                }
                else {
                    self.fillDescriptionInfo();
                    self.fillTagsInfo(data.tags);
                    self.fillProjectsAndClientsInfo(data.clients, data.projects);
                    self.showInfosFromToggl();
                }
            },
            error: function (data) {
                self.errorMessage(data.status, data.statusText);
            }
        });
    };
    ;
    PomoTogglTimerGroup.prototype.updateCompletedTime = function () {
        var _this = this;
        console.log("Updating completed time");
        $.ajax({
            url: './pomoTogglTimer/getUserData',
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
    ;
    PomoTogglTimerGroup.prototype.showCurrentTimer = function (currentTimer) {
        var _this = this;
        $('#startTimer').hide();
        $('#stopTimer').show();
        $('#activeActivityTitle').text(currentTimer.description);
        var start = new Date(currentTimer.start);
        var now = new Date();
        var milliseconds = Math.abs(Number(start) - Number(now));
        $('#activeActivityStartTime').attr('data-timeentryid', currentTimer.id);
        setInterval(function () {
            milliseconds += 1000;
            var min = (milliseconds / 1000 / 60) << 0;
            var sec = (milliseconds / 1000) % 60;
            $('#activeActivityStartTime').text(min + ":" + sec);
            if (min >= _this.pomodoriSize) {
                _this.notify("Take a break!", "You completed a pomodori. Take a five minutes break.");
                _this.stopCurrentTimer();
                _this.breakTime();
            }
        }, 1000);
    };
    ;
    PomoTogglTimerGroup.prototype.startTimer = function () {
        var _this = this;
        this.workItemFormService.getId().then(function (workItemID) {
            var result = _this.getFormInputs();
            $.ajax({
                url: './pomoTogglTimer/startTimer',
                type: 'POST',
                data: result,
                success: function (data) {
                    alert('Timer started successfully');
                    $('li[command="TogglButton"]').find('img').attr('src', 'https://localhost:43000/images/active-16.png');
                    var authTokenManager = _this.authenticationService.authTokenManager;
                    authTokenManager.getToken().then(function (token) {
                        var header = authTokenManager.getAuthorizationHeader(token);
                        $.ajaxSetup({ headers: { 'Authorization': header } });
                        var postData = [{
                                'op': 'add',
                                'path': '/fields/System.History',
                                'value': 'Toggl.com timer started'
                            }];
                        if (result.nextState) {
                            postData = postData.concat([{
                                    'op': 'add',
                                    'path': '/fields/System.State',
                                    'value': result.nextState
                                }]);
                        }
                        this.workItemFormService.getWorkItemResourceUrl(workItemID).then(function (apiURI) {
                            //var apiURI = this.webContext.collection.uri + "_apis/wit/workitems/" + workItemID + "?api-version=1.0";
                            $.ajax({
                                type: 'PATCH',
                                url: apiURI,
                                contentType: 'application/json-patch+json',
                                data: JSON.stringify(postData),
                                success: function (data) {
                                    if (console)
                                        console.log('History updated successful');
                                },
                                error: function (error) {
                                    if (console)
                                        console.log('Error ' + error.status + ': ' + error.statusText);
                                }
                            });
                        });
                    });
                },
                error: function (err) {
                    alert('Not possible to start the timer. Error ' + err.status + ': ' + err.statusText);
                }
            });
        });
    };
    PomoTogglTimerGroup.prototype.stopCurrentTimer = function () {
        var _this = this;
        var settings = {
            url: "./pomoTogglTimer/stopTimer",
            type: "PUT",
            data: { timeEntryId: $('#activeActivityStartTime').data('timeentryid'), apikey: this.apiKey },
            success: function (data, textStatus, jqXHR) {
                _this.initializeForm();
                _this.updateCompletedTime();
            },
            error: function (data) {
                _this.errorMessage(data.status, data.statusText);
            }
        };
        $.ajax(settings);
    };
    ;
    PomoTogglTimerGroup.prototype.discardCurrentTimer = function () {
        if (!confirm('Do you want to delete this running time entry?'))
            return;
        var self = this;
        $.ajax({
            url: './pomoTogglTimer/discardTimer',
            type: 'DELETE',
            data: { timeEntryId: $('#activeActivityStartTime').data('timeentryid'), apikey: this.apiKey },
            success: function (data) {
                self.initializeForm();
            },
            error: function (data) {
                self.errorMessage(data.status, data.statusText);
            }
        });
    };
    PomoTogglTimerGroup.prototype.loadAPIKey = function () {
        if (localStorage !== undefined) {
            this.apiKey = localStorage.getItem(this.togglApiTokenKey);
        }
    };
    PomoTogglTimerGroup.prototype.errorMessage = function (status, message) {
        if (status === void 0) { status = 200; }
        if (message === void 0) { message = ''; }
        var $errorDiv = $('#error');
        $errorDiv.html('');
        if (status != null && status != 200)
            $('#error').html('<p>Error ' + status + ': ' + message + '</p>');
    };
    PomoTogglTimerGroup.prototype.fillDescriptionInfo = function () {
        var _this = this;
        this.workItemFormService.getId().then(function (workItemID) {
            _this.workItemFormService.getFieldValue("System.Title").then(function (title) {
                $('#txtDescription').val(title + " (id: " + workItemID + ")");
            });
        });
    };
    PomoTogglTimerGroup.prototype.fillTagsInfo = function (tags) {
        var $tagSelect = $('#tagsSelect');
        $tagSelect.find("option[value!='']").remove();
        tags.forEach(function (tag) {
            var $option = $('<option>', {
                value: tag.name,
                text: tag.name
            });
            $tagSelect.append($option);
        });
    };
    PomoTogglTimerGroup.prototype.fillProjectsAndClientsInfo = function (clients, projects) {
        projects = projects.filter(function (project) {
            return project.server_deleted_at == undefined;
        });
        var $projects = $('#projectSelect');
        $projects.find("optGroup").remove();
        //$projects.find("option[value!='']").remove();
        $projects.find("option").remove();
        clients.forEach(function (client) {
            var $optGroup = $('<optGroup>', { label: client.name });
            projects.filter(function (project) {
                return project.cid === client.id;
            }).forEach(function (project) {
                var $opt = $('<option>', {
                    value: project.id,
                    text: project.name
                });
                $optGroup.append($opt);
            });
            $projects.append($optGroup);
        });
        var withoutClients = projects.filter(function (project) {
            return project.cid == undefined;
        });
        if (withoutClients.length > 0) {
            var $optNoClient = $('<optGroup>', { label: 'No client' });
            withoutClients.forEach(function (project) {
                var $opt = $('<option>', {
                    value: project.id,
                    text: project.name
                });
                $optNoClient.append($opt);
            });
            $projects.append($optNoClient);
        }
    };
    ;
    PomoTogglTimerGroup.prototype.getFormInputs = function () {
        var $tags = $('#tagsSelect');
        var tags = $tags.val() ? $tags.val().toString() : '';
        return {
            activityDescription: $('#txtDescription').val(),
            project: $('#projectSelect').val(),
            tags: tags,
            apikey: this.apiKey,
            nextState: $('#chkChangeState').prop('checked') == false ? "" : $('#nextState').html()
        };
    };
    ;
    PomoTogglTimerGroup.prototype.notify = function (title, body) {
        var options = {
            body: body,
            badge: "https://vso-toggl-pomo.azurewebsites.net/images/active-16.png",
            icon: "https://vso-toggl-pomo.azurewebsites.net/images/toggl_wide.png",
            vibrate: [200, 100, 200],
            renotify: true,
            requireInteraction: true
        };
        // Let's check if the browser supports notifications
        if (!("Notification" in window)) {
            return false;
        }
        else if (Notification.permission === "granted") {
            // If it's okay let's create a notification
            var notification = new Notification(title, options);
        }
        else if (Notification.permission !== 'denied') {
            Notification.requestPermission(function (permission) {
                // If the user accepts, let's create a notification
                if (permission === "granted") {
                    var notification = new Notification(title, options);
                }
            });
        }
        // Finally, if the user has denied notifications and you 
        // want to be respectful there is no need to bother them any more.
    };
    PomoTogglTimerGroup.prototype.breakTime = function () {
        var _this = this;
        var container = $("#startTimer.section");
        var waitControlOptions = {
            target: $("#activityTitle.section"),
            cancellable: true,
            cancelTextFormat: "{0} to cancel",
            cancelCallback: function () {
                _this.startTimer();
            }
        };
        var waitControl = this.controls.create(this.statusIndicator.WaitControl, container, waitControlOptions);
        setTimeout(function () {
            _this.notify("Break is over!", "It is time to get back to work.");
        }, this.pomodoriBreak * 60 * 1000);
    };
    PomoTogglTimerGroup.prototype.onFormChanged = function (callback) {
        if (this.formChangedCallbacks) {
            this.formChangedCallbacks.push(callback);
        }
    };
    ;
    return PomoTogglTimerGroup;
})();
//---------------------------------------------------------------------
// <copyright file="TogglButtonForm.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>All logic inside TogglButtonForm</summary>
//---------------------------------------------------------------------
/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />
/// <reference path='ref/chosen.d.ts' />
var PomoTogglTimerSettings = (function () {
    function PomoTogglTimerSettings(DataService) {
        var _this = this;
        this.STATE_FIELD = "System.State";
        this.REASON_FIELD = "System.Reason";
        this.dataService = DataService;
        this.webContext = VSS.getWebContext();
        this.togglApiTokenKey = this.webContext.user.uniqueName + "_togglAPIKey";
        this.loadAPIKey();
        $("#btnSave").click(function () { return _this.saveAPIKey(); });
    }
    PomoTogglTimerSettings.prototype.saveAPIKey = function () {
        var apiKey = $('#txtAPIKey').val();
        if (localStorage !== undefined) {
            var userName = this.webContext.user.uniqueName;
            var currentKey = localStorage.getItem(this.togglApiTokenKey);
            if (currentKey === '' || currentKey != apiKey) {
                localStorage.setItem(this.togglApiTokenKey, apiKey);
            }
        }
    };
    ;
    PomoTogglTimerSettings.prototype.loadAPIKey = function () {
        if (localStorage !== undefined) {
            var apiKey = localStorage.getItem(this.togglApiTokenKey);
            if (apiKey)
                $('#txtAPIKey').val(apiKey);
        }
    };
    PomoTogglTimerSettings.prototype.errorMessage = function (status, message) {
        if (status === void 0) { status = 200; }
        if (message === void 0) { message = ''; }
        var $errorDiv = $('#error');
        $errorDiv.html('');
        if (status != null && status != 200)
            $('#error').html('<p>Error ' + status + ': ' + message + '</p>');
    };
    return PomoTogglTimerSettings;
})();
//---------------------------------------------------------------------
// <copyright file="TogglButtonLauncher.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>Launcher for TogglButton Extension. Handles dialog options</summary>
//---------------------------------------------------------------------
/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />
/// <reference path='PomoTogglTimerGroup.ts' />
var TogglButtonDialogLauncher = (function () {
    function TogglButtonDialogLauncher(actionContext) {
        this.actionContext = actionContext;
    }
    TogglButtonDialogLauncher.prototype.launchDialog = function () {
        var context = this.actionContext;
        var self = this;
        VSS.require(["VSS/Service",
            "TFS/WorkItemTracking/RestClient",
            "TFS/WorkItemTracking/Contracts",
            "VSS/Authentication/Services"], function (VSS_Service, TFS_Wit_WebApi, TFS_Wit_Contracts, AuthenticationService) {
            var witClient = VSS_Service.getCollectionClient(TFS_Wit_WebApi.WorkItemTrackingHttpClient);
            witClient.getWorkItem(context.workItemId, undefined, undefined, TFS_Wit_Contracts.WorkItemExpand.Relations)
                .then(function (workItem) {
                VSS.getService("ms.vss-web.dialog-service").then(function (dialogSvc) {
                    //The Form!
                    var togglBtnForm;
                    var webContext = VSS.getWebContext();
                    //contribution info
                    var extInfo = VSS.getExtensionContext();
                    var dialogContributionId = extInfo.publisherId + "." + extInfo.extensionId + "." + "TogglButtonForm";
                    var dialogTitle = "Start Timer!";
                    //dialog options
                    var dialogOptions = {
                        title: dialogTitle,
                        width: 400,
                        height: 400,
                        okText: "Start",
                        okCallback: function (result) {
                            /// TODO: Call Toggl.com to start the activity
                            console.log('Starting time in toggl.com');
                        },
                        getDialogResult: function () {
                            return togglBtnForm ? togglBtnForm.getFormInputs() : null;
                        }
                    };
                    //set the contribution context, passed into the dialog
                    var contributionContext = {
                        item: context,
                        workItem: workItem
                    };
                    //open dialog, attach form change listeners and ok button anabler listener
                    dialogSvc.openDialog(dialogContributionId, dialogOptions, contributionContext).then(function (dialog) {
                        dialog.getContributionInstance("PomoTogglTimerGroup").then(function (pomoTogglTimerInstance) {
                            togglBtnForm = pomoTogglTimerInstance;
                            togglBtnForm.onFormChanged(function (formInput) {
                                dialog.updateOkButton(formInput.primaryId > 0);
                            });
                            dialog.updateOkButton(true);
                        });
                    });
                });
            });
        });
    };
    return TogglButtonDialogLauncher;
})();
//# sourceMappingURL=vsotogglbutton.js.map