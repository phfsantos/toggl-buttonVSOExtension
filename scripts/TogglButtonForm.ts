/// <reference path='ref/jquery.d.ts' />
/// <reference path='ref/VSS.d.ts' />
/// <reference path='ref/chosen.d.ts' />

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

class TogglButtonForm {
    formChangedCallbacks: any[];
    workItem: any;
    webContext: any;
    togglApiTokenKey: string;

    constructor(workItem: any) {
        this.webContext = VSS.getWebContext();
        this.workItem = VSS.getConfiguration().workItem;
        this.togglApiTokenKey = this.webContext.user.uniqueName + "_togglAPIKey";
        this.initializeForm();
    }

    initializeForm() {
        var self = this;

        $('#btnRefresh').click(function() {
            self.fetchTogglInformations();
        });

        $('#txtDescription').val(this.workItem.fields["System.Title"] + " (id: " + this.workItem.id + ")");

        this.loadAPIKey();

        $('#txtAPIKey').on('change', function() {
            self.hideInfosFromToggl();
        });

        if ($('#txtAPIKey').val())
            this.fetchTogglInformations();
        else
            this.hideInfosFromToggl();
    };

    hideInfosFromToggl() {
        $('#project').hide();
        $('#tags').hide();
        $('#btnRefresh').show();
    }

    showInfosFromToggl() {
        $('#project').show();
        $('#tags').show();
        $('#tagsSelect').chosen();
        //$('#projectSelect').chosen();

        // Add new tags... need improviment.
        // $('.search-field').find('input').on('change', function(e) { 
        //     var newValue = $('.search-field').find('input').val();
        //     var $tagSelect = $('#tagsSelect');
        //     
        //     if ($tagSelect.find('option[value="' + newValue + '"]').length !== 0)
        //         return;
        //      
        //     $tagSelect.append('<option value="' + newValue + '">' + newValue + '</option>');
        //     $tagSelect.val(newValue);
        //     $tagSelect.trigger("chosen:updated");    
        // });

        $('#btnRefresh').hide();
    }

    fetchTogglInformations() {
        var self = this;
        $.ajax({
            url: './togglButtonForm/getUserData',
            data: { apikey: $('#txtAPIKey').val() },
            success: function(data) {
                self.errorMessage(null);
                self.fillTagsInfo(data.tags);
                self.fillProjectsAndClientsInfo(data.clients, data.projects);
                self.showInfosFromToggl();
                self.saveAPIKey();
            },
            error: function(data) {
                self.errorMessage(data.status, data.statusText);
            }
        });
    };

    saveAPIKey() {
        var apiKey = $('#txtAPIKey').val();

        if (localStorage !== undefined) {
            var userName = this.webContext.user.uniqueName;
            var currentKey = localStorage.getItem(this.togglApiTokenKey);

            if ((currentKey === '' || currentKey != apiKey) && confirm("Do you want to store Toggl API Key for future queries?")) {
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

    fillTagsInfo(tags) {
        var $tagSelect = $('#tagsSelect');
        $tagSelect.find("option[value!='']").remove();

        tags.forEach(function(tag) {
            var $option = $('<option>', {
                value: tag.name,
                text: tag.name
            });
            $tagSelect.append($option);
        });
    }

    fillProjectsAndClientsInfo(clients, projects) {
        projects = projects.filter(function(project) {
				return project.server_deleted_at == undefined;
		});
		
		var $projects = $('#projectSelect');
        $projects.find("optGroup").remove();
        //$projects.find("option[value!='']").remove();
		$projects.find("option").remove();

        clients.forEach(function(client) {
            var $optGroup = $('<optGroup>', { label: client.name });
            projects.filter(function(project) {
                return project.cid === client.id;
            }).forEach(function(project) {
                var $opt = $('<option>', {
                    value: project.id,
                    text: project.name
                });
                $optGroup.append($opt);
            });
            
             $projects.append($optGroup);
        });

        var withoutClients = projects.filter(function(project) {
            return project.cid == undefined;
        });

        if (withoutClients.length > 0) {
            var $optNoClient = $('<optGroup>', {label: 'No client'});

            withoutClients.forEach(function(project) {
                var $opt = $('<option>', {
                    value: project.id,
                    text: project.name
                });
                $optNoClient.append($opt);
            });
            
            $projects.append($optNoClient);
        }
    };

    getFormInputs(): ITogglFormResponse {
        var $tags = $('#tagsSelect');
        var tags = $tags.val() ? $tags.val().toString() : '';

        return {
            activityDescription: $('#txtDescription').val(),
            project: $('#projectSelect').val(),
            tags: tags,
            apikey: $('#txtAPIKey').val()
        };
    };

    onFormChanged(callback) {
        this.formChangedCallbacks.push(callback);

    };
}

//$(document).ready(function () { var togglButtonForm = new TogglButtonForm() });
