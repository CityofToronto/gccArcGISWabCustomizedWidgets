///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 - 2018 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/html',
    'dojo/_base/lang',
    'dojo/query',
    'dojo/on',
    'dijit/_WidgetsInTemplateMixin',
    'jimu/utils',
    'jimu/BaseWidget',
    'jimu/filterUtils',
    'jimu/dijit/FilterParameters',
    'jimu/LayerInfos/LayerInfos',
    'jimu/FilterManager',
    'esri/request',
    // 'esri/tasks/query',
    // 'esri/tasks/QueryTask',
    'esri/symbols/jsonUtils',
    'jimu/symbolUtils',
    'jimu/dijit/LayerChooserFromMapWithDropbox',
    'jimu/dijit/Filter',
    './CustomFeaturelayerChooserFromMap',
    'jimu/dijit/ToggleButton',
    'jimu/loaderplugins/jquery-loader!https://code.jquery.com/jquery-3.2.1.min.js',
    'dojo/NodeList',
    'dojo/NodeList-dom'
  ],
  function(declare, array, html, lang, query, on, _WidgetsInTemplateMixin,
    jimuUtils, BaseWidget, FilterUtils, FilterParameters, LayerInfos, FilterManager,esriRequest,
    // Query, QueryTask,
    esriSymbolJsonUtils, jimuSymUtils, LayerChooserFromMapWithDropbox, Filter,
    CustomFeaturelayerChooserFromMap, ToggleButton, $) {

    return declare([BaseWidget, _WidgetsInTemplateMixin], {
      name: 'FilterByTime',
      baseClass: 'jimu-widget-filterbytime',
      startTime: '00:00',
      endTime: '00:00',
      //style="display:${hasValue}"

      // Rui -- added two input boxes for time input
      _itemTemplate: '<li class="filter-item" data-index="${index}">' +
        '<div class="header" >' +
          '<span class="arrow jimu-float-leading jimu-trailing-margin05" title="${toggleTip}" ></span>' +
          '<span class="icon">' +
            '<img src="${icon}" />' +
          '</span>' +
          '<span class="icon symbolIcon" style="display:none;">' +
          '</span>' +
          '<span class="item-title">${title}</span>' +
          '<span class="toggle-filter jimu-trailing-margin1"></span>' +
        '</div>' +
        '<div class="body">' +
          '<div class="parameters">' + 
            '<div><label style="color: #686868; display: inline-block; width: 60px; margin: 0 10px 0 2px" for="timeInput1">Start time</label><input type="time" id="timeInput1" value="00:00"></div>' + 
            '<div style="margin: 5px 0"><label style="color: #686868; display: inline-block; width: 60px; margin: 0 10px 0 2px" for="timeInput2">End time</label><input type="time" id="timeInput2" value="00:00"></div>' +
          '</div>' +
        '</div>' +
      '</li>',
      _store: null,

      postMixInProperties:function(){
        this.jimuNls = window.jimuNls;
      },

      postCreate: function(){
        this.inherited(arguments);
        this._store = {};
        this.layerInfosObj = LayerInfos.getInstanceSync();
        this.filterUtils = new FilterUtils();
        this.filterManager = FilterManager.getInstance();

        if(this.config.allowCustom){
          html.setStyle(this.showCustomButtonNode, 'display', 'block');
        }

        var existAskForValue = false;

        var filters = this.config.filters;

        //set filters's order by layer
        if(this.config.groupByLayer){
          var newFilters = {};
          array.forEach(filters, function(filterObj) {
            if(!newFilters[filterObj.layerId]){
              newFilters[filterObj.layerId] = [];
            }
            newFilters[filterObj.layerId].push(filterObj);
          }, this);

          for(var key in newFilters){
            var layer = this.layerInfosObj.getLayerInfoById(key);
            // var layerName = this.layerInfosObj._getLayerTitle(layer); //don't use private function
            var layerNameNode = document.createElement('div');
            html.addClass(layerNameNode, "filter-layer-name");
            layerNameNode.innerText = layer.title;
            html.place(layerNameNode, this.filterList);

            existAskForValue = this._initFilters(newFilters[key], existAskForValue);
          }
        }else{
          existAskForValue = this._initFilters(filters, existAskForValue);
        }

        if(!existAskForValue){
          html.addClass(this.domNode, 'not-exist-ask-for-value');
        }

        // Rui - remove time from the timestamp field when selected from calendar
        $("body").on('DOMSubtreeModified', ".dijitReset.dijitInputField.dijitButtonText", function() {
          var a = $(this).text().trim();
          if (a.indexOf(":") > 0) {
            if (a.indexOf(" ")) var b = new Date(a.substring(0, a.indexOf(' ')));
            var newDate = (b.getMonth()+1) + "/" + b.getDate() + "/" + b.getFullYear();
            $(this).text(newDate);
          }
        });
        
      },

      startup: function() {
        this.inherited(arguments);
        this.resize();
		    this.trimTime();
      },

      _initFilters: function(filters, existAskForValue){
        array.forEach(filters, function(filterObj, idx) {
          var isAskForValue = this.filterUtils.isAskForValues(filterObj.filter);

          if(isAskForValue){
            existAskForValue = true;
          }

          // filterObj.icon = (filterObj.symbol && filterObj.symbol.url) ? filterObj.symbol.url : filterObj.icon;
          var parse = {
            icon: filterObj.icon ? jimuUtils.processUrlInWidgetConfig(filterObj.icon, this.folderUrl) :
              this.folderUrl + '/css/images/default_task_icon.png',
            index: idx,
            title: filterObj.name,
            toggleTip: this.nls.toggleTip,
            hasValue: isAskForValue ?
              (window.appInfo.isRunInMobile ? 'block !important' : '') : 'none',
            isAskForValue: isAskForValue,
            apply: lang.getObject('jimuNls.common.apply', false, window) || 'Apply'
          };

          if (!this._store[filterObj.layerId]) {
            this._store[filterObj.layerId] = {
              mapFilterControls: {}
              // filter_item_idx
            }; // filter_item_idx, mapFilterControls
          }

          var template = lang.replace(this._itemTemplate, parse, /\$\{([^\}]+)\}/ig);
          var node = html.toDom(template);
          html.place(node, this.filterList);

          if(filterObj.symbol){ //svg
            var icons = query('.icon', node);
            html.setStyle(icons[0], 'display', 'none');
            html.setStyle(icons[1], 'display', 'inline-block');

            var jsonSymbol = esriSymbolJsonUtils.fromJson(filterObj.symbol);
            var size = 16;
            var isImgSym = filterObj.symbol.url || filterObj.symbol.imageData;
            if(isImgSym){//from image chooser
              jsonSymbol.setWidth(size);
              jsonSymbol.setHeight(size);
            }else{
              jsonSymbol.setSize(size);//.setOffset(0, 10);//not work
            }

            var symbolNode;
            if(isImgSym){
              symbolNode = jimuSymUtils.createSymbolNode(jsonSymbol);
            }else{
              symbolNode = jimuSymUtils.createSymbolNode(jsonSymbol, {width:size + 1, height: size + 1});
            }
            html.place(symbolNode, icons[1]);
          }

          var toggleButton = new ToggleButton({}, query('.toggle-filter', node)[0]);
          toggleButton.startup();
          node.toggleButton = toggleButton;
          this.own(
            query('.header', node)
            .on('click', lang.hitch(this, 'toggleFilter', node, filterObj, parse))
          );
          if(isAskForValue){
            html.addClass(node, 'has-ask-for-value');
          }else{
            html.addClass(node, 'not-has-ask-for-value');
          }
          if (parse.hasValue !== 'none') {
            // add parameters
            this.own(
              query('.arrow', node)
              .on('click', lang.hitch(this, 'configFilter', node, filterObj))
            );
            html.addClass(node, 'requesting');
            this.configFilter(node, filterObj, null, lang.hitch(this, function(){
              if(filterObj.collapse){
                html.removeClass(node, 'config-parameters');
              }

              if(filterObj.autoApplyWhenWidgetOpen){
                this.toggleFilter(node, filterObj, parse);
              }
            }));
          }else{
            if(filterObj.autoApplyWhenWidgetOpen){
              this.toggleFilter(node, filterObj, parse);
            }
          }

        }, this);
        return existAskForValue;
      },

      _getPriorityOfMapFilter: function(layerId) {
        var mapFilterControls = lang.getObject(layerId + '.mapFilterControls', false, this._store);
        var count = 0;
        for (var p in mapFilterControls) {
          var control = mapFilterControls[p];
          if (control.priority > count) {
            count = control.priority;
          }
        }

        return count;
      },

      _getMapFilterControl: function(layerId) {
        var mapFilterControls = lang.getObject(layerId + '.mapFilterControls', false, this._store);
        var count = 0;
        var enable = true;
        for (var p in mapFilterControls) {
          var control = mapFilterControls[p];
          if (control.priority > count) {
            enable = !!control.enable;
          }
        }

        return enable;
      },

      _setItemFilter: function(layerId, idx, expr, enableMapFilter) {
        this._store[layerId]['filter_item_' + idx] = expr;

        var priority = this._getPriorityOfMapFilter(layerId);
        lang.setObject(layerId + '.mapFilterControls.filter_item_' + idx , {
          enable: enableMapFilter,
          priority: priority + 1
        }, this._store);
      },

      _removeItemFilter: function(layerId, idx) {
        delete this._store[layerId]['filter_item_' + idx];
        delete this._store[layerId].mapFilterControls['filter_item_' + idx];
      },

      //combine all the filter task
      _getExpr: function(layerId) {
        if (!this._store[layerId]) {
          return null;
        }

        var parts = [];
        var exprs = this._store[layerId];

        for (var p in exprs) {
          var expr = exprs[p];
          if (expr && p !== 'mapFilterControls') {
            parts.push('(' + expr + ')');
          }
        }

        // return parts.join(' AND ');
        return parts.join(' ' + this.config.taskOper + ' '); //by filters's operator
      },

      toggleFilter: function(node, filterObj, parse) {
        if (html.hasClass(node, 'config-parameters') &&
          !(node.filterParams && node.filterParams.getFilterExpr())) {
          return;
        }
        if (parse.isAskForValue && !(node.filterParams && node.filterParams.getFilterExpr())) {
          this.configFilter(node, filterObj);
          return;
        }
        // if(node.toggleButton.isDoing){
        //   return;
        // }

        var layerId = filterObj.layerId;
        var idx = html.getAttr(node, 'data-index');
        var layerFilterExpr = null;

        var applied = html.hasClass(node, 'applied');
        if (applied) {
          html.removeClass(node, 'applied');
          node.toggleButton.uncheck();
        } else {
          html.addClass(node, 'applied');
          node.toggleButton.check();
        }

        var enableMapFilter = null;
        if (!applied) {

          // Rui -- get time input and add to filter
          var expr = this._getFilterExpr(node, filterObj);
          if (expr.indexOf("AND") >=0) {
            var new_expr = expr.split('AND');
            var a = new_expr[0].substring(0, new_expr[0].length-11) + this.validateTimeInput($('#timeInput1').val(), this.startTime);
            var b = new_expr[1].substring(0, new_expr[1].length-10) + this.validateTimeInput($('#timeInput2').val(), this.endTime);
            expr = a + " AND " + b;
          }

          this._setItemFilter(layerId, idx, expr, filterObj.enableMapFilter);
          layerFilterExpr = this._getExpr(layerId);
          enableMapFilter = this._getMapFilterControl(layerId);
          this.filterManager.applyWidgetFilter(layerId, this.id, layerFilterExpr, enableMapFilter);
        } else {
          this._removeItemFilter(layerId, idx);
          layerFilterExpr = this._getExpr(layerId);
          enableMapFilter = this._getMapFilterControl(layerId);
          this.filterManager.applyWidgetFilter(layerId, this.id, layerFilterExpr, enableMapFilter);
        }

        this._afterFilterApplied(filterObj.layerId);
      },

      configFilter: function(node, filterObj, evt, cb) {
        if (!node.filterParams) {
          esriRequest({
            url: filterObj.url,
            content: {
              f: 'json'
            },
            handleAs: 'json',
            callbackPrams: 'callback'
          }).then(lang.hitch(this, function(definition) {
            html.addClass(node, 'config-parameters');
            html.removeClass(node, 'requesting');
            var pamDiv = query('.parameters', node)[0];
            node.handles = [];
            node.filterParams = new FilterParameters();
            var partsObj = lang.clone(filterObj.filter);

            var layerId = null;
            if(filterObj.enableMapFilter){
              //if enableMapFilter is true, pass layerId to filterParams,
              //so filterParams can get the layer expr defined in webmap
              layerId = filterObj.layerId;
            }

            node.filterParams.build(filterObj.url, definition, partsObj, layerId);

            this.own(on(node.filterParams, 'change', lang.hitch(this, function(expr) {
              if (expr) {
                node.expr = expr;
              } else {
                delete node.expr;
              }

              if(node.toggleButton.checked){
                this.applyFilterValues(node, filterObj);
              }

            })));

            node.expr = node.filterParams.getFilterExpr();
            node.filterParams.placeAt(pamDiv);
            this._changeItemTitleWidth(node, 60);
            if(cb){
              cb();
            }
          }));
        } else {
          if (!html.hasClass(node, 'config-parameters')) {
            html.addClass(node, 'config-parameters');
            this._changeItemTitleWidth(node, 60);
          } else {
            html.removeClass(node, 'config-parameters');
            this._changeItemTitleWidth(node, window.appInfo.isRunInMobile ? 60 : 45);
          }
          if(cb){
            cb();
          }
        }

        if (evt && evt.target) {
          evt.stopPropagation();
        }
      },

      applyFilterValues: function(node, filterObj, evt) {
        var expr = this._getFilterExpr(node, filterObj);
        if (expr) {
          node.expr = expr;
          // getFilterExpr
          var layerId = filterObj.layerId;
          var idx = html.getAttr(node, 'data-index');
          html.addClass(node, 'applied');

          // rui - added time input to filter
          if (expr.indexOf("AND") >=0  && $('#timeInput1').val() && $('#timeInput2').val()) {
            var new_expr = expr.split('AND');
            var a = new_expr[0].substring(0, new_expr[0].length-11) + this.validateTimeInput($('#timeInput1').val(), this.startTime);
            var b = new_expr[1].substring(0, new_expr[1].length-10) + this.validateTimeInput($('#timeInput2').val(), this.endTime);
            expr = a + " AND " + b;
          }
          this._setItemFilter(layerId, idx, expr, filterObj.enableMapFilter);
          
          //this._setItemFilter(layerId, idx, node.expr, filterObj.enableMapFilter);
          var layerFilterExpr = this._getExpr(layerId);
          var enableMapFilter = this._getMapFilterControl(layerId);
          this.filterManager.applyWidgetFilter(layerId, this.id, layerFilterExpr, enableMapFilter);

          this._afterFilterApplied(filterObj.layerId);
        }

        if(evt){
          evt.stopPropagation();
        }
      },

      _getFilterExpr: function(node, filterObj){
        if(node.filterParams){
          return node.filterParams.getFilterExpr();
        }

        if(this.filterUtils.hasVirtualDate(filterObj.filter)){
          this.filterUtils.isHosted = jimuUtils.isHostedService(filterObj.url);
          return this.filterUtils.getExprByFilterObj(filterObj.filter);
        }else{
          return filterObj.filter.expr;
        }

      },

      _afterFilterApplied: function(layerId){
        if(!this.config.zoomto){
          return;
        }
        var layerInfo = this.layerInfosObj.getLayerInfoById(layerId);
        if(!layerInfo){
          return;
        }
        layerInfo.zoomTo();
      },

      _isValidExtent: function(extent){
        return !(isNaN(extent.xmax) || isNaN(extent.xmax) ||
          isNaN(extent.xmax) || isNaN(extent.xmax));
      },

      resize: function() {
        this.inherited(arguments);
        // this._changeItemTitleWidth(this.domNode, window.appInfo.isRunInMobile ? 60 : 45);
        this._changeItemTitleWidth(this.domNode, window.appInfo.isRunInMobile ? 60 : 70);
        if(this.customFilter){
          this.customFilter.resize();
        }
      },

      _changeItemTitleWidth: function(node, tolerace) {
        tolerace += 30;
        var itemHeader = query('.header', node)[0];
        if (itemHeader) {
          var contentBox = html.getContentBox(itemHeader);
          var maxWidth = contentBox.w - tolerace;// width of header minus others width
          if (maxWidth > 0) {
            query('.header .item-title', node).style({
              'maxWidth': maxWidth + 'px'
            });
          }
        }
      },

      _onShowCustomClick: function(){
        html.setStyle(this.customFilterContainerNode, 'display', 'block');
        html.setStyle(this.filterListContainerNode, 'display', 'none');

        if(!this.layerChooserSelect){
          var layerChooser = new CustomFeaturelayerChooserFromMap({
            showLayerFromFeatureSet: false,
            showTable: false,
            onlyShowVisible: false,
            createMapResponse: this.map.webMapResponse
          });
          this.layerChooserSelect = new LayerChooserFromMapWithDropbox({
            layerChooser: layerChooser
          });
          this.layerChooserSelect.placeAt(this.layerSelectNode);

          this.own(on(this.layerChooserSelect, 'selection-change', lang.hitch(this, this._onLayerChanged)));

          this.layerChooserSelect.showLayerChooser();
        }
      },

      _onLayerChanged: function(){
        var item = this.layerChooserSelect.getSelectedItem();
        if(!item){
          return;
        }
        //nameTextBox
        var layerInfo = item.layerInfo;
        var layer = layerInfo.layerObject;
        //filter
        var layerDefinition = this._getLayerDefinitionForFilterDijit(layer);

        if(!this.customFilter){
          this.customFilter = new Filter({
            enableAskForValues: false,
            featureLayerId: layer.id,
            runtime: true
          });
          this.customFilter.placeAt(this.customFilterNode);
          this.own(on(this.customFilter, 'change', lang.hitch(this, this._onCustomFilterChange)));
        }

        this.customFilter.build({
          url: layer.url,
          featureLayerId: layer.id, // featureLayerId is necessary
          layerDefinition: layerDefinition
        });

        this.selectedLayer = layer;
      },

      _getLayerDefinitionForFilterDijit: function(layer){
        var layerDefinition = null;

        if(layer.declaredClass === 'esri.layers.FeatureLayer'){
          layerDefinition = jimuUtils.getFeatureLayerDefinition(layer);
        }

        if (!layerDefinition) {
          layerDefinition = {
            currentVersion: layer.currentVersion,
            fields: lang.clone(layer.fields)
          };
        }

        return layerDefinition;
      },

      _onBackToListClick: function(){
        html.setStyle(this.customFilterContainerNode, 'display', 'none');
        html.setStyle(this.filterListContainerNode, 'display', 'block');
      },

      _onCustomFilterToggle: function(isChecked){
        if(!this.customFilter){
          return;
        }
        if(!isChecked){
          this.filterManager.applyWidgetFilter(this.selectedLayer.id, this.id + '-custom-filter', '1=1', true);
          this._afterFilterApplied(this.selectedLayer.id);
        }else{
          this._applyCustomFilter();
        }
      },

      _onCustomFilterChange: function(){
        this._applyCustomFilter();
      },

      _applyCustomFilter: function(){
        var filterJson = this.customFilter.toJson();
        if(!filterJson || !this.customFilterToggleButton.checked || filterJson.parts.length === 0){
          return;
        }
        this.filterManager.applyWidgetFilter(this.selectedLayer.id, this.id + '-custom-filter', filterJson.expr, true);
        this._afterFilterApplied(this.selectedLayer.id);
      },

      destroy: function(){
        query('.filter-item', this.filterList).forEach(function(node) {
          delete node.filterParams;
          delete node.expr;
        });
        if (this._store) {
          for (var p in this._store) {
            if (p) {
              this.filterManager.applyWidgetFilter(p, this.id, "", null);
            }
          }
        }
        this.inherited(arguments);
      },

      validateTimeInput: function (v, a) {
        if (typeof v == "undefined" || v == "" || v == null) {
          return a + ":00')";
        } else {
          return v + ":00')";
        }
      },

      trimTime: function() {
        var a = $(".dijitReset.dijitInputField.dijitButtonText").text().trim();
        if (a.indexOf(":") > 0) {
        if (a.indexOf(" ")) var b = new Date(a.substring(0, a.indexOf(' ')));
        var newDate = (b.getMonth()+1) + "/" + b.getDate() + "/" + b.getFullYear();
        $(".dijitReset.dijitInputField.dijitButtonText").text(newDate);
        }
      }

    });
  });