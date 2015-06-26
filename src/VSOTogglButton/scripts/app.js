togglButton = (function () {
    "use strict";

    var changeImage = function () {
        var img = $('.menu-item[title=TogglButton]').find('img');

        if (img.length) {
            if (img.attr('src').contains('inactive')) {
                img.attr('src', 'https://togglbtn-vso.azurewebsites.net/images/active-16.png');
            } else if (img.attr('src').contains('active')) {
                img.attr('src', 'https://togglbtn-vso.azurewebsites.net/images/inactive-16.png');
            }
        }
    }

    return {
        execute: function (workItemContext) {
            changeImage();

            $('#container').dialog();
        }
    };
}());

VSS.register('TogglButton', togglButton);