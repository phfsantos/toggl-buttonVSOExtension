/// <reference path="../sdk/scripts/VSS.SDK.js" />

//var TogglButtonHandler = (function (_super) {
//    this.dialogCallback = function (context) {
//        alert('dialogCallback WorkItemId' + context.id);
//    }
//    return TogglButtonHandler;
//})();


VSS.register("togglButtonDialog", function (context) {
    //return new TogglButtonHandler();
});

VSS.notifyLoadSucceeded();