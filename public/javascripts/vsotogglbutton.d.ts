/// <reference path="../../scripts/ref/jquery.d.ts" />
/// <reference path="../../scripts/ref/VSS.d.ts" />
interface ITogglFormResponse {
    activityDescription: string;
    project: string;
    tags: string;
}
interface ITogglOpts {
    method: string;
    baseUrl: string;
    token: string;
    crendentials: any;
    onLoad: any;
}
declare class TogglButton {
    $ApiV8Url: string;
    $user: any;
    constructor();
    fetchUser(token: string): void;
    ajax(url: string, opts: any): void;
}
declare class TogglButtonForm {
    formChangedCallbacks: any[];
    workItem: any;
    constructor(workItem: any);
    initializeForm(): void;
    fetchTogglInformations(): void;
    getFormInputs(): {
        activityDescription: any;
        project: any;
        tags: any;
    };
    onFormChanged(callback: any): void;
}
declare class TogglButtonDialogLauncher {
    actionContext: any;
    constructor(actionContext: any);
    launchDialog(): void;
}
declare var togglButtonHandler: {
    execute: (actionContext: any) => void;
};
