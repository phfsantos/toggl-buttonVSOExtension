/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />

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

class TogglButton {
    $ApiV8Url: string;
    $user: any;

    constructor() {
        this.$ApiV8Url = "https://www.toggl.com/api/v8";

    }

    fetchUser(token: string) {
        this.ajax('/me?with_related_data=true', {
            token: token || ' ',
            baseUrl: this.$ApiV8Url,
            onLoad: function(xhr) {
                
                
            }
            
            
        })

    }
    
    ajax(url: string, opts: any) {
        var xhr = new XMLHttpRequest();
        var method = opts.method || 'GET';
        var baseUrl = opts.baseUrl || this.$ApiV8Url;
        var token = opts.token || (this.$user && this.$$user.api_token);
        var credentials = opts.credentials || null;

        xhr.open(method, baseUrl, true);
        if (opts.onLoad) {
            xhr.addEventListener('load', function() { opts.onLoad(xhr) })
        }

        if (token && token !== ' ') {
            xhr.setRequestHeader('Authorization', 'Basic ' + btoa(token + ':api_token'));
        }

        if (credentials) {
            xhr.setRequestHeader('Authorization', 'Basic ' + btoa(credentials.username + ':' + credentials.password));
        }
        xhr.send(JSON.stringify(opts.payload));
    }

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

        $('#projectSelect').change(function() {
            ///TODO - Call toggl.com to receive a list of projects.
        });

        $('#tagsSelect').change(function() {
            ///TODO - Call toggl.com to receive a list of tags.
        });

        this.fetchTogglInformations();
    };

    fetchTogglInformation() {

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