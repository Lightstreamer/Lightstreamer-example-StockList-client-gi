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
 * Controller for the application. Configure various UI components an subscribes/publishes to various
 * topics on the PageBus
 */
jsx3.Package.definePackage("com.tibco.giclient",function(giclient) {

//CONFIGURATION 

  //PART 1 - it is possible to change the parameters below at run-time.
  
  //true to let the application repaint single cell, false to repaint the entire matrix 
  //at each update
  var incremental_repaint = true;
  //establish the refresh rate for the view (how often updates will render to the screen)
  //admitted values (milliseconds):  0 - 1000 - 2000 - 3000 - 4000
  //0 means realtime so that the view is updated as often as the model
  var refresh_rate = 1000;
  //when incremental_repaint is true this flag indicates the highlight policy
  //0->No higlighting 1->Simple higlighting 2->Fade higlighting
  var highlight_type = 1;
  //number of stocks subscribed on startup (min 0, max 30)
  var startSubscribing = 8;
  //number of columns to display on startup (min 1, max 12)
  var num_columns = 8;
  //initial maximum requested bandwidth (between 0.5 and 10, with increment of 0.5)
  // 10 is transformed to unlimited bandwidth
  var bandwidth = 10;
  //how many milliseconds any cell should be kept highlighted after an update
  var highlightTime = 500;
  //how many milliseconds the fade effect should last
  var fadeTime = 800;
  
  //PART 2 - static configuration
  
  //two arrays containg the dimension of the layout when monitor is active and inactive
  var showMonitorArray = new Array(30,"*",30,230);
  var hideMonitorArray = new Array(30,"*",30,40);
  //the host of the push server. null means "the same host as the web server"
  var lsHost = null;
  //must be set if lsHost above is different from null.
  //e.g. web-server:www.myComp.com push-server:push.myComp.com domain:myComp.com
  var lsDomain = null;
  //the port of the push server. null means "the same port as the web server"
  var lsPort = null;
  
  // flexible deployment; auto-detects the hostnames and domains for a couple
  // of possible deployment scenarios
  var host = location.hostname.toLowerCase();
  if (host.indexOf("lightstreamer.com") != -1 ) {
    // pick a random Push Server name, because this connection is not shared
    lsHost = "push.lightstreamer.com";
    lsPort = 80;
  } else if (host.indexOf("tibco.com") != -1 ) {
    lsHost = "ams-pushserver.tibco.com";
    lsPort = 80;
  } else if (host.indexOf("test.lightstreamer.it") != -1 ) {
    lsHost = "test.lightstreamer.it";
    lsPort = 80;
  } else {
    lsHost = "localhost";
    lsPort = 8080;
  }
  
//PRIVATE VARIABLES
  
  //a map containing the handles relative to subscriptions to the PageBus (needed for unsubscriptions)
  var subscriptions = {};
  //needed for delayed view update with incremental_repaint false
  var timeoutid = null;
  //needed for delayed view update with incremental_repaint true
  var timeouthash = {};
  //needed for simple highlighting handling
  var globalTurnOffPhase = 0;
  //available fields/columns
  var fields = new Array("stock_name","last_price","time","pct_change","bid_quantity","bid","ask","ask_quantity","min","max","ref_price","open_price");
  //text to show on the column headers
  var columnNames = new Array("Name","Last","Time","Change (%)","Bid Size","Bid","Ask","Ask Size","Min","Max","Ref","Open");
  //keep the order of the columns inside the view
  var columnIndex = new Array(0,1,2,3,4,5,6,7,8,9,10,11);
  //number of non-data column inside the matrix
  var columnOffset = 1;
  //xslt for the "Change" column
  var c3vt ='<xsl:template xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:choose><xsl:when test="{0}&lt;0"><span style="color:red;font-weight:bold;"><xsl:value-of select="{0}"/></span></xsl:when><xsl:otherwise><span style="color:green;font-weight:bold;"><xsl:value-of select="{0}"/></span></xsl:otherwise></xsl:choose></xsl:template>';
  //xslt for other columns (ovverrides the default template which puts a space before the values)
  var covt ='<xsl:template xmlns:xsl="http://www.w3.org/1999/XSL/Transform"><xsl:value-of select="{0}"/></xsl:template>';

//INITIALIZATION METHOD
  
  /**
   * Called by the onload event for the application. Initialize state.
   */
  giclient.init = function() {
    //the following is a public method in GI 3.3, but in case this app is running on 3.2, add here to extend the matrix
    if(jsx3.getVersion() == "3.2.0") {
      giclient.getTable().getContentElement = function(strCdfId,strAttName) {
        var obj;
        var objDChildren = this.getChildren();
        for(var i=0;i<objDChildren.length;i++) {
          if(objDChildren[i].getPath() == strAttName) {
            var strId = this.getId() + "_jsx_" + strCdfId + "_jsx_" + i;
            var objDoc = this.getDocument();
            obj = objDoc.getElementById(strId);
            break;
          }
        }
    
        if(obj) {
          if(obj.cellIndex == 0 && this.getRenderingModel() == "hierarchical" && this.getRenderNavigators(1) != 0) {
            var objTbl = obj.childNodes[0].childNodes[0];
            while(objTbl && objTbl.tagName.toLowerCase() != "tr") objTbl = objTbl.childNodes[0];
            if(objTbl) return objTbl.lastChild;
          } else {
            return obj.childNodes[0];
          }
        }
      };
    }
    
    //listen to cdf.error to alert for configuration error
    var tempErrorListener = PageBus.subscribe("cdf.error",giclient,giclient.listenToAlert,null);
    //validate the configuration parameters
    giclient.validateConfiguration();
    //confguration validated, unsubscribe from cdf.error
    PageBus.unsubscribe(tempErrorListener);
    
    //INITIALIZE GUI
    
    //initialize the radio buttons 
    giclient.initializeRadio();
    
    //initialize the sliders
    giclient.initializeSliders();
  
    //initialize the table columns
    giclient.adjustColumnCount(num_columns);
    
    //initialize AMS publisher 
    com.ams.amspublisher.init(lsHost, lsDomain, lsPort, bandwidth == 10 ? "unlimited" : bandwidth);
  
    //subscribe to the first stocks
    for (var i=1; i<=startSubscribing; i++) {
      giclient.getTable().adoptRecord("stocks","item"+i);
      giclient.subscribe("item"+i);
    }
  };
  
  /**
   * show an alert (used to warn about configuration errors)
   */
  giclient.listenToAlert = function(subject,message) {
    alert("Configuration error:\n"+message);
  }
  
  /**
   * validate the configured values 
   */
  giclient.validateConfiguration = function() {
    if (incremental_repaint != true && incremental_repaint != false) {
      PageBus.publish("cdf.error","Incremental repaint should be true or false, " + incremental_repaint + " is not valid");
      incremental_repaint = true;
    }
    
    refresh_rate = giclient.validateValue("refresh_rate",refresh_rate,0,4000,1000,1000);
    highlight_type = giclient.validateValue("highlight_type",highlight_type,0,3,1,1);
    startSubscribing = giclient.validateValue("startSubscribing",startSubscribing,0,30,1,8);
    num_columns = giclient.validateValue("num_columns",num_columns,1,12,1,6);
    bandwidth = giclient.validateValue("bandwidth",bandwidth,0.5,10,0.5,3);
  }
  
  /**
   * validate a value
   */
  giclient.validateValue = function(name,val,min,max,step,def) {
    if (val < min) {
      PageBus.publish("cdf.error","Minimum value for "+ name + " is " + min + ". " + val + " is not a valid value (" + def + " will be used");
      return def;
    } else if (val > max) {
      PageBus.publish("cdf.error","Maximum value for "+ name + " is " + max + ". " + val + " is not a valid value (" + def + " will be used");
      return def;
    } else if ((val % step) != 0) {
      PageBus.publish("cdf.error",name + " should be a multiple of " + step + ". " + val + " is not a valid value (" + def + " will be used");
      return def;
    }
    return val;
  }

//GUI HANDLING
  
  /**
   * Initialize slider values and text.
   * Register functions necessary to constrain the slider objects used by the app.
   */
  giclient.initializeSliders = function() {
    //REFRESH RATE SLIDER
    //allow between 0 and 4 seconds for the refresh rate (0 means real-time updates)
    giclient.APP.getJSXByName("sldRR").setValue((refresh_rate/1000)*25);
    giclient.APP.getJSXByName("sldRR").constrainValue = function(fpValue) {
      return Math.max(0, Math.min(100, jsx3.util.numRound(fpValue,25)));
    };
    if (refresh_rate == 0) {
      giclient.APP.getJSXByName("blkRR").setText("<span class='slidervalue'>Real-Time</span>",true);
    } else {
      giclient.APP.getJSXByName("blkRR").setText("Refresh every <span class='slidervalue'>"+refresh_rate/1000+"</span> seconds (throttle)",true);
    }
  
    //COLUMNS SLIDER
    //allow between 1 and 12 data columns to be displayed
    giclient.APP.getJSXByName("sldCC").setValue((num_columns-1)*9);
    giclient.APP.getJSXByName("sldCC").constrainValue = function(fpValue) {
      return Math.max(0, Math.min(100, jsx3.util.numRound(fpValue,9)));
    };
    giclient.APP.getJSXByName("blkCC").setText("Display <span class='slidervalue'>"+num_columns+"</span> columns",true);
    
    //BANDWIDTH SLIDER
    //set the slider value to the configured bandwidth
    giclient.APP.getJSXByName("sldBM").setValue((bandwidth-0.5)*10.5);
      
    giclient.APP.getJSXByName("sldBM").constrainValue = function(fpValue) {
      return Math.max(0, Math.min(100, jsx3.util.numRound(fpValue,5.25)));
    }
    //set the text above the slider to the configured bandwidth
    com.tibco.giclient.APP.getJSXByName("blkBM").setText("Bandwidth: <span class='slidervalue'>"+(bandwidth == 10 ? 'unlimited' : bandwidth)+"</span> kilobits per second",true);
    
  };
  
  /**
   * Initialize radio buttons
   */
  giclient.initializeRadio = function() {
    //initialize the incremental_repaint radio
    giclient.APP.getJSXByName("rdo1").setGroupValue(new String(incremental_repaint));
    //initialize the highlight_type radio (the value of this radio depends on the 
    //value of the incremental_repaint one)
    giclient.enableHighlightType(incremental_repaint);
    //giclient.APP.getJSXByName("ht3").setEnabled(jsx3.gui.Form.STATEDISABLED,true);
  }
  
  /**
   * Enable/disable the highlight_type radio buttons
   * (radio is disabled when incremental_repaint is false)
   */
  giclient.enableHighlightType = function(enable) {
    if (enable) {
      //enable the disabled radio buttons (simple highlight and fade)
      giclient.APP.getJSXByName("ht2").setEnabled(jsx3.gui.Form.STATEENABLED,true);
      //giclient.APP.getJSXByName("ht3").setEnabled(jsx3.gui.Form.STATEDISABLED,true);
      //set the radio to its original value (the value the radio had before being
      //disabled)
      giclient.APP.getJSXByName("ht1").setGroupValue(highlight_type);
    } else {
      //disable simple highlight and fade radio buttons
      giclient.APP.getJSXByName("ht2").setEnabled(jsx3.gui.Form.STATEDISABLED,true);
      //giclient.APP.getJSXByName("ht3").setEnabled(jsx3.gui.Form.STATEDISABLED,true);
      //set the radio to the "No highlight" value
      giclient.APP.getJSXByName("ht1").setGroupValue(0);      
    }
  }
  
  /**
   * event handler that updates the refresh rate variable. 0 means real-time
   */
  giclient.updateRefreshRate = function(newRate) {
    //we don't need any check since the value is constrained by our custom 
    //function (see initializeSliders method)
    refresh_rate = (newRate/25)*1000;
  }
  
  /**
   * event handler that updates the requested max bandwidth
   */
  giclient.updateBandwidth = function(newBandwidth) {
    //we don't need any check since the value is constrained by our custom 
    //function (see initializeSliders method)
    
    console.log("gi BW: " + newBandwidth);
    
    PageBus.publish("publisher.bandwidth",newBandwidth);
  };
  
  /**
   * event handler that updates the incremental_repaint variable.
   */
  giclient.updateIncrementalRepaint = function(newVal) {
    //the received value is "true" or "false" as strings
    //make an eval to convert them to true false variables
    incremental_repaint = eval(newVal);
    //update the status of the highlight_type radio (if incremental_repaint
    //is false only "No highlight" will be available)
    giclient.enableHighlightType(incremental_repaint);
  }

  /**
   * event handler that updates the highlight_type variable.
   */
  giclient.updateHighlightType = function(type) {
    //the received value is 0, 1 or 2 
    highlight_type = type;
  };
  
  /**
   * Event handler that is fired on click on the monitor's checkbox
   */
  giclient.enableMonitor = function(show) {
    if (show) {
      //enable the logging on the monitor
      com.tibco.giclient.monitor.subscribe();
      //change the layout to show the monitor
      giclient.APP.getJSXByName("mainLayout").setDimensionArray(showMonitorArray,true);
    } else {
      //disable the logging on the monitor
      com.tibco.giclient.monitor.unsubscribe();
      //change the layout to hide the monitor
      giclient.APP.getJSXByName("mainLayout").setDimensionArray(hideMonitorArray,true);
    }
  }
  
  

//GUI HANDLING / MATRIX & TREE
  
  /**
   * Return the matrix instance that will display the published data
   */
  giclient.getTable = function() {
    return giclient.APP.getJSXByName("matrix1");
  };
  
  /**
   * Return the tree instance that will display the available stocks
   */
  giclient.getTree = function() {
    return giclient.APP.getJSXByName("stocks");
  };
  
  /**
   * event handler that increases/decreases the number of columns in the data table 
   * (is called also on initialization)
   */
  giclient.adjustColumnCount = function(intCount) {
    //we don't need any check since the value is constrained by our custom 
    //function (see initializeSliders method)

    //display a "Loading..." message
    giclient.APP.getJSXByName("loadingLabel").setVisibility(jsx3.gui.Block.VISIBILITYVISIBLE,true);
    //shift the value for fixed non-data column(s)
    intCount+=columnOffset;
    setTimeout(function() {
      //get the table and read the actual number of displayed columns   
      var _table = com.tibco.giclient.getTable();
      var curCount = _table.getChildren().length;
      if (curCount < intCount) {
        //add columns until the requested number of columns matches the number of
        //displayed columns
        for(var i=curCount; i<intCount; i++) {
          //load a column template (don't repaint the matrix, we will
          //repaint everything at once later)
          var column = _table.loadAndCache("components/column.xml",false);
          //since columns can be reordered we need to know which column
          //we are adding
          var cID = columnIndex[i-columnOffset];
          //put the column name in the header of the column. Since column
          //names are right aligned we need to put some spaces to avoid the
          //overlap of the sort arrow with the column name
          column.setText(columnNames[cID]+"&nbsp;&nbsp;&nbsp;");
          //set the path for the column (the path mades the coupling
          //between CDF update objects and the view)
          column.setPath(fields[cID]); 
          
          if (cID == 3) {
            //the third column (pct_change) needs an XSLT to paint its
            //contents in red for negative values and green for positive 
            //ones
            column.setValueTemplate(c3vt);
          } else {
            //other columns just need a simple XSLT to override the default one
            //that puts a space after the values
            column.setValueTemplate(covt);
          }
          
          //repaint the entire matrix to add the new columns
          _table.repaint(); 
        }
      } else if(curCount > intCount) {
        //remove columns until the requested number of columns matches the number of
        //displayed columns
        for(var i=curCount-1;i>=intCount;i--) {
          _table.removeChild(i);
        }
        //the removeChild method repaints directly the matrix
      }
      
      //remove the "Loading..." message
      giclient.APP.getJSXByName("loadingLabel").setVisibility(jsx3.gui.Block.VISIBILITYHIDDEN,true);
    },500);
  };

  
  /**
   * matrix's Reorder event:
   * com.tibco.giclient.reorderColumns(intOLDINDEX,intNEWINDEX);
   * event handler that keeps the order of the columns so that is possible 
   * to remove/add columns without the risk to duplicate a column
   */
  giclient.reorderColumns = function(oldIndex,newIndex) {
    var inc;
    var cond;

    //shift the values for fixed non-data column(s)
    oldIndex-=columnOffset;
    newIndex-=columnOffset;
    
    if (oldIndex > newIndex) {
      //moving a column from left to right
      inc = -1;
      cond = function() {
        return i>=newIndex;
      }
      
    } else {
      //moving a column from right to left
      inc = 1;
      cond = function() {
        return i<=newIndex;
      }
    }
    
    //the "id" of the moving column
    var val = columnIndex[oldIndex];
    //shift all involved columns
    for (var i=oldIndex+inc; cond(); i+=inc) {
      columnIndex[i-inc] = columnIndex[i];
    }  
    //set the new column to its new index
    columnIndex[newIndex] = val;
    
    return true;
  };
  
  giclient.repaintAndDeselectTree = function() {
    giclient.repaintTree().deselectAllRecords();
  }
  
  giclient.repaintAndDeselectMatrix = function() {
    giclient.repaintMatrix().deselectAllRecords();
  }
  
  giclient.repaintTree = function() {
    var tree = giclient.getTree();
    tree.repaintData();
    return tree;
  }
  
  giclient.repaintMatrix = function() {
    var table = giclient.getTable();
    table.repaintData();
    return table;
  }
  
//GUI HANDLING / CLICKS
  
  /**
   * delete button's Execute event
   * com.tibco.giclient.matrixDelClick(this);
   * event handler that moves an item from the matrix to the tree
   * on X click
   */
  giclient.matrixDelClick = function(delButton) {
    //get the id of the clicked row
    var id = delButton.getParent().getParent().getSelectedIds();
    //get the tree instance
    var tree = giclient.getTree();
    //get the matrix instance
    var matrix = giclient.getTable();
    giclient.unsubscribe(id);
    //move the record
    tree.adoptRecord(matrix,id,"stocks_root");
    
    //repaint the entire matrix to keep the alternated row colors 
    setTimeout(com.tibco.giclient.repaintMatrix,500);
    //repaint the entire tree to keep it sorted
    setTimeout(com.tibco.giclient.repaintAndDeselectTree,500);

    return true;
  }
  
  /**
   * tree's Execute event:
   * com.tibco.giclient.treeDblClick(this,strRECORDID);
   * event handler that moves an item from the tree to the matrix
   * on double click
   */
  giclient.treeDblClick = function(tree,id) {
    //get the matrix object
    var matrix = giclient.getTable();
    //move the item
    matrix.adoptRecord(tree,id);
    giclient.subscribe(id);
    //repaint the entire matrix to keep the alternated row colors 
    setTimeout(com.tibco.giclient.repaintAndDeselectMatrix,500);
    return true;
  }

//GUI HANDLING / DRAG AND DROP
  
  /**
   * matrix's Drop event:
   * com.tibco.giclient.dropInMatrix(this,objSOURCE,strDRAGIDS);
   * event handler that repaints the matrix whenever a new stock is dropped to 
   * the matrix from the tree
   */
  giclient.dropInMatrix = function(matrix,fromObj,ids) {
    if (fromObj == matrix) {
      //we are dragging from matrix to matrix, no operations needed
      return false;
    }
    
    //make an initial control to avoid the dragging of the root of the tree
    for (var i = 0; i <= ids.length; i++) {
      if (ids[i] == "stocks_root") {
        //we are dragging the root, return false
        //to deny the operation
        return false;
      }
    }
    
    //repaint the entire matrix to keep the alternated row colors 
    setTimeout(com.tibco.giclient.repaintMatrix,500);
    //iterates through received items to subscribe to them
    for (var i = 0; i < ids.length; i++) {
      giclient.subscribe(ids[i]);
    }
    setTimeout("jsx3.EventHelp.reset();",500);
    return true;
  };
  
  /**
   * matrix's Adopt Event:
   * com.tibco.giclient.dragFromMatrix(this,objTARGET,strRECORDID);
   * event handler that repaints the matrix whenever a stock is dragged out from the
   * matrix
   */
  giclient.dragFromMatrix = function(matrix, toObj, id) {
    if (toObj == matrix) {
      //we are dragging from matrix to matrix, no operations needed
      return false;
    }
    giclient.unsubscribe(id);
    //repaint the entire matrix to keep the alternated row colors
    setTimeout(com.tibco.giclient.repaintMatrix,500);
    return true;
  };
  
  /**
   * tree's On Drop event:
   * com.tibco.giclient.dropInTree(strRECORDID);
   * event handler that handles the adoption of a stock by the tree
   */
  giclient.dropInTree = function(toItem) {
    //only dropping on the tree's root is admitted
    if (toItem != "stocks_root") {
      //items dropped to the tree must be dropped
      //on the root of the tree. All other cases are
      //not valid
      return false;
    } 
    
    //repaint the tree to keep stock sorted by name
    setTimeout(com.tibco.giclient.repaintTree,500);
    //moving a stock to the tree's root is always admitted
    return true;
    
  };

//SUB/UNSUB HANDLING
  
  /**
   * subscribe to the updates for a stock
   */
  giclient.subscribe = function(item) {
    //subscribe through PageBus to the topic pertaining to the updates for the
    //subscribing item (save the handle that will be used for unsubscription)
    subscriptions[item] = PageBus.subscribe("AMS.topic."+item,giclient,giclient.objectCallback,null);
    //publish to PageBus a message to request the amspublisher object to start 
    //publishing events on the specified item and schema
    PageBus.publish("publisher.start",{"item":item,"schema":fields});
  }
  
  /**
   * unsubscribe from the updates for a stock
   */
  giclient.unsubscribe = function(item) {
    //unsubscribe from PageBus the topic pertaining to the updates for the
    //unsubscribing item
    PageBus.unsubscribe(subscriptions[item]);
    //publish to PageBus a message to request the amspublisher object to stop
    //publishing events on the specified item
    PageBus.publish("publisher.stop",item);
  }

//UPDATE HANDLING
  
  /**
   * Callback method subscribed to the AMS.topic.itemN event
   */
  giclient.objectCallback = function(subject,publisherData) {
  
    if(publisherData && publisherData.jsxid != null) {
      //get the matrix
      var objMatrix = giclient.getTable();
      //get the record from the matrix. If not available we know that this
      //update is the first update for this item
      var bIsInsert = objMatrix.getRecordNode(publisherData.jsxid) == null;
      
      //update the model (but no the view)
      objMatrix.insertRecord(publisherData,null,false);
      if (bIsInsert) {
        //this is the first update for this item so we also update the view
        giclient.getTable().repaintData();
        //since item are dropped from the tree this code should never being called        
        PageBus.publish("cdf.error","Unexpected update. This item is not subscribed: " + publisherData.jsxid);
      } else if (refresh_rate > 0) {
        if(incremental_repaint) {
          //update only this record asynchronuosly
          giclient.incrementalRepaint(publisherData.jsxid,publisherData);
        } else {
          //update the entire table asynchronuosly
          giclient.repaint();
        }
      
      } else {
        //real-time updates
        if (incremental_repaint) {
          //update directly the view 
          giclient.incrementalObjectRepaint(publisherData);
        } else {
          //repaint the entire matrix contents
          objMatrix.repaintData();
        }
      }
    } else {
      //publish an error message to the PageBus
      PageBus.publish("cdf.error","Wrong object type for 'publisherData'. Must be a JavaScript Object with named property, jsxid.");
    }
  };
  
  /**
   * Throttles the repaint of each individual record to ensure the view is not overwhelmed
   */
  giclient.incrementalRepaint = function(strKey,obj) {
    //check if there is already a thread for this item that will repaint
    //the updated cells before. If so, it's useless to launch another timeout
    //that will begin when the updates are already on the view
    if(!timeouthash[strKey]) {
      //set a timeout to repaint the view after refresh_rate seconds
      timeouthash[strKey] = window.setTimeout(function() {
        //execute the update on the view
        giclient.incrementalObjectRepaint(obj);
        //delete this timeout object to let other updates
        //for this item start other threads
        delete timeouthash[strKey];
        }, refresh_rate);
    }
  };

  /**
   * Update the cells in a row, using a CDF JavaScript object (any object with jsxid property)
   */
  giclient.incrementalObjectRepaint = function(obj) {
    //get the matrix object
    var objMatrix = giclient.getTable();
    //this array will contain a list of cells to be turned off after a while (only
    //for simple highlight)
    var toTurnOff = new Array();
    
    //iterate through the values in the update object
    for(var path in obj) {
      //get from the view the DOM object related to this value (if any)
      var cell = objMatrix.getContentElement(obj.jsxid,path);
      if(cell) {
        //control that the value is changed from the last update
        if (cell.innerHTML != obj[path]) {
          var lightBGColor = "";
          cell.textNextColor = "";
          
          if (highlight_type > 0) {
            //if any highlight is needed, decide the color of the 
            //highlight on the basis of the difference between 
            //the old and the new update
            if (path == "pct_change") {
              cell.style.fontWeight = "bold";
              
              //since change is a string and has "+" or "-" in it we need to check which is 
              //the right color to put
              if (obj[path].charAt(0) != cell.innerHTML.charAt(0)) {
                lightBGColor = (obj[path].indexOf("-") == 0) ? "#f8b87a" : "lightgreen"
              } else if (obj[path].indexOf("-") == 0) {
                lightBGColor = (cell.innerHTML > obj[path]) ? "lightgreen" :  "#f8b87a";
              } else {
                lightBGColor = (cell.innerHTML > obj[path]) ? "#f8b87a" :  "lightgreen";
              }
              
              //highlight the text in black and set an "end color" to be applied. 
              if (obj[path].indexOf("-") == 0) {
                cell.textNextColor = "red";
                cell.style.color = "black";
              } else {
                cell.textNextColor = "green";
                cell.style.color = "black";
              }
              
            } else {
              lightBGColor = (cell.innerHTML > obj[path]) ? "#f8b87a" :  "lightgreen";
            }
          } else if (path == "pct_change") {
            cell.style.fontWeight = "bold";
            
            if (obj[path].indexOf("-") == 0) {
              cell.style.color = "red";
            } else {
              cell.style.color = "green";
            }
          }
        
          if (path == "stock_name") {
            //we are updating by hand, so the xslt will not be applied. 
            //set the stock_name style to bold
            cell.style.fontWeight = "bold";
          }
          
          //change the value inside the DOM object
          cell.innerHTML = obj[path];
          
          
          if (highlight_type == 2) {
            if (!cell.id) {
              //we need that the cell has an id to perform
              //the fade highlight
              cell.id = obj.jsxid+"|"+path;
            }
            //read the actual color of the cell 
            var toColor = giclient.obtainColor(cell);
            //set the highlight color of the cell
            cell.style.backgroundColor = lightBGColor;
            //this code will be executed at the end of the fade. Is needed to 
            //let the selection highlight override the cell color
            //after the fade (the fade function does not admit 
            //functions but only strings to eval)
            var removeBG = "document.getElementById('"+cell.id+"').style.backgroundColor = '';";
            
          } else if (highlight_type == 1) {
            //set the highlight color of the cell
            cell.style.backgroundColor = lightBGColor;
            //save a phase on the cell (avoid to turn off a cell because of update 1
            //when the cell has already received an update 2 and so should remain
            //highlighted)
            cell.turnOffPhase = globalTurnOffPhase;
            //add the cell to the array of cells to be turned off after a while
            toTurnOff[toTurnOff.length] = cell;
          }
          
        }
      }
      
    }
    
    if (highlight_type == 1) {
      //get a function that turns off the highlighted cells
      var turnOffClosure = giclient.getTurnOffClosure(toTurnOff,globalTurnOffPhase);
      //call the closure after a timeout
      setTimeout(turnOffClosure,highlightTime);
      //increment the highlight phase
      globalTurnOffPhase = (globalTurnOffPhase+1)%100;
    }
  };

  /**
   * Throttle the repaint of the table to only occur every 'n' seconds, even though the 
   * model updates more quickly
   */
  giclient.repaint = function() {
    //check if there is already a thread for this item that will repaint
    //the matrix content before. If so, it's useless to launch another timeout
    //that will begin when the updates are already on the view
    if(!timeoutid) {
      timeoutid = window.setTimeout(function() { giclient.getTable().repaintData();timeoutid = null; }, refresh_rate);
    }
  };

//UPDATE HANDLING / UTILS

  /**
   * get the background color of a DOM node
   * if the color is "transparent" recurse ancestor nodes until it finds the correct
   * shown color
   */ 
  giclient.obtainColor = function(elem) {
    if (elem == null) {
      //no element, return white
      return [255,255,255];
    }
    
    var val = "";
    

    if (window.getComputedStyle || (document.defaultView && document.defaultView.getComputedStyle)) {
      //FX
      var styleObj = document.defaultView.getComputedStyle(elem,null);
      if (styleObj) {
        val = styleObj.getPropertyValue("background-color");
      }
    } 
    if (!val && elem.currentStyle) {
      //IE
      val = elem.currentStyle["backgroundColor"];
    }
    
  
    if (val == "transparent" && elem.parentNode) {
      //recurse to parent
      return giclient.obtainColor(elem.parentNode);
      //there is no risk of infinite recursion. In the worst case it recurses
      //until the document object is reached
    } else if (val == "transparent") {
      //no more parents, return white
      return [255,255,255];
    }
    
    if (!val) {
      //fail, return white
      return [255,255,255];
    }
    return val;
  }
  
  /**
   * get an iterator to "turn off" updated cells
   */
  giclient.getTurnOffClosure = function(toTurnOff,turnOffPhase) {
    return function() {
      //iterate through toTurnOff array
      for (var i=0; i<toTurnOff.length; i++) {
        //check the update phase to avoid turning off a cell that was 
        //updated after this thread was launched
        if (turnOffPhase == toTurnOff[i].turnOffPhase) {
          toTurnOff[i].style.background = "";
          if (toTurnOff[i].textNextColor != "") {
            toTurnOff[i].style.color = toTurnOff[i].textNextColor;
          }
        }
      }
    };
  };
});