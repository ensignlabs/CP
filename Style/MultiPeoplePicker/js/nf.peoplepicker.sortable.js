/* ----- nf.peoplepicker.sortable.js / START ----- */
try {
    Type.registerNamespace('nf');
} catch (error) {
    window.nf = window.nf || {};
}

nf.peoplepicker = nf.peoplepicker || {};
nf.peoplepicker.sortable = (function () {

    /* +++ global variables / START +++ */

    var _formModeType = {
        Edit: "Edit",
        New: "New",
        Display: "Display"
    };
    var _isAdmin = false;

    /* +++ global variables / END +++ */

    /* +++ private interface / START +++ */

    function _setup() {

        NWF.FormFiller.Events.RegisterAfterReady(function () {

            _repositionModal();

            if (typeof ctrlID_AdminGroup !== 'undefined') {

                _isMember(NWF$('#' + ctrlID_AdminGroup).val());
            }

            var formMode = NWF$('#' + ctrlID_FormMode).val();

            NWF$('.mpp-users-panel.nf-filler-control').each(function () {

                if (_isAdmin && formMode != _formModeType.Display) {

                    // Add selected User to Tags
                    var ctrlSelectedUsersId = NWF$(this).find(".mpp-people-select .nf-peoplepicker").attr('id');
                    var ppSelectedUsers = new NF.PeoplePickerApi('#' + ctrlSelectedUsersId);
                    ppSelectedUsers.added(function () {

                        _addUsers(NWF$('#' + ctrlSelectedUsersId));
                    });

                    if (formMode == _formModeType.New) {

                        // Add container for Sortable User tags
                        NWF$(this).find(".mpp-users").html('<ul class="mpp-sortable"></ul>');
                    }

                    if (formMode == _formModeType.Edit) {

                        // Add container for Sortable User tags
                        NWF$(this).find(".mpp-users").html('<ul class="mpp-sortable"></ul>');

                        _renderEditMode(this);
                    }
                }

                if (formMode == _formModeType.Display || !_isAdmin) {

                    // Add container for Sortable User tags
                    NWF$(this).find(".mpp-users").html('<ul class="mpp-sortable read-only"></ul>');

                    if (formMode != _formModeType.New) {
                        _renderDisplayMode(this);
                    }
                }
            });

            if (formMode !== _formModeType.Display && _isAdmin) {

                NWF$('.mpp-sortable').sortable({
                    items: "li:not(.ui-state-disabled)",
                    update: _onSortUpdate
                });

                // Attach click event to remove icon for User tags
                NWF$('.mpp-users-panel.nf-filler-control').on('click', '.mpp-user-remove', function () {

                    var ctrlSortable = NWF$(this).closest('.mpp-sortable');
                    var ctrlUsers = NWF$(this).closest('.mpp-users');

                    NWF$(this).closest("li").remove();
                    _resize(ctrlUsers);
                    _updateValuesByTags(ctrlSortable);

                });
            }

            _fixFormHeightIssue();
        });
    }
    function _repositionModal() {

        NWF$('#mppModal').appendTo("body");
    }
    function _showModal(title, message) {

        NWF$('#mppModal').find('.modal-title').text(title);
        NWF$('#mppModal').find('.modal-body').text(message);
        jQuery('#mppModal').modal();
    }
    function _renderDisplayMode(ctrlPanel) {

        var userNamesValue = _htmlDecode(NWF$(ctrlPanel).find('.mpp-usernames textarea').val());
        var userNames = userNamesValue.split(';').filter(Boolean);

        // Add selected Users as Tags
        _setReadOnlyUserTags(ctrlPanel, userNames);
        // Resize Rich text control for User tags based on it's content
        _resize(NWF$(ctrlPanel).find('.mpp-users'));
    }
    function _renderEditMode(ctrlPanel) {

        var userApprovals = NWF$(ctrlPanel).find('.mpp-userapprovals textarea').val().split(';').filter(Boolean);
        var userIDs = NWF$(ctrlPanel).find('.mpp-userids textarea').val().split(';').filter(Boolean);
        var userLoginNames = NWF$(ctrlPanel).find('.mpp-userloginnames textarea').val().split(';').filter(Boolean);

        // Get Hidden User control
        var ctrlHiddenUsersId = NWF$(ctrlPanel).find(".mpp-people-hidden .nf-peoplepicker").attr('id');
        var ppHiddenUsers = new NF.PeoplePickerApi('#' + ctrlHiddenUsersId);
        ppHiddenUsers.clear();

        _getSelectedUserInfo(userLoginNames, ppHiddenUsers).then(function () {

            // Add selected Users to Hidden User control
            NWF$.each(arguments, function (index, value) {
                ppHiddenUsers.add(value);
            });

            // Add selected Users as Tags
            _setExistingUserTags(ctrlPanel, arguments, userIDs, userApprovals);

            // Resize Rich text control for User tags based on it's content
            _resize(NWF$(ctrlPanel).find('.mpp-users'));
        });
    }
    function _addUsers(ctrlAddUser) {

        var ctrlPanel = NWF$(ctrlAddUser).closest(".mpp-users-panel");
        var userConfirmationId = NWF$(ctrlPanel).find(".mpp-users-confirmation .nf-calculation-control-value").val();
        var ctrlSelectedUsers = NWF$(ctrlPanel).find(".mpp-people-select .nf-peoplepicker");
        var selectedUsersValue = NWF$(ctrlSelectedUsers).val();
        if (selectedUsersValue) {

            var ctrlSelectedUsersId = NWF$(ctrlSelectedUsers).attr('id');
            var ppSelectedUsers = new NF.PeoplePickerApi('#' + ctrlSelectedUsersId);
            var selectedUsers = selectedUsersValue.split(';').filter(Boolean);
            selectedUsers = selectedUsers.map(_fixLoginName);
            var ctrlUsers = NWF$(ctrlPanel).find('.mpp-users');
            var ctrlUserTags = NWF$(ctrlUsers).find('.mpp-sortable li');

            // Display confirmation
            if (userConfirmationId == "0") {

                // Check for duplicate in User Tags
                var checkUserTags = true;
                if (ctrlUserTags.length == 0) {

                    checkUserTags = false;
                }

                for (var i = 0; i < selectedUsers.length; i++) {

                    // Check for duplicate in selected Users
                    if (selectedUsers.indexOf(selectedUsers[i]) == i) {
                        // Check for duplicate in User tags
                        if (checkUserTags) {

                            NWF$(ctrlUserTags).each(function (indexUserTag, userTag) {

                                var tagValue = NWF$(userTag).find('.mpp-user-tag').first().attr("data-value").toLowerCase();
                                if (tagValue == selectedUsers[i].toLowerCase()) {
                                    if (!confirm('User ' + selectedUsers[i] + ' already exist, Do you still want to add this User?')) {

                                        selectedUsers.splice(i, 1);
                                        i--;
                                    }
                                    return false;
                                }
                            });
                        }

                    } else {

                        // Confirm for duplicate User
                        if (!confirm('User ' + selectedUsers[i] + ' already exist, Do you still want to add this User?')) {

                            selectedUsers.splice(i, 1);
                            i--;
                        }
                    }
                }
            }
            // No duplicates
            else if (userConfirmationId == "2") {

                selectedUsers = _getUniqueSelectedUsers(selectedUsers);
                // Iterate through User tags
                NWF$(ctrlUserTags).each(function (indexUserTag, userTag) {

                    var tagValue = NWF$(userTag).find('.mpp-user-tag').first().attr("data-value").toLowerCase();
                    // Iterate through selected Users
                    var lenSelectedUsers = selectedUsers.length;
                    while (lenSelectedUsers) {

                        // Check selected Users agains existing User tags
                        var indexSelectedUser = lenSelectedUsers - 1;
                        if (tagValue == selectedUsers[indexSelectedUser].toLowerCase()) {

                            selectedUsers.splice(indexSelectedUser, 1);
                        }

                        lenSelectedUsers--;
                    }
                });
            }

            if (selectedUsers.length) {

                _getSelectedUserInfo(selectedUsers, ppSelectedUsers).then(function () {

                    // Get Hidden User control
                    var ctrlHiddenUsersId = NWF$(ctrlPanel).find(".mpp-people-hidden .nf-peoplepicker").attr('id');
                    var ppHiddenUsers = new NF.PeoplePickerApi('#' + ctrlHiddenUsersId);
                    // Add selected Users to Hidden User control
                    NWF$.each(arguments, function (index, value) {
                        ppHiddenUsers.add(value);
                    });

                    // Add selected Users as Tags
                    _addUserTags(ctrlPanel, arguments);
                    // Resize Rich text control for User tags based on it's content
                    _resize(ctrlUsers);
                    // Clear People picker control values
                    ppSelectedUsers.clear();
                });
            }
            else {
                // Clear People picker control values
                ppSelectedUsers.clear();
            }

        } else {

            _showModal('Alert', 'Please enter Username');
        }
    }
    function _getUniqueSelectedUsers(selectedUsers) {
        var result = [];
        NWF$.each(selectedUsers, function (i, e) {
            if (NWF$.inArray(e, result) == -1) result.push(e);
        });
        return result;
    }
    function _getSelectedUserInfo(selectedUsers, ppSelectedUsers) {

        var promises = [];

        NWF$.each(selectedUsers, function (index, user) {

            var def = new NWF$.Deferred();

            ppSelectedUsers.search(user).done(function (data) {
                def.resolve(data[0]);
            });

            promises.push(def);
        });

        return NWF$.when.apply(NWF$, promises);
    }
    function _addUserTags(ctrlPanel, selectedUsersDetails) {

        var htmlToGenerate = '';
        var ctrlSortable = NWF$(ctrlPanel).find(".mpp-users .mpp-sortable");
        var userUniqueId = _getUniqueId(ctrlSortable);
        for (var counter = 0; counter < selectedUsersDetails.length; counter++) {

            userUniqueId += 1;
            htmlToGenerate += '<li><span class="mpp-user-tag" data-value="' + selectedUsersDetails[counter].id +

                '" data-type="' + selectedUsersDetails[counter].type +
                '" data-email="' + selectedUsersDetails[counter].email +
                '" data-id="' + userUniqueId +
                '" data-approval="' + 0 + '" >' + selectedUsersDetails[counter].label + '</span><span class="glyphicon glyphicon-remove-circle mpp-user-remove"></span></li>';
        }

        NWF$(ctrlSortable).append(htmlToGenerate);
        _setHiddenFieldValues(ctrlPanel, ctrlSortable);
    }
    function _setExistingUserTags(ctrlPanel, existingUsersDetails, userIDs, userApprovals) {

        var htmlToGenerate = '';
        var approvalStatus = '';

        for (var counter = 0; counter < existingUsersDetails.length; counter++) {

            approvalStatus = '';
            var tagState = '';
            // Apply css class to change tag color as per approval status. 
            if (userApprovals[counter] == "1") {

                approvalStatus = "mpp-inprogress";
                tagState += 'ui-state-disabled';

            } else if (userApprovals[counter] == "2") {

                approvalStatus = "mpp-approved";
                tagState += 'ui-state-disabled';

            } else if (userApprovals[counter] == "3") {

                approvalStatus = "mpp-rejected";
                tagState += 'ui-state-disabled';
            }

            htmlToGenerate += '<li class="' + tagState + '"><span class="mpp-user-tag ' + approvalStatus + '" data-value="' + existingUsersDetails[counter].id +
                '" data-type="' + existingUsersDetails[counter].type +
                '" data-email="' + existingUsersDetails[counter].email +
                '" data-id="' + userIDs[counter] +
                '" data-approval ="' + userApprovals[counter] + '" >' + existingUsersDetails[counter].label + '</span>';

            if (userApprovals[counter] == "0") {
                htmlToGenerate += '<span class="glyphicon glyphicon-remove-circle mpp-user-remove"></span>';
            }
            htmlToGenerate += '</li>';
        }

        var ctrlSortable = NWF$(ctrlPanel).find(".mpp-users .mpp-sortable");
        NWF$(ctrlSortable).append(htmlToGenerate);
    }
    function _setReadOnlyUserTags(ctrlPanel, userNames) {

        var htmlToGenerate = '';
        var approvalStatus = '';
        var userApprovals = NWF$(ctrlPanel).find('.mpp-userapprovals').text().split(";").filter(Boolean);

        NWF$.each(userNames, function (index, userName) {

            approvalStatus = '';

            // Apply css class to change tag color as per approval status
            if (userApprovals[index] == "1") {

                approvalStatus = "mpp-inprogress";

            } else if (userApprovals[index] == "2") {

                approvalStatus = "mpp-approved";

            } else if (userApprovals[index] == "3") {

                approvalStatus = "mpp-rejected";
            }

            htmlToGenerate += '<li><span class="mpp-user-tag ' + approvalStatus + '">' + userName + '</span></li>';
        });

        var ctrlSortable = NWF$(ctrlPanel).find(".mpp-users .mpp-sortable");
        NWF$(ctrlSortable).append(htmlToGenerate);
    }
    function _getUniqueId(ctrlSortable) {

        var maximum = 0;

        NWF$(ctrlSortable).find('li .mpp-user-tag').each(function (index, userTag) {

            var id = NWF$(userTag).attr("data-id");
            if (!isNaN(id) && Number(id) > maximum) {
                maximum = Number(id);
            }
        });

        return maximum;
    }
    function _onSortUpdate(event, ui) {

        _updateValuesByTags(event.target);
    }
    function _updateValuesByTags(ctrlSortable) {

        var updatedUsers = [];
        var data = [];
        var userIDs = [];
        var userNames = [];
        var userLoginNames = [];
        var userApprovals = [];
        // Gather data from Tags
        NWF$(ctrlSortable).find('li .mpp-user-tag').each(function (index, userTag) {

            var id = NWF$(userTag).attr("data-id");
            var loginName = NWF$(userTag).attr("data-value");
            var email = NWF$(userTag).attr("data-email");
            var type = NWF$(userTag).attr("data-type");
            var approval = NWF$(userTag).attr("data-approval");
            var displayName = NWF$(userTag).text();

            userNames.push(displayName);
            userIDs.push(id);
            data.push(id + "::" + displayName + "::" + loginName);
            userLoginNames.push(loginName);
            userApprovals.push(approval);

            updatedUsers.push({ "email": email, "id": loginName, "label": displayName, "title": "", "type": type, "value": loginName });
        });

        // Set hidden control values
        var ctrlPanel = NWF$(ctrlSortable).closest(".mpp-users-panel");
        // NWF$(ctrlPanel).find('.mpp-data textarea').val(data.join(';#'));
        NWF$(ctrlPanel).find('.mpp-userids textarea').val(userIDs.join(';'));
        NWF$(ctrlPanel).find('.mpp-usernames textarea').val(userNames.join(';'));
        NWF$(ctrlPanel).find('.mpp-userloginnames textarea').val(userLoginNames.join(';'));
        NWF$(ctrlPanel).find('.mpp-userapprovals textarea').val(userApprovals.join(';'));

        // Update Hidden people picker
        var ctrlHiddenUsersId = NWF$(ctrlSortable).closest(".mpp-users-panel").find(".mpp-people-hidden .nf-peoplepicker").attr('id');
        var ppHiddenUsers = new NF.PeoplePickerApi("#" + ctrlHiddenUsersId);
        ppHiddenUsers.clear();
        NWF$.each(updatedUsers, function (index, currentUser) {
            ppHiddenUsers.add(currentUser);
        });
    }
    function _setHiddenFieldValues(ctrlPanel, ctrlSortable) {

        var data = [];
        var userIDs = [];
        var userNames = [];
        var userLoginNames = [];
        var userApprovals = [];

        NWF$(ctrlSortable).find('li .mpp-user-tag').each(function (index, userTag) {

            var id = NWF$(userTag).attr("data-id");
            var loginName = NWF$(userTag).attr("data-value");
            var approval = NWF$(userTag).attr("data-approval");
            var displayName = NWF$(userTag).text();
            userNames.push(displayName);
            userIDs.push(id);
            data.push(id + "::" + displayName + "::" + loginName);
            userLoginNames.push(loginName);
            userApprovals.push(approval);
        });

        // NWF$(ctrlPanel).find('.mpp-data textarea').val(data.join(';#'));
        NWF$(ctrlPanel).find('.mpp-userids textarea').val(userIDs.join(';'));
        NWF$(ctrlPanel).find('.mpp-usernames textarea').val(userNames.join(';'));
        NWF$(ctrlPanel).find('.mpp-userloginnames textarea').val(userLoginNames.join(';'));
        NWF$(ctrlPanel).find('.mpp-userapprovals textarea').val(userApprovals.join(';'));
    }
    // Nintex Form events to fix issue with Form height
    function _fixFormHeightIssue() {

        NWF.FormFiller.Events.RegisterControlShowHidePropagating(function () {
            "use strict";
            outerDiv.data("outerDivHeight", outerDiv.height());
        });

        NWF.FormFiller.Events.RegisterControlShowHidePropagated(function () {
            "use strict";
            if (arguments[0].data("RepositionControls") === true && outerDiv.data("outerDivHeight") !== outerDiv.height()) {
                outerDiv.outerHeight(outerDiv.height());
                outerDiv.data("outerDivHeight", outerDiv.height());
            }
        });

        NWF.FormFiller.Events.RegisterControlHeightChangePropagated(function () {
            "use strict";
            outerDiv.outerHeight(outerDiv.height());
        });

        NWF.FormFiller.Events.RegisterAfterReady(function () {
            "use strict";
            outerDiv.outerHeight(outerDiv.height());
        });
    }
    // Fix issue with vertical spacing between Data Tables and controls below it due to dynamic content rendering for Data Tables
    function _resize(ctrlUsers) {

        var formFillerDivCurrent = NWF.FormFiller.Functions.GetFormFillerDiv();
        var topUserTags = NWF$(ctrlUsers).position().top;
        var nextElement = NWF$(ctrlUsers).next();
        //var nextTop = NWF$(nextElement).position().top;
        var nextTop = NWF$(nextElement).css('top').replace('px', '');
        var currentHeight = 0;
        NWF$(ctrlUsers).children().each(function () {
            currentHeight = currentHeight + NWF$(this).outerHeight(true);
        });
        var heightIncrease = currentHeight - (nextTop - topUserTags);
        NWF.FormFiller.Resize.RepositionAndResizeOtherControlsAndFillerContainerHeight(
            ctrlUsers,
            heightIncrease,
            heightIncrease,
            formFillerDivCurrent
        );
    }
    function _fixLoginName(userLoginName) {

        var index = userLoginName.lastIndexOf('|');
        if (index >= 0) {
            userLoginName = userLoginName.substring(index + 1);
        }

        return userLoginName;
    }
    function _isMember(groupName) {

        jQuery.ajax({
            url: _spPageContextInfo.webAbsoluteUrl + "/_api/web/sitegroups/getByName('" + groupName + "')/Users?$filter=Id eq " + _spPageContextInfo.userId,
            async: false,
            method: "GET",
            headers: { "Accept": "application/json; odata=verbose" },
            success: function (data) {
                if (data.d.results.length) {

                    _isAdmin = true;
                }
            }
        });
    }
    function _isUserCanManageWeb() {
        var hasPermission = "";
        var ctx = new SP.ClientContext.get_current();
        var web = ctx.get_web();

        var ob = new SP.BasePermissions();
        ob.set(SP.PermissionKind.manageWeb);
        ob.set(SP.PermissionKind.managePermissions);

        var per = web.doesUserHavePermissions(ob);
        ctx.executeQueryAsync(
            function () {
                hasPermission = per.get_value();
            },
            function (a, b) {
                alert("Something wrong");
            }
        );
        return hasPermission;
    }
    function _htmlDecode(value) {

        return NWF$('<div/>').html(value).text();
    }

    /* +++ private interface / END +++ */

    /* +++ public interface / START +++ */

    return {

        setup: function () {
            _setup();
        },
        renderEditMode: function (ctrlPanel) {
            _renderEditMode(ctrlPanel);
        },
        renderDisplayMode: function (ctrlPanel) {
            _renderDisplayMode(ctrlPanel);
        }

    };

    /* +++ public interface / END +++ */

})();

// Initialize
nf.peoplepicker.sortable.setup();
/* ----- nf.peoplepicker.sortable.js / END ----- */