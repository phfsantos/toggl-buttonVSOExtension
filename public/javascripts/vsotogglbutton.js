/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />
/// <reference path='ref/chosen.d.ts' />
var TogglButtonForm = (function () {
    function TogglButtonForm(workItem) {
        this.webContext = VSS.getWebContext();
        this.workItem = VSS.getConfiguration().workItem;
        this.togglApiTokenKey = this.webContext.user.uniqueName + "_togglAPIKey";
        this.initializeForm();
    }
    TogglButtonForm.prototype.initializeForm = function () {
        var self = this;
        $('#btnRefresh').click(function () {
            self.fetchTogglInformations();
        });
        $('#txtDescription').val(this.workItem.fields["System.Title"] + " (id: " + this.workItem.id + ")");
        this.loadAPIKey();
        $('#txtAPIKey').on('change', function () {
            self.hideInfosFromToggl();
        });
        if ($('#txtAPIKey').val())
            this.fetchTogglInformations();
        else
            this.hideInfosFromToggl();
    };
    ;
    TogglButtonForm.prototype.hideInfosFromToggl = function () {
        $('#project').hide();
        $('#tags').hide();
        $('#btnRefresh').show();
    };
    TogglButtonForm.prototype.showInfosFromToggl = function () {
        $('#project').show();
        $('#tags').show();
        $('#tagsSelect').chosen();
        //$('#projectSelect').chosen();
        // Add new tags... need improviment.
        // $('.search-field').find('input').on('change', function(e) { 
        //     var newValue = $('.search-field').find('input').val();
        //     var $tagSelect = $('#tagsSelect');
        //     
        //     if ($tagSelect.find('option[value="' + newValue + '"]').length !== 0)
        //         return;
        //      
        //     $tagSelect.append('<option value="' + newValue + '">' + newValue + '</option>');
        //     $tagSelect.val(newValue);
        //     $tagSelect.trigger("chosen:updated");    
        // });
        $('#btnRefresh').hide();
    };
    TogglButtonForm.prototype.fetchTogglInformations = function () {
        var self = this;
        $.ajax({
            url: './togglButtonForm/getUserData',
            data: { apikey: $('#txtAPIKey').val() },
            success: function (data) {
                self.errorMessage(null);
                self.fillTagsInfo(data.tags);
                self.fillProjectsAndClientsInfo(data.clients, data.projects);
                self.showInfosFromToggl();
                self.saveAPIKey();
            },
            error: function (data) {
                self.errorMessage(data.status, data.statusText);
            }
        });
    };
    ;
    TogglButtonForm.prototype.saveAPIKey = function () {
        var apiKey = $('#txtAPIKey').val();
        if (localStorage !== undefined) {
            var userName = this.webContext.user.uniqueName;
            var currentKey = localStorage.getItem(this.togglApiTokenKey);
            if ((currentKey === '' || currentKey != apiKey) && confirm("Do you want to store Toggl API Key for future queries?")) {
                localStorage.setItem(this.togglApiTokenKey, apiKey);
            }
        }
    };
    ;
    TogglButtonForm.prototype.loadAPIKey = function () {
        if (localStorage !== undefined) {
            var apiKey = localStorage.getItem(this.togglApiTokenKey);
            if (apiKey)
                $('#txtAPIKey').val(apiKey);
        }
    };
    TogglButtonForm.prototype.errorMessage = function (status, message) {
        if (status === void 0) { status = 200; }
        if (message === void 0) { message = ''; }
        var $errorDiv = $('#error');
        $errorDiv.html('');
        if (status != null && status != 200)
            $('#error').html('<p>Error ' + status + ': ' + message + '</p>');
    };
    TogglButtonForm.prototype.fillTagsInfo = function (tags) {
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
    TogglButtonForm.prototype.fillProjectsAndClientsInfo = function (clients, projects) {
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
    TogglButtonForm.prototype.getFormInputs = function () {
        var $tags = $('#tagsSelect');
        var tags = $tags.val() ? $tags.val().toString() : '';
        return {
            activityDescription: $('#txtDescription').val(),
            project: $('#projectSelect').val(),
            tags: tags,
            apikey: $('#txtAPIKey').val()
        };
    };
    ;
    TogglButtonForm.prototype.onFormChanged = function (callback) {
        this.formChangedCallbacks.push(callback);
    };
    ;
    return TogglButtonForm;
})();
//$(document).ready(function () { var togglButtonForm = new TogglButtonForm() });
/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />
/// <reference path='TogglButtonForm.ts' />
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
                            $.ajax({
                                url: './togglButtonForm/startTimer',
                                method: 'POST',
                                data: result,
                                success: function (data) {
                                    alert('Timer started successfully');
                                    $('li[command="TogglButton"]').find('img').attr('src', 'https://localhost:43000/images/active-16.png');
                                    var authTokenManager = AuthenticationService.authTokenManager;
                                    authTokenManager.getToken()
                                        .then(function (token) {
                                        var header = authTokenManager.getAuthorizationHeader(token);
                                        $.ajaxSetup({ headers: { 'Authorization': header } });
                                        var postData = [{
                                                'op': 'add',
                                                'path': '/fields/System.History',
                                                'value': 'Toggl.com timer started'
                                            }];
                                        var apiURI = webContext.collection.uri + "_apis/wit/workitems/" + workItem.id + "?api-version=1.0";
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
                                },
                                error: function (err) {
                                    alert('Not possible to start the timer. Error ' + err.status + ': ' + err.statusText);
                                }
                            });
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
                        dialog.getContributionInstance("TogglButtonForm").then(function (togglButtonFormInstance) {
                            togglBtnForm = togglButtonFormInstance;
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
/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />
/// <reference path='TogglButtonLauncher.ts' />
VSS.init({
    usePlatformScripts: true,
    usePlatformStyles: true
});
var togglButtonHandler = (function () {
    "use strict";
    return {
        execute: function (actionContext) {
            var launcher = new TogglButtonDialogLauncher(actionContext);
            launcher.launchDialog();
        }
    };
}());
VSS.register("TogglButton", togglButtonHandler);
//# sourceMappingURL=vsotogglbutton.js.map