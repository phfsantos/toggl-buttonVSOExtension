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

let Notification = (<any>window).Notification;

interface ITogglFormResponse {
    activityDescription: string;
    project: string;
    tags: any[];
    apikey: string;
    nextState: string;
}

interface ITogglOpts {
    method: string;
    baseUrl: string;
    token: string;
    crendentials: any;
    onLoad: any;

}

class PomoTogglTimerGroup {
    formChangedCallbacks: any[];
    workItemForm: any;
    authenticationService: any;
    webContext: any;
    togglApiTokenKey: string;
    STATE_FIELD: string = "System.State";
    REASON_FIELD: string = "System.Reason";

    constructor(WorkItemFormService, AuthenticationService) {
        this.authenticationService = AuthenticationService;
        this.workItemForm = WorkItemFormService;
        this.webContext = VSS.getWebContext();
        this.togglApiTokenKey = this.webContext.user.uniqueName + "_togglAPIKey";
        this.initializeForm();
    }

    initializeForm() {
        var self = this;

        $('#btnRefresh').click(function () {
            self.fetchTogglInformations();
        });

        $('#btnStop').click(function () {
            self.stopCurrentTimer();
        });

        $('#btnDiscard').click(function () {
            self.discardCurrentTimer();
        });

        this.loadAPIKey();

        $('#txtAPIKey').on('change', function () {
            self.hideInfosFromToggl();
        });

        if ($('#txtAPIKey').val()) {
            this.fetchTogglInformations();
        }
        else
            this.hideInfosFromToggl();
    };

    setNextState() {
        var nextState = "";
        this.workItemForm.getService().then((workItemFormService) => {
            workItemFormService.getFieldValues([
                this.STATE_FIELD,
                this.REASON_FIELD,
                "System.WorkItemType",
            ]).then((fields) => {
                var currentState = fields[this.STATE_FIELD];

                switch (fields["System.WorkItemType"]) {
                    case 'Product Backlog Item':
                        if (currentState === "Approved") {
                            nextState = "Committed"
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
                            var reason = fields[this.REASON_FIELD];
                            if (reason === "New" || reason === "Investigation Complete")//Agile
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
                        } else if (currentState === "New" || currentState === "Proposed") {
                            nextState = "Active";
                        }
                        break;
                }

                if (nextState) {
                    $('#nextState').html(nextState);
                    $('#changeWIState').show();
                }
            })
        })
    }

    hideInfosFromToggl() {
        $('#startTimer').show();
        $('#project').hide();
        $('#tags').hide();
        $('#changeWIState').hide();
        $('#btnRefresh').show();
    }

    showInfosFromToggl() {
        $('#startTimer').show();
        $('#stopTimer').hide();
        $('#project').show();
        $('#tags').show();
        $('#tagsSelect').chosen();
        $('#btnRefresh').hide();

        this.setNextState();
    }

