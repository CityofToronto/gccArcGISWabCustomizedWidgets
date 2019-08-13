define(['dojo/_base/declare', 'jimu/BaseWidget',
        'dojo/_base/lang',
        'dojo/promise/all',
        'dojo/date/locale',
        'jimu/LayerInfos/LayerInfos',
        'esri/arcgis/utils',
        'esri/InfoTemplate',
        'esri/tasks/query',
        'esri/tasks/QueryTask',
        'jimu/loaderplugins/jquery-loader!https://code.jquery.com/jquery-3.2.1.min.js, https://code.jquery.com/ui/1.12.1/jquery-ui.min.js'],
  function(declare, BaseWidget, lang, all, locale, LayerInfos, ArcgisUtils, InfoTemplate, Query, QueryTask, $) {
    return declare([BaseWidget], {

      baseClass: 'jimu-widget-featureFilter',
      name: 'Feature Filter',
      mapProgramLayerInfo: [],
      mapCoordinationLayerInfo: [],
      mapOtherLayerInfo: [],

      startup: function() {
        this.inherited(arguments);
        this._denyLayerInfosReorderResponseOneTime = false;
        var config = this.config;
        var legendUrl = this.config.legendUrl;
        this.showApplyButton = config.showApplyButton;

        if (!this.showApplyButton) {
          $("div.btnContainer").addClass("hidden");
        }

        if (!this.showSelectAllButton) {
          $(".btnSelectAll").addClass("hidden");
        }

        // generate layer list with checkboxes for all tabs
        this.createLayerGroup("tab1", '', config.groupLayer1, 0, legendUrl);
        this.createLayerGroup("tab2", '', config.groupLayer2, 0, legendUrl);
        this.createLayerGroup("tab3", '', config.groupLayer3, 0, legendUrl);
        this.createLayerGroup("tab4", '', config.groupLayer4, 0, legendUrl);

        // jquery ui element initialization
        $( "#tabs" ).tabs();
        $(".layer-category, .group-layer-heading input").checkboxradio({
          classes: {
            "ui-checkboxradio": "highlight"
          }
        });
        $(".year-selector").checkboxradio({
          icon: false
        });
        $("fieldset button, #btnApply").button();

        var d = new Date();
        var currentYear = d.getFullYear();
        if (config.currentYearButton) {
          for (var i = 0; i < 6; i++) {
            $('label[for="currYear' + i + '"]').text(currentYear+i);
            $('#currYear' + i).val(currentYear+i);
            if (i > 0) {
              $('label[for="conflictYear' + i + '"]').text(currentYear+i);
              $('#conflictYear' + i).val(currentYear+i);
            }
          }
        }
        if (config.pastYearButton) {
          for (var i = 0; i < 7; i++) {
            $('label[for="pastYear' + i + '"]').text(currentYear-i-1);
            $('#pastYear' + i).val(currentYear-i-1);
          }
        }

        // attach jqueyr ui stylesheet
        var strCode = '<link rel="stylesheet" href="./widgets/FeatureFilter/css/jquery-ui.css">'; 
        $("#appCode").html(strCode);

        // put related layers to array
        if (this.map.itemId) {
          var myLayers = ArcgisUtils.getLayerList(this.map);

          var infoTemplate = new InfoTemplate();
          infoTemplate.setTitle("${INV_OWNER}");
          infoTemplate.setContent(this.getTextContent);

          for (var i = 0; i < myLayers.length; i++) {
            if (myLayers[i].title.toLowerCase().indexOf("wards") < 0 && myLayers[i].title.toLowerCase().indexOf(config.filterLayerTitle) >= 0) {
              myLayers[i].layer.infoTemplate = infoTemplate;
              this.mapProgramLayerInfo.push(myLayers[i].layer);
            } else if (myLayers[i].title.toLowerCase().indexOf("wards") < 0 && myLayers[i].title.toLowerCase().indexOf("coordination") >= 0) {
              this.mapCoordinationLayerInfo.push(myLayers[i].layer);
            } else {
              this.mapOtherLayerInfo.push(myLayers[i].layer);
            }
          }

          // set current year selected
          $.each($(".current-year input.year-selector"), function(index, year) {
            if ($(year).val() == currentYear) {
              $(year).prop('checked', true);
              $("label[for='" + $(year).attr("id") + "']").addClass("ui-checkboxradio-checked ui-state-active");
              return false;
            }
          });


          // disable / enable select all program buttons
          var that = this;
          that.setDefaultVisibleLayer(that.mapOtherLayerInfo, $('.feature-group').find("input"));

          that.map.on("extent-change", function(ext){
            if ($("#map").attr("data-zoom") > 12) {
              $(".btnSelectAll").button("option", "disabled", false);
            } else {
              $(".btnSelectAll").button("option", "disabled", true);
            }
            that.disableInputOnLayerVisibleScale(that.mapOtherLayerInfo, $('.feature-group').find("input"));
          });
        }

        // hide the categories
        $('.group-layer-heading > span').click(function(){
          $(this).parent().children('span.headingIcon').toggleClass('close');
          $(this).closest('.group-layer-row').children('.layer-row').slideToggle("fast");
          $(this).closest('.group-layer-row').children('.group-layer-row').slideToggle("fast");
        });

        // group heading checkbox event
        $('#tabs fieldset.feature-group').on('change', '.layer-heading', function(){
          that.setParentChildrenInputVisual(this);
          if (!that.showApplyButton) that.toggleLayers();
        });

        // category checkbox event
        $('#tabs fieldset.feature-group').on('change', '.layer-category', function(){
          var groupHeadings = $(this).parents('.group-layer-row');
          var noOfCheckedCategory, noOfAllCategories;
          for (var i = 0; i < groupHeadings.length; i++) {
            noOfCheckedCategory = groupHeadings.eq(i).find('.layer-category:checked').length;
            noOfAllCategories = groupHeadings.eq(i).find('.layer-category').length;
            groupHeading = groupHeadings.eq(i).children('.group-layer-heading').find('input');
            if (noOfAllCategories == noOfCheckedCategory) {
              groupHeading.prop("checked", this.checked);
              groupHeading.checkboxradio("refresh");
            } else {
              if (noOfCheckedCategory == 0) {
                groupHeading.prop("indetermined", false).prop("checked", false);  
                groupHeading.checkboxradio("refresh");           
              } else {
                groupHeading.prop("checked", false).prop("indetermined", true);
                groupHeadings.eq(i).children('.group-layer-heading').find('label').children('.ui-icon').removeClass('ui-icon-blank ui-icon-check ui-state-checked').addClass('ui-icon-indeterminate');
              }
            }
          }

          if (!that.showApplyButton) that.toggleLayers()

        });

        // select/unselect all current/past year event
        $('#toggleCurrentYears, #togglePastYears, #toggleConflictProjectYears').click(function(){
          var text = $(this).children("span").text();
          if (text == 'Select') {
            text = "Unselect"; 
            $(this).siblings('.year-selector').prop('checked', true);
            $(this).siblings('label').addClass('ui-checkboxradio-checked ui-state-active');
          } else {
            text = "Select";
            $(this).siblings('.year-selector').prop('checked', false);
            $(this).siblings('label').removeClass('ui-checkboxradio-checked ui-state-active');
          }
          $(this).children("span").text(text);
        });

        // toggle all program accordion
        $('.btnToggleAll').click(function(){
          var text = $(this).children('span').text();
          var heading = $(this).closest('fieldset').find('.group-layer-row');
          if (text == 'Expand') {
            text = "Collapse"; 
            heading.children('.layer-row').slideDown("fast");
            heading.children('.group-layer-row').slideDown("fast");
            heading.find('.group-layer-heading .headingIcon').removeClass("close");
          } else {
            text = "Expand";
            heading.children('.layer-row').slideUp("fast");
            heading.children('.group-layer-row').slideUp("fast");
            heading.find('.group-layer-heading .headingIcon').addClass("close");
          }
          $(this).children("span").text(text);
        });

        // select / unselect all programs
        $('.btnSelectAll').click(function(){
          var childCategories = $(this).parent('fieldset').find('input');
          var groupHeadingLabel = $(this).parent('fieldset').find('label');
          childCategories.prop('checked', true);
          groupHeadingLabel.addClass('ui-checkboxradio-checked ui-state-active');
          groupHeadingLabel.children('.ui-icon').removeClass('ui-icon-blank').addClass('ui-icon-check ui-state-checked');

          if (!that.showApplyButton) that.toggleLayers();

        });

        $('.btnUnselectAll').click(function(){
          var childCategories = $(this).parent('fieldset').find('input');
          var groupHeadingLabel = $(this).parent('fieldset').find('label');
          childCategories.prop('checked', false);
          groupHeadingLabel.removeClass('ui-checkboxradio-checked ui-state-active');
          groupHeadingLabel.children('.ui-icon').removeClass('ui-icon-check ui-state-checked').addClass('ui-icon-blank');

          if (!that.showApplyButton) that.toggleLayers();
          
        });

        // open / close current or past years group
        $(".year-wrapper legend").click(function(){
          $(this).siblings("div").toggleClass("hidden");
          $(this).find(".whiteTriangle").toggleClass("close");
        });

        $("#btnApply").click(that.toggleLayers());
        
      },

      toggleLayers: function() {
        // builder layerDef for current tab
        layerDef = this.buildCategoryFilter();
        mapLayerInfo = this.mapProgramLayerInfo;
        for (var i = 0; i < mapLayerInfo.length; i++) {
            if (layerDef) {
              mapLayerInfo[i].setDefinitionExpression(layerDef);
              if (!mapLayerInfo[i].visible) mapLayerInfo[i].setVisibility(true);
            } else {
              mapLayerInfo[i].setVisibility(false);
            }
        }
        // set visibility based on checkbox.checked
        this.toggleOtherInfoLayerVisibility(this.getOtherDef());
      },

      // enable or disable input checkbox by layer visibility at current map scale
      disableInputOnLayerVisibleScale: function(layers, layerInputs) {
        var layerName, matchingInput, inputStatus;
        $.each(layers, function(index, layer) {
          layerName = layer.name || layer.arcgisProps.title;
          inputStatus = layer.visibleAtMapScale?"enable":"disable";
          if (layerName.indexOf("-") >= 0) {
            layerName = layerName.toLowerCase().split("-")[1].trim();
          }
          //matchingInput = layerInputs.filter(i => layerInputs[i].value.toLowerCase() == layerName.toLowerCase());
          matchingInput = layerInputs.filter(function(i) { return layerInputs[i].value.toLowerCase() == layerName });
          if (matchingInput && matchingInput.length > 0) {
            $(matchingInput).checkboxradio(inputStatus);
          }
        })
      },
      // build category groups
      createLayerGroup: function(tab, toDomNode, groupInfo, level, legendUrl) {
        var that = this, counter = 0, groupName, html, groupHeadingValue;
        for (var grouplayer in groupInfo) {
          counter ++;
          groupName = grouplayer.replace(/[^a-zA-Z ]/g, "").split(' ').join('_');
          if (groupInfo[grouplayer].layers) {
            groupHeadingValue = grouplayer;
          } else {
            groupHeadingValue = groupInfo[grouplayer].id;
          }
          html = "<div class='group-layer-row" + (groupInfo[grouplayer].class?" " + groupInfo[grouplayer].class:"") + "'>" +
                        "<div class='group-layer-heading'>" + 
                          "<span class='" + (groupInfo[grouplayer].layers?"headingIcon":"headingIconPlaceolder") + "'></span>" + 
                          (groupInfo[grouplayer].legend&&groupInfo[grouplayer].legend.indexOf(".png")>0?"<span class='legend'><img src='" + legendUrl + groupInfo[grouplayer].legend + "' alt='" + groupName + " legend' /></span>":"") +
                          "<label for='" + groupName  + "'>" + grouplayer + "</label><input type='checkbox' class='layer-heading'" + (groupInfo[grouplayer].filterById?" data-attr='filteredLayers'":"") + " value='" + groupHeadingValue + "' name='" +  groupName + "' id='" +  groupName + "'>" + 
                        "</div>" + 
                      "</div>";
          if (level == 0) {
            //$('fieldset.' + propertyType).append(html);
            $('#' + tab + ' fieldset.feature-group').append(html);
          } else {
            toDomNode.append(html);
          }
         
          $.each(groupInfo[grouplayer].layers, function(index, layer) {
            if (layer.id) {
              that.addLayerNode(tab, layer, counter-1, level, groupName, legendUrl);
            } else {      
              that.createLayerGroup(tab, $('#' + groupName).closest('.group-layer-row'), layer, level+1, legendUrl);
            }
          });
        };
      },

      addLayerNode: function(tab, layerInfo, layerIndex, level, toDomNode, legendUrl) {
        var html = "<div class='layer-row'>" + 
                      (layerInfo.legend&&layerInfo.legend.indexOf(".png")>0?"<span class='legend'><img src='" + legendUrl + layerInfo.legend + "' alt='" + layerInfo.label + " legend' /></span>":"") +
                      "<label for='checkbox-" + layerInfo.id  + "'>" + layerInfo.label + "</label><input type='checkbox' class='layer-category'" + (layerInfo.filterById?" data-attr='filteredLayers'":"") + " value='" + layerInfo.id + "' name='checkbox-" +  layerInfo.id + "' id='checkbox-" +  layerInfo.id + "'>" + 
                    "</div>";
        if (level == 0) {
          $('#' + tab + ' fieldset > .group-layer-row:eq(' + layerIndex + ')').append(html);
        } else {
          $('#' + toDomNode).closest('.group-layer-row').append(html);
        }
      },

      // show features according to filters
      buildLayer: function(propertyType) {
        var layerDef = "", mapLayerInfo;
        if (propertyType == 'category') {
          layerDef = this.buildCategoryFilter();
          mapLayerInfo = this.mapProgramLayerInfo;
        }
        if (propertyType == 'conflict') {  
          layerDef = this.buildConflictFilter();
          mapLayerInfo = this.mapCoordinationLayerInfo;
        }
        for (var i = 0; i < mapLayerInfo.length; i++) {
            if (layerDef) {
              mapLayerInfo[i].setDefinitionExpression(layerDef);
              if (!mapLayerInfo[i].visible) mapLayerInfo[i].setVisibility(true);
            } else {
              mapLayerInfo[i].setVisibility(false);
            }
        }
      },

      // build category/program filter sql statement
      buildCategoryFilter: function() {
        var yearFilter = [], statusFilter = [], tt, categoryStat = "", statusStat = "", sql;
        $.each($('.current-year input:checked'), function(index, item) {
          yearFilter.push("NOT (INV_START_YEAR>" + item.value + " OR INV_END_YEAR<" + item.value + ")");
        });
        $.each($('.past-year input:checked'), function(index, item) {
          yearFilter.push("NOT (INV_START_YEAR>" + item.value + " OR INV_END_YEAR<" + item.value + ")");
        });
        $.each($('.project-status input:checked'), function(index, item) {
          if (index == 0) {
            statusStat = "INV_STATUS = '" + item.value + "'";
          } else {
            statusStat += " OR INV_STATUS = '" + item.value + "'"
          }
        });
        $.each($('.category input.layer-category:checked'), function(index, item){
          if (index == 0) {
            categoryStat = "INV_DISPLAY_PROGRAM = '" + item.value + "'";
          } else {
            categoryStat += " OR INV_DISPLAY_PROGRAM = '" + item.value + "'";
          }
        });

        for (var i = 0; i < yearFilter.length; i++) {
          if (i == 0) 
            yearStat = "(" + yearFilter[i] + ")";
          else
            yearStat += " OR (" + yearFilter[i] + ")";
        }

        if (yearFilter.length > 0 && categoryStat.length > 0 && statusStat.length > 0) {
          tt = "(" + yearStat + ") AND (" + categoryStat + ") AND (" + statusStat + ")";
          this.categoryQuery = "(" + categoryStat + ") AND (" + statusStat + ")"; // only pass category and status, not years
        } else { 
          tt = "INV_DISPLAY_PROGRAM = ''";
          this.categoryQuery = tt;
        }
        return tt;
      },

      // build conflict/coordination filter sql statement
      buildConflictFilter: function() {
        var yearFilter = [], conflictStat = "COORD_STATUS = ''", bizOwner= "", tt, statusStat="";
        $.each($('.conflict-year input:checked'), function(index, item) {
          yearFilter.push("NOT (START_YEAR>" + item.value + " OR END_YEAR<" + item.value + ")");
        });
        $.each($('.coordination input.layer-category:checked'), function(index, item){
          if (index == 0) {
            conflictStat = "COORD_STATUS = '" + item.value + "'"
          } else {
            conflictStat += " OR COORD_STATUS = '" + item.value + "'"
          }
        });
        $.each($('.coordBizOwner input.layer-category:checked'), function(index, item){
          if (index == 0) {
            bizOwner = "INV_OWNER = '" + item.value + "'"
          } else {
            bizOwner += " OR INV_OWNER = '" + item.value + "'"
          }
        });
        $.each($('.conflict-status input:checked'), function(index, item) {
          var s = (item.value!=''?("IS_RESOLVED='" + item.value + "'"):"IS_RESOLVED is null");
          if (index == 0) {
            statusStat = s;
          } else {
            statusStat += " OR " + s;
          }
        });

        for (var i = 0; i < yearFilter.length; i++) {
          if (i == 0) 
            yearStat = "(" + yearFilter[i] + ")";
          else
            yearStat += " OR (" + yearFilter[i] + ")";
        }

        if (yearFilter.length > 0 && conflictStat.length > 0  && statusStat.length > 0) 
          tt = "(" + yearStat + ") AND (" + conflictStat + ") AND (" + statusStat + ")" + (bizOwner.length>0?" AND (" + bizOwner + ")":"");
        return tt;
      },

      toggleOtherInfoLayerVisibility: function(qd) {
        var checkedInputs = $("#tabs fieldset.feature-group").eq($("#tabs").tabs("option", "active")).find("input");
        $.map(this.mapOtherLayerInfo, function(layer, i) {
          //console.log(checkedInputs.filter((i, c) => $.trim(layer.name.toLowerCase()).indexOf($.trim(c.value.toLowerCase())) >= 0));
          $.each(checkedInputs, function(index, checkbox){
            var layerName = layer.name || layer.arcgisProps.title;
            if ($.trim(layerName.toLowerCase()).indexOf($.trim(checkbox.value.toLowerCase())) >= 0) {
              //if (layerDef != '' && $(checkbox).siblings(".showDatePicker").length == 1) layer.setDefinitionExpression(layerDef);
              //var q = qd.filter(l => l.layerId == layer.name);
              var q = qd.filter(function(l) { return l.layerId == layerName })
              if (q.length == 1) layer.setDefinitionExpression(q[0].query);
              layer.setVisibility(checkbox.checked);
            } 
          })
        })
      },

      setDefaultVisibleLayer: function(layers, layerInputs) {
        var visibleLayer, layerName;
        var that = this;
        $.each(layers, function(index, layer) {
          if (layer.visible) {
            layerName = layer.name || layer.arcgisProps.title;
            layerName = layerName.toLowerCase()
            if (layerName.indexOf("-") >= 0) {
              layerName = layerName.split("-")[1].trim();
            }
            //visibleLayer = layerInputs.filter(i => layerInputs[i].value.toLowerCase() == layerName);
            visibleLayer = layerInputs.filter(function(i) { return layerInputs[i].value.toLowerCase() == layerName });
            if (visibleLayer && visibleLayer.length > 0) {
              $(visibleLayer).prop("checked", true);
              $(visibleLayer).checkboxradio("refresh");
              //$(visibleLayer).parent('.group-layer-heading').siblings('.layer-row, .group-layer-row').find("input").prop("checked", true).checkboxradio("refresh");
              that.setParentChildrenInputVisual(visibleLayer[0]);
            }
          }
        });
      },

      setParentChildrenInputVisual: function(target) {
        childCategories = $(target).parent('.group-layer-heading').siblings('.layer-row, .group-layer-row').find('input').prop('checked', target.checked).checkboxradio("refresh");
        var parentProgramHeading = $(target).parent('.group-layer-heading').parent('.group-layer-row').siblings('.group-layer-heading');
        var parentProgram = $(target).parent('.group-layer-heading').parent('.group-layer-row').siblings('.group-layer-heading').find("input");
        if (parentProgramHeading) {
          var subProgram = parentProgramHeading.parent(".group-layer-row");
          var noOfSubPrograms = subProgram.find(".layer-category").length;
          var noOfCheckedSubPrograms = subProgram.find(".layer-category:checked").length;
          parentProgramHeading.find('label').addClass("ui-checkboxradio-checked ui-state-active");
          if (noOfSubPrograms == noOfCheckedSubPrograms) {
            parentProgram.prop("checked", target.checked);
            parentProgram.checkboxradio("refresh");
            //parentProgramHeading.find('.ui-icon').removeClass('ui-icon-blank ui-icon-check ui-state-checked ui-icon-indeterminate').addClass('ui-icon-check ui-state-checked');
          } else {
            if (noOfCheckedSubPrograms == 0) {
              parentProgram.prop("indetermined", false).prop("checked", false);
              parentProgram.checkboxradio("refresh");
              //parentProgramHeading.find('.ui-icon').removeClass('ui-icon-blank ui-icon-check ui-state-checked ui-icon-indeterminate').addClass('ui-icon-blank');
            } else {
              parentProgram.prop("checked", false).prop("indetermined", true);
              parentProgramHeading.find('.ui-icon').removeClass('ui-icon-blank ui-icon-check ui-state-checked').addClass("ui-icon-indeterminate");
            }
          }
        }
      },


      // set info window content
      getTextContent:function(graphic) {
        var content = "<dl>" +
                          (graphic.attributes.INV_PROJECT?"<dt>Project</dt><dd>" + graphic.attributes.INV_PROJECT + "</dd>":"") + 
                          (graphic.attributes.INV_LOCATION?"<dt>Location</dt><dd>" + graphic.attributes.INV_LOCATION + "</dd>":"") + 
                          (graphic.attributes.INV_DETAIL?"<dt>Details</dt><dd>" + graphic.attributes.INV_DETAIL + "</dd>":"") + 
                          (graphic.attributes.INV_DURATION_COORD?"<dt>Planning Duration</dt><dd>" + graphic.attributes.INV_DURATION_COORD + "</dd>":"") +
                          "<dt>Delivery Duration</dt><dd>" + (graphic.attributes.INV_DURATION_DELIVERY?graphic.attributes.INV_DURATION_DELIVERY:"") + "</dd>" + 
                          (graphic.attributes.SCOPE?"<dt>Scope</dt><dd>" + graphic.attributes.SCOPE + "</dd>":"") + 
                          (graphic.attributes.INV_STATUS?"<dt>Status</dt><dd>" + graphic.attributes.INV_STATUS + "</dd>":"") + 
                          (graphic.attributes.LAST_UPDATED_DATE?"<dt>Last Updated</dt><dd>" + locale.format(new Date(graphic.attributes.LAST_UPDATED_DATE), {datePattern:'MMM dd, yyyy.', selector:'date'}) + "</dd>":"") + 
                          (graphic.attributes.INV_PRIORITY?"<dt>Priority</dt><dd>" + graphic.attributes.INV_PRIORITY + "</dd>":"") +
                          (graphic.attributes.PROJ_NUM?"<dt>Project #</dt><dd>" + graphic.attributes.PROJ_NUM + "</dd>":"") + 
                          (graphic.attributes.INV_OWNER?"<dt>Owner</dt><dd>" + graphic.attributes.INV_OWNER + "</dd>":"") + 
                          (graphic.attributes.INV_INTERNAL_CONTACT_NAME?"<dt>Contact</dt><dd>" + graphic.attributes.INV_INTERNAL_CONTACT_NAME:"") + 
                          (graphic.attributes.INV_INTERNAL_CONTACT_PHONE?"<br><a href='tel:" + graphic.attributes.INV_INTERNAL_CONTACT_PHONE + "'>" + graphic.attributes.INV_INTERNAL_CONTACT_PHONE + "</a>":"") + 
                          (graphic.attributes.INV_INTERNAL_CONTACT_EMAIL?"<br><a href='mailto:" + graphic.attributes.INV_INTERNAL_CONTACT_EMAIL + "'>" + graphic.attributes.INV_INTERNAL_CONTACT_EMAIL + "</a>":"") + 
                          (graphic.attributes.INV_INTERNAL_CONTACT_NAME?"</dd>":"") + 
                          (graphic.attributes.INV_WEB_SITE?"<dt>Website</dt><dd>" + "<a href='" + graphic.attributes.INV_WEB_SITE + "' target='_blank'>More information</a>" + "</dd>":"") + 
                          (graphic.attributes.INV_PTPWU_WORK_ID?"<dt>PTP Work Unit</dt><dd>" +"<form name='workunit' id='workunit' target='_blank' method='post' " + 
                                         "action='https://insideto-secure.toronto.ca/wes/ptp/projecttracking/cpca/cpcaBasicInfo4GCC.jsp'>" +
                                        "<input type='hidden' id='skipMYPTP' name='skipMYPTP' value='1' />" +
                                        "<input type='hidden' id='ptpWorkId' name='ptpWorkId' value='" + graphic.attributes.INV_PTPWU_WORK_ID + "' />" +
                                        "</form><a href=\"#\" onclick=\"document.getElementById(\'workunit\').submit()\">" + graphic.attributes.INV_PTPWU_PROJECT_CODE + "</a></dd>" +
                                        "<dt>Coordination</dt><dd><form name='statusres' id='statusres' target='_blank' method='post' " + 
                                         "action='https://insideto-secure.toronto.ca/wes/ptp/projecttracking/cpca/cpcaCoordination4GCC.jsp'>" +
                                        "<input type='hidden' id='skipMYPTP' name='skipMYPTP' value='1' />" +
                                        "<input type='hidden' id='ptpWorkId' name='ptpWorkId' value='" + graphic.attributes.INV_PTPWU_WORK_ID + "' />" +  
                                        "</form><a href=\"#\" onclick=\"document.getElementById(\'statusres\').submit()\">Link to Status and Resolution</a></dd>":"") +  
                          "<dt></dt><dd></dd>" +
                          (graphic.attributes.INV_PTPDB_WORK_ID?"<dt>PTP Delivery Bundle</dt><dd>" +"<form name='delbundle' id='delbundle' target='_blank' method='post' " + 
                                         "action='https://insideto-secure.toronto.ca/wes/ptp/projecttracking/cpca/cpcaBasicInfo4GCC.jsp'>" +
                                        "<input type='hidden' id='skipMYPTP' name='skipMYPTP' value='1' />" +
                                        "<input type='hidden' id='ptpWorkId' name='ptpWorkId' value='" + graphic.attributes.INV_PTPDB_WORK_ID + "' />" + 
                                        "</form><a href=\"#\" onclick=\"document.getElementById(\'delbundle\').submit()\">"+ graphic.attributes.INV_PTPDB_PROJECT_CODE + "</a></dd>":"") +
                          (graphic.attributes.WORK_ID?"<dt>IGE Work ID</dt><dd>" + graphic.attributes.WORK_ID + "</dd>":"") +               
                      "</dl>";

        var contract = "<dl>" +
                          "<dt>Contract State</dt><dd>" + (graphic.attributes.CONTR_STATE?graphic.attributes.CONTR_STATE:"") + "</dd>" + 
                          "<dt>Contract #</dt><dd>" + (graphic.attributes.CONTR_NUMBER?graphic.attributes.CONTR_NUMBER:"") + "</dd>" + 
                          "<dt>Award Date</dt><dd>" + (graphic.attributes.CONTR_AWARD_DATE?locale.format(new Date(graphic.attributes.CONTR_AWARD_DATE), {datePattern:'MMM dd, yyyy.', selector:'date'}):"")  + "</dd>" + 
                          "<dt>Substantial Performance Date</dt><dd>" + (graphic.attributes.CONTR_SUBSTAN_PERFORM_DATE?locale.format(new Date(graphic.attributes.CONTR_SUBSTAN_PERFORM_DATE), {datePattern:'MMM dd, yyyy.', selector:'date'}):"")  + "</dd>" + 
                          "<dt>Tender/RFP Issue Date</dt><dd>" + (graphic.attributes.CONTR_TEND_ADVERT_RFP_ISS_DATE?locale.format(new Date(graphic.attributes.CONTR_TEND_ADVERT_RFP_ISS_DATE), {datePattern:'MMM dd, yyyy.', selector:'date'}):"") + "</dd>" + 
                          "<dt>Tender/RFP Closing Date</dt><dd>" + (graphic.attributes.CONTR_TEND_CLOS_RFP_CLOS_DATE?locale.format(new Date(graphic.attributes.CONTR_TEND_CLOS_RFP_CLOS_DATE), {datePattern:'MMM dd, yyyy.', selector:'date'}):"")  + "</dd>" + 
                          "<dt>Warranty Expiry Date</dt><dd>" + (graphic.attributes.CONTR_WARRANTY_EXPIRY_DATE?locale.format(new Date(graphic.attributes.CONTR_WARRANTY_EXPIRY_DATE), {datePattern:'MMM dd, yyyy.', selector:'date'}):"") + "</dd>" + 
                          "<dt>Design Start Date</dt><dd>" + (graphic.attributes.DESIGN_START_DATE?locale.format(new Date(graphic.attributes.DESIGN_START_DATE), {datePattern:'MMM dd, yyyy.', selector:'date'}):"")  + "</dd>" + 
                          "<dt>Design End Date</dt><dd>" + (graphic.attributes.DESIGN_COMPLETION_DATE?locale.format(new Date(graphic.attributes.DESIGN_COMPLETION_DATE), {datePattern:'MMM dd, yyyy.', selector:'date'}):"")  + "</dd>" + 
                        "</dl>";
        
        var tabs = '<div class="infoTabs">' + 
                      '<ul>' + 
                        '<li><a href="#infoWindowTabs-1">Project</a></li>' +
                        '<li><a href="#infoWindowTabs-2">Contract</a></li>' + 
                      '</ul>' +
                      '<div id="infoWindowTabs-1">' + content + '</div>' + 
                      '<div id="infoWindowTabs-2">' + contract + '</div>' + 
                    '</div>';

        return tabs; 
      },

      onOpen: function(){
        var panel = this.getPanel();
        panel.position.width = 500;
        panel.setPosition(panel.position);
        panel.panelManager.normalizePanel(panel);
        if ($("#map").attr("data-zoom") > 12) {
          $(".btnSelectAll").button("option", "disabled", false);
        } else {
          $(".btnSelectAll").button("option", "disabled", true);
        }
        if ($('.btnToggleAll').children("span").text().indexOf("Collapse") >= 0) {
          $('.btnToggleAll').click();
        }
        //this.buildLayer("category");
        this.disableInputOnLayerVisibleScale(this.mapOtherLayerInfo, $('.feature-group').find("input"));
      }
    });
  });