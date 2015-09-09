/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />

class TogglButtonDialogLauncher {

    constructor(public actionContext: any) {

    }

    launchDialog() {
        var context = this.actionContext;
        var self = this;

        VSS.require(["VSS/Service",
            "TFS/WorkItemTracking/RestClient",
            "TFS/WorkItemTracking/Contracts"],
            function (VSS_Service, TFS_Wit_WebApi, TFS_Wit_Contracts) {
                var witClient = VSS_Service.getCollectionClient(TFS_Wit_WebApi.WorkItemTrackingHttpClient);
                witClient.getWorkItem(context.workItemId, undefined, undefined, TFS_Wit_Contracts.WorkItemExpand.Relations)
                    .then(function (workItem) {
                        VSS.getService("ms.vss-web.dialog-service").then(function (dialogSvc: IHostDialogService) {

                            //The Form!
                            var togglBtnForm: TogglButtonForm;
                            var webContext = VSS.getWebContext();

                            //contribution info
                            var extInfo = VSS.getExtensionContext();
                            var dialogContributionId = extInfo.publisherId + "." + extInfo.extensionId + "." + "TogglButtonForm";

                            var dialogTitle = "Start Timer!";

                            //dialog options
                            var dialogOptions = {
                                title: dialogTitle,
                                width: 400,
                                height: 300,
                                okText: "Start",
                                okCallback: function (result: ITogglFormResponse) {
                                    /// TODO: Call Toggl.com to start the activity
                                    alert('Call toggl.com');
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
                            dialogSvc.openDialog(dialogContributionId, dialogOptions, contributionContext).then(function (dialog: IExternalDialog) {
                                dialog.getContributionInstance("TogglButtonForm").then(function (togglButtonFormInstance: TogglButtonForm) {
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
    }
}