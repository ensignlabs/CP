/* ----- lookup.multilist.datatable.js / START ----- */
try {
    Type.registerNamespace('lookup');
} catch (error) {
    window.lookup = window.lookup || {};
}

lookup.multilist = lookup.multilist || {};
lookup.multilist.datatable = (function () {

    /* +++ global variables / START +++ */

    var _formModeType = {
        Edit: "Edit",
        New: "New",
        Display: "Display"
    };
    var _configListUrl = "/Lists/Configuration";
    var _pagesLibraryUrl = '/Pages';
    var _listConfig = null;
    var _webUrl;
    var _webRelativeUrl;
    var _tagInfo = {};
    var _formMode = "";
    var _currentListID;
    var _itemDisplayFormUrl = '';
    var _dtMaster = [];
    var _isAdmin = true;
    var _currentUserId = '';
    var _fieldTypeLinkTitle = 'LinkTitle';
    var _fieldTypeLinkFile = 'LinkFile';
    var _fieldTypeDocIcon = 'DocIcon';
    var _fieldTypeContentType = 'ContentType';
    var _skipFieldValues = ['ContentType'];
    var _fileIcons = [];

    /* +++ global variables / END +++ */

    /* +++ private interface / START +++ */

    function _setup() {

        NWF.FormFiller.Events.RegisterAfterReady(function () {

            // Set basic web details
            _webUrl = _spPageContextInfo.webAbsoluteUrl;
            _webRelativeUrl = _spPageContextInfo.webServerRelativeUrl;
            _currentListID = jQuery('#' + ctrlID_ListID).val();
            _currentUserId = _spPageContextInfo.userId;
            var formUrl = _spPageContextInfo.serverRequestPath;

            // Get current Form mode
            _formMode = NWF$('#' + ctrlID_FormMode).val();

            // Check for Admin User
            if (typeof ctrlID_AdminGroup !== 'undefined') {

                if (!_isMember(NWF$('#' + ctrlID_AdminGroup).val())) {

                    _isAdmin = false;
                }
            }

            // Get configuration list
            _listConfig = _getListDetailsByUrl(_webUrl, _webRelativeUrl, _configListUrl);

            NWF$('.mll-dt-panel.nf-filler-control').each(function () {

                var ctrlPanel = this;
                var dtDetails = {};

                // Is Admin only control
                var isAdminOnly = false;
                var ctrlAdminOnly = NWF$(ctrlPanel).find('.mll-adminonly .nf-calculation-control-value');
                if (ctrlAdminOnly.length && ctrlAdminOnly.val() == "1") {

                    isAdminOnly = true;
                }

                var isDisplayMode = false;
                if (_formMode === _formModeType.Display || (isAdminOnly && !_isAdmin)) {

                    isDisplayMode = true;
                }

                // Render base HTML structure
                _renderBaseStructure(ctrlPanel, isDisplayMode);

                var panelID = NWF$(ctrlPanel).attr("data-controlid");
                dtDetails.panelID = panelID;

                // Render tagify input control with Add/Remove event.
                var input = NWF$(ctrlPanel).find('input[name=tagify-input-title]');
                if (input.length) {

                    var tagifyControl = new Tagify(input[0], {
                        delimiters: ",#"
                    });
                    tagifyControl.on('add', _onTagChange);
                    tagifyControl.on('remove', _onTagChange);

                    dtDetails.tagifyControl = tagifyControl;
                }

                _dtMaster.push(dtDetails);

                if (isDisplayMode) {

                    // Render selected tags as read only
                    _renderSelectedTags(ctrlPanel, tagifyControl);
                    NWF$('.tagify__tag').css("margin-right", "0.5em");

                    if (_listConfig.listId) {

                        _processViewSelectedList(ctrlPanel, tagifyControl);
                    }
                    else {

                        console.log("Configuration list not found at URL '" + _configListUrl + "'");
                    }
                }
                else {

                    // If Configuration list found
                    if (_listConfig.listId) {

                        // Attach change event to Lookup control based on Lookup type (Single/Multi)
                        var lookupType = NWF$(ctrlPanel).find('.mll-lookup-type .nf-calculation-control-value').val();

                        var ctrlLookupID = '';
                        var ctrlLookupValueID = '';
                        var isSingleLookup = true;
                        if (lookupType.toLowerCase() === "multilookup") {

                            var ctrlListSelectionID = NWF$(ctrlPanel).find(".mll-list-selection .nf-lookup").attr('id');
                            ctrlLookupID = ctrlListSelectionID + '_4';
                            ctrlLookupValueID = ctrlListSelectionID + '_hid';
                            isSingleLookup = false;

                        } else {

                            ctrlLookupID = NWF$(ctrlPanel).find(".mll-list-selection .nf-associated-control").attr('id');
                            // In case Calculated control is used for Lookup list selection
                            if (!ctrlLookupID) {

                                ctrlLookupID = NWF$(ctrlPanel).find(".mll-list-selection .nf-calculation-control-value").attr('id');
                            }
                            ctrlLookupValueID = ctrlLookupID;
                        }

                        NWF$('#' + ctrlLookupID).change(function (e) {

                            // Disable list selection while rendering
                            _changeListSelectionState(ctrlPanel, true);

                            setTimeout(function () {

                                // e.isTrigger - To Identify item add/remove in List box
                                if (isSingleLookup || e.isTrigger) {

                                    // Remove all Tags on change of list selection
                                    tagifyControl.removeAllTags();

                                    // Clear Text box value
                                    NWF$(ctrlPanel).find('.mll-dt-config textarea').val('').change();
                                    NWF$(ctrlPanel).find('.mll-dt-items textarea').val('').change();

                                    _processSelectedLists(ctrlPanel, ctrlLookupValueID, tagifyControl);
                                }
                                else {
                                    // Enable list selection
                                    _changeListSelectionState(ctrlPanel, false);
                                }
                            }, 10);
                        });

                        if (_formMode === _formModeType.Edit) {

                            _itemDisplayFormUrl = formUrl.replace('EditForm', 'DispForm');

                            // Disable list selection while rendering
                            _changeListSelectionState(ctrlPanel, true);

                            // Render already selected items and datatable
                            _processSelectedLists(ctrlPanel, ctrlLookupValueID, tagifyControl);

                            // Render selected tags with edit option
                            _renderSelectedTags(ctrlPanel, tagifyControl);

                            _resetSelectedTagDesign(panelID);

                        } else {

                            _itemDisplayFormUrl = formUrl.replace('NewForm', 'DispForm');
                        }
                    } else {

                        console.log("Configuration list not found at URL '" + _configListUrl + "'");
                    }
                }
            });

            _fixFormHeightIssue();
        });
    }
    function _processViewSelectedList(ctrlPanel, tagifyControl) {

        var lookupControlSelector = '';

        // For Lookup control
        if (NWF$(ctrlPanel).find('.mll-list-selection  .nf-associated-control').length) {

            lookupControlSelector = '.mll-list-selection .nf-associated-control';
        }

        // For Calculated control
        if (NWF$(ctrlPanel).find('.mll-list-selection  .nf-calculation-control-value').length) {

            lookupControlSelector = '.mll-list-selection .nf-calculation-control-value';
        }

        if (lookupControlSelector) {

            // Get selected Lists
            var selectedLists = NWF$(ctrlPanel).find(lookupControlSelector).val().split(";#").filter(Boolean);

            if (selectedLists.length) {

                var selectedListsItemID = _getSelectedListsItemID(selectedLists);

                // Get List details from Config list
                var selectedListDetails = _getListConfiguration(selectedListsItemID);

                // Process to render datatable based on config list data
                _processListByIndex(ctrlPanel, selectedListDetails, 0, tagifyControl, true);
            }
        }
    }
    function _getParameterValues(param, link) {
        var url = link.slice(link.indexOf('?') + 1).split('&').filter(Boolean);
        for (var i = 0; i < url.length; i++) {
            var urlparam = url[i].split('=').filter(Boolean);
            if (urlparam[0] === param) {
                return urlparam[1];
            }
        }
    }
    function _renderBaseStructure(ctrlPanel, isDisplayMode) {

        // Clear Rich text control data
        NWF$(ctrlPanel).find(".mll-dt").empty();

        var sectionTitle = NWF$(ctrlPanel).find('.mll-section-title .nf-calculation-control-value').val();

        var baseStructure = "<div class='mll-dt-main'>";
        baseStructure += "<div class='mll-dt-disable'></div><div class='mll-dt-loader'></div>";
        if (sectionTitle) {

            baseStructure += "<div class='mll-section-title'>" + sectionTitle + "</div>";
        }
        if (isDisplayMode) {

            baseStructure += "<input name='tagify-input-title' readonly class='mll-tagify-input'/>";
        } else {

            baseStructure += "<input name='tagify-input-title' class='mll-tagify-input'/>";
        }

        baseStructure += "<div class='mll-dt-container'></div>";
        baseStructure += "</div>";

        NWF$(ctrlPanel).find(".mll-dt").html(baseStructure);
    }
    function _resetSelectedTagDesign(panelID) {

        // Use Bootstrap close icon for Tag
        NWF$("div[data-controlid='" + panelID + "']").find("x.tagify__tag__removeBtn").attr("class", "glyphicon glyphicon-remove-circle");
    }
    function _processSelectedLists(ctrlPanel, ctrlLookupValueID, tagifyControl) {

        // Clear Data tables
        NWF$(ctrlPanel).find(".mll-dt-container").empty();

        // Get selected Lists
        var selectedLists = NWF$('#' + ctrlLookupValueID).val().split(";#").filter(Boolean);

        if (selectedLists.length) {

            var selectedListsItemID = _getSelectedListsItemID(selectedLists);

            // Get List details from Config list
            var selectedListDetails = _getListConfiguration(selectedListsItemID);

            // Process to render datatable based on config list data
            _processListByIndex(ctrlPanel, selectedListDetails, 0, tagifyControl, false);
        }
        else {
            // Enable list selection
            _changeListSelectionState(ctrlPanel, false);
        }
    }
    function _changeListSelectionState(ctrlPanel, disable) {

        var ctrlListSelectionID = NWF$(ctrlPanel).find(".mll-list-selection .nf-lookup").attr('id');
        var lookupType = NWF$(ctrlPanel).find('.mll-lookup-type .nf-calculation-control-value').val();

        if (lookupType.toLowerCase() === "multilookup") {

            NWF$('#' + ctrlListSelectionID + '_1').prop("disabled", disable);
            NWF$('#' + ctrlListSelectionID + '_4').prop("disabled", disable);
        }

        if (disable) {

            NWF$(ctrlPanel).find('.mll-dt-disable').show();
            NWF$(ctrlPanel).find('.mll-dt-loader').show();

        } else {

            NWF$(ctrlPanel).find('.mll-dt-disable').hide();
            NWF$(ctrlPanel).find('.mll-dt-loader').hide();
        }
    }
    function _getSelectedListsItemID(selectedLists) {

        var selectedListItemIDs = [];
        for (var counter = 0; counter < selectedLists.length; counter++) {
            if (counter % 2 === 0) {
                selectedListItemIDs.push(selectedLists[counter]);
            }
        }

        return selectedListItemIDs;
    }
    function _getListConfiguration(selectedListsItemID) {

        // Clear previous selected lists
        var selectedListDetails = [];

        // Get configuration list data
        for (var counter = 0; counter < selectedListsItemID.length; counter++) {

            var requestListDetailsUrl = _webUrl + "/_api/web/lists(guid'" + _listConfig.listId + "')/items?$filter=Id eq " + selectedListsItemID[counter];
            _getDataRest(requestListDetailsUrl, function (listDetails) {

                selectedListDetails.push({
                    "ConfigId": listDetails.d.results[0].ID,
                    "ListTitle": listDetails.d.results[0].Title,
                    "ListUrl": listDetails.d.results[0].ListURL,
                    "ListView": listDetails.d.results[0].ListView,
                    "Field": listDetails.d.results[0].Field,
                    "WebUrl": listDetails.d.results[0].WebURL
                });
            }, function (jqXHR, textStatus, errorThrown) {

                console.log('Error getting details of list with id: ' + selectedListsItemID[counter] + '. Details: ' + errorThrown);
            });
        }

        return selectedListDetails;
    }
    function _processListByIndex(ctrlPanel, selectedListDetails, indexSelectedLists, tagifyControl, isDisplayMode) {

        var asyncProcess = false;
        var panelID = NWF$(ctrlPanel).attr("data-controlid");

        // Get current list details
        var listWebUrl = selectedListDetails[indexSelectedLists].WebUrl;
        var webDetails = _getWebDetails(listWebUrl);

        if (webDetails.Url) {

            var listUrl = selectedListDetails[indexSelectedLists].ListUrl;
            var listInfo = _getListDetailsByUrl(webDetails.Url, webDetails.ServerRelativeUrl, listUrl);
            var configListTitle = selectedListDetails[indexSelectedLists].ListTitle;
            var listId = listInfo.listId;
            var listTitle = listInfo.title;

            if (listId) {

                var configItemId = selectedListDetails[indexSelectedLists].ConfigId;
                // Get configured List View details
                var listView = selectedListDetails[indexSelectedLists].ListView;
                var requestListViewUrl = webDetails.Url + "/_api/web/lists(guid'" + listId + "')/Views?&$filter=Title eq '" + listView + "'&$select=ID,Title";
                _getDataRest(requestListViewUrl, function (listViewDetails) {

                    if (listViewDetails && listViewDetails.d.results.length) {

                        // Get View Fields
                        var listViewId = listViewDetails.d.results[0].Id;
                        var listField = selectedListDetails[indexSelectedLists].Field;
                        var requestViewFieldsUrl = webDetails.Url + "/_api/web/lists(guid'" + listId + "')/Views(guid'" + listViewId + "')/ViewFields";
                        _getDataRest(requestViewFieldsUrl, function (viewFields) {

                            var viewFieldDetails = _getViewFieldsDetails(webDetails.Url, listId, viewFields);
                            var dataTableId = panelID + "_" + indexSelectedLists;

                            // Render External list data.
                            var requestListItemsUrl = "";
                            var camlQuery = "";
                            var renderList = false;

                            // In New/Edit mode, Display items based on View selected
                            if (!isDisplayMode) {

                                renderList = true;
                                if (listInfo.listBaseType == "600") {

                                    requestListItemsUrl = webDetails.Url + "/_api/web/lists(guid'" + listId + "')/items?$top=500&$skiptoken=Paged=TRUE";
                                }

                            } else {

                                // In Display mode, only show selected items
                                var alreadySelectedTag = NWF$(ctrlPanel).find('.mll-dt-config textarea').val().split("##").filter(Boolean);

                                if (listInfo.listBaseType == "600") {

                                    requestListItemsUrl = webDetails.Url + "/_api/web/lists/getbytitle('" + listTitle + "')/items?$select=*&$filter=";

                                    for (var counter = 0; counter < alreadySelectedTag.length; counter++) {

                                        var itemInfo = alreadySelectedTag[counter].split(";").filter(Boolean);
                                        if (configItemId == itemInfo[0]) {

                                            requestListItemsUrl += "(BdcIdentity eq '" + itemInfo[1] + "') or ";
                                            renderList = true;
                                        }
                                    }

                                    requestListItemsUrl = encodeURI(requestListItemsUrl.slice(0, -4));

                                } else {

                                    camlQuery += '<Query><Where><In><FieldRef Name="ID" /><Values>';

                                    for (var counter = 0; counter < alreadySelectedTag.length; counter++) {

                                        var itemInfo = alreadySelectedTag[counter].split(";").filter(Boolean);
                                        if (configItemId == itemInfo[0]) {

                                            camlQuery += '<Value Type="Number">' + itemInfo[1] + '</Value>';
                                            renderList = true;
                                        }
                                    }

                                    camlQuery += '</Values></In></Where></Query>';
                                }
                            }

                            if (renderList) {

                                if (listInfo.listBaseType == "600") {

                                    _getAllItemsRest(requestListItemsUrl, function (resultListItems) {

                                        _addLinkToDefaultField(webDetails.Url, listId, listField, resultListItems);
                                        _renderDataTableHeader(ctrlPanel, viewFieldDetails, dataTableId, configListTitle);
                                        _renderDataTable(ctrlPanel, resultListItems, listField, listInfo, viewFieldDetails, dataTableId, configItemId, tagifyControl, isDisplayMode);

                                    }, function (jqXHR, textStatus, errorThrown) {

                                        console.log('Error getting items for External list with Url: ' + listUrl + '. Details: ' + errorThrown);
                                    });
                                } else {

                                    asyncProcess = true;

                                    _getListItemsFromView(webDetails.Url, listInfo, camlQuery, listView, function (items) {

                                        var itemsValueColl = [];

                                        var listItemEnumerator = items.getEnumerator();
                                        while (listItemEnumerator.moveNext()) {
                                            var lstItem = listItemEnumerator.get_current();
                                            itemsValueColl.push(_getCurrentItemValueColl(webDetails.Url, listInfo, lstItem, viewFieldDetails));
                                        }
                                        _renderDataTableHeader(ctrlPanel, viewFieldDetails, dataTableId, configListTitle);
                                        _renderDataTable(ctrlPanel, itemsValueColl, listField, listInfo, viewFieldDetails, dataTableId, configItemId, tagifyControl, isDisplayMode);
                                        _processNextList(ctrlPanel, selectedListDetails, indexSelectedLists, tagifyControl, isDisplayMode);

                                    }, function (sender, args) {

                                        console.log('An error occured while retrieving ' + listTitle + ' list items:' + args.get_message());
                                        _processNextList(ctrlPanel, selectedListDetails, indexSelectedLists, tagifyControl, isDisplayMode);
                                    });
                                }
                            }
                        }, function (jqXHR, textStatus, errorThrown) {

                            console.log("Error getting view field for View '" + listView + "' of list '" + listTitle + "'. Details: " + errorThrown);
                        });
                    } else {

                        console.log("List View with name '" + listView + "' not found in List '" + listTitle + "'!");
                    }
                }, function (jqXHR, textStatus, errorThrown) {

                    console.log("List View with name '" + listView + "' not found in List '" + listTitle + "'!");
                });
            } else {

                console.log("Selected list '" + listTitle + "' not found!");
            }
        }

        // Process for next List
        if (!asyncProcess) {

            _processNextList(ctrlPanel, selectedListDetails, indexSelectedLists, tagifyControl, isDisplayMode);
        }
    }
    function _getWebDetails(webUrl) {

        var webDetails = {};

        if (webUrl) {
            var requestWebDetailsUrl = _trimTrailingSlash(webUrl) + '/_api/web?$select=Url,ServerRelativeUrl';

            _getDataRest(requestWebDetailsUrl, function (resultWebDetails) {

                if (resultWebDetails) {

                    webDetails.Url = resultWebDetails.d.Url;
                    webDetails.ServerRelativeUrl = resultWebDetails.d.ServerRelativeUrl;
                }
            }, function (jqXHR, textStatus, errorThrown) {

                console.log('Error getting Web with Url: ' + webUrl + '. Details: ' + errorThrown);
            });
        }

        return webDetails;
    }
    function _processNextList(ctrlPanel, selectedListDetails, indexSelectedLists, tagifyControl, isDisplayMode) {

        indexSelectedLists += 1;
        if (indexSelectedLists < selectedListDetails.length) {

            _processListByIndex(ctrlPanel, selectedListDetails, indexSelectedLists, tagifyControl, isDisplayMode);

        } else {

            _changeListSelectionState(ctrlPanel, false);
        }
    }
    function _getViewFieldsDetails(webUrl, listId, viewFields) {

        // Clear Data Table columns
        var viewFieldsDetails = [];
        var requestListFieldsUrl = webUrl + "/_api/web/lists(guid'" + listId + "')/Fields?$select=InternalName,Title,TypeAsString,DisplayFormat&$filter=Hidden eq false";
        _getDataRest(requestListFieldsUrl, function (listFields) {

            NWF$.each(viewFields.d.Items.results, function (index, viewFieldInternalName) {

                var findViewField = _searchObjByProp(listFields.d.results, 'InternalName', viewFieldInternalName);
                if (findViewField.length) {

                    var fieldInternalName = findViewField[0].InternalName;
                    var fieldTitle = findViewField[0].Title;
                    var fieldType = findViewField[0].TypeAsString;

                    if (fieldType === 'DateTime') {
                        var displayFormat = findViewField[0].DisplayFormat;
                        if (displayFormat === 0) {
                            fieldType = 'DateOnly';
                        }
                    }

                    switch (fieldInternalName) {
                        case 'LinkTitle':
                        case 'LinkTitleNoMenu':

                            fieldType = _fieldTypeLinkTitle;
                            break;
                        case 'LinkFilename':
                        case 'LinkFilenameNoMenu':

                            fieldType = _fieldTypeLinkFile;
                            break;
                        case 'DocIcon':

                            fieldType = _fieldTypeDocIcon;
                            break;
                        case 'ContentType':

                            fieldType = _fieldTypeContentType;
                            break;
                        default:
                            break;
                    }

                    viewFieldsDetails.push({
                        "DisplayName": fieldTitle,
                        "InternalName": fieldInternalName,
                        "Type": fieldType
                    });
                }
            });
        }, function (jqXHR, textStatus, errorThrown) {

            console.log('Error getting fields for List with Id: ' + listId + '. Details: ' + errorThrown);
        });

        return viewFieldsDetails;
    }
    function _getCurrentItemValueColl(webUrl, listInfo, currentItem, fieldsInfo) {

        var currentItemColl = {};
        var itemId = currentItem.get_id();
        currentItemColl["ID"] = itemId;

        // Process item fields by their respective type.
        for (var itemCounter = 0; itemCounter < fieldsInfo.length; itemCounter++) {

            var fieldInternalName = fieldsInfo[itemCounter].InternalName;
            var fieldType = fieldsInfo[itemCounter].Type;

            try {

                var skipFieldValue = _skipFieldValues.indexOf(fieldInternalName) !== -1;
                var fieldValue = '';
                if (!skipFieldValue) {
                    fieldValue = currentItem.get_item(fieldInternalName);
                }

                if (skipFieldValue || fieldValue) {

                    switch (fieldType) {
                        case _fieldTypeContentType:

                            currentItemColl[fieldInternalName] = currentItem.get_contentType().get_name();
                            break;
                        case 'User':
                        case 'Lookup':

                            currentItemColl[fieldInternalName] = fieldValue.get_lookupValue();
                            break;
                        case 'URL':

                            currentItemColl[fieldInternalName] = '<a href="' + fieldValue.get_url() + '">' + fieldValue.get_description() + '</a>';
                            break;
                        case 'DateTime':

                            currentItemColl[fieldInternalName] = String.localeFormat('{0:d} {0:t}', new Date(fieldValue));
                            break;
                        case 'DateOnly':

                            currentItemColl[fieldInternalName] = String.localeFormat('{0:d}', new Date(fieldValue));
                            break;
                        case 'UserMulti':
                        case 'LookupMulti':

                            var itemValues = "";
                            for (var counter = 0; counter < fieldValue.length; counter++) {
                                itemValues += fieldValue[counter].get_lookupValue() + ", ";
                            }
                            currentItemColl[fieldInternalName] = itemValues;
                            break;
                        case 'TaxonomyFieldType':

                            currentItemColl[fieldInternalName] = fieldValue.Label;
                            break;
                        case 'TaxonomyFieldTypeMulti':

                            var itemValues = "";
                            fieldValue = fieldValue._Child_Items_;
                            for (var counter = 0; counter < fieldValue.length; counter++) {

                                itemValues += fieldValue[counter].Label + ", ";
                            }
                            currentItemColl[fieldInternalName] = itemValues;
                            break;
                        case 'MultiChoice':

                            var itemValues = "";
                            for (var counter = 0; counter < fieldValue.length; counter++) {

                                itemValues += fieldValue[counter] + ", ";
                            }
                            currentItemColl[fieldInternalName] = itemValues;
                            break;

                        case _fieldTypeDocIcon:

                            currentItemColl[fieldInternalName] = _getIconByFileType(currentItem.get_item('File_x0020_Type'));
                            break;
                        case _fieldTypeLinkFile:

                            // var ext = currentItem.get_item('File_x0020_Type');
                            // var progId = _getProgId(ext);
                            // var checkedOutUser = currentItem.get_item('CheckedOutUserId');
                            // var checkedOutUserId = '';
                            // if (checkedOutUser) {
                            //     checkedOutUserId = checkedOutUser.get_lookupValue() ? checkedOutUser.get_lookupValue() : '';
                            // }
                            var serverUrl = currentItem.get_item('ServerUrl');
                            // var isCheckedoutToLocal = currentItem.get_item('IsCheckedoutToLocal');
                            // var permMask = currentItem.get_item('PermMask');
                            var baseName = currentItem.get_item('BaseName');

                            // currentItemColl[fieldInternalName] = '<a target=\'_blank\' href="' + serverUrl +
                            //     '" onclick="CoreInvoke(\'CallSuiteExtensionControlFactory\', this, event, \'' + ext + '\',\'' + _webUrl + '\',\'' + serverUrl +
                            //     '\');return DispEx(this,event,\'TRUE\',\'FALSE\',\'FALSE\',\'' + progId + '\',\'' + listInfo.defaultItemOpen + '\',\'' + progId + '\',\'\',\'\',\'' +
                            //     checkedOutUserId + '\',\'' + _currentUserId + '\',\'' + Number(listInfo.forceCheckout) + '\',\'' + isCheckedoutToLocal + '\',\'' + permMask + '\')">' +
                            //     baseName + '</a>';
                            currentItemColl[fieldInternalName] = '<a target=\'_blank\' href=\'' + serverUrl + '?web=1\'>' + baseName + '</a>';
                            break;
                        case _fieldTypeLinkTitle:

                            var contentTypeId = currentItem.get_item('ContentTypeId').toString();
                            var linkUrl = webUrl + '/_layouts/15/listform.aspx?PageType=4&ListId=' + listInfo.listId + '&ID=' + itemId + '&ContentTypeID=' + contentTypeId;
                            currentItemColl[fieldInternalName] = '<a onfocus="OnLink(this)" href="' + linkUrl + '" onclick="event.stopPropagation();EditLink2(this,2);return false;" target="_blank" dragid="1" draggable="true">' + fieldValue + '</a>';
                            break;
                        default:

                            currentItemColl[fieldInternalName] = fieldValue;
                            break;
                    }
                }
                else {

                    currentItemColl[fieldInternalName] = "";
                }
            }
            catch (err) {

                currentItemColl[fieldInternalName] = "";
            }
        }

        return currentItemColl;
    }
    function _addLinkToDefaultField(webUrl, listId, listField, listItems) {

        NWF$.each(listItems, function (index, listItem) {

            if (listItem.hasOwnProperty(listField) && listItem[listField]) {

                var itemId = listItem['BdcIdentity'];
                var linkUrl = webUrl + '/_layouts/15/listform.aspx?PageType=4&ListId=' + listId + '&ID=' + itemId;
                listItem[listField] = '<a onfocus="OnLink(this)" href="' + linkUrl +
                    '" onclick="event.stopPropagation();EditLink2(this,0);return false;" target="_blank">' + listItem[listField] + '</a>';
            }
        });
    }
    function _renderDataTableHeader(ctrlPanel, fieldsInfo, dataTableId, listTitle) {

        // Render datatable header and search box control
        var htmlContent = "<p class='mml-dt-title'>" + listTitle + "</p>";
        htmlContent += '<table id="mml-dt-' + dataTableId + '" class="display nowrap" cellspacing="0">';
        htmlContent += '<thead>';
        htmlContent += '<tr>';

        for (var counter = 0; counter < fieldsInfo.length; counter++) {
            htmlContent += '<th>' + fieldsInfo[counter].DisplayName + '</th>';
        }

        htmlContent += '</tr>';
        htmlContent += '</thead>';
        htmlContent += '</table>';

        NWF$(ctrlPanel).find('.mll-dt-container').append(htmlContent);
    }
    function _renderDataTable(ctrlPanel, listItems, listField, listInfo, viewFieldDetails, dataTableId, configItemId, tagifyControl, isDisplayMode) {

        var tableId = "#mml-dt-" + dataTableId;
        var panelID = NWF$(ctrlPanel).attr("data-controlid");

        // Prepare columns to show
        var fieldsToshow = viewFieldDetails.map(function (viewField) {
            return {
                data: viewField.InternalName
            };
        });

        jQuery(tableId).DataTable({
            destroy: true,
            searching: true,
            deferRender: false,
            paging: true,
            ordering: true,
            autoWidth: false,
            scrollX: true,
            aaData: listItems,
            columns: fieldsToshow,
            drawCallback: function (e, settings) {
                _resize(ctrlPanel);
            }
        });

        // Prevent row selection on datatable.  
        if (isDisplayMode) {
            return;
        }

        var table = jQuery(tableId).DataTable();

        // Add value to Textbox upon clicking on any row
        NWF$(tableId + ' tbody').on('click', 'tr', function (e) {

            var data = table.row(this).data();

            // Get value of pre-defined field
            var selectedValue = "";
            if (typeof data[listField] !== "undefined") {

                var element = document.createElement('div');
                element.innerHTML = data[listField];
                selectedValue = element.textContent;
            } else {

                console.log("Default field '" + listField + "' not found");
            }

            // Get selected item id
            var selectedItemId = "";
            if (listInfo.listBaseType == "600") {
                selectedItemId = data.BdcIdentity;
            } else {
                selectedItemId = data.ID;
            }

            var isToBeAdd = false;
            var confirmDuplicate = NWF$(ctrlPanel).find('.mll-duplicate-confirm .nf-calculation-control-value').val();
            var configField = NWF$(ctrlPanel).find('.mll-config-field .nf-calculation-control-value').val();
            if (confirmDuplicate == "0" || !configField) {

                isToBeAdd = true;
            }

            if (confirmDuplicate == "1" && !!configField) {

                var additionalQuery = NWF$(ctrlPanel).find('.mll-duplicate-query .nf-calculation-control-value').val();
                var searchString = configItemId + ';' + selectedItemId + ';';
                var currentItemId = NWF$('#' + ctrlID_ItemID).val();
                var duplicateItems = _isItemExist(searchString, currentItemId, configField, additionalQuery);
                if (duplicateItems.length) {

                    // Store tag details for later use
                    _tagInfo = {};
                    _tagInfo.selectedValue = selectedValue;
                    _tagInfo.selectedItemId = selectedItemId;
                    _tagInfo.configItemId = configItemId;
                    _tagInfo.panelID = panelID;

                    // Open dialog to get User confirmation
                    var requestUrl = _webUrl + _pagesLibraryUrl + "/ConfirmationDialog.aspx";
                    var textMsg = NWF$(ctrlPanel).find('.mll-duplicate-msg .nf-calculation-control-value').val();

                    var dialogData = { message: textMsg, duplicateItems: duplicateItems };

                    _openDialog(requestUrl, 'Existing Change Proposal', dialogData);

                } else {

                    isToBeAdd = true;
                }
            }

            if (isToBeAdd == true) {

                tagifyControl.addTags([{
                    value: selectedValue,
                    readonly: false,
                    title: selectedValue,
                    itemId: selectedItemId,
                    configItemId: configItemId,
                    panelID: panelID
                }]);

                _resetSelectedTagDesign(panelID);
            }
        });
    }
    function _renderSelectedTags(ctrlPanel, tagifyControl) {

        var selectedTags = NWF$(ctrlPanel).find('.mll-dt-config textarea').val().split("##").filter(Boolean);
        var panelID = NWF$(ctrlPanel).attr("data-controlid");

        for (var counter = 0; counter < selectedTags.length; counter++) {

            var selectedTagDetails = selectedTags[counter].split(";").filter(Boolean);

            if (selectedTagDetails && selectedTagDetails.length === 3) {

                tagifyControl.addTags([{
                    value: selectedTagDetails[2],
                    readonly: false,
                    title: selectedTagDetails[2],
                    itemId: selectedTagDetails[1],
                    configItemId: selectedTagDetails[0],
                    panelID: panelID
                }]);
            }
        }
    }
    function _openDialog(tUrl, tTitle, data) {

        var options = {
            url: tUrl,
            title: tTitle,
            allowMaximize: false,
            showClose: false,
            autoSize: true,
            args: data,
            dialogReturnValueCallback: Function.createDelegate(null, function (result, returnValue) {

                if (result === SP.UI.DialogResult.OK) {

                    var dtSearch = _searchObjByProp(_dtMaster, 'panelID', _tagInfo.panelID);

                    if (dtSearch.length) {

                        dtDetails = dtSearch[0];
                        dtDetails.tagifyControl.addTags([{
                            value: _tagInfo.selectedValue,
                            readonly: false,
                            title: _tagInfo.selectedValue,
                            itemId: _tagInfo.selectedItemId,
                            configItemId: _tagInfo.configItemId,
                            panelID: _tagInfo.panelID
                        }]);

                        _resetSelectedTagDesign(_tagInfo.panelID);
                    }
                }
            })
        };

        SP.UI.ModalDialog.showModalDialog(options);
    }

    //#region Events

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
    function _resize(ctrlPanel) {

        var formFillerDivCurrent = NWF.FormFiller.Functions.GetFormFillerDiv();
        var currentControl = NWF$(ctrlPanel).find('.mll-dt');
        var currentTop = NWF$(currentControl).position().top;
        var nextElement = NWF$(currentControl).next();
        var nextTop = NWF$(nextElement).css('top').replace('px', '');
        var currentHeight = 0;
        NWF$(currentControl).children().each(function () {
            currentHeight = currentHeight + NWF$(this).outerHeight(true);
        });
        var heightIncrease = currentHeight - (nextTop - currentTop);
        NWF.FormFiller.Resize.RepositionAndResizeOtherControlsAndFillerContainerHeight(
            currentControl,
            heightIncrease,
            heightIncrease,
            formFillerDivCurrent
        );
    }
    // Process all selected tags and add it to Textbox control
    function _onTagChange(e) {

        var isManualTag = false;
        var panelID = '';
        // Get Panel ID for Manual Tag
        if (e.type === 'add' && !e.detail.data.panelID) {

            isManualTag = true;
            var ctrlTag = NWF$(e.detail.tag);
            var ctrlPanel = NWF$(ctrlTag).closest('.mll-dt-panel.nf-filler-control');
            panelID = NWF$(ctrlPanel).attr("data-controlid");
        }
        else {

            panelID = e.detail.data.panelID;
        }

        var dtSearch = _searchObjByProp(_dtMaster, 'panelID', panelID);

        if (dtSearch.length) {

            dtDetails = dtSearch[0];

            // Remove manual Tag entries
            if (isManualTag) {

                dtDetails.tagifyControl.removeTag();
                return;
            }

            // Set value of Text field
            var allValues = [];
            var allIDs = [];
            var selectedTags = dtDetails.tagifyControl.value;
            if (selectedTags.length > 0) {

                for (var tagcounter = 0; tagcounter < selectedTags.length; tagcounter++) {

                    allValues.push(selectedTags[tagcounter].configItemId + ";" + selectedTags[tagcounter].itemId + ";" + selectedTags[tagcounter].value);
                    allIDs.push(selectedTags[tagcounter].itemId);
                }
            }

            NWF$("div[data-controlid='" + panelID + "']").find('.mll-dt-config textarea').val(allValues.join('##')).change();
            NWF$("div[data-controlid='" + panelID + "']").find('.mll-dt-items textarea').val(allIDs.join(';')).change();
        }
    }

    //#endregion Events

    //#region Helper Methods

    function _getListItemsFromView(webUrl, listInfo, camlQuery, viewTitle, success, error) {

        var ctx = new SP.ClientContext(webUrl);
        var list = ctx.get_web().get_lists().getById(listInfo.listId);
        var view = list.get_views().getByTitle(viewTitle);
        ctx.load(view, 'ViewQuery', 'ViewFields');
        ctx.executeQueryAsync(
            function () {
                var viewQry = '';
                if (camlQuery) {

                    viewQry = "<View>" + camlQuery + "</View>";
                }
                else {

                    viewQry = "<View><Query>" + view.get_viewQuery() + "</Query></View>";
                }

                var viewFields = view.get_viewFields().getEnumerator();
                var collViewFields = [];
                while (viewFields.moveNext()) {
                    var fieldName = viewFields.get_current();
                    collViewFields.push(fieldName);
                }

                collViewFields.push('ContentTypeId');
                if (collViewFields.indexOf('Id') === -1) collViewFields.push('Id');

                if (listInfo.listBaseType == 101) {

                    collViewFields.push('CheckedOutUserId');
                    collViewFields.push('IsCheckedoutToLocal');
                    collViewFields.push('PermMask');
                    collViewFields.push('ServerUrl');
                    collViewFields.push('BaseName');
                    collViewFields.push('File_x0020_Type');
                }

                _getListItems(ctx, list, viewQry, collViewFields, success, error);
            },
            error);
    }
    function _getListItems(ctx, list, queryText, viewFields, success, error) {
        var query = new SP.CamlQuery();
        query.set_viewXml(queryText);
        var items = list.getItems(query);
        ctx.load(items, 'Include(' + viewFields.join(',') + ')');
        ctx.executeQueryAsync(
            function () {
                success(items);
            },
            error
        );
    }
    function _getListDetailsByUrl(webUrl, webRelativeUrl, listUrl) {

        var listInfo = {};
        var listRelativeUrl = _trimTrailingSlash(webRelativeUrl) + '/' + _trimLeadingSlash(listUrl);
        var requestListUrl = webUrl + "/_api/web/getlist('" + listRelativeUrl + "')?$select=Id,ListItemEntityTypeFullName,BaseTemplate,Title,ForceCheckout,SchemaXml";
        _getDataRest(requestListUrl, function (listData) {

            if (listData) {

                listInfo.listId = listData.d.Id;
                listInfo.listBaseType = listData.d.BaseTemplate;
                listInfo.title = listData.d.Title;
                listInfo.schemaXml = listData.d.SchemaXml;
                listInfo.forceCheckout = listData.d.ForceCheckout;

                var schemaXmlDoc = NWF$.parseXML(listData.d.SchemaXml);
                var flagsValue = NWF$(schemaXmlDoc).find('List').attr('Flags');
                var flags = 0;
                if (flagsValue && !isNaN(parseInt(flagsValue))) {
                    flags = parseInt(flagsValue);
                }

                // 1 - Browser, 0 - Client
                listInfo.defaultItemOpen = (flags & 268435456) != 0 ? "1" : "0";
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
    function _getAllItemsRest(requestUrl, successHandler, errorHandler) {

        function getListItems() {
            NWF$.ajax({
                url: requestUrl,
                type: "GET",
                async: false,
                headers: {
                    "accept": "application/json;odata=verbose"
                },
                success: function (data, textStatus, jqXHR) {

                    response = response.concat(data.d.results);
                    if (data.d.__next) {

                        requestUrl = data.d.__next;
                        getListItems();
                    }
                    else {

                        successHandler(response);
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    errorHandler(jqXHR, textStatus, errorThrown);
                }
            });
        }

        var response = [];
        getListItems();
    }
    function _isItemExist(itemValue, currentItemId, configField, additionalQuery) {

        var duplicateItems = [];
        var camlQuery = "<Contains><FieldRef Name='" + configField + "'/><Value Type='Note'>" + itemValue + "</Value></Contains>";

        if (additionalQuery) {

            camlQuery = "<And>" + camlQuery + additionalQuery + "</And>";
        }

        // Add filter for current item
        if (currentItemId) {

            camlQuery = "<And>" + camlQuery + "<Neq><FieldRef Name='ID' /><Value Type='Counter'>" + currentItemId + "</Value></Neq></And>";
        }

        camlQuery = "<Query><Where>" + camlQuery + "</Where></Query>";

        var viewQuery = "<View>" + camlQuery + "<ViewFields><FieldRef Name='Title' /><FieldRef Name='ID' /></ViewFields></View>";
        var data = { "query": { "__metadata": { "type": "SP.CamlQuery" }, "ViewXml": viewQuery } };

        jQuery.ajax({
            url: _webUrl + "/_api/web/lists(guid'" + _currentListID + "')/GetItems",
            async: false,
            method: "POST",
            data: JSON.stringify(data),
            headers: {
                "X-RequestDigest": $("#__REQUESTDIGEST").val(),
                'content-type': 'application/json;odata=verbose',
                'accept': 'application/json;odata=verbose'
            },
            success: function (response) {

                if (response.d.results.length) {

                    isItemExist = true;
                    jQuery.each(response.d.results, function (index, item) {

                        var itemTitle = item.Title;
                        if (!itemTitle) {
                            itemTitle = 'Item ' + item.ID;
                        }
                        var itemUrl = _itemDisplayFormUrl + '?ID=' + item.ID;
                        duplicateItems.push({ itemUrl: itemUrl, title: itemTitle });
                    });
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log('Error checking for Tag duplication with config: ' + itemValue);
                console.error('Error: ' + errorThrown);
            }
        });

        return duplicateItems;
    }
    function _searchObjByProp(objColl, prop, value) {
        return objColl.filter(function (obj) {
            return obj[prop] == value;
        });
    }
    function _trimTrailingSlash(str) {
        if (str.substr(-1) === '/') {
            return str.substr(0, str.length - 1);
        }
        return str;
    }
    function _trimLeadingSlash(str) {
        if (str[0] === '/') {
            return str.substr(1);
        }
        return str;
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
    function _getProgId(fileExt) {

        var progId = '';

        switch (fileExt) {
            // case 'accdt':
            case 'accdb':
            // case 'accdc':
            case 'accde':
            case 'accdr':
            // case 'asax':
            case 'ascx':
            // case 'asmx':
            // case 'asp':
            case 'aspx':
            // case 'bmp':
            // case 'cat':
            // case 'chm':
            // case 'cmp':
            // case 'config':
            // case 'css':
            // case 'db':
            // case 'dib':
            // case 'disc':
            case 'doc':
            case 'docm':
            case 'docx':
            case 'dot':
            case 'dotm':
            case 'dotx':
            // case 'dvd':
            // case 'dwp':
            // case 'dwt':
            // case 'eml':
            // case 'est':
            // case 'fwp':
            // case 'gif':
            // case 'hdp':
            // case 'hlp':
            // case 'hta':
            // case 'htm':
            // case 'html':
            // case 'htt':
            // case 'inf':
            // case 'ini':
            // case 'jfif':
            // case 'jpe':
            // case 'jpeg':
            // case 'jpg':
            // case 'js':
            // case 'jse':
            // case 'log':
            case 'master':
            case 'mht':
            case 'mhtml':
            // case 'mpd':
            case 'mpp':
            // case 'mps':
            case 'mpt':
            // case 'mpw':
            // case 'mpx':
            // case 'msg':
            // case 'msi':
            // case 'msp':
            // case 'ocx':
            case 'odc':
            case 'odp':
            case 'odt':
            case 'ods':
            case 'one':
            case 'onepkg':
            case 'onetoc2':
            // case 'png':
            case 'pot':
            case 'potm':
            case 'potx':
            case 'ppa':
            case 'ppam':
            case 'ppt':
            case 'pptm':
            case 'pptx':
            case 'pps':
            // case 'ppsdc':
            case 'ppsm':
            case 'ppsx':
            // case 'psp':
            // case 'psd':
            // case 'ptm':
            // case 'ptt':
            case 'pub':
            // case 'rsds':
            // case 'rtf':
            // case 'stp':
            // case 'stt':
            // case 'thmx':
            // case 'tif':
            // case 'tiff':
            // case 'txt':
            // case 'vbe':
            // case 'vbs':
            case 'vdw':
            case 'vdx':
            case 'vsd':
            // case 'vsl':
            case 'vss':
            case 'vst':
            // case 'vsu':
            // case 'vsw':
            case 'vsx':
            case 'vtx':
            case 'vsdx':
            case 'vsdm':
            case 'vssm':
            case 'vssx':
            case 'vstm':
            case 'vstx':
            // case 'wdp':
            // case 'webpart':
            // case 'wm':
            // case 'wma':
            // case 'wmd':
            // case 'wmp':
            // case 'wms':
            // case 'wmv':
            // case 'wmx':
            // case 'wmz':
            // case 'wsf':
            case 'xla':
            case 'xlam':
            case 'xls':
            case 'xlsb':
            case 'xlsm':
            case 'xlsx':
            case 'xlt':
            case 'xltb':
            case 'xltm':
            case 'xltx':
            // case 'xml':
            // case 'xps':
            // case 'xsd':
            // case 'xsl':
            case 'xsn':
            // case 'xslt':
            // case 'zip':
            case 'pdf':
                progId = 'SharePoint.OpenDocuments';
                break;
            case 'rdl':
                progId = 'SharePoint.OpenRdlFiles';
                break;
            case 'rsapplication':
                progId = 'SharePoint.OpenRdlbFiles';
                break;
            case 'rsc':
                progId = 'SharePoint.OpenRscFiles';
                break;
            case 'rsd':
                progId = 'SharePoint.OpenRsdFiles';
                break;
            case 'smdl':
                progId = 'SharePoint.OpenSmdlFiles';
                break;
            default:
                break;
        }

        return progId;
    }
    function _getIconByFileType(fileExt) {

        var findIcon = _searchObjByProp(_fileIcons, 'ext', fileExt);
        if (findIcon.length) {

            return findIcon[0].icon;
        }
        else {
            var iconFile = '';
            var requestIconUrl = _webUrl + '/_api/web/maptoicon(filename=\'' + fileExt + '\',progid=\'\',size=0)';
            _getDataRest(requestIconUrl,
                function (iconDetails) {

                    iconFile = '<img src=\'' + _webUrl + '/_layouts/15/images/' + iconDetails.d.MapToIcon + '\'/>';
                },
                function (jqXHR, textStatus, errorThrown) {

                    console.log('Error getting icon for file extension : ' + fileExt + '. Details: ' + errorThrown);
                }
            );

            _fileIcons.push({
                ext: fileExt,
                icon: iconFile
            });

            return iconFile;
        }
    }

    //#endregion Helper Methods

    /* +++ private interface / END +++ */

    /* +++ public interface / START +++ */

    return {

        setup: function () {

            _setup();
        }

    };

    /* +++ public interface / END +++ */

})();

// Initialize
lookup.multilist.datatable.setup();
/* ----- lookup.multilist.datatable.js / END ----- */