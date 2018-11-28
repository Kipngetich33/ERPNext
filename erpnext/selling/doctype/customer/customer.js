// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// License: GNU General Public License v3. See license.txt

frappe.ui.form.on("Customer", {
	setup: function(frm) {
		frm.add_fetch('lead_name', 'company_name', 'customer_name');
		frm.add_fetch('default_sales_partner','commission_rate','default_commission_rate');
		frm.set_query('customer_group', {'is_group': 0});
		frm.set_query('default_price_list', { 'selling': 1});
		frm.set_query('account', 'accounts', function(doc, cdt, cdn) {
			var d  = locals[cdt][cdn];
			var filters = {
				'account_type': 'Receivable',
				'company': d.company,
				"is_group": 0
			};

			if(doc.party_account_currency) {
				$.extend(filters, {"account_currency": doc.party_account_currency});
			}
			return {
				filters: filters
			}
		});

		if (frm.doc.__islocal == 1) {
			frm.set_value("represents_company", "");
		}

		frm.set_query('customer_primary_contact', function(doc) {
			return {
				query: "erpnext.selling.doctype.customer.customer.get_customer_primary_contact",
				filters: {
					'customer': doc.name
				}
			}
		})
		frm.set_query('customer_primary_address', function(doc) {
			return {
				query: "erpnext.selling.doctype.customer.customer.get_customer_primary_address",
				filters: {
					'customer': doc.name
				}
			}
		})
	},
	customer_primary_address: function(frm){
		if(frm.doc.customer_primary_address){
			frappe.call({
				method: 'frappe.contacts.doctype.address.address.get_address_display',
				args: {
					"address_dict": frm.doc.customer_primary_address
				},
				callback: function(r) {
					frm.set_value("primary_address", r.message);
				}
			});
		}
		if(!frm.doc.customer_primary_address){
			frm.set_value("primary_address", "");
		}
	},

	is_internal_customer: function(frm) {
		if (frm.doc.is_internal_customer == 1) {
			frm.toggle_reqd("represents_company", true);
		}
		else {
			frm.toggle_reqd("represents_company", false);
		}
	},

	customer_primary_contact: function(frm){
		if(!frm.doc.customer_primary_contact){
			frm.set_value("mobile_no", "");
			frm.set_value("email_id", "");
		}
	},

	loyalty_program: function(frm) {
		if(frm.doc.loyalty_program) {
			frm.set_value('loyalty_program_tier', null);
		}
	},

	refresh: function(frm) {
		if(frappe.defaults.get_default("cust_master_name")!="Naming Series") {
			frm.toggle_display("naming_series", false);
		} else {
			erpnext.toggle_naming_series();
		}

		frappe.dynamic_link = {doc: frm.doc, fieldname: 'name', doctype: 'Customer'}
		frm.toggle_display(['address_html','contact_html','primary_address_and_contact_detail'], !frm.doc.__islocal);

		if(!frm.doc.__islocal) {
			frappe.contacts.render_address_and_contact(frm);

			// custom buttons
			frm.add_custom_button(__('Accounting Ledger'), function() {
				frappe.set_route('query-report', 'General Ledger',
					{party_type:'Customer', party:frm.doc.name});
			});

			frm.add_custom_button(__('Accounts Receivable'), function() {
				frappe.set_route('query-report', 'Accounts Receivable', {customer:frm.doc.name});
			});

			frm.add_custom_button(__('Pricing Rule'), function () {
				erpnext.utils.make_pricing_rule(frm.doc.doctype, frm.doc.name);
			}, __("Make"));

			// indicator
			erpnext.utils.set_party_dashboard_indicators(frm);

			//
			if (frm.doc.__onload.dashboard_info.loyalty_point) {
				frm.dashboard.add_indicator(__('Loyalty Point: {0}', [frm.doc.__onload.dashboard_info.loyalty_point]), 'blue');
			}

		} else {
			frappe.contacts.clear_address_and_contact(frm);
		}

		var grid = cur_frm.get_field("sales_team").grid;
		grid.set_column_disp("allocated_amount", false);
		grid.set_column_disp("incentives", false);
	},
	validate: function(frm) {
		if(frm.doc.lead_name) frappe.model.clear_doc("Lead", frm.doc.lead_name);
	},
});

