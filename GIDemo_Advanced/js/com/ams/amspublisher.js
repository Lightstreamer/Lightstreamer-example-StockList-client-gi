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

jsx3.Package.definePackage("com.ams.amspublisher",function(amspublisher) {

  //resolve the path of AMS' web client libraries
  var enginePath = jsx3.resolveURI("jsxapp://GIAMSDemo/js/ls/");
  //configured bandwidth
  var actualBW;
  //LightstreamerClient object
  var lsClient = null;
  //Subscription objects
  var rowSubs;
  
  /**
   * Initialize the amspublisher
   */
  amspublisher.init = function(lsHost,lsDomain,lsPort,bandwidth) {

    if (location.href.indexOf("file:///") == 0) {
      //we are probably inside the GI builder so that AMS' Web Client cannot work
      alert("Run the application from the Web Server to be able to connect to the Push Server.")
      return;
    }

    //copy the given bandwidth in a variable
    actualBW = bandwidth;
    //create or attach a LS client
    lsClient = new LightstreamerClient("http://" + lsHost + ":" + lsPort,"DEMO");
    lsClient.connectionSharing.enableSharing("GI_DemoCommonConnection", "ATTACH", "CREATE");
    
    //////////////// (OPTIONAL) Visual Status Notification
    lsClient.addListener(new StatusWidget("right", "0px", true));
    
    lsClient.connectionOptions.setMaxBandwidth(actualBW);
    
    lsClient.addListener({onServerError: function(code, mec) {
        PageBus.publish("AMS.error","Server error! Code:" + code + " -> " + mex);
      },
      onStatusChange: function(newStatus) {
        //publish the new Status to the PageBus 
        PageBus.publish("AMS.status",newStatus);  
      },
      onPropertyChange: function(propertyName) {
        PageBus.publish("AMS.warning","Changed value for " + propertyName + " property.");  
      }
    });
    
    lsClient.connect();
        
    //subscribe to the PageBus "publisher.start" subject in order to start publishing as requested.
    PageBus.subscribe("publisher.start",amspublisher,amspublisher.start);
    //subscribe to the PageBus "publisher.stop" subject in order to stop publishing as requested.
    PageBus.subscribe("publisher.stop",amspublisher,amspublisher.stop);
    //subscribe to the PageBus "publisher.bandwidth" subject in order to change the max bandwith as requested.
    PageBus.subscribe("publisher.bandwidth",amspublisher,amspublisher.changeBW);
  }
  
  /**
   * starts the publishing of events for an item
   */
  amspublisher.start = function(subject,publisherData) {
    //the requested item
    var item = new Array(publisherData.item);
    //the requested schema
    var fields = publisherData.schema;
    
    //create the table to be subscribed to on the push server
    var subscription = new Subscription("MERGE", item, fields);
		subscription.setDataAdapter("QUOTE_ADAPTER");
    //the snapshot is needed to give a complete view to the user
    subscription.setRequestedSnapshot('yes');
    //this method is called on each item update
    
    
    subscription.addListener({ onItemUpdate: function(info) {
        //format and serialize the updates
        var updateObj = amspublisher.serializeAndFormat(info,info.getItemName());
      
        //publish the update to the PageBus
        PageBus.publish("AMS.topic."+info.getItemName(),updateObj);
      }
    });
    
    //subscribe to the table on the push server. page id is also used to index
    //the subscription inside the PushPage object
    lsClient.subscribe(subscription);
    
    if ( !rowSubs ) {
      rowSubs = new Array(30);
    }
    rowSubs[item[0].substring(4)] = subscription;
  }
  
  amspublisher.serializeAndFormat = function(itemObj,itemName) {
    //create an object in order to fill it with update values
    var updateObj = {};
    //the itemName is used as the jsxid
    updateObj.jsxid = itemName;
    updateObj.stock_name = itemObj.getValue("stock_name");
    updateObj.last_price = amspublisher.format2Dec(itemObj.getValue("last_price")); 
    updateObj.time = amspublisher.formatTime(itemObj.getValue("time")); 
    updateObj.pct_change = amspublisher.formatPerc(itemObj.getValue("pct_change")); 
    updateObj.bid_quantity = itemObj.getValue("bid_quantity"); 
    updateObj.bid = amspublisher.format2Dec(itemObj.getValue("bid"));
    updateObj.ask = amspublisher.format2Dec(itemObj.getValue("ask"));
    updateObj.ask_quantity = itemObj.getValue("ask_quantity");
    updateObj.min = amspublisher.format2Dec(itemObj.getValue("min"));
    updateObj.max = amspublisher.format2Dec(itemObj.getValue("max"));
    updateObj.open_price = amspublisher.format2Dec(itemObj.getValue("open_price"));
    updateObj.ref_price = amspublisher.format2Dec(itemObj.getValue("ref_price"));
    
    return updateObj;
  }
  
  /**
   * stop the publishing of events for an item
   */
  amspublisher.stop = function(subject,publisherData) {
    //unsubscribe from the table.
    
    lsClient.unsubscribe(rowSubs[new String(publisherData).substring(4)]); 
  }
  
  /**
   * change the max bandwith of the current/next connection to the push server
   */
  amspublisher.changeBW = function(subject,newBW) {
  
    actualBW = newBW;
    if (lsClient != null) {
      lsClient.connectionOptions.setMaxBandwidth(actualBW);
    } else {
      PageBus.publish("AMS.warning","LightstreamerEngine not available. New bandwidth value stored for future use.");
    }
  }
        
  amspublisher.format2Dec = function(val) {
    var conv = new Number(val);
    return conv.toFixed(2);
  }
  
  amspublisher.formatPerc = function(val) {
    val = amspublisher.format2Dec(val);
    if (val > 0) {
      val = "+" + val;
    }
    return val;
  }
  
  amspublisher.formatTime = function(val) {
    var a = new Number(val.substring(0,val.indexOf(":")));
    if (a > 12) {
      a -= 12;
    }
    var b = val.substring(val.indexOf(":"),val.length);
    return a + b;
  }

});
