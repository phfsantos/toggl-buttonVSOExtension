// ---------------------------------------------------------------------
// <copyright file="TogglButtonForm.ts">
//    this code is licensed under the MIT License.
//    tHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    aNY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    tO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    pARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>All logic inside TogglButtonForm</summary>
// ---------------------------------------------------------------------

/// <reference path='../ref/jquery.d.ts' />
/// <reference path='../ref/VSS.d.ts' />
/// <reference path='../ref/chosen.d.ts' />

let Notification = (<any>window).Notification;

interface ITogglFormResponse {
    activityDescription: string;
    project: string;
    tags: any[];
    apikey: string;
}

interface ITogglOpts {
    method: string;
    baseUrl: string;
    token: string;
    crendentials: any;
    onLoad: any;
}

class PomoTogglTimerGroup {
    apiKey: string = "";
    title: string = "";
    currentTimerId: number;
    workspaceId: number;
    pomodoriSize: number = 25;
    pomodoriBreak: number = 5;
    pomodoriStreak: number = 0;
    formChangedCallbacks: any[];
    workItemFormService: any;
    authenticationService: any;
    controls: any;
    dialogs: any;
    statusIndicator: any;
    dataService: any;
    webContext: any;
    togglApiTokenKey: string;
    timerInterval: number;
    tags: string[];
    project: number;
    STATE_FIELD: string = "System.State";
    REASON_FIELD: string = "System.Reason";

    constructor(WorkItemFormService: any, AuthenticationService: any, Controls: any, StatusIndicator: any, dataService: any, Dialogs: any) {
        this.authenticationService = AuthenticationService;
        this.workItemFormService = WorkItemFormService;
        this.controls = Controls;
        this.statusIndicator = StatusIndicator;
        this.dataService = dataService;
        this.dialogs = Dialogs;
        this.webContext = VSS.getWebContext();
        this.initializeForm();
    }

    initializeForm() {
        // init buttons
        $("#btnStop").off().click(() => this.stopCurrentTimer());
        $("#btnStart").off().click(() => this.startTimer());
        $("#btnDiscard").off().click(() => this.discardCurrentTimer());

        this.loadAPIKey().then(() => {
            if (this.apiKey) {
                this.fetchTogglInformation();
            } else {
                this.hideInfosFromToggl();
            }
        });
    };

    hideInfosFromToggl() {
        $("#startTimer").show();
    }

    showInfosFromToggl() {
        $("#startTimer").show();
        $("#stopTimer").hide();
    }

    fetchTogglInformation() {
        $.ajax({
            url: "./pomoTogglTimer/getUserData",
            data: { apikey: this.apiKey },
            success: (data: any) => {
                this.errorMessage(null);
                var currentTimer = null;

                if (data.time_entries) {
                    currentTimer = data.time_entries.find((t: any) => {
                        return t.duration < 0;
                    });
                }

                if (data.workspaces.length) {
                    this.workspaceId = data.workspaces[0].id;
                }

                if (currentTimer) {
                    if (this.currentTimerId !== currentTimer.id) {
                        this.showCurrentTimer(currentTimer);
                    }
                } else {
                    this.clearCurrentTimer();
                    this.getDescriptionInfo();
                    this.showInfosFromToggl();
                }

                this.workItemFormService.getFieldValues([
                    "System.TeamProject",
                    "System.Tags",
                ]).then((fields) => {
                    let projectName = fields["System.TeamProject"];
                    let togglProject = (<any[]>data.projects).find((p: any) => {
                        return p.name === projectName;
                    });
                    if (togglProject) {
                        this.project = togglProject.id;
                    } else {
                        $.ajax({
                            url: "./pomoTogglTimer/createProject",
                            data: { apikey: this.apiKey, projectName, workspaceId: this.workspaceId  },
                            success: (p) => {
                                this.project = p.id;
                            }
                        });
                    }

                    this.tags = [""];
                    if (fields["System.Tags"]) {
                        this.tags = fields["System.Tags"].split(";");
                    };
                });
            },
            error: (data: any) => {
                this.errorMessage(data.status, data.statusText);
            }
        });
    };
    updateCompletedTime() {
        console.log("Updating completed time");
        $.ajax({
            url: "./pomoTogglTimer/getUserData",
            data: { apikey: this.apiKey },
            success: (data) => {
                const COMPLETED_WORK = "Microsoft.VSTS.Scheduling.CompletedWork";
                this.workItemFormService.getFieldValue(COMPLETED_WORK).then((completedWork) => {
                    let lastTimeEntry = data.time_entries.pop();
                    let hours = lastTimeEntry.duration / 60 / 60; // duration is in seconds
                    completedWork += hours;

                    this.workItemFormService.setFieldValue(COMPLETED_WORK, Number(completedWork).toFixed(2)).then((success) => {
                        if (success) {
                            console.log("Updated completed time");
                            this.workItemFormService.save();
                        } else {
                            console.log("could not update");
                        }
                    }, (err) => {
                        console.log("could not update", err);
                    });
                }, (err) => {
                    console.log("could not update", err);
                });
            },
            error: (data) => {
                this.errorMessage(data.status, data.statusText);
            }
        });
    }