// custom scripts below
// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
/*general functions section*/
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
// global variables
var latest_customer_sys_no = 0

// end of global varibles section

// function creates a new project
function create_new_project(){
	if(cur_frm.doc.status == "Pending Application"){
		frappe.route_options = {"system_no":cur_frm.doc.system_no,"customer":cur_frm.doc.customer_name}
		frappe.set_route("Form", "Project","New Project 1")
	}
	else{
		alert_message("Cannot Create Project for a Customer whose Status is not Pending")
	}

} 

// function that supercedes the doctype
function supercede_function(){
	cur_frm.copy_doc()
}

// function that creates an alert message
function alert_message(message_to_print){
	msgprint(message_to_print)
}

// alert function
function alert_new_project(alert_message){
	frappe.confirm(
		alert_message,
		function(){
			// create a new project
			frappe.route_options = {"system_no":cur_frm.doc.system_no,"customer":cur_frm.doc.customer_name}
			frappe.set_route("Form", "Project","New Project 1")
		}
	)
}


// function that sets filters for the different territory fields
function set_country(territory_field,type_of_territory){
	cur_frm.set_query(territory_field, function() {
		return {
			"filters": {
				"type_of_territory": type_of_territory
			}
		}
	});
}

// function that sets custom buttons for the customer
function add_custom_buttons(button_name,new_status){
	cur_frm.add_custom_button(__(button_name), function(){
		
		if(new_status == "Supercede"){
			console.log("super seeed")
			if(cur_frm.doc.status == "Terminated" || cur_frm.doc.status == "Inactive"){
				alert_function("Do you want to supercede this account",supercede_function)
				
			}
			else{
				// alert the user that the account cannot be superseded
				alert_message("You Cannot Supercede This Account")
			}
		}
		else{
			cur_frm.set_value("status", new_status)
			cur_frm.save();
		}
	},__("Customer Management Menu"));
}

// function that sets filters for the different territory fields
function filter_field(field,filter_name1,filter_name2){
	cur_frm.set_query(field, function() {
		return {
			"filters": {
				category_of_warehouse:filter_name2
			}
		}
	});
}



/*frappe call function that gets a docytype without filters*/
function get_doctype_without_filters(requested_doctype){
	frappe.call({
		method: 'frappe.client.get',
		args: {
			doctype:requested_doctype,
		},
		callback: function(response) {
			return response
		}
	});

}

/*functions that checks whether a customer number exists*/
function if_system_number(){
	if(cur_frm.doc.system_no){
		return true
	}
	else{
		return false
	} 
}
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
/*end of the general functions section*/


/*section below contains field triggered functions*/
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
/*Functionality that sets the value of form query 'route' 
to show only routes*/
frappe.ui.form.on("Customer", "refresh", function(frm) {
	console.log("Running through js")
	
	// sets the value of the country/territory query field
	set_country("territory","Country")
	set_country("area","Area")
	set_country("zone","Zone")
	set_country("route","Route")
	// end of set territory field details

	// add custom buttons
	add_custom_buttons("Activate","Active")
	add_custom_buttons("Inactivate","Inactive")
	add_custom_buttons("Reconnect","Reconnected")
	add_custom_buttons("Disconnect","Disconnected")
	add_custom_buttons("Terminate","Terminated")
	add_custom_buttons("Supercede","Supercede")

	// filter dma by warehouse dma
	// filter_field("dma","DMA Bulk Meter - UL")
	filter_field("dma","DMA Bulk Meter - UL","DMA(Bulk Meter)")
	
});


/* this code fetches the customer name and the project name and 
creates a new project using those details*/
frappe.ui.form.on("Customer", "new_project", function(frm) {
	if(cur_frm.doc.status == "Pending Application"){
		cur_frm.save()
		alert_new_project("Create New Project")
	}
	else{
		alert_message("Cannot Create Project for a Customer whose Status is not Pending")
	}
});


/*save function */
frappe.ui.form.on("Customer", "create_application", function(frm) {
	if(cur_frm.doc.status == "Pending Application"){
		cur_frm.save()
		alert_new_project("Create New Project")
	}
	else{
		alert_message("Cannot Create Project for a Customer whose Status is not Pending")
	}
	
});
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
/*End of the field triggered functions*/
