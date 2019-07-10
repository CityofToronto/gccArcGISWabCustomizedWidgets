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
      var layerName, fieldName, paramValue, queryLayer;
      $(".appCode").html(strCode);
      $( "#dialog" ).dialog({
        autoOpen: false
      });
      // put related layers to array
      if (this.map.itemId) {
        map = this.map;
        mapLayers = ArcgisUtils.getLayerList(map);
        var /* layerList = this.config.layerName.map(v => v.toLowerCase()), */ layers = [];
        var layerList = this.config.layerName.map(function(v) {
          return v.toLowerCase();
        })
        for (var i = 0; i < mapLayers.length; i++) {
          var title = mapLayers[i].title.toLowerCase();
          if ($.inArray(title, layerList) >=0) {
            layers.push({"name": title, "url": mapLayers[i].layer.url, "index": i});
          }
        }
      }

      layerName = this.getURLParams('layer');
      fieldName = this.getURLParams("field");
      paramValue = "(" + this.getURLParams('value') + ")";
      urlValues = this.getURLParams('value')?this.getURLParams('value').split(","):this.getURLParams('value');

      if (layerName && paramValue && fieldName) {
        queryLayer = layers.filter(function(v) {
          return v.name == layerName.toLowerCase()
        })[0]
        //queryLayer = layers.filter(v => v.name == layerName.toLowerCase())[0];
      } 
      //var queryLayer = layers.filter(function(item){return item.name == layerName})[0];

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
      var thisExtent;
      if (data.length > 0) {

        if (data[0].geometry.type == "point") {           
          var xmin = data[0].geometry.x; 
          var xmax = data[0].geometry.x; 
          var ymax = data[0].geometry.y; 
          var ymin = data[0].geometry.y; 

          newExtent = new Extent(xmin, ymin, xmax, ymax, data[0].geometry.spatialReference); 

          for (i = 1; i < data.length; i++) { 
            var xmini = data[i].geometry.x; 
            var xmaxi = data[i].geometry.x; 
            var ymaxi = data[i].geometry.y; 
            var ymini = data[i].geometry.y; 

            thisExtent = new Extent(xmini, ymini, xmaxi, ymaxi, data[i].geometry.spatialReference); 
            newExtent = newExtent.union(thisExtent); 
          } 
          newExtent = new Extent(newExtent.xmin-5000, newExtent.ymin-5000, newExtent.xmax+5000, newExtent.ymax+5000, newExtent.spatialReference)
        } 

        if (data[0].geometry.type == "polyline" || data[0].geometry.type == "polygon") {
          newExtent = new Extent(data[0].geometry.getExtent()) 
          for (i = 1; i < data.length; i++) { 
            thisExtent = data[i].geometry.getExtent(); 
            newExtent = newExtent.union(thisExtent) 
          } 
          newExtent = new Extent(newExtent.xmin-900, newExtent.ymin-900, newExtent.xmax+900, newExtent.ymax+900, newExtent.spatialReference)
        }

        //newExtent = newExtent.union(thisExtent); 
        map.setExtent(newExtent); 
      } 
      if (data.length > urlValues.length) {
        //$("#dialog p").text("Non-unique features are found.")
        //$("#dialog").dialog("open");
      } else if (data.length < urlValues.length) {
        $("#dialog p").text("One or more features do not exist.")
        $("#dialog").dialog("open");
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


