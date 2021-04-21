/* ----- sp.login.comments.js / START ----- */
try {
    Type.registerNamespace('sp');
} catch (error) {
    window.sp = window.sp || {};
}

sp.login = sp.login || {};
sp.login.comments = (function () {

    /* +++ global variables / START +++ */
    var _webUrl;

    /* +++ global variables / END +++ */

    /* +++ private interface / START +++ */
    function _setup() {

        _webUrl = _spPageContextInfo.webAbsoluteUrl;

        _loadCSS(_webUrl + '/Style Library/Bootstrap/css/bootstrap.css');
        _loadCSS(_webUrl + '/Style Library/sp.login.module/css/sp.login.comments.css');

        _loadScriptResources(function () {

            jQuery("#login-username").val(_spPageContextInfo.userLoginName);
            jQuery("#globalNavBox").hide();
            jQuery(".welcome-content").hide();
            jQuery('#login-comments').show();
        });
    }
    function _loadScriptResources(callback) {

        var layoutsUrl = _webUrl + '/' + _spPageContextInfo.layoutsUrl + '/';

        RegisterSod('sp.ui.dialog.js', layoutsUrl + 'sp.ui.dialog.js');
        RegisterSod('jQuery.js', _webUrl + '/Style Library/jQuery/jquery.min.js');

        RegisterSodDep('jQuery.js', 'sp.ui.dialog.js');

        SP.SOD.executeFunc("jQuery.js", null, callback);
    }
    function _onAuthenticate() {

        var userDetails = {
            "UserName": jQuery("#login-username").val(),
            "Password": jQuery("#login-password").val()
        };
        var serviceUri = _webUrl + "/_vti_bin/LoginService.svc/AuthenticateUser";
        _sendRESTPOST(serviceUri, userDetails, function (response) {

            if (response == false) {
                alert('Password is incorrect');
                return;
            }
            SP.UI.ModalDialog.commonModalDialogClose(SP.UI.DialogResult.OK, null);

        }, function (error) {
            console.log(JSON.stringify(error));
        });
    }
    function _onCancel() {
        // Close Modal dialog
        SP.UI.ModalDialog.commonModalDialogClose(0, 1);
    }
    function _sendRESTPOST(requestUrl, item, successHandler, errorHandler) {
        // POST call to add data into list.
        jQuery.ajax({
            url: requestUrl,
            type: "POST",
            async: false,
            contentType: "application/json;odata=verbose",
            data: JSON.stringify(item),
            headers: {
                "Accept": "application/json;odata=verbose",
                "X-RequestDigest": jQuery("#__REQUESTDIGEST").val()
            },
            success: function (data, textStatus, jqXHR) {
                successHandler(data);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                errorHandler(jqXHR, textStatus, errorThrown);
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
        onCancel: function () {
            _onCancel();
        },
        onAuthenticate: function () {
            _onAuthenticate();
        }
    };

    /* +++ public interface / END +++ */

})();

// Initialize
sp.login.comments.setup();

/* ----- sp.login.comments.js / END ----- */