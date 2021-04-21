/* ----- nf.proposals.form.js / START ----- */
try {
    Type.registerNamespace('nf');
} catch (error) {
    window.nf = window.nf || {};
}

nf.proposals = nf.proposals || {};

nf.proposals.form = (function () {

    /* +++ global variables / START +++ */

    var _formModeType = {
        Edit: "Edit",
        New: "New",
        Display: "Display"
    };
    var _taskOutcome = {
        Pending: "Pending",
        Approve: "Approve",
        Reject: "Reject"
    };
    var _formMode = "";
    var _webUrl = "";
    var _webRelativeUrl = "";
    var _listCTypeUrl = "Lists/CType";
    var _listWFTaskUrl = "WorkflowTasks";
    var _listWFTaskInfo = {};
    var _isAdmin = 0;
    var _today = moment().startOf('day');
    var _validationMsgText = {
        ChangeRequiredBy: "Change required by cannot be in past",
        RiskRating: "Please select Risk Rating",
        CustomerApprovalRequired: "Please select Customer Approval Required?",
        DeactivateTemplate: "Please select Deactivate Template",
        ItemRequired: "Please select at least one item",
        DetailsOfChange: "Details of Change is required",
        ReasonsForChange: "Reasons for Change is required",
        SaveConflict: "A newer version of the Form is available. Please refresh the Form and try again."
    }

    /* +++ global variables / END +++ */

    /* +++ private interface / START +++ */

    function _init() {

        NWF.FormFiller.Events.RegisterAfterReady(function () {

            _webUrl = _spPageContextInfo.webAbsoluteUrl;
            _webRelativeUrl = _spPageContextInfo.webServerRelativeUrl;
            _formMode = NWF$('#' + ctrlID_FormMode).val();

            if (typeof ctrlID_AdminGroup !== 'undefined' && _isMember(NWF$('#' + ctrlID_AdminGroup).val())) {

                _isAdmin = 1;
            }

            NWF$('#' + ctrlID_IsAdmin).val(_isAdmin);
            NWF.FormFiller.Functions.ProcessOnChange(NWF$('#' + ctrlID_IsAdmin));

            // Update hidden control with Items
            NWF$("#" + ctrlID_ItemsConfig).on('change', function () {

                _updateDTValue(this, ctrlID_ItemsValue);
            });

            // Update hidden control with References
            NWF$("#" + ctrlID_ReferencesConfig).on('change', function () {

                _updateDTValue(this, ctrlID_ReferencesValue);
            });

            if (_formMode == _formModeType.Edit) {

                _disableStatus();

                NWF$("#" + ctrlID_ReferenceProposalItems).on('change', function () {
                    _disableStatus();
                });
                _disableContributors();
            }
            if (_formMode === _formModeType.Edit || _formMode === _formModeType.Display) {
                _isCurrentUserApprover();
            }
            _listWFTaskInfo = _getListIdByUrl(_webUrl, _webRelativeUrl, _listWFTaskUrl);
        });
    }

    // This function will be used to check if current login user is approver or not
    function _isCurrentUserApprover() {
        var currentAppprovers = NWF$('#' + ctrlID_CurrentApproverUsers).val();
        var currentUserLoginName = _spPageContextInfo.userLoginName;
        var isCurrentUserApprover = 0;
        if (currentAppprovers) {
            var currentAppproversArr = currentAppprovers.split(';');
            NWF$.each(currentAppproversArr, function (index, approver) {
                if (approver) {
                    var approverLoginName = '';
                    if (approver.indexOf('|') > -1) {
                        var approverArray = approver.split('|');
                        approverLoginName = approverArray[approverArray.length - 1];
                    }
                    else {
                        approverLoginName = approver;
                    }
                    if (currentUserLoginName && approverLoginName && currentUserLoginName.toLocaleLowerCase() === approverLoginName.toLocaleLowerCase()) {
                        isCurrentUserApprover = 1;
                    }
                }
            });
        }
        NWF$('#' + ctrlID_IsCurrentUserApprover).val(isCurrentUserApprover);
        NWF.FormFiller.Functions.ProcessOnChange(NWF$('#' + ctrlID_IsCurrentUserApprover));
    }

    function _disableContributors() {
        //         ctrlID_Approvals4
        // ctrlID_IsProcessCompleted4
        var numberOfContributors = 4;
        var completedContributors = [];
        var isPreviousCompleted = false;
        for (var i = 1; i <= numberOfContributors; i++) {
            var approvals = NWF$("#" + window["ctrlID_Approvals" + i]).val();
            if (approvals) {
                var approvalsArr = approvals.split(';');
                var inProgress = false;
                NWF$.each(approvalsArr, function (index, value) {
                    if (value != 2) {
                        inProgress = true;
                    }
                });
                if (!inProgress) {
                    completedContributors.push(i);
                    isPreviousCompleted = true;
                }
                else {
                    break;
                }
            }
            else {
                if (i === 1) {
                    completedContributors.push(i);
                    isPreviousCompleted = true;
                }
                else if (isPreviousCompleted) {
                    completedContributors.push(i);
                    isPreviousCompleted = true;
                }
            }
        }
        for (var i = 1; i <= numberOfContributors; i++) {
            if (completedContributors.indexOf(i) > -1) {
                NWF$("#" + window["ctrlID_IsProcessCompleted" + i]).val(1);
            }
            else {
                NWF$("#" + window["ctrlID_IsProcessCompleted" + i]).val(0);
            }
            NWF.FormFiller.Functions.ProcessOnChange(NWF$('#' + window["ctrlID_IsProcessCompleted" + i]));
        }
    }

    function _updateDTValue(ctrlConfig, ctrlValueID) {

        var itemsValues = [];
        var itemsConfig = NWF$(ctrlConfig).val();
        if (itemsConfig) {

            var items = itemsConfig.split('##').filter(Boolean);
            NWF$.each(items, function (index, item) {

                var itemInfo = item.split(";").filter(Boolean);
                if (itemInfo.length === 3) {

                    itemsValues.push(itemInfo[2]);
                }
            });
        }

        NWF$('#' + ctrlValueID).val(itemsValues.join(', '));
        NWF.FormFiller.Functions.ProcessOnChange(NWF$('#' + ctrlValueID));
    }

    function _disableControl(ctrl, disable) {

        if (_isAdmin == 0) {

            NWF$('#' + ctrl).val(disable);
            NWF.FormFiller.Functions.ProcessOnChange(NWF$('#' + ctrl));
        }
    }

    function _changeStep(stepNumber) {

        // Validate Step 2 before moving to Step 3
        if (stepNumber == "3") {

            var validationErrorFound = _validateStep2();
            if (validationErrorFound) {
                return;
            }
        }
        // Validate Step 3 before Raising the request
        if (stepNumber == "0") {
            var validationErrorFound2 = _validateLastStep();
            if (validationErrorFound2) {
                NWF$('.nf-validation-summary')[0].scrollIntoView(true);
                return false;
            }
            else {
                var confirmMsgText = NWF$("#" + ctrlID_RaiseRequest).val()
                var isConfirm = confirm(confirmMsgText);
                if (isConfirm) {
                    return true;
                }
                else {
                    return false;
                }
            }
        }
        else {

            // Update Step
            var hiddenTxtBox = NWF$("#" + hiddenTxtBoxId);
            hiddenTxtBox.val(stepNumber);
            NWF.FormFiller.Functions.ProcessOnChange(hiddenTxtBox);
        }
        if (_formMode == _formModeType.New && NWF$("#" + hiddenTxtBoxId).val() == "3") {

            // Set Contributors based on selected Change type
            _setContributorsByChangeType();
            // Copy Section 2 data to Section 3 for Edit mode
            _copyNewData();
        }
    }

    function _validateStep2() {

        var validationErrorFound = false;
        var errorMsgs = [];
        // Validate Details of Change
        // var controlDetails = NWF$(".cp-rt-change .nf-repeater-row:not(.nf-repeater-row-hidden) .cp-doc textarea");
        // jQuery.each(controlDetails, function (index, controlDetail) {

        //     if (jQuery(controlDetail).val()) {

        //         jQuery(controlDetail).removeClass("nf-error-highlight");

        //     } else {

        //         validationErrorFound = true;
        //         jQuery(controlDetail).addClass("nf-error-highlight");
        //     }
        // });

        // Validate Reasons for Change
        // var controlReasons = NWF$(".cp-rt-change .nf-repeater-row:not(.nf-repeater-row-hidden) .cp-rfc textarea");
        // jQuery.each(controlReasons, function (index, controlReason) {

        //     if (jQuery(controlReason).val()) {

        //         jQuery(controlReason).removeClass("nf-error-highlight");

        //     } else {

        //         validationErrorFound = true;
        //         jQuery(controlReason).addClass("nf-error-highlight");
        //     }
        // });

        // Validate Change required by
        var changeRequiredBy = NWF$("#" + ctrlID_ChangeRequiredBy).val();
        if (changeRequiredBy && moment(changeRequiredBy, "DD/MM/YYYY").isValid() && moment(changeRequiredBy, "DD/MM/YYYY").isSameOrAfter(_today)) {

            NWF$("#" + ctrlID_ChangeRequiredBy).removeClass("nf-error-highlight");
        } else {

            validationErrorFound = true;
            NWF$("#" + ctrlID_ChangeRequiredBy).addClass("nf-error-highlight");
            errorMsgs.push(_validationMsgText.ChangeRequiredBy);
        }

        // Validate Risk Rating
        if (NWF$("#" + ctrlID_RRating).val() == "**SelectValue**") {

            validationErrorFound = true;
            NWF$("#" + ctrlID_RRating).addClass("nf-error-highlight");
            errorMsgs.push(_validationMsgText.RiskRating);

        } else {

            NWF$("#" + ctrlID_RRating).removeClass("nf-error-highlight");
        }

        // Validate Customer Approval
        if (NWF$("#" + ctrlID_CustomerApproval).val() == "**SelectValue**") {

            validationErrorFound = true;
            NWF$("#" + ctrlID_CustomerApproval).addClass("nf-error-highlight");
            errorMsgs.push(_validationMsgText.CustomerApprovalRequired);

        } else {

            NWF$("#" + ctrlID_CustomerApproval).removeClass("nf-error-highlight");
        }

        // Validate Deeactivate Template
        if (NWF$("#" + ctrlID_DTemplate).val() == "**SelectValue**") {

            validationErrorFound = true;
            NWF$("#" + ctrlID_DTemplate).addClass("nf-error-highlight");
            errorMsgs.push(_validationMsgText.DeactivateTemplate);

        } else {

            NWF$("#" + ctrlID_DTemplate).removeClass("nf-error-highlight");
        }
        _showNintexErrorSummary(errorMsgs, validationErrorFound);
        return validationErrorFound;
    }

    // this function will be used to show error message summary
    function _showNintexErrorSummary(errorMsgArray, isErrorFound) {
        if (isErrorFound) {
            var errorMessageHTML = 'Please address the following:';
            errorMessageHTML += '<ul>';
            NWF$.each(errorMsgArray, function (index, message) {
                errorMessageHTML += '<li>' + message + '</li>';
            })
            errorMessageHTML += '</ul>';

            // Bind error message details to nf-validation-summary div 
            NWF$("div.nf-validation-summary").html(errorMessageHTML);
            NWF$("div.nf-validation-summary").css("display", "");
        }
        else {
            NWF$("div.nf-validation-summary").html("");
            NWF$("div.nf-validation-summary").css("display", "none");
        }

    }
    function _validateLastStep() {

        var validationErrorFound = false;
        var errorMsgs = [];

        // Validate Items
        var ctrlItems = ctrlID_ItemsIDConfig ? NWF$("#" + ctrlID_ItemsIDConfig) : '';
        if (ctrlItems) {

            var ctrlItemsValue = NWF$(ctrlItems).val();
            var ctrlTagifyInput = NWF$(ctrlItems).closest('.mll-dt-panel').find(".tagify.mll-tagify-input");
            if (ctrlItemsValue && ctrlTagifyInput.length) {

                NWF$(ctrlTagifyInput).removeClass("nf-error-highlight");

            } else {

                validationErrorFound = true;
                NWF$(ctrlTagifyInput).addClass("nf-error-highlight");
                errorMsgs.push(_validationMsgText.ItemRequired);
            }
        }

        // Validate Details of Change
        var controlDetails = NWF$(".cp-rt-changeedit .nf-repeater-row:not(.nf-repeater-row-hidden) .cp-doc textarea");
        jQuery.each(controlDetails, function (index, controlDetail) {
            if (jQuery(controlDetail).val()) {
                jQuery(controlDetail).removeClass("nf-error-highlight");

            } else {
                validationErrorFound = true;
                jQuery(controlDetail).addClass("nf-error-highlight");
                if (errorMsgs.indexOf(_validationMsgText.DetailsOfChange) < 0) {
                    errorMsgs.push(_validationMsgText.DetailsOfChange);
                }

            }
        });

        // Validate Reasons for Change
        var controlReasons = NWF$(".cp-rt-changeedit .nf-repeater-row:not(.nf-repeater-row-hidden) .cp-rfc textarea");
        jQuery.each(controlReasons, function (index, controlReason) {

            if (jQuery(controlReason).val()) {
                jQuery(controlReason).removeClass("nf-error-highlight");

            } else {
                validationErrorFound = true;
                jQuery(controlReason).addClass("nf-error-highlight");
                if (errorMsgs.indexOf(_validationMsgText.ReasonsForChange) < 0) {
                    errorMsgs.push(_validationMsgText.ReasonsForChange);
                }
            }
        });
        _showNintexErrorSummary(errorMsgs, validationErrorFound);
        return validationErrorFound;
    }

    function _setContributorsByChangeType() {

        // Clear all Contributors
        NWF$(".mpp-userloginnames").find("textarea").val("");
        NWF$(".mpp-userids").find("textarea").val("");
        NWF$(".mpp-usernames").find("textarea").val("");
        NWF$(".mpp-userapprovals").find("textarea").val("");

        NWF$('.mpp-users-panel.nf-filler-control').each(function () {

            NWF$(this).find(".mpp-users .mpp-sortable").empty();
            if (_isAdmin) {

                nf.peoplepicker.sortable.renderEditMode(this);

            } else {

                nf.peoplepicker.sortable.renderDisplayMode(this);
            }
        });

        var selectedCType = NWF$("#" + ctrlID_CType).val().split(";#")[0];

        if (selectedCType) {

            _processDataByChangeType(selectedCType);
        }
    }

    function _copyNewData() {

        NWF$("#" + ctrlID_RRatingEdit).val(NWF$("#" + ctrlID_RRating).val());
        NWF$("#" + ctrlID_DTemplateEdit).val(NWF$("#" + ctrlID_DTemplate).val());
        NWF$("#" + ctrlID_CustomerApprovalEdit).val(NWF$("#" + ctrlID_CustomerApproval).val());
        NWF$("#" + ctrlID_ChangeRequiredByEdit).val(NWF$("#" + ctrlID_ChangeRequiredBy).val());
        // NWF$("#" + ctrlID_ConsiderationsEdit).val(NWF$("#" + ctrlID_Considerations).val());

        // // Get Change details of New mode
        // var newChangeDetails = NWF$(".cp-rt-change .nf-repeater-row:not(.nf-repeater-row-hidden) .cp-doc textarea");
        // var newChangeReasons = NWF$(".cp-rt-change .nf-repeater-row:not(.nf-repeater-row-hidden) .cp-rfc textarea");

        // var editChangeDetailRows = NWF$(".cp-rt-changeedit .nf-repeater-row:not(.nf-repeater-row-hidden)");

        // // Delete existing rows in Edit mode
        // NWF$.each(editChangeDetailRows, function (index, item) {

        //     NWF$(item).find(".nf-repeater-deleterow-image").click();
        // });

        // // Clear last row data
        // NWF$('.cp-rt-changeedit .nf-repeater-row:last').each(function () {

        //     var row = NWF$(this);
        //     row.find('.cp-doc textarea').val('');
        //     row.find('.cp-rfc textarea').val('');
        // });

        // // Add New mode data to Edit mode
        // for (var index = 0; index < newChangeDetails.length; index++) {

        //     // Get the repeating section last row
        //     NWF$('.cp-rt-changeedit .nf-repeater-row:last').each(function () {

        //         var row = NWF$(this);
        //         row.find('.cp-doc textarea').val(newChangeDetails[index].value);
        //         row.find('.cp-rfc textarea').val(newChangeReasons[index].value);
        //     });

        //     // Add new row
        //     NWF$('.cp-rt-changeedit a.nf-repeater-addrow-link').click();
        // }

        // // Delete extra unnecessary row
        // NWF$('.cp-rt-changeedit .nf-repeater-row:last').find('.nf-repeater-deleterow-image').click();
    }

    function _disableStatus() {

        var disableStatus = 0;
        var listID = NWF$("#" + ctrlID_ListID).val();
        var referenceProposalValue = NWF$("#" + ctrlID_ReferenceProposalItems).val();
        var referenceProposalItems = referenceProposalValue.split(';').filter(Boolean);

        if (referenceProposalItems.length) {

            // Check if any Reference Proposals are Open
            var requestReferenceProposalsUrl = _webUrl + "/_api/web/lists(guid'" + listID + "')/GetItems";

            var queryReferenceProposals = '';
            NWF$.each(referenceProposalItems, function (index, item) {

                queryReferenceProposals += '<Value Type="Counter">' + item + '</Value>';
            });

            queryReferenceProposals = "<View><Query><Where><And><In><FieldRef Name='ID' /><Values>" + queryReferenceProposals + "</Values></In><Eq><FieldRef Name='CPStatus' /><Value Type='Choice'>Open</Value></Eq></And></Where></Query><ViewFields><FieldRef Name='ID' /></ViewFields></View>";
            var data = { "query": { "__metadata": { "type": "SP.CamlQuery" }, "ViewXml": queryReferenceProposals } };

            _getDataRestPOST(requestReferenceProposalsUrl, data,
                function (data) {
                    if (data.d.results.length) {

                        disableStatus = 1;
                    }
                },
                function (jqXHR, textStatus, errorThrown) {

                    console.log('Error getting Reference Proposals. Details: ' + errorThrown);
                }
            );
        }

        NWF$('#' + ctrlID_OpenReferece).val(disableStatus);
        NWF.FormFiller.Functions.ProcessOnChange(NWF$('#' + ctrlID_OpenReferece));
    }

    function _processDataByChangeType(selectedCType) {

        // Get Change Type list
        var changeTypeListInfo = _getListIdByUrl(_webUrl, _webRelativeUrl, _listCTypeUrl);

        if (changeTypeListInfo.listId) {

            // Get Change type details
            var requestUri = _webUrl + "/_api/web/lists(guid'" + changeTypeListInfo.listId + "')/items?$expand=Contributor_x0020_2/Id,Contributor_x0020_3/Id&$select=ID,Contributor_x0020_2/Name,Contributor_x0020_2/Title,Contributor_x0020_3/Name,Contributor_x0020_3/Title,FormData&$filter=(ID eq " + selectedCType + ")";

            _getDataRest(requestUri, function (data) {

                if (data.d.results.length) {

                    // Populate hidden control values for Contributors
                    _populateContributorData(data);

                    // Render all tags based on populated form control data.
                    NWF$('.mpp-users-panel.nf-filler-control').each(function () {

                        if (_isAdmin) {

                            nf.peoplepicker.sortable.renderEditMode(this);

                        } else {

                            nf.peoplepicker.sortable.renderDisplayMode(this);
                        }
                    });
                }
            }, function (jqXHR, textStatus, errorThrown) {

                console.log('Error getting Change Type details from item with Id: ' + selectedCType + '. Details: ' + errorThrown);
            });
        }
    }

    function _populateContributorData(data) {

        var Loginnames = [];
        var UserIDs = [];
        var Usernames = [];
        var Approvals = [];

        // Get Form data
        var formdata = data.d.results[0].FormData;
        var formXml = jQuery(jQuery.parseXML(formdata));

        // Set data for Contributor 1
        NWF$("#" + ctrlID_Loginnames1).val(formXml.find("Loginnames1").text());
        NWF$("#" + ctrlID_UserIDs1).val(formXml.find("UserIDs1").text());
        NWF$("#" + ctrlID_Usernames1).val(formXml.find("Usernames1").text());
        NWF$("#" + ctrlID_Approvals1).val(formXml.find("Approvals1").text());

        // Set data for Contributor 2
        if (data.d.results[0].Contributor_x0020_2.results) {

            NWF$.each(data.d.results[0].Contributor_x0020_2.results, function (index, value) {

                Loginnames.push(value.Name.split("|")[1]);
                UserIDs.push(index + 1);
                Usernames.push(value.Title);
                Approvals.push(0);
            });
            NWF$("#" + ctrlID_Loginnames2).val(Loginnames.join(';'));
            NWF$("#" + ctrlID_UserIDs2).val(UserIDs.join(';'));
            NWF$("#" + ctrlID_Usernames2).val(Usernames.join(';'));
            NWF$("#" + ctrlID_Approvals2).val(Approvals.join(';'));
        }

        // Set data for Contributor 3
        if (data.d.results[0].Contributor_x0020_3.results) {

            // Clear Arrays
            Loginnames.splice(0, Loginnames.length);
            UserIDs.splice(0, UserIDs.length);
            Usernames.splice(0, Usernames.length);
            Approvals.splice(0, Approvals.length);

            NWF$.each(data.d.results[0].Contributor_x0020_3.results, function (index, value) {

                Loginnames.push(value.Name.split("|")[1]);
                UserIDs.push(index + 1);
                Usernames.push(value.Title);
                Approvals.push(0);
            });
            NWF$("#" + ctrlID_Loginnames3).val(Loginnames.join(';'));
            NWF$("#" + ctrlID_UserIDs3).val(UserIDs.join(';'));
            NWF$("#" + ctrlID_Usernames3).val(Usernames.join(';'));
            NWF$("#" + ctrlID_Approvals3).val(Approvals.join(';'));
        }

        // Set data for Contributor 4
        NWF$("#" + ctrlID_Loginnames4).val(formXml.find("Loginnames4").text());
        NWF$("#" + ctrlID_UserIDs4).val(formXml.find("UserIDs4").text());
        NWF$("#" + ctrlID_Usernames4).val(formXml.find("Usernames4").text());
        NWF$("#" + ctrlID_Approvals4).val(formXml.find("Approvals4").text());
    }

    function _getSelectedUserInfo(selectedUsers, ppControl) {

        var promises = [];

        NWF$.each(selectedUsers, function (index, user) {

            var def = new NWF$.Deferred();

            ppControl.search(user).done(function (data) {
                def.resolve(data[0]);
            });

            promises.push(def);
        });

        return NWF$.when.apply(NWF$, promises);
    }

    function _getListIdByUrl(webUrl, webRelativeUrl, listUrl) {

        var listInfo = {};
        var listRelativeUrl = webRelativeUrl + '/' + listUrl;
        var requestListUrl = webUrl + "/_api/web/getlist('" + listRelativeUrl + "')?$select=Id,ListItemEntityTypeFullName,BaseTemplate,Title";
        _getDataRest(requestListUrl, function (listData) {

            if (listData) {

                listInfo.listId = listData.d.Id;
                listInfo.listBaseType = listData.d.BaseTemplate;
                listInfo.Title = listData.d.Title;
            }

        }, function (jqXHR, textStatus, errorThrown) {

            console.log('Error getting list with Url: ' + listUrl + '. Details: ' + errorThrown);
        });

        return listInfo;
    }

    function _getDataRest(requestUrl, successHandler, errorHandler) {

        NWF$.ajax({
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

    function _getDataRestPOST(requestUrl, requestData, successHandler, errorHandler) {

        NWF$.ajax({
            url: requestUrl,
            method: "POST",
            async: false,
            data: JSON.stringify(requestData),
            headers: {
                'X-RequestDigest': NWF$("#__REQUESTDIGEST").val(),
                'content-type': 'application/json;odata=verbose',
                'accept': 'application/json;odata=verbose'
            },
            success: function (data, textStatus, jqXHR) {
                successHandler(data);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                errorHandler(jqXHR, textStatus, errorThrown);
            }
        });
    }

    function _approveRejectTask() {

        var currentApprovalType = ctrlID_CurrentApprovalType ? NWF$("#" + ctrlID_CurrentApprovalType).val() : "";
        if (currentApprovalType == 'Parallel') {
            var taskOutcome = ctrlID_TaskOutcome ? NWF$("#" + ctrlID_TaskOutcome + " input:checked").val() : "";
            var wfInstanceID = ctrlID_WFInstanceID ? NWF$("#" + ctrlID_WFInstanceID).val() : "";
            var approverComment = ctrlID_ApproverComment ? NWF$("#" + ctrlID_ApproverComment).val() : "";
            // if no changes in task 
            if (taskOutcome && taskOutcome === _taskOutcome.Pending) {
                return true;
            }
            // var currentUserId = _spPageContextInfo.userId;
            var currentUserLoginName = _spPageContextInfo.userLoginName;
            console.log('Processing Task: Instance ID: ' + wfInstanceID + ', User Login Name: ' + currentUserLoginName + ', Task Outcome: ' + taskOutcome);
            // If Task is Approved/Rejected
            if (taskOutcome && wfInstanceID && taskOutcome !== _taskOutcome.Pending) {
                var isTaskCompleted = false;
                // Get all Tasks that created using current workflow instant
                var requestTaskIdUrl = _webUrl + "/_api/web/GetList('" + _webRelativeUrl + "/" + _listWFTaskUrl + "')/items?$select=Id,AssignedTo/Id,AssignedTo/Name&$filter=WorkflowInstanceID eq '" + wfInstanceID + "' and Status ne 'Completed'&$expand=AssignedTo";
                _getDataRest(requestTaskIdUrl, function (data) {
                    if (data && data.d && data.d.results.length > 0) {
                        var taskId = 0;
                        // Go through all items to find task that assing to current user
                        NWF$.each(data.d.results, function (index, item) {
                            var assignedTo = item["AssignedTo"] && item["AssignedTo"].Name ? item["AssignedTo"].Name : ""
                            if (assignedTo) {
                                var assingToLoginName = ""
                                if (assignedTo.indexOf('|') > -1) {
                                    var assignedToArray = assignedTo.split('|');
                                    assingToLoginName = assignedToArray[assignedToArray.length - 1];
                                }
                                else {
                                    assingToLoginName = assignedTo;
                                }
                                if (currentUserLoginName && assingToLoginName && currentUserLoginName.toLocaleLowerCase() === assingToLoginName.toLocaleLowerCase()) {
                                    taskId = item.Id;
                                    return false;
                                }

                            }
                        });
                        // var taskId = data.d.results[0].Id;
                        if (taskId) {
                            var setStatusValue = taskOutcome === _taskOutcome.Reject ? 'Rejected' : 'Approved';
                            var updateTaskReqUrl = _webUrl + "/_vti_bin/NintexWorkflow/Workflow.asmx";
                            var rqstData = '<?xml version="1.0" encoding="utf-8"?>';
                            rqstData += '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:m="http://nintex.com">';
                            rqstData += '<soap:Header>';
                            rqstData += '</soap:Header>';
                            rqstData += '  <soap:Body>';
                            rqstData += '    <m:ProcessTaskResponse3>';
                            rqstData += '      <m:comments>' + approverComment + '</m:comments>';
                            rqstData += '      <m:outcome>' + setStatusValue + '</m:outcome>';
                            rqstData += '      <m:spTaskId>' + taskId + '</m:spTaskId>';
                            rqstData += '      <m:taskListName>' + _listWFTaskInfo.Title + '</m:taskListName>';
                            rqstData += '    </m:ProcessTaskResponse3>';
                            rqstData += '  </soap:Body>';
                            rqstData += '</soap:Envelope>';

                            NWF$.ajax({
                                type: "POST",
                                url: updateTaskReqUrl,
                                contentType: "text/xml;charset=UTF-8",
                                data: rqstData,
                                dataType: "xml",
                                async: false,
                                success: function (data, status, xhr) {
                                    console.log('OK: ' + status);
                                    console.log('resp: ' + xhr.responseText);
                                    isTaskCompleted = true;
                                },
                                error: function (xhr, status, errText) {
                                    console.log('ERR: ' + status + ' / ' + errText);
                                    console.log('status: [' + xhr.status + '] ' + xhr.statusText);
                                }
                            });
                        }
                        else {
                            console.log("Task not found for current user");
                        }
                    }
                    else {
                        console.log("Task not found in Workflow Tasks list");
                    }
                }, function (jqXHR, textStatus, errorThrown) {
                    console.log("Error while getting data from task list. Error details is " + jqXHR.responseText);
                });
            }
            else {
                if (!taskOutcome) {
                    console.log("Task is not Pending");
                }
                if (!wfInstanceID) {
                    console.log("Workflow instance not found");
                }

            }
            return isTaskCompleted;
        }
        else {
            return true;
        }
    }

    function _isMember(groupName) {

        var isAdmin = false;

        jQuery.ajax({
            url: _spPageContextInfo.webAbsoluteUrl + "/_api/web/sitegroups/getByName('" + groupName + "')/Users?$filter=Id eq " + _spPageContextInfo.userId,
            async: false,
            method: "GET",
            headers: { "Accept": "application/json; odata=verbose" },
            success: function (data) {
                if (data.d.results.length) {

                    isAdmin = true;
                }
            }
        });

        return isAdmin;
    }

    function _checkSaveConflict() {

        var hasSaveConflict = false;

        // Get item version when Form was opened
        var version = '';
        if (typeof ctrlID_ItemVersion !== 'undefined' && NWF$('#' + ctrlID_ItemVersion).val()) {

            version = NWF$('#' + ctrlID_ItemVersion).val();
            if (!isNaN(version)) {

                version = Number(version);
                console.log('Item version: ' + version);
            }
            else {
                version = '';
            }
        }

        // Get current Item ID
        if (typeof ctrlID_ItemID !== 'undefined' && NWF$('#' + ctrlID_ItemID).val()) {
            var itemId = NWF$('#' + ctrlID_ItemID).val();
        }

        if (version && itemId) {

            // Get current Version
            var listID = NWF$("#" + ctrlID_ListID).val();

            // Check if any Reference Proposals are Open
            var requestProposalVersionUrl = _webUrl + "/_api/web/lists(guid'" + listID + "')/items(" + itemId + ")?$select=OData__UIVersionString";

            _getDataRest(requestProposalVersionUrl,
                function (responseProposalVersion) {
                    if (responseProposalVersion.d.OData__UIVersionString && !isNaN(responseProposalVersion.d.OData__UIVersionString)) {
                        var currentVersion = Number(responseProposalVersion.d.OData__UIVersionString);
                        if (currentVersion > version) {
                            hasSaveConflict = true;
                            console.log('A newer version of item exists. Current item version: ' + currentVersion);
                        }
                    }
                },
                function (jqXHR, textStatus, errorThrown) {

                    console.log('Error getting Version of Proposal item. Details: ' + errorThrown);
                }
            );
        }

        if (hasSaveConflict) {
            _showNintexErrorSummary([_validationMsgText.SaveConflict], true);
        }

        return hasSaveConflict;
    }

    function _confirmationMsg(buttonName) {


        if (!_checkSaveConflict() && Page_ClientValidate()) {
            var confirmMsgText = ""
            if (buttonName == "Delegate") {
                confirmMsgText = NWF$("#" + ctrlID_DelegateConfirmText).val()
            }
            else if (buttonName == "RestartApproval") {
                confirmMsgText = NWF$("#" + ctrlID_RestartConfirmText).val()
            }
            else if (buttonName == "CancelWorkflow") {
                confirmMsgText = NWF$("#" + ctrlID_CencelApprovalProcess).val()
            }
            else if (buttonName == "Save") {
                confirmMsgText = NWF$("#" + ctrlID_SaveConfirmText).val()
            }
            if (confirmMsgText) {
                var isConfirm = confirm(confirmMsgText);
                if (isConfirm) {
                    // If it's save button then we need to check for Approve/Reject 
                    if (buttonName == "Save") {
                        return _approveRejectTask();
                    }
                    return true;
                }
                else {
                    return false;
                }
            }
        }
        else {
            // If any error then scroll to Top
            NWF$('.nf-validation-summary')[0].scrollIntoView(true);
            return false;
        }
    }
    /* +++ private interface / END +++ */

    /* +++ public interface / START +++ */

    return {

        init: function () {
            _init();
        },
        changeStep: function (stepNumber) {
            return _changeStep(stepNumber);
        },
        approveRejectTask: function () {
            return _approveRejectTask();
        },
        confirmationMsg: function (btnName) {
            return _confirmationMsg(btnName);
        }
    };

    /* +++ public interface / END +++ */

})();

nf.proposals.form.init();
/* ----- nf.proposals.form.js / END ----- */