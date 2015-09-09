/// <reference path="../sdk/scripts/VSS.SDK.js" />

//var TogglButton = (function () {

//    var TogglButton = function () { };


//    TogglButton.prototype.execute = function (actionContext) {
//        this.actionContext = actionContext;
//        this.showDialog();
//    };

//    TogglButton.prototype.showDialog = function () {
//        var _this = this;

//        VSS.getService("vss.dialogs").then(function (dialogSvc) {
//            var createTogglDialog;
//            var controlContributionInfo = {
//                id: "togglButtonDialog",
//                extensionId: VSS.getExtensionContext().id,
//                pointId: VSS.getExtensionContext().namespace + "#dialog"
//            };

//            var callBack = new TogglButtonHandler(_this.actionContext).dialogCallback;

//            var dialogOptions = {
//                title: "Toggl Button",
//                draggable: false,
//                modal: true,
//                okText: "Start",
//                cancelText: "Cancel",
//                okCallback: callBack,
//                getDialogResult: function () {
//                    return;
//                }
//            };

//            dialogSvc.openDialog(controlContributionInfo, dialogOptions).then(function (dialog) {
//                dialog.getContribitionInstance("createTogglDialog").then(function (togglButtonDialogInstance) {
//                    togglButtonDialog = togglButtonDialogInstance;

//                });
//            });
//        });
//    }
//    return TogglButton;
//})();

VSS.register("TogglButton", function (context) {
    //return new TogglButton();
});