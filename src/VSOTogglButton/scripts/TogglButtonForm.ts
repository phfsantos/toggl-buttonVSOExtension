/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />

interface ITogglFormResponse {
    activityDescription: string;
    project: string;
    tags: string;
}


class TogglButtonForm {
    formChangedCallbacks: any[];
    workItem: any;

    constructor(workItem: any) {
        var webContext = VSS.getWebContext();
        this.workItem = VSS.getConfiguration().workItem;

        this.initializeForm();
    }

    initializeForm() {
        var self = this;

        $('#txtDescription').text(this.workItem.fields["System.Title"] + " #" + this.workItem.id);

        $('#projectSelect').change(function () {
            ///TODO - Call toggl.com to receive a list of projects.
        });

        $('#tagsSelect').change(function () {
            ///TODO - Call toggl.com to receive a list of tags.
        });
    }

    getFormInputs() {
        return {
            activityDescription: $('#txtDescription').val(),
            project: $('#projectSelect').val(),
            tags: $('tagsSelect').val()
        };
    }

    onFormChanged(callback) {
        this.formChangedCallbacks.push(callback);

    }
}