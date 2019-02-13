define(['dojo/_base/declare', 
        'jimu/BaseWidget',
        'esri/arcgis/utils',
        "esri/geometry/Extent",
        'esri/tasks/query', 
        'esri/tasks/QueryTask',
        "esri/InfoTemplate",
        'esri/graphic', 
        'esri/geometry/Point',
        "esri/symbols/jsonUtils",
        'jimu/loaderplugins/jquery-loader!https://code.jquery.com/jquery-3.2.1.min.js, https://code.jquery.com/ui/1.12.1/jquery-ui.min.js'],
function(declare, BaseWidget, ArcgisUtils, Extent, Query, QueryTask, InfoTemplate, Graphic, Point, JsonUtils, $) {
  return declare(BaseWidget, {

    name: 'URL Query',
    layers: [],
    map: null,
    fieldName: null,
    queryLayer: null,
    mapLayers: null,

    startup: function(){
      var strCode = '<link rel="stylesheet" href="https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css">'; 
      if (typeof Mustache === 'object') { 
      } else {
        strCode += '<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/mustache.js/3.0.0/mustache.min.js"></script>'
      }
      $(".appCode").html(strCode);

      // put related layers to array
      if (this.map.itemId) {
        map = this.map;
        mapLayers = ArcgisUtils.getLayerList(this.map);
        var layerList = this.config.layerName;
        for (var i = 0; i < mapLayers.length; i++) {
          var title = mapLayers[i].title.toLowerCase();
          if ($.inArray(title, layerList) >=0) {
            this.layers.push({"name": title, "url": mapLayers[i].layer.url, "index": i});
          }
        }
      }

      var layerName = this.getURLParams('layer');
      var paramValue = "(" + this.getURLParams('value') + ")";
     
      fieldName = this.getURLParams("field");
      if (layerName &&  paramValue && fieldName) {

        queryLayer = this.layers.filter(function(item){return item.name == layerName})[0];

        var queryTask = new QueryTask(queryLayer.url);
        var query = new Query();
        query.where = fieldName + " IN " + paramValue;
        query.outSpatialReference = this.map.spatialReference;
        query.returnGeometry = true;
        query.outFields = ["*"];

        queryTask.execute(query, this.findFeatures, this.errorHandler);

      } 
    },

    findFeatures: function(data) {
      for (var i = 0; i < data.features.length; i++) {
        var html = "";
        // infowindow popup
        $.each (data.features[i].attributes, function(key, value) {
          html = html + "<dt class='title'>" + key + "</dt><dd class='detail'>" + (value?value:"") + "</dd>";
        })
        html = html + "</dl>";

         // show features on map
        var graphic = data.features[i];
        if (data.features[i].geometry.type == "point") {           
          /*var selectedPoint = {geometry: data.features[i].geometry, "symbol":{"color":[0,0,0,255],"size":10,"type":"esriSMS","style":"esriSMSCircle"}}
          map.graphics.add(new Graphic(selectedPoint));
          map.centerAndZoom(new Point(data.features[i].geometry), 20);
          */
          graphic.setSymbol(JsonUtils.fromJson({"color":[0,0,0,255],"size":10,"type":"esriSMS","style":"esriSMSCircle"}));
          graphic.setInfoTemplate(new InfoTemplate("Attributes", html));
          map.graphics.add(graphic);
          map.centerAndZoom(new Point(data.features[i].geometry), 20);
        } 

        if (data.features[i].geometry.type == "polyline") {
          /*
          var selectedLine = {geometry: data.features[i].geometry, "symbol":{"color":[0,0,0,255],"width":4,"type":"esriSLS","style":"esriSLSSolid"}};
          map.graphics.add(new Graphic(selectedLine));
          var newExtent = new Extent(data.features[i].geometry.getExtent());
          map.setExtent(newExtent, true);
          */
          graphic.setSymbol(JsonUtils.fromJson({"color":[0,0,0,255],"width":4,"type":"esriSLS","style":"esriSLSSolid"}));
          graphic.setInfoTemplate(new InfoTemplate("Attributes", html));
          map.graphics.add(graphic);
          var newExtent = new Extent(data.features[i].geometry.getExtent());
          map.setExtent(newExtent, true);

        }

      }
        
    },

    errorHandler: function(error) {
      console.log(error);
    },

    getURLParams: function(sParam) {
      var sPageURL = window.location.search.substring(1);
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


