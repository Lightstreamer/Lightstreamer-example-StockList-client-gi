/*
Copyright 2013 Weswit Srl

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 *  Subscribe to the known topics on the PageBus and display in order to monitor traffic
 */
jsx3.Package.definePackage("com.tibco.giclient.monitor",function(monitor) {

	//max number of lines inside the monitor
	var monitorDim = 20;
	//subscription handle. Used to unsubscribe	
	var subscription = null;
	
	/**
	 * Receive every notification that goes through the PageBus to show them
	 * on the monitor section
	 */
	monitor.handle = function(subject,message) {
		//get the monitor object (where messages are painted)
		var objOut = com.tibco.giclient.APP.getJSXByName("blkMonitor");
		if(objOut) {
			//get the renderer for that object
			var objGUI = objOut.getRendered();
			if(objGUI) {
				if(objGUI.childNodes.length > monitorDim) {
					//if too much log lines are displayed on screen
					//remove the first one (FIFO)
					objGUI.removeChild(objGUI.firstChild);
				}
				//expand the message received from the PageBus
				var messageString = monitor.expandMessage(message);
				//put the message on screen
				jsx3.html.insertAdjacentHTML(objGUI, "beforeEnd", "<pre class='sysout'>" + subject + " - " + messageString + "</pre>");
				//scroll to the last inserted line
				objGUI.scrollTop = objGUI.lastChild.offsetTop + objGUI.lastChild.offsetHeight;
			}
		}
		
	};
	
	/**
	 * Get an object and expand it to a string
	 */
	monitor.expandMessage = function(message) {
		var type = typeof message;
		if (type == "String" || type == "string") {
			//the object is already a string
			return message;
		}
		var commaFlag = false;
		var messageString = '{ ';
		//iterate through the received object
		for (var i in message) {
			if (commaFlag) {
				messageString += ', ';
			} else {
				commaFlag= true;
			}
			//append a name-value pair for this property
			messageString += '"'+i+'":"'+message[i];
		}
		messageString += ' }';
		return messageString;
	};

	/**
	 * Subscribe to the PageBus ** (everything)
	 */
	monitor.subscribe = function() {
		subscription = PageBus.subscribe("**",monitor,monitor.handle,null);
	};
	
	/**
	 * Unsubscribe from the PageBus
	 */
	monitor.unsubscribe = function() {
		PageBus.unsubscribe(subscription);
	};
	
  
});



