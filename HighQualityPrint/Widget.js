define(["dojo/_base/declare",
  "jimu/BaseWidget",
  "esri/arcgis/utils",
  "esri/tasks/PrintTask",
  "esri/tasks/Geoprocessor",
  'jimu/loaderplugins/jquery-loader!https://code.jquery.com/jquery-3.2.1.min.js, https://code.jquery.com/ui/1.12.1/jquery-ui.js'],
function(declare, BaseWidget, ArcgisUtils, PrintTask, GeoProcessor, $) {
  return declare([BaseWidget], {

     baseClass: 'jimu-widget-highQualityPrint',
     name: 'High Quality Print',
     mapLayers: [],
     gp: null,
     printableLayers: [],
     basemapLayers: [],

  	startup: function() {
  		this.inherited(arguments);
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
        var printMapJson = {
          operationalLayers: $.merge($.merge([], that.basemapLayers), that.printableLayers),
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
          },
          exportOptions: {
            "outputSize": [$("#mapWidth").val(), $("#mapHeight").val()],
            "dpi": $("#quality").val()
          }
        };

        gp = new GeoProcessor("https://gis-intra-qa.toronto.ca/arcgis/rest/services/gp/MapAdvancedHighQualityPrinting/GPServer/MapAdvancedHighQualityPrinting/");
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
          console.log(result);
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