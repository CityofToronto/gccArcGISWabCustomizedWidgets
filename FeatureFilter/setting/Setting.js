///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 - 2016 Esri. All Rights Reserved.
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
    'dojo/_base/json',
    'dojo/json',
    'jimu/BaseWidgetSetting',
    'jimu/LayerInfos/LayerInfos',
    'dijit/_WidgetsInTemplateMixin',
    './LayerSelector',
    'jimu/loaderplugins/jquery-loader!https://code.jquery.com/jquery-3.2.1.min.js'
  ],
  function(
    declare,
    dojo,
    JSON,
    BaseWidgetSetting,
    LayerInfos,
    _WidgetsInTemplateMixin,
    LayerSelector, $) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {

      baseClass: 'jimu-widget-featurefilter-setting',

      startup: function() {
        this.inherited(arguments);
        this.setConfig(this.config);
      },

      setConfig: function(config) {
        /*this.showLegend.setValue(config.showLegend);
        if(config.contextMenu) {
          this.zoomto.setValue(config.contextMenu.ZoomTo);
          this.transparency.setValue(config.contextMenu.Transparency);
          this.controlPopup.setValue(config.contextMenu.EnableOrDisablePopup);
          this.moveupDown.setValue(config.contextMenu.MoveupOrMovedown);
          this.table.setValue(config.contextMenu.OpenAttributeTable);
          this.url.setValue(config.contextMenu.DescriptionOrShowItemDetailsOrDownload);
        }*/
        if (config.groupLayers) {
          $('#grouplayers').val(JSON.stringify(config.groupLayers, undefined, 4));
        }
        if (config.otherLayers) {
          $('#otherInfolayers').val(JSON.stringify(config.otherLayers, undefined, 4));
        }
        if (config.legendUrl) {
        	$('#legendUrl').val(config.legendUrl);
        }
      },

      getConfig: function() {
        /*this.config.showLegend = this.showLegend.getValue();
        if(!this.config.contextMenu) {
          this.config.contextMenu = {};
        }
        this.config.contextMenu.ZoomTo = this.zoomto.getValue();
        this.config.contextMenu.Transparency = this.transparency.getValue();
        this.config.contextMenu.EnableOrDisablePopup = this.controlPopup.getValue();
        this.config.contextMenu.MoveupOrMovedown = this.moveupDown.getValue();
        this.config.contextMenu.OpenAttributeTable = this.table.getValue();
        this.config.contextMenu.DescriptionOrShowItemDetailsOrDownload = this.url.getValue();
        */
        if(!this.config.legendUrl) {
          this.config.legendUrl = "https://insideto-map.toronto.ca/maps/images/";
        }
        this.config.legendUrl = $('#legendUrl').val()?$('#legendUrl').val():"https://insideto-map.toronto.ca/maps/images/";

        if(!this.config.groupLayers) {
          this.config.groupLayers = {};
        }
        this.config.groupLayers = JSON.parse($('#grouplayers').val()?$('#grouplayers').val():"{}");	

        if(!this.config.otherLayers) {
          this.config.otherLayers = {};
        }
        this.config.otherLayers = JSON.parse($('#otherInfolayers').val()?$('#otherInfolayers').val():"{}"); 
        return this.config;
      }

    });
  });
