/*
 * LIGHTSTREAMER - www.lightstreamer.com
 * GI DEMO - BASIC
 *
 *  Copyright 2013 Weswit Srl
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
 
  //////////////////////////Event handlers
	
	var redColor = "#f8b87a";
	var greenColor = "lightgreen"; 
  var hotTxtCol = "#000000";
	  
	function formatValues(item, itemUpdate) { //onChangingValues
	 	if (itemUpdate == null) {
	 		return;
	 	}
	 	
	 	itemUpdate.setHotTime(600);
	 	
	 	//choose the backgroundColor
	 	var backC = (item % 2 == 1) ? "#eeeeee" : "#ddddee";
	 	var backH = itemUpdate.getCellValue(14);
		itemUpdate.setAttribute(backH,backC,"backgroundColor");
	 	
	 	//choose the "change" field stylesheet
	 	var newChng;
	 	if ((newChng = itemUpdate.getValue(3)) != null) {
	 		var hotTxtCol = (newChng.charAt(0) == '-') ? "#dd0000" :  "#009900";
	 		itemUpdate.setCellAttribute(3,"black",hotTxtCol,"color");
	 		itemUpdate.setCellAttribute(3,"bold","bold","fontWeight");
	 	}
	 	
		itemUpdate.setCellAttribute(12,backC,backC,"backgroundColor");
	
		//format the fields
		for (var i = 1; i <= 11; i++) {
		 	var val = itemUpdate.getValue(i);
			if (val != null) {
				var formattedVal = formatField(val, i);
				if (formattedVal != null) {
					itemUpdate.setValue(i, formattedVal);
				}
			}
	 	}
	}

	function formatField(val, i) {	
		if (i == 4 || i == 7) {
			return null; //"string" fields
		} else if (i == 2) {
		 	//format the timestamp
			val = formatTime(val);
			return val;
		} else {
			var formattedVal = formatDecimal(val, 2, true);
			
			if (i == 3) {
				if (formattedVal > 0) {
					formattedVal = "+" + formattedVal;
				}
			}
			return formattedVal;	
 		}
 	}
 	
 	var giSnapshot = null;
 	//var pollListInterval = null;

	function updateGI(item, itemUpdate, sign) {
		//create a JavaScript object with name/value pairs     
		var o = new Object(); 
        
		o.jsxtextNAME = itemUpdate.getValue(12); 
		o.jsxtextLAST = extractFormattedValue(itemUpdate, 1); 
		//o.jsxtextCOLORLAST = itemUpdate.getValue(14); 
		o.jsxtextTIME = extractFormattedValue(itemUpdate, 2); 
    o.jsxtextSIGNCHNG = sign;
		o.jsxtextCHNG = extractFormattedValue(itemUpdate, 3); 
		o.jsxtextVALCHNG = itemUpdate.getValue(3); 
		o.jsxtextBIDSIZE = extractFormattedValue(itemUpdate, 4); 
		o.jsxtextBID = extractFormattedValue(itemUpdate, 5); 
		o.jsxtextASK = extractFormattedValue(itemUpdate, 6); 
		o.jsxtextASKSIZE = extractFormattedValue(itemUpdate, 7); 
		o.jsxtextMIN = extractFormattedValue(itemUpdate, 8); 
		o.jsxtextMAX = extractFormattedValue(itemUpdate, 9); 
		o.jsxtextREF = extractFormattedValue(itemUpdate, 10); 
		o.jsxtextOPEN = extractFormattedValue(itemUpdate, 11); 
		o.jsxid = new String(itemUpdate.getItemPos()); 
		
		var objList = jsx3.GO("list"); 
		if (!objList) {
			if (giSnapshot == null) {
				giSnapshot = {};
				//due to the high frequency of updates on this demo, 
				//this thread is quite useless
				//pollListInterval = setInterval(pollList,500);
			}
			giSnapshot[item] = o;
		} else {
			if (giSnapshot != null) {
				dequeueGISnapshot(objList,item);
			}
			
			//insert the object into the list 
			objList.insertRecord(o,null,true); 
		}
	}
	
	function dequeueGISnapshot(objList,item) {
		for (var i in giSnapshot) {
			if (i != item) {
				objList.insertRecord(giSnapshot[i],null,true); 
			}
		}
		giSnapshot = null;
		//clearInterval(pollListInterval);
	}
	
	function pollList() {
		if (giSnapshot != null) {
			var objList = jsx3.GO("list"); 
			if (objList) {
				dequeueGISnapshot(objList);
			}
		}
	}

	function extractFormattedValue(itemUpdate, field) {
		var fmt = itemUpdate.getValue(field);
		if (fmt != null) {
			return fmt;
		} else {
			// the field is unchanged;
			// we still need to get the current field value
			// and format it in order to put the value in the row;
			// this can be avoided with a smarter use of GI API
		 	var val = itemUpdate.getServerValue(field);
			return formatField(val, field);
		}
	}

	//////////////////////////Format functions
		
	//time format from [0-24] to [0-12] (without AM / PM )
	function formatTime(val) {
		var a = new Number(val.substring(0,val.indexOf(":")));
		if (a > 12) {
			a -= 12;
		}
		var b = val.substring(val.indexOf(":"),val.length);
		return a + b;
	}
	
	//format a decimal number to a fixed number of decimals 
	function formatDecimal(value, decimals, keepZero) {
		var mul = new String("1");
		var zero = new String("0");
		for (var i = decimals; i > 0; i--) {
			mul += zero;
		}
		value = Math.round(value * mul);
		value = value / mul;
		var strVal = new String(value);
		if (!keepZero) {
			return strVal;	
		}
		
		var nowDecimals = 0;
		var dot = strVal.indexOf(".");
		if (dot == -1) {
			strVal += ".";
		} else {
		 	nowDecimals = strVal.length - dot - 1;
		}
		for (var i = nowDecimals; i < decimals; i++) {
			strVal = strVal + zero;
		}
			
		return strVal;
	}

/////////////// dialog management

/**
 * Define a namespace
 * Don't define the same namespace in other script files. See for example mutiInstances.js
 * 
 * you may also want to create a package. 
 * jsx3.lang.Package.definePackage("sfn.dialogs", function(dialogs) { Your functions } )
 * @see jsx3.lang.Package
 */
