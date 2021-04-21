/* ----- sp.login.notification.js / START ----- */
try {
    Type.registerNamespace('sp');
} catch (error) {
    window.sp = window.sp || {};
}

sp.login = sp.login || {};
sp.login.notification = (function () {

    /* +++ global variables / START +++ */
    var _webUrl;
    var _retryCount = 0;
    var _currentUser = '';

    /* +++ global variables / END +++ */

    /* +++ private interface / START +++ */
    function _setup() {

        _webUrl = _spPageContextInfo.webAbsoluteUrl;

        _loadCSS(_webUrl + '/Style Library/Bootstrap/css/bootstrap.css');
        _loadCSS(_webUrl + '/Style Library/sp.login.module/css/sp.login.notification.css');

        _loadScriptResources();

        _waitUntilLoaded(function () {

            _currentUser = window.parent.jQuery('#' + window.parent.ctrlID_UserDisplayName).val();
            _initializePeoplePicker('peoplePickerDiv');

            jQuery("#login-sent-from").val(_currentUser);
            jQuery("#login-title").val(window.parent.jQuery("#" + window.parent.ctrlId_Title).val());
            jQuery("#login-module").html(window.parent.jQuery("#" + window.parent.ctrlID_Module).val());
            jQuery("#globalNavBox").hide();
            jQuery(".welcome-content").hide();
            jQuery(".login-loader").hide();
            jQuery('#login-notification').show();
        });
    }

    function _waitUntilLoaded(callback) {

        setTimeout(function () {

            if (this.SPClientPeoplePicker_InitStandaloneControlWrapper === undefined) {

                _retryCount++;
                if (_retryCount == 10) {

                    callback();
                } else {

                    _waitUntilLoaded(callback);
                }
            } else {

                callback();
            }
        }, 250);
    }

    function _loadScriptResources(callback) {

        var layoutsUrl = _webUrl + '/' + _spPageContextInfo.layoutsUrl + '/';

        RegisterSod('clienttemplates.js', layoutsUrl + 'clienttemplates.js');
        RegisterSod('clientforms.js', layoutsUrl + 'clientforms.js');
        RegisterSod('clientpeoplepicker.js', layoutsUrl + 'clientpeoplepicker.js');
        RegisterSod('autofill.js', layoutsUrl + 'autofill.js');
        RegisterSod('sp.js', layoutsUrl + 'sp.js');
        RegisterSod('sp.runtime.js', layoutsUrl + 'sp.runtime.js');
        RegisterSod('sp.core.js', layoutsUrl + 'sp.core.js');
        RegisterSod('sp.ui.dialog.js', layoutsUrl + 'sp.ui.dialog.js');
        RegisterSod('jQuery.js', _webUrl + '/Style Library/jQuery/jquery.min.js');
        RegisterSod('bootstrap.min.js', _webUrl + '/Style Library/Bootstrap/js/bootstrap.min.js');

        RegisterSodDep('sp.js', 'sp.runtime.js');
        RegisterSodDep('sp.core.js', 'sp.js');

        SP.SOD.executeFunc("clienttemplates.js", null, null);
        SP.SOD.executeFunc("clientforms.js", null, null);
        SP.SOD.executeFunc("clientpeoplepicker.js", null, null);
        SP.SOD.executeFunc("autofill.js", null, null);
        SP.SOD.executeFunc("sp.core.js", null, null);
        SP.SOD.executeFunc("sp.ui.dialog.js", null, null);
        SP.SOD.executeFunc("jQuery.js", null, null);
        SP.SOD.executeFunc("bootstrap.min.js", null, null);
    }

    function _initializePeoplePicker(peoplePickerElementId) {

        // Create a schema to store picker properties, and set the properties
        var schema = {};
        schema['PrincipalAccountType'] = 'User';
        schema['SearchPrincipalSource'] = 15;
        schema['ResolvePrincipalSource'] = 15;
        schema['AllowMultipleValues'] = true;
        schema['MaximumEntitySuggestions'] = 50;

        // Render and initialize the picker
        this.SPClientPeoplePicker_InitStandaloneControlWrapper(peoplePickerElementId, null, schema);
        jQuery('.sp-peoplepicker-topLevel').addClass('form-control');
    }

    function _onSend() {

        var notificationComment = jQuery("#login-notification-comment").val();

        if (notificationComment) {

            var notification = { "comment": "", "sentBy": "", "sendToUserIDs": [], "sendToUsers": [] };
            notification.comment = notificationComment;
            notification.sentBy = _currentUser;

            // Get the people picker object from the page.
            var peoplePicker = this.SPClientPeoplePicker.SPClientPeoplePickerDict.peoplePickerDiv_TopSpan;

            // Get information about all users.
            var users = peoplePicker.GetAllUserInfo();
            if (users.length) {

                jQuery.each(users, function (index, user) {

                    _ensureUser(user.Key).done(function (userDetails) {

                        notification.sendToUserIDs.push(userDetails.d.Id);
                        notification.sendToUsers.push(userDetails.d.Title);

                    }).fail(function (error) {

                        console.log(JSON.stringify(error));
                    });
                });

                SP.UI.ModalDialog.commonModalDialogClose(SP.UI.DialogResult.OK, notification);
            }
        } else {

            alert("Please add Notification comment...!");
        }
    }

    function _onCancel() {
        // Close Modal dialog
        SP.UI.ModalDialog.commonModalDialogClose(0, 1);
    }

    function _ensureUser(accountName) {
        // Ensure added user.
        var payload = {
            'logonName': accountName
        };
        return jQuery.ajax({
            url: _webUrl + "/_api/web/ensureuser",
            async: false,
            type: "POST",
            contentType: "application/json;odata=verbose",
            data: JSON.stringify(payload),
            headers: {
                "X-RequestDigest": $("#__REQUESTDIGEST").val(),
                "accept": "application/json;odata=verbose"
            }
        });
    }

    function _loadCSS(url) {

        var head = document.getElementsByTagName("head")[0];
        var link = document.createElement("link");
        link.setAttribute("rel", "stylesheet");
        link.setAttribute("type", "text/css");
        link.setAttribute("href", url);
        head.appendChild(link);
    }
    /* +++ private interface / END +++ */

    /* +++ public interface / START +++ */

    return {

        setup: function () {
            _setup();
        },
        onSend: function () {
            _onSend();
        },
        onCancel: function () {
            _onCancel();
        }
    };

    /* +++ public interface / END +++ */

})();

// Initialize
sp.login.notification.setup();

/* ----- sp.login.notification.js / END ----- */