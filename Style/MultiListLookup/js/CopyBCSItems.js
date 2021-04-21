<script type="text/javascript" src="/apps/CR/Style%20Library/MultiListLookup/js/jquery.min.js"></script>
<script type="text/javascript">
var BCSArray = [];
var BCSRepArray = [];
var _webUrl ='';
var clientContext = '';
var BCSReplicaListName ='BCSList_Replica';
var BCSListName = 'BCSList';

$(function(){
	// Load sp.js and call function
	SP.SOD.executeFunc('sp.js', 'SP.ClientContext', CRUD_BCSRepList);
		_webUrl = _spPageContextInfo.webAbsoluteUrl;
});

		// Synchronize data between BCSList and BCS_Replica List
		function CRUD_BCSRepList(){
			// Call function per 3 second(Job Scheduler) 
			setInterval(function(){	
		clientContext = new SP.ClientContext(_webUrl);  
        var BCSRepList = clientContext.get_web().get_lists().getByTitle(BCSReplicaListName);  
			var requestUri = _webUrl +"/_api/web/lists/getbyTitle('"+BCSListName+"')/items?$select=ADUser,Title,BdcIdentity";
				$.ajax({
					url: requestUri,
					type: "GET",
					headers: { "ACCEPT": "application/json;odata=verbose" },
					success: function (data) {
						if(data.d.results.length>0){
							BCSArray = data.d.results;
							var reqUri = _webUrl +"/_api/web/lists/getbyTitle('"+BCSReplicaListName+"')/items?$select=BCSItemID,ID";
								$.ajax({
									url: reqUri,
									type: "GET",
									headers: { "ACCEPT": "application/json;odata=verbose" },
									success: function (Repdata) {
										//If new data added in BCSList, add in BCS_REplica list 
										if(Repdata.d.results.length>0){
											BCSRepArray = Repdata.d.results;
											var CompValArray = BCSArray.filter(obj => !BCSRepArray.find(x => x.BCSItemID === obj.BdcIdentity));
											for(var i =0; i < CompValArray.length; i++){
											var itemCreateInfo = new SP.ListItemCreationInformation();  
											var oListItem = BCSRepList.addItem(itemCreateInfo);  
											oListItem.set_item('ADUser', CompValArray[i].ADUser);  
											oListItem.set_item('Title', CompValArray[i].Title);  
											oListItem.set_item('BCSItemID', CompValArray[i].BdcIdentity);  
											oListItem.update();  
											clientContext.load(oListItem);  
											}
											clientContext.executeQueryAsync(function(){}, function(sender,erre){console.log("Adding BCS_Replica data: "+ erre.message);});  
										}
										else{	
											//Add items in new/empty BCS_REplica list 
											for(var i =0; i < BCSArray.length; i++){										
											var itemCreateInfo = new SP.ListItemCreationInformation();  
											var oListItem = BCSRepList.addItem(itemCreateInfo);  
											oListItem.set_item('ADUser', BCSArray[i].ADUser);  
											oListItem.set_item('Title', BCSArray[i].Title);  
											oListItem.set_item('BCSItemID', BCSArray[i].BdcIdentity);  
											oListItem.update();  
											clientContext.load(oListItem);  
											}
											clientContext.executeQueryAsync(function(){}, function(sender,erre){console.log("Adding BCS_Replica data in empty list: "+ erre.message);});										
										}
										if(Repdata.d.results.length > BCSArray.length){
											//Delete items from BCS_REplica list, if not exist in BCSList
											var CompValArray = BCSRepArray.filter(obj => !BCSArray.find(x => x.BdcIdentity === obj.BCSItemID));
											for(var i =0; i < CompValArray.length; i++){
											var item = BCSRepList.getItemById(CompValArray[i].ID);
											item.deleteObject();
											}
											clientContext.executeQueryAsync(function(){}, function(sender,erre){console.log("Deleting BCS_Replica data: "+ erre.message);}); 
										}
									},
									error: function (ex) { console.log(ex.message); }
									});
						}
						
					},
					error: function (exx) { console.log(exx.message); }
				});
		}, 3000);
		}
</script>