if (window["sfn"] == null) 
   window.sfn  = new Object();
sfn.position = 0;

/**
 * Returns the application server object which by default is the application
 * namespace as specified in Project->Deployment Options.
 *
 * @returns {jsx3.app.Server} the application server object.
 */
sfn.getServer = function() {
    // should be the same as namespace in Project -> Deployment Options
    return GIDemoBasic; 
}

/**                                       
  * Launches a simple dialog as a child of server body block if one dosen't exists. 
  * Brings an existing dialog forward instead of launching it again    
  */
sfn.launchDetail = function(list, row) {
    var currentRecordNode = list.getRecordNode(row);
    var stockSymbol = currentRecordNode.getAttribute("jsxtextNAME"); 
    var item = currentRecordNode.getAttribute("jsxid"); 
    this.launchDetailDialog(item, stockSymbol, 650, 375);
}

sfn.launchDetailDialog = function(item, stockSymbol, posX, posY) {
	var tableName = "chart_" + item;
	var itemName = "item" + item;
	var objDialog = this.getServer().getBodyBlock().getChild(tableName);
	if (!objDialog) {
		if (posX == null) {
			posX = this.position;
			posY = this.position;
		    this.position += 30;
		}
		objDialog = this.getServer().getBodyBlock().load("components/simpleDialog.xml");
		objDialog.setName(tableName);
		if (stockSymbol != null) {
			objDialog.getCaptionBar().setText("Stock: " + stockSymbol); 
		}
	    objDialog.setLeft(posX , false); 
	    objDialog.setTop(posY , false);
		objDialog.repaint();

		var tempTags = document.getElementsByTagName("DIV");
		var v;
		for (v = 0; v < tempTags.length; v++) {
			var str0 = tempTags[v].getAttribute("data-source");
			var str = tempTags[v].getAttribute("id");
			if (str0 == "lightstreamer" && str == "chart_xxx") {
			    tempTags[v].setAttribute("id", tableName);
			}
		} 
		
		var table = LS_onDialog(itemName, tableName);
		table.dialog = objDialog;
	} else {
		objDialog.focus();
	}
}

