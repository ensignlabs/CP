jQuery.expr[':'].Contains = function(a,i,m){return (a.textContent || a.innerText || "").toUpperCase().indexOf(m[3].toUpperCase())>=0;};

jQuery(document).ready(function(){
	jQuery("input.search").change(function() {
		var txt = jQuery("input.search").val();
	
		if (txt) {
			jQuery("#WebPartWPQ3").find("td:not(:Contains("+txt+"))").parent("tr").hide();
			jQuery("#WebPartWPQ3").find("td:Contains("+txt+")").parent("tr").show();
		} else {
			jQuery("#WebPartWPQ3").find("td").parent("tr").show();
		}
	}).keyup(function(){
		jQuery(this).change();
	});
});
