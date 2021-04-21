/* ----- lookup.multilist.duplicate.js / START ----- */
try {
    Type.registerNamespace('lookup');
} catch (error) {
    window.lookup = window.lookup || {};
}

lookup.multilist = lookup.multilist || {};
lookup.multilist.duplicate = (function () {

    /* +++ global variables / START +++ */

    var _webUrl = '';

    /* +++ global variables / END +++ */

    /* +++ private interface / START +++ */
    function _setup() {

        _webUrl = _spPageContextInfo.webAbsoluteUrl;

        _loadCSS(_webUrl + '/Style Library/MultiListLookup/css/lookup.multilist.duplicate.css');

        _loadScriptResources(function () {

            _showDuplicateItemLinks();
            _autoSizeDialog();
        });
    }
    function _loadScriptResources(callback) {

        var layoutsUrl = _webUrl + '/' + _spPageContextInfo.layoutsUrl + '/';

        RegisterSod('sp.ui.dialog.js', layoutsUrl + 'sp.ui.dialog.js');
        RegisterSod('jQuery.js', _webUrl + '/Style Library/jQuery/jquery.min.js');

        RegisterSodDep('jQuery.js', 'sp.ui.dialog.js');

        SP.SOD.executeFunc("jQuery.js", null, callback);
    }
    function _onCancel() {

        SP.UI.ModalDialog.commonModalDialogClose(SP.UI.DialogResult.cancel, null);
    }
    function _onSubmit() {

        SP.UI.ModalDialog.commonModalDialogClose(SP.UI.DialogResult.OK, null);
    }
    function _showDuplicateItemLinks() {

        var itemLinks = "";
        var data = SP.UI.ModalDialog.get_childDialog().get_args();

        jQuery('.mll-dup-msg').html(data.message);

        jQuery.each(data.duplicateItems, function (index, item) {

            itemLinks += '<li><a href="' + item.itemUrl + '" target="_blank">' + item.title + '</a></li>';
        });

        jQuery(".mll-dup-items").html(itemLinks);
    }
    function _autoSizeDialog() {
        // Resize dialog if we are in one
        var dlg = SP.UI.ModalDialog.get_childDialog();
        if (dlg != null) {
            dlg.autoSize();
        }
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
        onSubmit: function () {

            _onSubmit();
        }
    };

    /* +++ public interface / END +++ */

})();

// Initialize
lookup.multilist.duplicate.setup();
/* ----- lookup.multilist.duplicate.js / END ----- */