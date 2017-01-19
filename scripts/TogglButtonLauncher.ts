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

class TogglButtonDialogLauncher {
    constructor(public actionContext: any) {

    }

    launchDialog() {
        var context = this.actionContext;
        var self = this;

        VSS.require(["VSS/Service",
            "TFS/WorkItemTracking/RestClient",
            "TFS/WorkItemTracking/Contracts",
            "VSS/Authentication/Services"],
            function(VSS_Service, TFS_Wit_WebApi, TFS_Wit_Contracts, AuthenticationService) {
                var witClient = VSS_Service.getCollectionClient(TFS_Wit_WebApi.WorkItemTrackingHttpClient);
                witClient.getWorkItem(context.workItemId, undefined, undefined, TFS_Wit_Contracts.WorkItemExpand.Relations)
                    .then(function(workItem) {
                        VSS.getService("ms.vss-web.dialog-service").then(function(dialogSvc: IHostDialogService) {

                            //The Form!
                            var togglBtnForm: PomoTogglTimerGroup;
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
                                okCallback: function(result: ITogglFormResponse) {
                                    /// TODO: Call Toggl.com to start the activity
                                    console.log('Starting time in toggl.com');
                                    
                                },
                                getDialogResult: function() {
                                    return togglBtnForm ? togglBtnForm.getFormInputs() : null;
                                }
                            };

                            //set the contribution context, passed into the dialog
                            var contributionContext = {
                                item: context,
                                workItem: workItem
                            };

                            //open dialog, attach form change listeners and ok button anabler listener
                            dialogSvc.openDialog(dialogContributionId, dialogOptions, contributionContext).then(function(dialog: IExternalDialog) {
                                dialog.getContributionInstance("PomoTogglTimerGroup").then(function(pomoTogglTimerInstance: PomoTogglTimerGroup) {
                                    togglBtnForm = pomoTogglTimerInstance;

                                    togglBtnForm.onFormChanged(function(formInput) {
                                        dialog.updateOkButton(formInput.primaryId > 0);
                                    });

                                    dialog.updateOkButton(true);
                                });
                            });
                        });
                    });
            });
    }
}