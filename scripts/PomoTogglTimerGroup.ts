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
    workItem: any;
    webContext: any;
    togglApiTokenKey: string;
    STATE_FIELD: string = "System.State";
    REASON_FIELD: string = "System.Reason";

    constructor(workItem: any) {
        this.webContext = VSS.getWebContext();
        this.togglApiTokenKey = this.webContext.user.uniqueName + "_togglAPIKey";
        this.initializeForm();
    }

    initializeForm() {
        var self = this;

        $('#btnRefresh').click(function() {
            self.fetchTogglInformations();
        });

        $('#btnStop').click(function() {
            self.stopCurrentTimer();
        });

        $('#btnDiscard').click(function() {
            self.discardCurrentTimer();
        });

        this.loadAPIKey();

        $('#txtAPIKey').on('change', function() {
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
        var currentState = this.workItem.fields[this.STATE_FIELD];
        switch (this.workItem.fields["System.WorkItemType"]) {
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
                    var reason = this.workItem.fields[this.REASON_FIELD];
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
            success: function(data) {
                self.errorMessage(null);
                var currentTimer = null;
                
                if (data.time_entries) {
                    currentTimer = data.time_entries.find(function(t) { return t.duration < 0; });
                }
                
                if (currentTimer) {
                    self.showCurrentTimer(currentTimer);
                } else {
                    self.fillTagsInfo(data.tags);
                    self.fillProjectsAndClientsInfo(data.clients, data.projects);
                    self.showInfosFromToggl();
                }
            },
            error: function(data) {
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
                VSS.require(["TFS/WorkItemTracking/Services"], function (_WorkItemServices) {
                    // Get the WorkItemFormService.  This service allows you to get/set fields/links on the 'active' work item (the work item
                    // that currently is displayed in the UI).
                    function getWorkItemFormService() {
                        return _WorkItemServices.WorkItemFormService.getService();
                    }

                    getWorkItemFormService().then(function(service) {            
                        // Get the current values for a few of the common fields
                        service.getFieldValue(COMPLETED_WORK).then( (completedWork) => {
                            let lastTimeEntry = data.time_entries.pop()
                            let hours = lastTimeEntry.duration/60/60; // duration is in seconds
                            completedWork += hours;
                            service.setFieldValue(COMPLETED_WORK, completedWork).then( (success) => {
                                if (success) {
                                    console.log("Updated completed time");
                                }else{
                                    console.log("could not update");  
                                }
                            }, (err) => {
                                console.log("could not update", err);
                            });
                        }, (err) => {
                            console.log("could not update", err);
                        }); 
                
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
        $('#activeActivityStartTime').text(new Date(currentTimer.start).toLocaleString())
            .attr('data-timeentryid', currentTimer.id);
    };

    startTimer(){
        VSS.require([
            "TFS/WorkItemTracking/Services",
            "VSS/Authentication/Services"
        ], (_WorkItemServices, AuthenticationService) => {
            // Get the WorkItemFormService.  This service allows you to get/set fields/links on the 'active' work item (the work item
            // that currently is displayed in the UI).
            function getWorkItemFormService() {
                return _WorkItemServices.WorkItemFormService.getService();
            }

        getWorkItemFormService().then((service) => {
                // Get the current values for a few of the common fields
                service.getID().then((workItemID) => {
                    let result = this.getFormInputs();
                    $.ajax({
                        url: './pomoTogglTimer/startTimer',
                        method: 'POST',
                        data: result,
                        success: function(data) {
                            alert('Timer started successfully');
                            $('li[command="TogglButton"]').find('img').attr('src', 'https://localhost:43000/images/active-16.png')
                            
                            var authTokenManager = AuthenticationService.authTokenManager;
                            authTokenManager.getToken().then(function (token){
                                var header = authTokenManager.getAuthorizationHeader(token);
                                $.ajaxSetup({headers: {'Authorization': header}});
                                
                                var postData = [{
                                    'op': 'add',
                                    'path': '/fields/System.History',
                                    'value': 'Toggl.com timer started'
                                }];
                                
                                if (result.nextState){
                                    postData = postData.concat([{
                                        'op': 'add',
                                        'path': '/fields/System.State',
                                        'value': result.nextState
                                    }]);
                                }

                                service.getWorkItemResourceUrl(workItemID).then((apiURI)=>{
                                    //var apiURI = this.webContext.collection.uri + "_apis/wit/workitems/" + workItemID + "?api-version=1.0";
                                    $.ajax({
                                        type: 'PATCH',
                                        url: apiURI,
                                        contentType: 'application/json-patch+json',
                                        data: JSON.stringify(postData),
                                        success(data){
                                            if (console) console.log('History updated successful');
                                        },
                                        error(error){
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
            });
        });
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
            method: 'DELETE',
            data: { timeEntryId: $('#activeActivityStartTime').data('timeentryid'), apikey: $('#txtAPIKey').val() },
            success: function(data) {
                self.initializeForm();
            },
            error: function(data) {
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

    fillDescriptionInfo(){
        VSS.require([
            "TFS/WorkItemTracking/Services",
            "VSS/Authentication/Services"
        ], (_WorkItemServices, AuthenticationService) => {
            // Get the WorkItemFormService.  This service allows you to get/set fields/links on the 'active' work item (the work item
            // that currently is displayed in the UI).
            function getWorkItemFormService() {
                return _WorkItemServices.WorkItemFormService.getService();
            }

            getWorkItemFormService().then((service) => {
                // Get the current values for a few of the common fields
                service.getID().then((workItemID) => {
                    service.getFieldValue("System.Title").then((title) => {
                         $('#txtDescription').val(title + " (id: " + workItemID + ")");
                    });
                });
            });
        });
    }

    fillTagsInfo(tags) {
        var $tagSelect = $('#tagsSelect');
        $tagSelect.find("option[value!='']").remove();

        tags.forEach(function(tag) {
            var $option = $('<option>', {
                value: tag.name,
                text: tag.name
            });
            $tagSelect.append($option);
        });
    }

    fillProjectsAndClientsInfo(clients, projects) {
        projects = projects.filter(function(project) {
            return project.server_deleted_at == undefined;
        });

        var $projects = $('#projectSelect');
        $projects.find("optGroup").remove();
        //$projects.find("option[value!='']").remove();
        $projects.find("option").remove();

        clients.forEach(function(client) {
            var $optGroup = $('<optGroup>', { label: client.name });
            projects.filter(function(project) {
                return project.cid === client.id;
            }).forEach(function(project) {
                var $opt = $('<option>', {
                    value: project.id,
                    text: project.name
                });
                $optGroup.append($opt);
            });

            $projects.append($optGroup);
        });

        var withoutClients = projects.filter(function(project) {
            return project.cid == undefined;
        });

        if (withoutClients.length > 0) {
            var $optNoClient = $('<optGroup>', { label: 'No client' });

            withoutClients.forEach(function(project) {
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

    onFormChanged(callback) {
        if (this.formChangedCallbacks) {
            this.formChangedCallbacks.push(callback);
        }

    };
}
