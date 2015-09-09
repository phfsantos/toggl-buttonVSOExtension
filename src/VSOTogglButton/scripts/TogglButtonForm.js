/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />
var TogglButtonForm = (function () {
    function TogglButtonForm(workItem) {
        var webContext = VSS.getWebContext();
        this.workItem = VSS.getConfiguration().workItem;
        this.initializeForm();
    }
    TogglButtonForm.prototype.initializeForm = function () {
        var self = this;
        $('#txtDescription').text(this.workItem.fields["System.Title"] + " #" + this.workItem.id);
        $('#projectSelect').change(function () {
            ///TODO - Call toggl.com to receive a list of projects.
        });
        $('#tagsSelect').change(function () {
            ///TODO - Call toggl.com to receive a list of tags.
        });
    };
    TogglButtonForm.prototype.getFormInputs = function () {
        return {
            activityDescription: $('#txtDescription').val(),
            project: $('#projectSelect').val(),
            tags: $('tagsSelect').val()
        };
    };
    TogglButtonForm.prototype.onFormChanged = function (callback) {
        this.formChangedCallbacks.push(callback);
    };
    return TogglButtonForm;
})();
//# sourceMappingURL=TogglButtonForm.js.map