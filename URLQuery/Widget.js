define(['dojo/_base/declare', 
        'jimu/BaseWidget',
        'esri/arcgis/utils',
        "esri/layers/FeatureLayer",
        "esri/geometry/Extent",
        'esri/tasks/query', 
        'esri/tasks/QueryTask',
        'esri/symbols/PictureMarkerSymbol', 
        'esri/graphic', 
        'esri/geometry/Point',
        'jimu/loaderplugins/jquery-loader!https://code.jquery.com/jquery-3.2.1.min.js, https://code.jquery.com/ui/1.12.1/jquery-ui.min.js'],
function(declare, BaseWidget, ArcgisUtils, FeatureLayer, Extent, Query, QueryTask, PictureMarkerSymbol, Graphic, Point, $) {
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

        var that = this;
        $('.container').click('a.locate', function(e) {
          e.preventDefault();
          console.log(e.target.dataset.attr);
          that.locateFeature(e.target.dataset.attr);
        })

      } 
    },

    locateFeature: function(id) {
      var query = new Query(), newPoint, midPoint;
      query.objectIds = [id];
      mapLayers[queryLayer.index].layer.selectFeatures(query, FeatureLayer.SELECTION_NEW, function(features) {
        map.infoWindow.setFeatures(features);

        if (features[0].geometry.type == "point") {
          newPoint = new Point(features[0].geometry);
          map.centerAndZoom(newPoint, 15);
          map.infoWindow.show(features[0].geometry);
        }

        if (features[0].geometry.type == "polyline") {
          midPoint = features[0].geometry.paths[0][Math.ceil(features[0].geometry.paths[0].length/2)];
          newPoint = new Point({"x": midPoint[0], "y": midPoint[1], "spatialReference": features[0].geometry.spatialReference});
          map.centerAndZoom(newPoint, 15);
          map.infoWindow.show(newPoint);
        }

      })
    },

    findFeatures: function(data) {
      var html = "", 
          symbol = new PictureMarkerSymbol({
            "angle":0,
            "xoffset":0,
            "yoffset":10,
            "type":"esriPMS",
            "url":"https://static.arcgis.com/images/Symbols/Shapes/BlackPin1LargeB.png",
            "contentType":"image/png",
            "width":24,
            "height":24
      });

      for (var i = 0; i < data.features.length; i++) {
          // show attributes in side panel
          html = html + "<a class='locate' href='' data-attr='" + (data.features[i].attributes.OBJECTID?data.features[i].attributes.OBJECTID:data.features[i].attributes.objectid) + "'>Locate feature</a><dl class='attr-list'>";
          $.each (data.features[i].attributes, function(key, value) {
            html = html + "<dt class='title'>" + key + "</dt><dd class='detail'>" + (value?value:"") + "</dd>";
          })
          html = html + "</dl>";

           // show features on map
          if (data.features[i].geometry.type == "point") {
            var centrePoint = new Point(data.features[i].geometry);
            map.graphics.add(new Graphic(centrePoint, symbol));
            map.centerAndZoom(centrePoint, 15);
          } 

          if (data.features[i].geometry.type == "polyline") {
            var selectedLine = {geometry: data.features[i].geometry, "symbol":{"color":[0,0,0,255],"width":4,"type":"esriSLS","style":"esriSLSSolid"}};
            map.graphics.add(new Graphic(selectedLine));
            var newExtent = new Extent(data.features[i].geometry.getExtent());
            map.setExtent(newExtent, true);
          }

        }

        $('.container').html(html);
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
    },

     onOpen: function(){
        var panel = this.getPanel();
        panel.position.width = 500;
        panel.setPosition(panel.position);
        panel.panelManager.normalizePanel(panel);
    }

  })
})