    addPomodoriEntry() {
        this.dataService.getValue("pomodories").then((pomodories) => {
            pomodories = pomodories? pomodories : 0;
            return this.dataService.setValue("pomodories", ++pomodories);
        });
        this.workItemFormService.getId().then((workItemID) => {
            this.dataService.getValue(`${workItemID}-pomodories`).then((pomodories) => {
                pomodories = pomodories? pomodories : 0;
                return this.dataService.setValue(`${workItemID}-pomodories`, ++pomodories);
            });
            var authTokenManager = this.authenticationService.authTokenManager;
            authTokenManager.getToken().then((token: string) => {
                var header = authTokenManager.getAuthorizationHeader(token);
                $.ajaxSetup({
                    headers: {
                        "Authorization": header,
                        "Accept": "application/json; api-version=1.0;",
                    },
                });

                var postData = [{
                    "op": "add",
                    "path": "/fields/System.History",
                    "value": "Completed a pomodori"
                }];

                this.workItemFormService.getWorkItemResourceUrl(workItemID).then((apiURI) => {
                    // var apiURI = this.webContext.collection.uri + "_apis/wit/workitems/" + workItemID + "?api-version=1.0";
                    $.ajax({
                        type: "PATCH",
                        url: apiURI,
                        contentType: "application/json-patch+json",
                        data: JSON.stringify(postData),
                        success() {
                            if (console) {
                                console.log("History updated successful");
                            }
                        },
                        error(error: any) {
                            if (console) {
                                console.log("Error " + error.status + ": " + error.statusText);
                            }
                        }
                    });
                });
            });
        });
    }

    showCurrentTimer(currentTimer: any) {
        this.clearCurrentTimer();
        $("#startTimer").hide();
        $("#stopTimer").show();
        $("#activeActivityTitle").text(currentTimer.description);
        let start = new Date(currentTimer.start);
        let now = new Date();
        let milliseconds = Math.abs(Number(start) - Number(now));
        this.currentTimerId = currentTimer.id;
        this.timerInterval = setInterval(() => {
            milliseconds += 1000;
            let min = (milliseconds / 1000 / 60) << 0;
            let sec = (milliseconds / 1000) % 60;
            let secZero = sec < 10 ? "0" : "";
            $("#activeActivityStartTime").text(`${min.toFixed(0)}:${secZero}${parseInt(String(sec), 10)}`);

            // check if the timer is still on Toggl
            if (sec % 20 === 0) {
                this.fetchTogglInformation();
            }

            if (min === this.pomodoriSize) {
                this.pomodoriStreak++;
                if (this.pomodoriStreak === 4) {
                    this.pomodoriBreak = 15;
                    // reset streak
                    this.pomodoriStreak = 0;
                } else {
                    this.pomodoriBreak = 5;
                }
                this.addPomodoriEntry();
                this.stopCurrentTimer();
                this.notify("Take a break!", `You completed a pomodori. Take ${this.pomodoriBreak} minutes break.`, () => this.breakTime());
            }
        }, 1000);
    }

    clearCurrentTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    startTimer() {
        this.workItemFormService.getId().then((workItemID) => {
            let result = this.getFormInputs();
            $.ajax({
                url: "./pomoTogglTimer/startTimer",
                type: "POST",
                data: result,
                success: (data) => {
                    this.fetchTogglInformation();
                },
                error: (err) => {
                    alert("Not possible to start the timer. Error " + err.status + ": " + err.statusText);
                }
            });
        });
    }

    stopCurrentTimer() {
        this.clearCurrentTimer()
        let settings: JQueryAjaxSettings = {
            url: "./pomoTogglTimer/stopTimer",
            type: "PUT",
            data: { timeEntryId: this.currentTimerId, apikey: this.apiKey },
            success: (data: any, textStatus: string, jqXHR: JQueryXHR) => {
                this.initializeForm();
                this.updateCompletedTime();
            },
            error: (data) => {
                this.errorMessage(data.status, data.statusText);
                clearInterval(this.timerInterval);
            }
        };
        $.ajax(settings);
    };

    discardCurrentTimer() {
        if (!confirm("Do you want to delete this running time entry?")) {
            return;
        }

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        $.ajax({
            url: "./pomoTogglTimer/discardTimer",
            type: "DELETE",
            data: { timeEntryId: this.currentTimerId, apikey: this.apiKey },
            success: (data: any) => {
                this.initializeForm();
            },
            error: (data: any) => {
                this.errorMessage(data.status, data.statusText);
            }
        });
    }

    loadAPIKey() {
        return this.dataService.getValue("apikey").then((currentKey) => {
            return this.apiKey = currentKey;
        });
    }

    errorMessage(status: number = 200, message: string = "") {
        var $errorDiv = $("#error");

        $errorDiv.html("");

        if (status != null && status !== 200) {
            $("#error").html("<p>Error " + status + ": " + message + "</p>");
        }
    }

    getDescriptionInfo() {
        this.workItemFormService.getId().then((workItemID) => {
            this.workItemFormService.getFieldValue("System.Title").then((title) => {
                this.title = workItemID + " - " + title;
            });
        });
    }

    getFormInputs(): ITogglFormResponse {
        return {
            activityDescription: this.title,
            project: String(this.project),
            tags: this.tags,
            apikey: this.apiKey
        };
    };

    notify(title: string, body: string, thenDo: () => void, cancel?: () => void) {
        const dialog = this.dialogs.show(this.dialogs.ModalDialog, {
            title,
            contentText: body,
            resizable: false,
            hideCloseButton: true,
            width: "80%",
            height: "80%",
            buttons: [
                {
                  text: "Ok",
                  icon: "ui-icon-check",
                  click: () => {
                      thenDo();
                      dialog.close();
                  }
                },
                {
                    text: "Cancel",
                    icon: "ui-icon-cancel",
                    click: () => {
                        dialog.close();
                    }
                }
            ],
        });
    }

    breakTime() {
        let container = $("#startTimer.section");
        let waitControlOptions = {
            cancellable: true,
            cancelTextFormat: `${this.pomodoriBreak} minutes break! {0} to skip`,
            cancelCallback: () => {
                this.startTimer();
            }
        };

        var waitControl: any = this.controls.create(this.statusIndicator.WaitControl, container, waitControlOptions);
        waitControl.startWait();

        setTimeout(() => {
            this.notify("Break is over!", "It is time to get back to work.", () => waitControl.endWait(), () => waitControl.endWait());
        }, this.pomodoriBreak * 60 * 1000);
    }

    onFormChanged(callback: Function) {
        if (this.formChangedCallbacks) {
            this.formChangedCallbacks.push(callback);
        }

    };
}

export default PomoTogglTimerGroup;
