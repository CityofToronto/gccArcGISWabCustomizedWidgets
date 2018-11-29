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
      strCode += '<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/mustache.js/3.0.0/mustache.min.js"></script>'
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
          var html = Mustache.to_html(template, {"result": distanceByYear});
          $('#totalDistanceContent').html(html);
          $("#loader").addClass("hidden");
          $("#totalDistanceContent").removeClass("hidden");
        });
      
        //, that.calculateTotalDistance);
        //promises = all([parcels, buildings]);
        //promises.then(that.calculateTotalDistance);
        /*
        if (that.mapProgramLayerInfo[1].graphics.length > 0) {
          that.calculateTotalDistance (that.mapProgramLayerInfo[1].graphics);
        }
        */
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
          var totalDistance = distance.reduce((a, b) => +a + +b.attributes.LENGTH, 0);
          distanceByYear.push({"details": distance, "year": year, "totalLengthByYear": totalDistance});
        }
    },

    /*  
    calculateTotalDistanceByYear: function(resultData, year) {
      console.log(year);
      var details = [];
      details.push(resultData.features.filter(i => i.attributes.LENGTH > 0));

      console.log(details);

      var features = resultData.features;
      var lengthByProgram, length, program, owner, startYear, endYear, featuresByYear = [];
      for (var m = 0; m < lengthByYear.length; m++) { 
        lengthByYear[m].totalLengthByYear = 0;
        lengthByYear[m].details = [];
        featuresByYear[m] = [];
      }
      for (var i = 0; i < features.length; i++) {
        length = GeometryEngine.planarLength(features[i].geometry, "kilometers");
        startYear = features[i].attributes.INV_START_YEAR;
        endYear = features[i].attributes.INV_END_YEAR;
        for (var j = 0; j < lengthByYear.length; j++) {         
            if (startYear <= lengthByYear[j].year  && lengthByYear[j].year <= endYear) {     
              lengthByYear[j].totalLengthByYear = Math.round((length + lengthByYear[j].totalLengthByYear)*100)/100;
              featuresByYear[j].push(features[i]);
              featuresByYear[j].sort((a,b) => (a.attributes.INV_OWNER > b.attributes.INV_OWNER) ? 1 : ((b.attributes.INV_OWNER > a.attributes.INV_OWNER) ? -1 : 0));
              //featuresByYear[j].sort((a,b) => (a.attributes.INV_OWNER === b.attributes.INV_OWNER) ? (a.attributes.INV_PROJECT > b.attributes.INV_PROJECT ? 1 : ((b.attributes.INV_PROJECT > a.attributes.INV_PROJECT) ? -1 : 0)) : 1);
            }
        }
      }
      for (var m = 0; m < featuresByYear.length; m++) {
        lengthByProgram = [];

        for (var k = 0; k < featuresByYear[m].length; k++) {
          program = featuresByYear[m][k].attributes.INV_PROJECT;
          owner = featuresByYear[m][k].attributes.INV_OWNER;
          //length = featuresByYear[m][k].attributes.P_LENGTH;
          length = GeometryEngine.planarLength(featuresByYear[m][k].geometry, "kilometers");
          //console.log(length + " vs " + length_c);
          for (var n = 0; n < lengthByProgram.length; n++) {
            if (lengthByProgram[n].program == program && lengthByProgram[n].owner == owner) {
              lengthByProgram[n].totalLength = Math.round((length + lengthByProgram[n].totalLength)*100)/100; 
              n = lengthByProgram.length + 1;
            }
          }
          if (n == lengthByProgram.length) {
              lengthByProgram[n] = {"owner": owner, "program": program, "totalLength": Math.round(length*100)/100};
          }
        }
        lengthByYear[m].details = lengthByProgram;
      }
      //console.log(resultData);
      if (details.length == lengthByYear.length) {
        var template = $('#distanceSum').html();
        var html = Mustache.to_html(template, {"result": {"details": details}});
        $('#totalDistanceContent').html(html);
        
        $("#loader").addClass("hidden");
        $("#totalDistanceContent").removeClass("hidden");
      }
      
    }, */

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
    },

    compare: function(a,b) {
      if (a.attributes.INV_OWNER < b.attributes.INV_OWNER)  
        return -1;
      if (a.last_nom > b.last_nom)
        return 1;
      return 0;
    }

  })
})


