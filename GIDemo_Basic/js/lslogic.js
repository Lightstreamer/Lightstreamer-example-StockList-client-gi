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

/////////////////////////////////Vars
require
  
	//popup image string
	var imgString = '<img src="images/popup.gif" alt="Details" width="16" height="16" align="left" border="0" hspace="1">';
	
  var redColor = "#f8b87a";
	var greenColor = "lightgreen"; 
  var hotTxtCol = "#000000";
  
/////////////////////////////////PushPage Configuration

  var lsPage;
	var lsHost;
	var lsEng;
  var lsPort;
  
  var lsSub = null;
  var lsClient = null;
  var chartSubs;
	
/////////////////////////////////Table Handler
	
function LS_startPush() {  
  var fieldsList = ["last_price", "time", "pct_change", "bid_quantity", "bid", "ask", "ask_quantity", "min", "max", "ref_price", "open_price", "stock_name", "arrow"];
  var itemsList = ["item1", "item2", "item3", "item4", "item5"];
  var imgUp = "images/quotes_up.gif";
  var imgDown = "images/quotes_down.gif";

  if (location.href.indexOf("file:///") == -1) {

    var host = location.hostname.toLowerCase();

		if (host.indexOf("lightstreamer.com") != -1 ) {
		  lsHost = "http://push.lightstreamer.com";
      lsPort = 80;
		} else if (host.indexOf("tibco.com") != -1 ) {
 		  lsHost = "http://ams-pushserver.tibco.com";
      lsPort = 80;
		}  else if (host.indexOf("test.lightstreamer.it") != -1 ) {
      lsHost = "http://test.lightstreamer.it";
      lsPort = 80;
    } else {
      lsHost = "http://localhost";
      lsPort = 8080;
    }
  } else {
    alert("Run the application from the Web Server to be able to connect to the Push Server.")
  }
  
    //create or attach a LS client
    lsClient = new LightstreamerClient(lsHost + ":" + lsPort,"DEMO");
    lsClient.connectionSharing.enableSharing("GIDemosCommonConnection", "ATTACH", "CREATE");
    
    //////////////// (OPTIONAL) Visual Status Notification
    lsClient.addListener(new StatusWidget("left", "0px", true));
    lsClient.connect();

    // create StaticGrid
    var myGrid = new StaticGrid("1");
    
    myGrid.setAutoCleanBehavior(true,false);
    myGrid.setNodeTypes(["div","span","img","a"]);
    myGrid.parseHtml();
    myGrid.setSort(12);
    myGrid.addListener({
      onVisualUpdate: function(key,info,domNode) {
        if (info == null) {
          return;
        }
        
        // choose the backgroundColor                
        var lastPrice = info.getChangedFieldValue(1);
        if (lastPrice !== null) {
          var prevPrice = myGrid.getValue(key,1);
          if (!prevPrice || lastPrice > prevPrice) {
            info.setAttribute(greenColor,null,"backgroundColor");
          } else {
            info.setAttribute(redColor,null,"backgroundColor");
          }
        } else {
          info.setAttribute(greenColor,null,"backgroundColor");
        }
        
        //put arrow and handle change style
        var pctChange = info.getChangedFieldValue(3);
        if (pctChange !== null) {
          pctChange = formatDecimal(pctChange,2,true)+"%";
          hotTxtCol = (pctChange.charAt(0) == '-') ? "#dd0000" : "#009900";
          if (pctChange.indexOf("-") > -1) {
            info.setCellValue(13,imgDown);
            info.setCellAttribute(13,null,null,"backgroundColor");
            
            info.setCellAttribute(3,"black",hotTxtCol,"color");
            info.setCellValue(3,pctChange);
          } else {
            info.setCellValue(13,imgUp);
            info.setCellAttribute(13,null,null,"backgroundColor");
                    
            info.setCellAttribute(3,"black",hotTxtCol,"color");
            info.setCellValue(3,"+"+pctChange);

           }
          info.setCellAttribute(3,"bold","bold","fontWeight");
        }
      }
    });

    //create the new subscription
    var subscription = new Subscription("MERGE");
    subscription.setItemGroup("item1 item2 item3 item4 item5");
    subscription.setFieldSchema("last_price time pct_change bid_quantity bid ask ask_quantity min max ref_price open_price stock_name arrow");
    subscription.setDataAdapter("QUOTE_ADAPTER");
    subscription.setRequestedSnapshot('yes');
    subscription.setRequestedMaxFrequency(0.5);
    
    subscription.addListener( {onItemUpdate: function(updateInfo) {
              if (updateInfo.getValue(3) < 0 ) {
                updateGI(updateInfo.getItemName(), updateInfo, "down"); // in logic.js
              } else {
                updateGI(updateInfo.getItemName(), updateInfo, "up"); // in logic.js
              }
            }
    });	
    
    subscription.addListener(myGrid);

    lsSub = subscription;
    lsClient.subscribe(lsSub);
}

function LS_onDialog(itemName, tableName) {
  
  //Chart conf
  var indx = tableName.substring(6);
  
  var subsGrid = new Subscription("MERGE");
  subsGrid.setItems(new Array(itemName));
  subsGrid.setFieldSchema("stock_name last_price time");
  subsGrid.setDataAdapter("QUOTE_ADAPTER");
  subsGrid.getRequestedSnapshot('yes');
  subsGrid.getRequestedMaxFrequency(0.5);
  
  lsClient.subscribe(subsGrid);
  
  var stockChart = new Chart(tableName, true);
  stockChart.configureArea("lsgbox",200,200,0,30);
  stockChart.setXAxis(3, function(stringDate) {
    stringDate = new String(stringDate);
    i1 = stringDate.indexOf(':');
    i2= stringDate.lastIndexOf(':');
    return(stringDate.substring(0,i1)*3600+stringDate.substring(i1+1,i2)*60+stringDate.substring(i2+1,stringDate.length)*1);
  });
  stockChart.addYAxis([2], function(yValue) {
    var y = new String(yValue);
    if (y.indexOf(",") > -1 ) {
      var y=y.replace(",",".");
    }
    return new Number(y);
  });
  stockChart.setXLabels(4,"lslbl",formatXlbl);
  
  stockChart.addListener(new SimpleChartListener());
  stockChart.addListener({
    onNewLine: function(key,newChartLine,nowX,nowY) {
        newChartLine.setYLabels(4,"lslbl",formatYlbl);
        newChartLine.setStyle("black","black",1,1);
    }
  });
  
  subsGrid.addListener({onItemUpdate: function(updateInfo) {
      onChartSubsUpdate(updateInfo.getItemName(), updateInfo);
    }
  });
  subsGrid.addListener(stockChart);
  
  if ( !chartSubs ) {
    chartSubs = new Array(5);
  }
  chartSubs[indx] = subsGrid;
  
  return stockChart;
}

function LS_onCloseDialog(tableName) {
	lsClient.unsubscribe(chartSubs[tableName.substring(6)]);
}
  
function formatTime(val) {
  var a = new Number(val.substring(0,val.indexOf(":")));
	if (a > 12) {
		a -= 12;
	}
	var b = val.substring(val.indexOf(":"),val.length);
	return a + b;
}
	
function formatYlbl (val) {
		return formatDecimal(val,2,true);
	}
  
function formatXlbl (val) {
	return formatTime(getTime(val));
}
