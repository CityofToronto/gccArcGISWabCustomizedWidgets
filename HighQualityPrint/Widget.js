define(["dojo/_base/declare",
  "jimu/BaseWidget",
  "esri/arcgis/utils",
  "esri/tasks/PrintTask",
  "esri/tasks/PrintParameters",
  "esri/tasks/Geoprocessor",
  'jimu/loaderplugins/jquery-loader!https://code.jquery.com/jquery-3.2.1.min.js, https://code.jquery.com/ui/1.12.1/jquery-ui.js'],
function(declare, BaseWidget, ArcgisUtils, PrintTask, PrintParameters, GeoProcessor, $) {
  return declare([BaseWidget], {

     baseClass: 'jimu-widget-highQualityPrint',
     name: 'High Quality Print',
     mapLayers: [],
     gp: null,
     printableLayers: [],
     basemapLayers: [],

    startup: function() {
  		this.inherited(arguments);
      var serviceUrl = this.config.service_url;
      var strCode = '<link rel="stylesheet" href="./widgets/HighQualityPrint/css/jquery-ui.css">'; 
      $("#appCode").html(strCode);

      $("#template, #format").selectmenu();
      $("#print, #advance").button();
          
      // get basemap layers
      var basemapLayer = {};
  		if (this.map.itemId) {
        mapLayers = ArcgisUtils.getLayerList(this.map);
        for (var i = 0, length = this.map.itemInfo.itemData.baseMap.baseMapLayers.length; i < length; i++) {  
           basemapLayer = {
            "id": this.map.itemInfo.itemData.baseMap.baseMapLayers[i].id,
            "title": this.map.itemInfo.itemData.baseMap.baseMapLayers[i].title,
            "opacity": this.map.itemInfo.itemData.baseMap.baseMapLayers[i].opacity,
            "url":  this.map.itemInfo.itemData.baseMap.baseMapLayers[i].url
           };
           this.basemapLayers.push(basemapLayer);
        }  
      }


      var that = this;
      $("#print").click(function(){
        var printTask = new PrintTask(that.config.print_task);   
        var printParams = new PrintParameters();
        printParams.map = that.map;
        printParams.template = $("#template").val();
        printParams.outSpatialReference = that.map.extent.spatialReference;
        var webMapAsJSON = printTask._getPrintDefinition(that.map, printParams);
        var graphicLayers = [];
        for(var i=0;i<webMapAsJSON.operationalLayers.length;i++) {
          if (webMapAsJSON.operationalLayers[i].featureCollection != undefined) {
            graphicLayers.push(webMapAsJSON.operationalLayers[i]);
          }
        }
        var oLayer = that.basemapLayers.concat(that.printableLayers);
        var allLayers = oLayer.concat(graphicLayers);
        var printMapJson = {
          operationalLayers: allLayers,
          mapOptions: {
            "scale" : that.map.getScale(),
            //"rotation" : $("#angle").val()?parseInt($("#angle").val()):0,
            "extent" : that.map.extent,
            "showAttribution": true,
            "spatialReference": that.map.extent.spatialReference
          }, 
          layoutOptions: {
            "titleText": $("#mapTitle").val(),
            "authorText": $("#mapAuthor").val(),
            "copyrightText": $("#mapCopyright").val(),
            "scalebarUnit" : "Kilometers",
            "legendOptions" : {
              "operationalLayers" : that.printableLayers
            }
          }/*,
          exportOptions: {
            "outputSize": [$("#mapWidth").val(), $("#mapHeight").val()],
            "dpi": $("#quality").val()
          }*/
        };

        gp = new GeoProcessor(serviceUrl);
        var inputdata = {
          "Web_Map_as_JSON" : JSON.stringify(printMapJson),
          "Format" : $("#format").val(),
          "Layout_Template" : $("#template").val(),
          "Georef_info" : false
        };
        gp.submitJob(inputdata, that.gpJobComplete, that.gpJobStatus, that.gpJobFailed);
      })

      // accordin
      $("#advance").click(function() {
        $(".accordinPanel").slideToggle();
      })
  	},

    gpJobComplete: function(event) {
      $("#progressBar").addClass("hidden");
      if (event.jobStatus == "esriJobSucceeded") {
        gp.getResultData(event.jobId, "Output_File", function(result) {
          //console.log(result);
          $(".printStatus a").attr("href", result.value.url).text("CLICK TO OPEN").removeClass("hidden");
          $('.printStatus > p').addClass("hidden");
        });
      } else if ( event.jobStatus == "esriJobFailed") {
        $(".printStatus a").addClass("hidden");
        $('.printStatus > p').removeClass("hidden").addClass("error").text("Error, try again!")
        console.log(event);
      } else {
        console.log(event);
      }
    },

    gpJobStatus: function(jobinfo) {
      $(".printStatus a").addClass("hidden");
      $("#progressBar").removeClass("hidden");
      $('.printStatus > p').addClass("hidden");
    },

    gpJobFailed: function(error) {
      console.log(error);
      $("#progressBar").addClass("hidden");
      $(".printStatus a").addClass("hidden");
      $('.printStatus > p').text(error).removeClass("hidden").addClass("error");
    },

    onOpen: function(){
      this.printableLayers = [];
      var layerObj = {};

      for (var i = 0; i < mapLayers.length; i++) {
        if (mapLayers[i].layer.visible) {
          layerObj = {
            "id": mapLayers[i].layer.id,
            "title": mapLayers[i].layer.name,
            "opacity": mapLayers[i].layer.opacity,
            "minScale": mapLayers[i].layer.minScale,
            "maxScale": mapLayers[i].layer.maxScale,
            "layerDefinition": {
              "definitionExpression": mapLayers[i].layer._defnExpr
            },
            "url":  mapLayers[i].layer.url
          }
          this.printableLayers.push(layerObj);
        }
      }
    }
  });
  return clazz;
});