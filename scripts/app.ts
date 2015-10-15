/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />
/// <reference path='TogglButtonLauncher.ts' />

 //---------------------------------------------------------------------
 // <copyright file="app.ts">
 //    This code is licensed under the MIT License.
 //    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
 //    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
 //    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
 //    PARTICULAR PURPOSE AND NONINFRINGEMENT.
 // </copyright>
 // <summary>The "main" method of extension, handle extension call and lauch the dialog.</summary>
 //---------------------------------------------------------------------


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

