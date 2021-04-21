/* ----- sp.login.module.js / START ----- */
try {
    Type.registerNamespace('sp');
} catch (error) {
    window.sp = window.sp || {};
}

sp.login = sp.login || {};
sp.login.module = (function () {

    /* +++ global variables / START +++ */
    var _formModeType = {
        Edit: "Edit",
        New: "New",
        Display: "Display"
    };
    var _webUrl;
    var _webRelativeUrl;
    var _module = "";
    var _title = "";
    var _referenceId = "";
    var _comment = "";
    var _pagesLibraryUrl = '/Pages';
    var _isToBeAuthenticate = '';
    var _notificationData = "";

    /* +++ global variables / END +++ */

    /* +++ private interface / START +++ */
    function _setup() {

        _webUrl = _spPageContextInfo.webAbsoluteUrl;
        _webRelativeUrl = _spPageContextInfo.webServerRelativeUrl;

        NWF.FormFiller.Events.RegisterAfterReady(function () {

            var formMode = NWF$('#' + ctrlID_FormMode).val();

            if (formMode == _formModeType.Edit) {
                // value to store in comment list.
                _module = NWF$('#' + ctrlID_Module).val();
                _title = NWF$('#' + ctrlId_Title).val();
                _referenceId = NWF$('#' + ctrlID_ItemID).val();
                _isToBeAuthenticate = NWF$('#' + ctrlID_IsToBeAuthenticate).val();
            }
        });
    }

    function _showNotification() {

        var requestUrl = _webUrl + _pagesLibraryUrl + "/Notification.aspx";
        _openDialog(requestUrl, "Send Notification", _getNotificationData);
    }

    function _showComment() {

        // Get comment value from control.
        _comment = NWF$('#' + ctrlId_Comment).parent().siblings('input').val().replace(/(<([^>]+)>)/ig, "");

        // Check if comment is null or not , if not then open auth form to allow user to ad  comment.
        if (_comment.length > 1) {

            if (_isToBeAuthenticate == "1") {
                // Add Comments with authentication
                var requestUrl = _webUrl + _pagesLibraryUrl + "/Comments.aspx";
                _openDialog(requestUrl, "Authorise User", _addComments);
            } else {
                _addComments();
            }
        } else {

            alert("Please add comment...!");
        }
    }

    function _getNotificationData(notification) {

        _notificationData = notification;

        if (_isToBeAuthenticate == "1") {

            // Add notification with authentication
            var requestUrl = _webUrl + _pagesLibraryUrl + "/Comments.aspx";
            _openDialog(requestUrl, "Authorise User", _addNotification);

        } else {

            _addNotification();
        }
    }
    function _addNotification() {

        var listTitleNotification = _module + " - Notification";
        var listNotification = _getListIdByTitle(_webUrl, _webRelativeUrl, listTitleNotification);
        if (listNotification.listId) {
            var itemData = {
                __metadata: {
                    type: listNotification.EntityTypeFullName
                }
            };
            itemData["Title"] = _title;
            itemData["Module"] = _module;
            itemData["SentFromId"] = _spPageContextInfo.userId;
            itemData["Reference"] = parseInt(_referenceId, 10);
            itemData["Comments"] = _notificationData.comment;
            itemData["SentToId"] = { 'results': _notificationData.sendToUserIDs };
            itemData["SentDate"] = (new Date()).toISOString();
            var requestUrl = _webUrl + "/_api/web/lists(guid'" + listNotification.listId + "')/items";
            _addDataREST(requestUrl, itemData, function (newRequestData) {

                var commentToUpdate = "Notification sent by " + _notificationData.sentBy + " to " + _notificationData.sendToUsers.join(', ') + "<br/>" + _notificationData.comment;
                _updateListComment(commentToUpdate);

            }, function (error) {

                console.log(JSON.stringify(error));
            });
        }

    }
    function _updateListComment(comment) {

        var listId = jQuery('#' + ctrlID_ListID).val();
        var listEntityType = _getListById(listId);

        if (listEntityType) {

            item = {
                __metadata: {
                    type: listEntityType
                }
            };
            item["Comments"] = comment;
        }

        var requestUri = _webUrl + "/_api/web/lists(guid'" + listId + "')/items(" + parseInt(_referenceId, 10) + ")";

        _updateDataREST(requestUri, item, function (newRequestData) {

            window.location = window.location.href;

        }, function (error) {

            console.log(JSON.stringify(error));
        });
    }

    function _addComments() {
        var itemData = "";
        var listTitleComments = _module + " - Comments";
        var listComments = _getListIdByTitle(_webUrl, _webRelativeUrl, listTitleComments);
        if (listComments.listId) {
            itemData = {
                __metadata: {
                    type: listComments.EntityTypeFullName
                }
            };
            itemData["Title"] = _title;
            itemData["Module"] = _module;
            itemData["CommentAuthorId"] = _spPageContextInfo.userId;
            itemData["Reference"] = parseInt(_referenceId, 10);
            itemData["Comments"] = _comment;
            itemData["CommentDate"] = (new Date()).toISOString();
            var requestUrl = _webUrl + "/_api/web/lists(guid'" + listComments.listId + "')/items";
            _addDataREST(requestUrl, itemData, function (newRequestData) {

                var commentToUpdate = "Comments entered by " + NWF$('#' + ctrlID_UserDisplayName).val() + "<br/>" + _comment;
                _updateListComment(commentToUpdate);

            }, function (error) {
                console.log(JSON.stringify(error));
            });
        }
    }

    function _openDialog(tUrl, tTitle, callback) {

        var options = {
            url: tUrl,
            title: tTitle,
            allowMaximize: true,
            autoSize: false,
            resizable: false,
            scroll: false,
            width: 600,
            height: 550,
            //A function pointer that specifies the return callback function.
            dialogReturnValueCallback: function (result, returnValue) {

                if (result === SP.UI.DialogResult.OK) {
                    callback(returnValue);
                }
            }
        };
        SP.UI.ModalDialog.showModalDialog(options);
        return false;
    }

    function _getListIdByTitle(webUrl, webRelativeUrl, listTitle) {
        // Get required list information. 
        var listInfo = {};
        var requestListByTitle = _webUrl + "/_api/web/lists?$filter=Title eq '" + listTitle + "'";
        _getDataRest(requestListByTitle, function (listData) {
            if (listData.d.results.length) {

                listInfo.listId = listData.d.results[0].Id;
                listInfo.listBaseType = listData.d.results[0].BaseTemplate;
                listInfo.EntityTypeFullName = listData.d.results[0].ListItemEntityTypeFullName;
            } else {

                console.log("List not found with Title: " + listTitle);
            }
        }, function (jqXHR, textStatus, errorThrown) {

            console.log('Error getting list with Title: ' + listTitle + '. Details: ' + errorThrown);
        });

        return listInfo;
    }

    function _getListById(listID) {

        var listInfo = '';

        var requestListByID = _webUrl + "/_api/web/lists(guid'" + listID + "')?$select=ListItemEntityTypeFullName";
        _getDataRest(requestListByID, function (listData) {

            listInfo = listData.d.ListItemEntityTypeFullName;

        }, function (jqXHR, textStatus, errorThrown) {

            console.log('Error getting list with ID: ' + listID + '. Details: ' + errorThrown);
        });

        return listInfo;
    }

    function _addDataREST(requestUrl, item, successHandler, errorHandler) {
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

    function _updateDataREST(requestUrl, item, successHandler, errorHandler) {

        jQuery.ajax({
            url: requestUrl,
            type: "POST",
            async: false,
            contentType: "application/json;odata=verbose",
            data: JSON.stringify(item),
            headers: {
                "IF-MATCH": "*",
                "X-HTTP-Method": "MERGE",
                "Accept": "application/json;odata=verbose",
                "X-RequestDigest": jQuery("#__REQUESTDIGEST").val()
            },
            success: function (data, textStatus, jqXHR) {
                successHandler();
            },
            error: function (jqXHR, textStatus, errorThrown) {
                errorHandler(jqXHR, textStatus, errorThrown);
            }
        });

    }

    function _getDataRest(requestUrl, successHandler, errorHandler) {
        // GET call to fetch data from list.  
        jQuery.ajax({
            url: requestUrl,
            type: "GET",
            async: false,
            headers: {
                "accept": "application/json;odata=verbose"
            },
            success: function (data, textStatus, jqXHR) {
                successHandler(data);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                errorHandler(jqXHR, textStatus, errorThrown);
            }
        });
    }
    /* +++ private interface / END +++ */

    /* +++ public interface / START +++ */

    return {

        setup: function () {
            _setup();
        },
        showComment: function () {
            _showComment();
        },
        showNotification: function () {
            _showNotification();
        }
    };

    /* +++ public interface / END +++ */

})();

// Initialize
sp.login.module.setup();

/* ----- sp.login.module.js / END ----- */