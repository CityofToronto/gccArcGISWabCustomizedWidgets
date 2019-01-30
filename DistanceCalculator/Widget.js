define(['dojo/_base/declare', 
        'jimu/BaseWidget',
        'esri/arcgis/utils',
        'esri/tasks/query', 
        'esri/tasks/QueryTask',
        'esri/geometry/geometryEngine',
        'jimu/loaderplugins/jquery-loader!https://code.jquery.com/jquery-3.2.1.min.js, https://code.jquery.com/ui/1.12.1/jquery-ui.min.js'],
function(declare, BaseWidget, ArcgisUtils, Query, QueryTask, GeometryEngine, $) {
  return declare(BaseWidget, {

    name: 'Distance Calculator',
    mapProgramLayerInfo: [],
    mapCoordinationLayerInfo: [],
    mapOtherLayerInfo: [],
    lengthByYear: [],
    categoryQuery: '',
    distanceByYear: [],

    startup: function(){
      this.fetchDataByName('Feature Filter');
      var map = this.map;
      var strCode = '<link rel="stylesheet" href="https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css">'; 
      if (typeof Mustache === 'object') { 
      } else {
        strCode += '<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/mustache.js/3.0.0/mustache.min.js"></script>'
      }
      $(".appCode").html(strCode);
      $("#btnCalculate").button();

      // put related layers to array
      if (this.map.itemId) {
        var myLayers = ArcgisUtils.getLayerList(this.map);

        for (var i = 0; i < myLayers.length; i++) {
          if (myLayers[i].title.toLowerCase().indexOf("wards") < 0 && myLayers[i].title.toLowerCase().indexOf("program") >= 0) {
            this.mapProgramLayerInfo.push(myLayers[i].layer);
          } else if (myLayers[i].title.toLowerCase().indexOf("wards") < 0 && myLayers[i].title.toLowerCase().indexOf("coordination") >= 0) {
            this.mapCoordinationLayerInfo.push(myLayers[i].layer);
          } else {
            this.mapOtherLayerInfo.push(myLayers[i].layer);
          }
        }
      }

      var that = this;
      $("#btnCalculate").click(function(){
        $("#loader").removeClass("hidden");
        $("#totalDistanceContent").addClass("hidden");
        distanceByYear = [];
        Promise.all(that.queryDistance()).then(function(data){
          var template = $('#distanceSum').html();
          distanceByYear.sort((a,b) => a.year - b.year);
          var html = Mustache.to_html(template, {"result": distanceByYear});
          $('#totalDistanceContent').html(html);
          $("#loader").addClass("hidden");
          $("#totalDistanceContent").removeClass("hidden");
        });
      
      })
    },

    queryDistance: function() {
      promises = [];
      var queryTask = new QueryTask(this.mapProgramLayerInfo[1].url);

      var statDef = new esri.tasks.StatisticDefinition();
      statDef.statisticType = "sum";
      statDef.onStatisticField = "P_LENGTH";
      statDef.outStatisticFieldName = "length";
      
      var query = new Query();
      query.returnGeometry = true;
      query.spatialRelationship = esri.tasks.Query.SPATIAL_REL_CONTAINS;
      query.outStatistics = [ statDef ];
      query.groupByFieldsForStatistics = ["INV_OWNER", "INV_PROJECT"];
      query.orderByFields = ["INV_OWNER", "INV_PROJECT"];

      for (var i = 0; i < lengthByYear.length; i++) {
        query.where = categoryQuery + " AND (NOT (INV_START_YEAR>" + lengthByYear[i].year + " OR INV_END_YEAR<" + lengthByYear[i].year + "))";
        var defered = queryTask.execute(query, this.calculateTotalDistanceByYear(lengthByYear[i].year));
        promises.push(defered.promise);
      }
      return promises;
    },

    calculateTotalDistanceByYear: function (year) {
        return function (resultData) {
          var distance = resultData.features.filter(i => i.attributes.LENGTH > 0);
          var totalDistance = distance.reduce((a, b) => +a + +b.attributes.LENGTH, 0)/1000;
          distance.filter(i => i.attributes.LENGTH = (i.attributes.LENGTH/1000).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})); // ormatted string in the default locale, e.g. 3,500
          distanceByYear.push({"details": distance, "year": year, "totalLengthByYear": totalDistance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})});
        }
    },

     onOpen: function(){
        var panel = this.getPanel();
        panel.position.width = 500;
        panel.setPosition(panel.position);
        panel.panelManager.normalizePanel(panel);
    },

    onReceiveData: function(name, widgetId, data, historyData) {
      if (name != "Feature Filter") {
        console.log ("Error when receiving widget data");
        return;
      } else {
        lengthByYear = data[0];
        categoryQuery = data[1]; 
      } 
    }

  })
})


