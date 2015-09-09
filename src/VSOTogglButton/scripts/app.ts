/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />
/// <reference path='TogglButtonLauncher.ts' />


VSS.init(
    {
        usePlatformScripts: true,
        usePlatformStyles: true
    }
);

var togglButtonHandler = (function () {
    "use strict";

    return {
        execute: function (actionContext: any) {
            var launcher = new TogglButtonDialogLauncher(actionContext);
            launcher.launchDialog();
        }
    }
} ());


VSS.register("TogglButton", togglButtonHandler);