    fetchTogglInformations() {
        var self = this;
        $.ajax({
            url: './pomoTogglTimer/getUserData',
            data: { apikey: $('#txtAPIKey').val() },
            success: function (data) {
                self.errorMessage(null);
                var currentTimer = null;

                if (data.time_entries) {
                    currentTimer = data.time_entries.find(function (t) { return t.duration < 0; });
                }

                if (currentTimer) {
                    self.showCurrentTimer(currentTimer);
                } else {
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
    updateCompletedTime() {
        console.log("Updating completed time");
        $.ajax({
            url: './pomoTogglTimer/getUserData',
            data: { apikey: $('#txtAPIKey').val() },
            success: (data) => {
                const COMPLETED_WORK = "Microsoft.VSTS.Scheduling.CompletedWork";
                this.workItemForm.getService().then((workItemFormService) => {
                    workItemFormService.getFieldValue(COMPLETED_WORK).then((completedWork) => {
                        let lastTimeEntry = data.time_entries.pop()
                        let hours = lastTimeEntry.duration / 60 / 60; // duration is in seconds
                        completedWork += hours;
                        workItemFormService.setFieldValue(COMPLETED_WORK, completedWork).then((success) => {
                            if (success) {
                                console.log("Updated completed time");
                            } else {
                                console.log("could not update");
                            }
                        }, (err) => {
                            console.log("could not update", err);
                        });
                    }, (err) => {
                        console.log("could not update", err);
                    });
                });
            },
            error: (data) => {
                this.errorMessage(data.status, data.statusText);
            }
        });
    };

    showCurrentTimer(currentTimer: any) {
        $('#startTimer').hide();
        $('#stopTimer').show();
        $('#activeActivityTitle').text(currentTimer.description);
        let start = new Date(currentTimer.start);
        let now = new Date();
        let milliseconds = Math.abs(Number(start) - Number(now));
        $('#activeActivityStartTime').attr('data-timeentryid', currentTimer.id);
        setInterval(() => {
            milliseconds += 1000;
            let min = (milliseconds / 1000 / 60) << 0;
            let sec = (milliseconds / 1000) % 60;

            $('#activeActivityStartTime').text(`${min}:${sec}`);
        }, 1000)
    };

    startTimer() {
        this.workItemForm.getService().then((workItemFormService) => {
            workItemFormService.getID().then((workItemID) => {
                let result = this.getFormInputs();
                $.ajax({
                    url: './pomoTogglTimer/startTimer',
                    type: 'POST',
                    data: result,
                    success: (data) => {
                        alert('Timer started successfully');
                        $('li[command="TogglButton"]').find('img').attr('src', 'https://localhost:43000/images/active-16.png')

                        var authTokenManager = this.authenticationService.authTokenManager;
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

                            workItemFormService.getWorkItemResourceUrl(workItemID).then((apiURI) => {
                                //var apiURI = this.webContext.collection.uri + "_apis/wit/workitems/" + workItemID + "?api-version=1.0";
                                $.ajax({
                                    type: 'PATCH',
                                    url: apiURI,
                                    contentType: 'application/json-patch+json',
                                    data: JSON.stringify(postData),
                                    success(data) {
                                        if (console) console.log('History updated successful');
                                    },
                                    error(error) {
                                        if (console) console.log('Error ' + error.status + ': ' + error.statusText);
                                    }
                                });
                            });
                        });
                    },
                    error: (err) => {
                        alert('Not possible to start the timer. Error ' + err.status + ': ' + err.statusText);
                    }
                });
            });
        })
    }

    stopCurrentTimer() {
        let settings: JQueryAjaxSettings = {
            url: "./pomoTogglTimer/stopTimer",
            type: "PUT",
            data: { timeEntryId: $('#activeActivityStartTime').data('timeentryid'), apikey: $('#txtAPIKey').val() },
            success: (data: any, textStatus: string, jqXHR: JQueryXHR) => {
                this.initializeForm();
                this.updateCompletedTime();
            },
            error: (data) => {
                this.errorMessage(data.status, data.statusText);
            }
        }
        $.ajax(settings);
    };

    discardCurrentTimer() {
        if (!confirm('Do you want to delete this running time entry?'))
            return;

        var self = this;

        $.ajax({
            url: './pomoTogglTimer/discardTimer',
            type: 'DELETE',
            data: { timeEntryId: $('#activeActivityStartTime').data('timeentryid'), apikey: $('#txtAPIKey').val() },
            success: function (data) {
                self.initializeForm();
            },
            error: function (data) {
                self.errorMessage(data.status, data.statusText);
            }
        })
    }

    loadAPIKey() {
        if (localStorage !== undefined) {
            var apiKey = localStorage.getItem(this.togglApiTokenKey);
            if (apiKey)
                $('#txtAPIKey').val(apiKey);
        }
    }

    errorMessage(status: number = 200, message: string = '') {
        var $errorDiv = $('#error');

        $errorDiv.html('');

        if (status != null && status != 200)
            $('#error').html('<p>Error ' + status + ': ' + message + '</p>')
    }

    fillDescriptionInfo() {
        this.workItemForm.getService().then((workItemFormService) => {
            workItemFormService.getID().then((workItemID) => {
                workItemFormService.getFieldValue("System.Title").then((title) => {
                    $('#txtDescription').val(title + " (id: " + workItemID + ")");
                });
            });
        });
    }

    fillTagsInfo(tags) {
        var $tagSelect = $('#tagsSelect');
        $tagSelect.find("option[value!='']").remove();

        tags.forEach(function (tag) {
            var $option = $('<option>', {
                value: tag.name,
                text: tag.name
            });
            $tagSelect.append($option);
        });
    }

    fillProjectsAndClientsInfo(clients, projects) {
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

    getFormInputs(): ITogglFormResponse {
        var $tags = $('#tagsSelect');
        var tags = $tags.val() ? $tags.val().toString() : '';

        return {
            activityDescription: $('#txtDescription').val(),
            project: $('#projectSelect').val(),
            tags: tags,
            apikey: $('#txtAPIKey').val(),
            nextState: $('#chkChangeState').prop('checked') == false ? "" : $('#nextState').html()
        };
    };

    notify(title: string, body: string) {
        let options = {
            body,
            badge: "https://vso-toggl-pomo.azurewebsites.net/images/active-16.png",
            icon: "https://vso-toggl-pomo.azurewebsites.net/images/toggl_wide.png",
            vibrate: [200, 100, 200],
            renotify: true,
            requireInteraction: true,
        }

        // Let's check if the browser supports notifications
        if (!("Notification" in window)) {
            return false;
        }

        // Let's check whether notification permissions have already been granted
        else if (Notification.permission === "granted") {
            // If it's okay let's create a notification
            let notification = new Notification(title, options);
        }

        // Otherwise, we need to ask the user for permission
        else if (Notification.permission !== 'denied') {
            Notification.requestPermission(function (permission) {
                // If the user accepts, let's create a notification
                if (permission === "granted") {
                    let notification = new Notification(title, options);
                }
            });
        }

        // Finally, if the user has denied notifications and you 
        // want to be respectful there is no need to bother them any more.
    }

    onFormChanged(callback) {
        if (this.formChangedCallbacks) {
            this.formChangedCallbacks.push(callback);
        }

    };
}
