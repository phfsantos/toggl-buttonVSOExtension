var togglButton = (function () {
    "use strict";

    return {
        execute: function (workItemContext) {
            var img = $('.menu-item[title=TogglButton]').find('img');

            if (img.attr('src').contains('inactive')) {
                img.attr('src', 'https://togglbtn-vso.azurewebsites.net/images/active-16.png');
            } else if (img.attr('src').contains('active')) {
                img.attr('src', 'https://togglbtn-vso.azurewebsites.net/images/inactive-16.png');
            }

            alert('toggl!!!!');
        }
    };
}());

VSS.register('TogglButton', togglButton);