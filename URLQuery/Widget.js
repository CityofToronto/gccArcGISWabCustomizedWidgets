define(['dojo/_base/declare', 
        'jimu/BaseWidget',
        'esri/arcgis/utils',
        "esri/geometry/Extent",
        'esri/tasks/query', 
        "esri/layers/FeatureLayer",
        "esri/InfoTemplate",
        "esri/renderers/SimpleRenderer",
        'esri/geometry/Point',
        "esri/symbols/jsonUtils",
        'jimu/loaderplugins/jquery-loader!https://code.jquery.com/jquery-3.2.1.min.js, https://code.jquery.com/ui/1.12.1/jquery-ui.min.js'],
function(declare, BaseWidget, ArcgisUtils, Extent, Query, FeatureLayer, InfoTemplate, SimpleRenderer, Point, JsonUtils, $) {
  return declare(BaseWidget, {

    name: 'URL Query',
    map: null,
    urlValues: [],

    startup: function(){
      var strCode = '<link rel="stylesheet" href="https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css">'; 
      
      $(".appCode").html(strCode);
      $( "#dialog" ).dialog({
        autoOpen: false
      });
      // put related layers to array
      if (this.map.itemId) {
        map = this.map;
        mapLayers = ArcgisUtils.getLayerList(map);
        var layerList = this.config.layerName.map(v => v.toLowerCase()), layers = [];
        for (var i = 0; i < mapLayers.length; i++) {
          var title = mapLayers[i].title.toLowerCase();
          if ($.inArray(title, layerList) >=0) {
            layers.push({"name": title, "url": mapLayers[i].layer.url, "index": i});
          }
        }
      }

      var layerName = this.getURLParams('layer').toLowerCase();
      var fieldName = this.getURLParams("field");
      var paramValue = "(" + this.getURLParams('value') + ")";
      urlValues = this.getURLParams('value').split(",");
      var queryLayer = layers.filter(function(item){return item.name == layerName})[0];

      if (layerName && paramValue && fieldName && queryLayer) {
        // add layer to map
        var infoTemplate = new InfoTemplate("Attributes", this.setInfoWindowContent);
        featureLayer = new FeatureLayer(queryLayer.url,
        {
          infoTemplate: infoTemplate,
          outFields: ["*"],
          definitionExpression: fieldName + " IN " + paramValue,
          minScale: 300000
        });

        // rerender feature layer
        var rerenderSymbol = "";
        var that = this;
        $.getJSON(queryLayer.url + "?f=json", function(response) {
          if (response.geometryType.toLowerCase().indexOf("point") >=0) {
            rerenderSymbol = that.config.symbol.point;
          }
          if (response.geometryType.toLowerCase().indexOf("polyline") >=0) {
            rerenderSymbol = that.config.symbol.linear;
          }
          if (response.geometryType.toLowerCase().indexOf("polygon") >=0) {
            rerenderSymbol = that.config.symbol.polygon;
          }
          featureLayer.setRenderer(new SimpleRenderer(JsonUtils.fromJson(rerenderSymbol)));

          map.addLayer(featureLayer);
        })


        // query features to zoom to selected features
        var query = new Query();
        query.where = fieldName + " IN " + paramValue;
        query.outSpatialReference = map.spatialReference;
        query.returnGeometry = true;
        query.outFields = ["*"];
        featureLayer.selectFeatures(query, FeatureLayer.SELECTION_NEW, this.findFeatures);
      }


    },

    findFeatures: function(data) {
      var centrePoint;
      if (data.length > 0) {
        if (data[0].geometry.type == "point") {           
          centrePoint = new Point(data[0].geometry);
        } 

        if (data[0].geometry.type == "polyline") {
          var mid = Math.round(data[0].geometry.paths[0].length/2);
          centrePoint = new Point({"spatialReference": data[0].geometry.spatialReference, "x": data[0].geometry.paths[0][mid][0], "y": data[0].geometry.paths[0][mid][1]});
        }

        if (data[0].geometry.type == "polygon") {
          var mid = Math.round(data[0].geometry.rings[0].length/2);
          centrePoint = new Point({"spatialReference": data[0].geometry.spatialReference, "x": data[0].geometry.rings[0][mid][0], "y": data[0].geometry.rings[0][mid][1]});
        }

        map.centerAndZoom(centrePoint, 20);
      } 
      if (data.length != urlValues.length) {
        $( "#dialog" ).dialog("open");
      }
        
    },

    setInfoWindowContent: function (feature) {
      var html = "<dl>";
      // infowindow popup
      $.each (feature.attributes, function(key, value) {
        html = html + "<dt>" + key + "</dt><dd>" + (value?value:"") + "</dd>";
      })
      return html + "</dl>";
    },

    errorHandler: function(error) {
      console.log(error);
    },

    getURLParams: function(sParam) {
      var sPageURL = decodeURIComponent(window.location.search.substring(1));
      var sURLVariables = sPageURL.split('&');
      for (var i = 0; i < sURLVariables.length; i++) {
          var sParameterName = sURLVariables[i].split('=');
          if (sParameterName[0] == sParam){
              return sParameterName[1];
          }
      }
    }

  })
})


