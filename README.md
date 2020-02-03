# Lightstreamer - Stock-List Demos - HTML (General Interface) Clients

This project contains two demos client showing integration between Lightstreamer and [TIBCO General Interface](http://developer.tibco.com/gi/default.jsp).


## Stock-List Demo - HTML (General Interface) Client ##
<!-- START DESCRIPTION lightstreamer-example-stocklist-client-gi-stock-list-demo---html-general-interface-client -->

### Live Demo

[![screenshot](screen_gibasic_large.png)](http://demos.lightstreamer.com/TIBCOGIDemos/Workspace/JSXAPPS/GIDemo_Basic/)<br>
### [![](http://demos.lightstreamer.com/site/img/play.png) View live demo](http://demos.lightstreamer.com/TIBCOGIDemos/Workspace/JSXAPPS/GIDemo_Basic/)<br>

### Details

This application uses the <b>Web Client SDK API for Lightstreamer</b> to handle the communications with Lightstreamer Server and uses the <b>General Interface API</b> to display the real-time data.<br>

In this application, five stock quotes are displayed in real-time. The demo page contains two tables, both of which receive the real-time data flow from Lightstreamer Server. The table at the top is managed by the Lightstreamer Web Client library, though embedded inside GI. The table at the bottom is a GI table (in which you can drag, resize, and sort columns) and is updated by the Lightstreamer Web Client library. GI-based pop-up windows show the price charts produced by the Lightstreamer Web Client library.<br>

The demo includes the following client-side functionalities:
* A [Subscription](https://lightstreamer.com/api/ls-web-client/latest/Subscription.html) containing 10 items, subscribed to in <b>MERGE</b> mode feeding both a [StaticGrid](https://lightstreamer.com/api/ls-web-client/latest/StaticGrid.html) and the GI widget.
* For each pop-up window opened, a [Subscription](https://lightstreamer.com/api/ls-web-client/latest/Subscription.html) containing 1 item, subscribed to in <b>MERGE</b> mode feeding a [Chart](https://lightstreamer.com/api/ls-web-client/latest/Chart.html).

<!-- END DESCRIPTION lightstreamer-example-stocklist-client-gi-stock-list-demo---html-general-interface-client -->

## Advanced Stock-List Demo - HTML (General Interface) Client ##
<!-- START DESCRIPTION lightstreamer-example-stocklist-client-gi-advanced-stock-list-demo---html-general-interface-client -->

### Live Demo

[![screenshot](screen_giadvanced_large.png)](http://demos.lightstreamer.com/TIBCOGIDemos/Workspace/JSXAPPS/GIDemo_Advanced/)<br>
### [![](http://demos.lightstreamer.com/site/img/play.png) View live demo](http://demos.lightstreamer.com/TIBCOGIDemos/Workspace/JSXAPPS/GIDemo_Advanced/)<br>

### Details

An online demonstration is hosted on our servers at [http://demos.lightstreamer.com/TIBCOGIDemos/Workspace/JSXAPPS/GIDemo_Advanced/](http://demos.lightstreamer.com/TIBCOGIDemos/Workspace/JSXAPPS/GIDemo_Advanced/)

This application uses the <b>Web Client SDK API for Lightstreamer</b> to handle the communications with Lightstreamer Server; uses <b>PageBus</b> as a bridge between Lightstreamer and General Interface APIs; and uses the <b>General Interface API</b> to display the real-time data.<br>

The Lightstreamer client receives events from Lightstreamer Server and publishes the stock updates on TIBCO PageBus. The application, created with the GI Builder, subscribes to the PageBus to receive and display the updates to the user.<br>

A [detailed explanation](http://demos.lightstreamer.com/TIBCOGIDemos/Workspace/JSXAPPS/GIDemo_Advanced/GI-AMS%20Demo.pdf) of this application is available (in that document, Lightstreamer is referred to as "Ajax Message Service").<br>

The demo includes the following client-side functionalities:
* A [Subscription](https://lightstreamer.com/api/ls-web-client/latest/Subscription.html) for each item added to the update panel, subscribed to in <b>MERGE</b> mode.

<!-- END DESCRIPTION lightstreamer-example-stocklist-client-gi-advanced-stock-list-demo---html-general-interface-client -->


## Install

If you want to install a version of one of these demo pointing to your local Lightstreamer Server, follow these steps:

* Note that, as prerequisite, the [Lightstreamer - Stock- List Demo - Java Adapter](https://github.com/Lightstreamer/Lightstreamer-example-Stocklist-adapter-java) has to be deployed on your local Lightstreamer Server instance. Please check out that project and follow the installation instructions provided with it.
* Launch Lightstreamer Server.
![Folder structure](dir.png)<br>
* To deploy the demo on a new Web Server, set up a folder structure like that shown above.
* `ROOT` is the Web Server root folder or any subfolder under which to install the Demo. JSX contains the GI libraries. The `addins`, `prototypes`, and `settings` folders under `Workspace` don't need to contain anything special. 
* Make sure to set the correct host name and port in the JavaScript code specific of each Demo (for example, `giclient.js` for the GIDemo_Advanced, or `lslogic.js` for the GIDemo_Basic).
* Complete your installation of the demo with a valid version of the Lightstreamer Web Client SDK library.
  Get the `lightstreamer.min.js` file from [npm](https://www.npmjs.com/package/lightstreamer-client-web) or [unpkg](https://unpkg.com/lightstreamer-client-web/lightstreamer.min.js) and put the file into the folder `commons`.
* Launch the demo by downloading the index.html file from the desired Demo folder under JSXAPPS (for example: http://www.mycompany.com/TIBCOGIDemos/Workspace/JSXAPPS/GIDemo_Basic/ )

## Build

To edit the demos with GI Builder, copy the application folder (for example, `GIDemo_Basic` or `GIDemo_Advanced`) to the `JSXAPPS` folder of your GI Builder workspace.<br>
Launch GI Builder and select the copied application folder.

## See Also

### Lightstreamer Adapters Needed by These Demo Clients
<!-- START RELATED_ENTRIES -->

* [Lightstreamer - Stock-List Demo - Java Adapter](https://github.com/Lightstreamer/Lightstreamer-example-Stocklist-adapter-java)
* [Lightstreamer - Reusable Metadata Adapters - Java Adapter](https://github.com/Lightstreamer/Lightstreamer-example-ReusableMetadata-adapter-java)

<!-- END RELATED_ENTRIES -->

### Related Projects

* [Lightstreamer - Stock-List Demos - HTML Clients](https://github.com/Lightstreamer/Lightstreamer-example-Stocklist-client-javascript)
* [Lightstreamer - Basic Stock-List Demo - jQuery Client](https://github.com/Lightstreamer/Lightstreamer-example-StockList-client-jquery)
* [Lightstreamer - Stock-List Demo - Dojo Toolkit Client](https://github.com/Lightstreamer/Lightstreamer-example-StockList-client-dojo)
* [Lightstreamer - Stock-List Demos - Flex Clients](https://github.com/Lightstreamer/Lightstreamer-example-StockList-client-flex)
* [Lightstreamer - Basic Stock-List Demo - Java SE (Swing) Client](https://github.com/Lightstreamer/Lightstreamer-example-StockList-client-java)
* [Lightstreamer - Basic Stock-List Demo - .NET Client](https://github.com/Lightstreamer/Lightstreamer-example-StockList-client-dotnet)
* [Lightstreamer - Basic Stock-List Demo - Silverlight Client](https://github.com/Lightstreamer/Lightstreamer-example-StockList-client-silverlight)

## Lightstreamer Compatibility Notes

* Compatible with Lightstreamer Web Client library version 8.0 or newer.

* For a version of this example compatible with Lightstreamer SDK for Web Clients version 7.x or earlier, please refer to [this tag](https://github.com/Lightstreamer/Lightstreamer-example-StockList-client-gi/releases/tag/latest-for-client-7.x).