function startGIDialogs() {	
	sfn.launchDetailDialog(2, 'Ations Europe', 600, 250);
}

	//////////////////////////Chart Event handlers
		
  function onChartSubsUpdate(item, itemUpdate) {
    var tableName = "chart_" + itemUpdate.getItemName().substring(4);
    
    if ( itemUpdate.isValueChanged(1) ) {
      var objDialog = sfn.getServer().getBodyBlock().getChild(tableName);
			var stockSymbol = itemUpdate.getValue(1);
      
			objDialog.getCaptionBar().setText("Stock: " + stockSymbol); 
			objDialog.getCaptionBar().repaint();
		}
  }
    
	function onChartUpdate(item, upOb) {
		upOb.addField(4,getSeconds(upOb.getNewValue(2)),true);	
		upOb.addField(5,yPosition(upOb.getNewValue(3)),true);
		if (upOb.isValueChanged(1) && this.dialog != null) {
			var stockSymbol = upOb.getNewValue(1);
			this.dialog.getCaptionBar().setText("Stock: " + stockSymbol); 
			this.dialog.getCaptionBar().repaint();
		}
		var aValue = upOb.getOldValue(1);
		if (aValue == null) { //first update for this item
			if (! this.gLine) {
				var fx = upOb.getNewValue(4);
				var fy = upOb.getNewValue(5);
				this.gLine = getNewChart(this,item,fx,fy);
				this.addLine(this.gLine,"t"+item);
			}
		}
	}
	
	function getNewChart(gTable,item,xStart,yRef) {
		chart = new ChartLine();

		chart.setPointClass("lspxbig");
		chart.setLineClass("lspx");
		xStart = new String(xStart);
		yRef = new String(yRef);
		
		maxX = getSeconds(xStart)+60;
		minX= getSeconds(xStart);
		gTable.positionXAxis(minX, maxX);
		
		minY=yRef.replace(",",".")*0.80;
		maxY=yRef.replace(",",".")*1.20;
		chart.setYAxis(item,5,true);
		chart.positionYAxis(minY,maxY);
		
		var lblFrmttr = {};
		lblFrmttr.formatValue = formatYlbl;
		chart.setYLabels(4,"lslbly",lblFrmttr);
		
		return chart;
	}
	
	//////////////////////////Chart Format functions

	function getSeconds(stringDate) {
		stringDate = new String(stringDate);
		i1 = stringDate.indexOf(':');
		i2= stringDate.lastIndexOf(':');
		return(stringDate.substring(0,i1)*3600+stringDate.substring(i1+1,i2)*60+stringDate.substring(i2+1,stringDate.length)*1);
	}
	
	function yPosition(yValue) {	
		var y = new String(yValue);
		if (y.indexOf(",") > -1 ) {
			var y=y.replace(",",".");
		}
		return new Number(y);
	}
	
	function formatYlbl (val) {
		return formatDecimal(val,2,true);
	}
	
	function formatXlbl (val) {
		return formatTime(getTime(val));
	}
	
	function getTime(secondsStr) {
		var hours = Math.floor(secondsStr/(60*60));
		var seconds = secondsStr - (hours * (60*60));
		var minutes = Math.floor(seconds/60);
		var seconds = Math.round(seconds - (minutes * 60));
		
		if (minutes.toString().length < 2) {
			minutes = ":0" + minutes; 
		} else {
			minutes = ":" + minutes; 
		}
		
		if (seconds.toString().length < 2) {
			seconds = ":0" + seconds; 
		} else {
			seconds = ":" + seconds; 
		}
		
		return hours +  minutes + seconds;
	}

