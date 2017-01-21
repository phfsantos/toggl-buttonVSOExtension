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
 
/// <reference path='../ref/jquery.d.ts' />
/// <reference path='../ref/VSS.d.ts' />
/// <reference path='../ref/chosen.d.ts' />

interface ITogglSettingsResponse {
    apikey: string;
    nextState: string;
}

class PomoTogglTimerSettings {
    webContext: any;
    dataService: any;
    togglApiTokenKey: string;
    STATE_FIELD: string = "System.State";
    REASON_FIELD: string = "System.Reason";

    constructor(DataService: any) {
        this.dataService = DataService;
        this.webContext = VSS.getWebContext();
        this.togglApiTokenKey = this.webContext.user.uniqueName + "_togglAPIKey";
        this.loadAPIKey();
        $("#btnSave").click(() => this.saveAPIKey());
    }

    saveAPIKey() {
        var apiKey = $('#txtAPIKey').val();

        if (localStorage !== undefined) {
            var userName = this.webContext.user.uniqueName;
            var currentKey = localStorage.getItem(this.togglApiTokenKey);

            if (currentKey === '' || currentKey != apiKey) {
                localStorage.setItem(this.togglApiTokenKey, apiKey);
            }
        }
    };

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
}

export default PomoTogglTimerSettings;