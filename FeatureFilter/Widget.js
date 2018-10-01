define(['dojo/_base/declare', 'jimu/BaseWidget',
        'dojo/_base/lang',
        "dojo/promise/all",
        'dojo/date/locale',
        'jimu/LayerInfos/LayerInfos',
        "esri/arcgis/utils",
        "esri/InfoTemplate",
        "esri/tasks/query",
        "esri/tasks/QueryTask",
        'jimu/loaderplugins/jquery-loader!https://code.jquery.com/jquery-3.2.1.min.js, https://code.jquery.com/ui/1.12.1/jquery-ui.js'],
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

        this.createLayerGroup("category", $('.category')[0], config.groupLayers, 0, legendUrl);
        this.createLayerGroup("conflict", $('.conflict')[0], config.coordination, 0, legendUrl);
        this.createLayerGroup("otherInfo", $('.otherInfo')[0], config.otherLayers, 0, legendUrl);

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
        for (var i = 0; i < 6; i++) {
          $('label[for="currYear' + i + '"]').text(currentYear+i);
          $('#currYear' + i).val(currentYear+i);
          if (i > 0) {
            $('label[for="conflictYear' + i + '"]').text(currentYear+i);
            $('#conflictYear' + i).val(currentYear+i);
          }
        }
        for (var i = 0; i < 7; i++) {
          $('label[for="pastYear' + i + '"]').text(currentYear-i-1);
          $('#pastYear' + i).val(currentYear-i-1);
        }

        var strCode = '<link rel="stylesheet" href="./widgets/FeatureFilter/css/jquery-ui.css">'; 
        $("#appCode").html(strCode);

        // put related layers to array
        if (this.map.itemId) {
          var myLayers = ArcgisUtils.getLayerList(this.map);

          var infoTemplate = new InfoTemplate();
          infoTemplate.setTitle("${INV_OWNER}");
          infoTemplate.setContent(this.getTextContent);

          for (var i = 0; i < myLayers.length; i++) {
            if (myLayers[i].title.toLowerCase().indexOf("wards") < 0 && myLayers[i].title.toLowerCase().indexOf("program") >= 0) {
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

          this.setDefaultVisibleLayer(this.mapOtherLayerInfo, $('.otherInfo').find("input"));

          // disable / enable select all program buttons
          this.map.on("extent-change", function(ext){
            if ($("#map").attr("data-zoom") >= 5) {
              $("#toggleAllPrograms, #toggleAllConflict, #toggleAllOtherInfo").button("option", "disabled", false);
            } else {
              $("#toggleAllPrograms, #toggleAllConflict, #toggleAllOtherInfo").button("option", "disabled", true);
            }
          });
        }

        // hide the categories
        $('.group-layer-heading > span').click(function(){
          $(this).parent().children('span.headingIcon').toggleClass('close');
          $(this).closest('.group-layer-row').children('.layer-row').slideToggle("fast");
          $(this).closest('.group-layer-row').children('.group-layer-row').slideToggle("fast");
        });

        var that = this;
        // group heading checkbox event
        $('fieldset.feature-group').on('change', '.layer-heading', function(){
          var childCategories = $(this).parent('.group-layer-heading').siblings('.layer-row, .group-layer-row');
          var groupHeadingLabel = childCategories.find('label');
          childCategories.find('input').prop('checked', this.checked);
          var groupHeadingChecked = this.checked;
          if (groupHeadingChecked) {
            groupHeadingLabel.addClass('ui-checkboxradio-checked ui-state-active');
            groupHeadingLabel.children('.ui-icon').removeClass('ui-icon-blank').addClass('ui-icon-check ui-state-checked');
          } else {
            groupHeadingLabel.removeClass('ui-checkboxradio-checked ui-state-active');
            groupHeadingLabel.children('.ui-icon').removeClass('ui-icon-check ui-state-checked').addClass('ui-icon-blank');
          }
          var parentProgramHeading = $(this).parent('.group-layer-heading').parent('.group-layer-row').siblings('.group-layer-heading');
          if (parentProgramHeading) {
            var parentProgram = parentProgramHeading.parent(".group-layer-row");
            var noOfSubPrograms = parentProgram.find(".layer-category").length;
            var noOfCheckedSubPrograms = parentProgram.find(".layer-category:checked").length;
            parentProgramHeading.find('label').addClass("ui-checkboxradio-checked ui-state-active");
            if (noOfSubPrograms == noOfCheckedSubPrograms) {
              parentProgramHeading.find('.ui-icon').removeClass('ui-icon-blank ui-icon-check ui-state-checked ui-icon-indeterminate').addClass('ui-icon-check ui-state-checked');
            } else {
              if (noOfCheckedSubPrograms == 0) {
                parentProgramHeading.find('.ui-icon').removeClass('ui-icon-blank ui-icon-check ui-state-checked ui-icon-indeterminate').addClass('ui-icon-blank');
              } else {
                parentProgramHeading.find('.ui-icon').removeClass('ui-icon-blank ui-icon-check ui-state-checked').addClass("ui-icon-indeterminate");
              }
            }
          }

          if (!that.showApplyButton) {
            $('#btnApply').click();
          }
        });

        // category checkbox event
        $('fieldset.feature-group').on('change', '.layer-category', function(){
          var groupHeadings = $(this).parents('.group-layer-row');
          var checkedCategory, noOfAllCategories, groupHeadingLabel
          for (var i = 0; i < groupHeadings.length; i++) {
            checkedCategory = groupHeadings.eq(i).find('.layer-category:checked').length;
            noOfAllCategories = groupHeadings.eq(i).find('.layer-category').length;
            groupHeadingLabel = groupHeadings.eq(i).children('.group-layer-heading').find('label');
            if (noOfAllCategories != checkedCategory) {
              groupHeadingLabel.removeClass('ui-checkboxradio-checked ui-state-active');
              if (checkedCategory == 0) {
                groupHeadingLabel.children('.ui-icon').removeClass('ui-icon-blank ui-icon-check ui-state-checked ui-icon-indeterminate').addClass('ui-icon-blank');
              } else {
               groupHeadingLabel.children('.ui-icon').removeClass('ui-icon-blank ui-icon-check ui-state-checked').addClass('ui-icon-indeterminate');
              }
            } else {
              groupHeadingLabel.addClass('ui-checkboxradio-checked ui-state-active');
              groupHeadingLabel.children('.ui-icon').removeClass('ui-icon-blank ui-icon-check ui-state-checked ui-icon-indeterminate').addClass('ui-icon-check ui-state-checked');
            }
          }

          if (!that.showApplyButton) {
            $('#btnApply').click();
          }
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
        $('#toggleCategoryHeading, #toggleConflictHeading, #toggleOtherInfoHeading').click(function(){
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
        $('#toggleAllPrograms, #toggleAllConflict, #toggleAllOtherInfo').click(function(){
          var text = $(this).children("span").text();
          var childCategories = $(this).parent('fieldset').find('input');
          var groupHeadingLabel = $(this).parent('fieldset').find('label');
          if (text == 'Select') {
            text = "Unselect"; 
            childCategories.prop('checked', true);
            groupHeadingLabel.addClass('ui-checkboxradio-checked ui-state-active');
            groupHeadingLabel.children('.ui-icon').removeClass('ui-icon-blank').addClass('ui-icon-check ui-state-checked');
          } else {
            text = "Select";
            childCategories.prop('checked', false);
            groupHeadingLabel.removeClass('ui-checkboxradio-checked ui-state-active');
            groupHeadingLabel.children('.ui-icon').removeClass('ui-icon-check ui-state-checked').addClass('ui-icon-blank');
          }
          $(this).children("span").text(text);
        });

        // open / close current or past years group
        $(".year-wrapper legend").click(function(){
          $(this).siblings("div").toggleClass("hidden");
          $(this).find(".whiteTriangle").toggleClass("close");
        });

        $("#btnApply").click(function() {
          var activeTabIndex = $("#tabs").tabs("option", "active");
          var activeTab = $("#tabs li").eq(activeTabIndex).attr("data-attr");

          if (activeTab == "otherInfo") {
            that.toggleOtherInfoLayerVisibility();
          } else { 
            that.buildLayer(activeTab);
          }
        });

        // watch info window to initialize jquery ui tab
        $popup = $(".esriPopup .contentPane");
        var observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            var cssClass = $(".esriPopup").attr('class');
            if (cssClass.indexOf("esriPopupVisible") >= 0 )
            $(".infoTabs").tabs();
          });    
        });
        observer.observe($popup[0], {childList: true});

        /*$mobilePop = $(".esriMobileInfoView");
        var observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            console.log(mutation);
            console.log($(mutation.target));
            if ($(mutation.target).attr('style') == "display: block;" )
            $(mutation.target).find(".infoTabs").tabs();
          });    
        });
        observer.observe($mobilePop[0], {attributes: true});
        */
        
        $(".esriPopupMobile .titleButton.arrow").click(function(e){
           $(".infoTabs").tabs();
        });
        
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
          html = "<div class='group-layer-row'>" + 
                        "<div class='group-layer-heading'>" + 
                          "<span class='headingIcon'></span>" + 
                          (groupInfo[grouplayer].legend?"<span class='legend'><img src='" + legendUrl + groupInfo[grouplayer].legend + "' alt='" + groupName + " legend' /></span>":"") +
                          "<label for='" + groupName  + "'>" + grouplayer + "</label><input type='checkbox' class='layer-heading' value='" + groupHeadingValue + "' name='" +  groupName + "' id='" +  groupName + "'>" + 
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
                      (layerInfo.legend?"<span><img src='" + legendUrl + layerInfo.legend + "' alt='" + layerInfo.label + " legend' /></span>":"") +
                      "<label for='checkbox-" + layerInfo.id  + "'>" + layerInfo.label + "</label><input type='checkbox' class='layer-category' value='" + layerInfo.id + "' name='checkbox-" +  layerInfo.id + "' id='checkbox-" +  layerInfo.id + "'>" + 
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
          //this.controlAllProgramInputs(true);
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
      // use input value to get selected category value
      buildCategoryFilter: function() {
        var yearFilter = [], statusFilter = [], categoryFilter = [], tt, program, sql;
        $.each($('.current-year input:checked'), function(index, item) {
          yearFilter.push("NOT (INV_START_YEAR>'" + item.value + "' OR INV_END_YEAR<'" + item.value + "')");
        });
        $.each($('.past-year input:checked'), function(index, item) {
          yearFilter.push("NOT (INV_START_YEAR>'" + item.value + "' OR INV_END_YEAR<'" + item.value + "')");
        });
        $.each($('.project-status input:checked'), function(index, item) {
          statusFilter.push("INV_STATUS = '" + item.value + "'");
        });
        $.each($('.category input.layer-category:checked'), function(index, item){
          program = item.value;
          sql = "INV_DISPLAY_PROGRAM = '" + program + "'";
          if (program.indexOf("TS_Moratorium_1") >= 0) sql = sql.replace("TS_Moratorium_1", "TS_Moratorium") + " AND PRIORITY = 1";
          if (program.indexOf("TS_Moratorium_2") >= 0) sql = sql.replace("TS_Moratorium_2", "TS_Moratorium") + " AND PRIORITY = 2";
          categoryFilter.push(sql);
        });

        for (var i = 0; i < yearFilter.length; i++) {
          if (i == 0) 
            yearStat = "(" + yearFilter[i] + ")";
          else
            yearStat += " OR (" + yearFilter[i] + ")";
        }

        for (var k = 0; k < statusFilter.length; k++) {
          if (k == 0) 
            statusStat = statusFilter[k];
          else
            statusStat += " OR " + statusFilter[k];
        }

        for (var j = 0; j < categoryFilter.length; j++) {
          if (j == 0) 
            categoryStat = categoryFilter[j];
          else
            categoryStat += " OR " + categoryFilter[j];
        }

        if (yearFilter.length > 0 && categoryFilter.length > 0 && statusFilter.length > 0) 
          tt = "(" + yearStat + ") AND (" + categoryStat + ") AND (" + statusStat + ")";
        else tt = "INV_DISPLAY_PROGRAM = ''";
        return tt;
      },

      // build conflict/coordination filter sql statement
      buildConflictFilter: function() {
        var yearFilter = [], statusFilter = [], conflictFilter = [], conflictStat = "COORD_STATUS = ''", tt;
        $.each($('.conflict-year input:checked'), function(index, item) {
          yearFilter.push("NOT (START_YEAR>'" + item.value + "' OR END_YEAR<'" + item.value + "')");
        });
        $.each($('.conflict input.layer-category:checked'), function(index, item){
          if (index == 0) {
            conflictStat = "COORD_STATUS = '" + item.value + "'"
          } else {
            conflictStat += " OR COORD_STATUS = '" + item.value + "'"
          }
        });

        for (var i = 0; i < yearFilter.length; i++) {
          if (i == 0) 
            yearStat = "(" + yearFilter[i] + ")";
          else
            yearStat += " OR (" + yearFilter[i] + ")";
        }

        //
        // TODO: resolution checks 
        //

        if (yearFilter.length > 0 && conflictStat.length > 0 /* && statusFilter.length > 0*/) 
          tt = "(" + yearStat + ") AND (" + conflictStat + /*") AND (" + statusStat + */ ")";
        return tt;
      },

      toggleOtherInfoLayerVisibility: function() {
        var checkedInputs = $("#tabs fieldset.feature-group").eq($("#tabs").tabs("option", "active")).find("input");
        $.map(this.mapOtherLayerInfo, function(layer, i) {
          $.each(checkedInputs, function(index, checkbox){
            if ($.trim(layer.name.toLowerCase()).indexOf($.trim(checkbox.value.toLowerCase())) >= 0) {
              layer.setVisibility(checkbox.checked);
            } 
          })
        })
      },

      setDefaultVisibleLayer: function(layers, layerInputs) {
        var visibleLayer;
        $.each(layers, function(index, layer) {
          if (layer.visible) {
            visibleLayer = layerInputs.filter(function(index) {
              return $.trim($("label[for='" + layerInputs[index].id + "']").text()) == layer.name;
            })
          }
        });
        if (visibleLayer && visibleLayer.length > 0) {
          $(visibleLayer).prop("checked", true);
          $("label[for='" + visibleLayer[0].id + "']").addClass("ui-checkboxradio-checked ui-state-active");
          $("label[for='" + visibleLayer[0].id + "']").children('.ui-icon').addClass('ui-icon-check ui-state-checked');
        }
      },

      // set info window content
      getTextContent:function(graphic) {

        var content = "<dl>" +
                          (graphic.attributes.INV_PROJECT?"<dt>Project</dt><dd>" + graphic.attributes.INV_PROJECT + "</dd>":"") + 
                          (graphic.attributes.INV_LOCATION?"<dt>Location</dt><dd>" + graphic.attributes.INV_LOCATION + "</dd>":"") + 
                          (graphic.attributes.INV_DETAIL?"<dt>Details</dt><dd>" + graphic.attributes.INV_DETAIL + "</dd>":"") + 
                          (graphic.attributes.INV_DURATION_COORD?"<dt>Duration</dt><dd>" + graphic.attributes.INV_DURATION_COORD + "</dd>":"") + 
                          (graphic.attributes.SCOPE?"<dt>Scope</dt><dd>" + graphic.attributes.SCOPE + "</dd>":"") + 
                          (graphic.attributes.INV_STATUS?"<dt>Status</dt><dd>" + graphic.attributes.INV_STATUS + "</dd>":"") + 
                          (graphic.attributes.LAST_UPDATED_DATE?"<dt>Last Updated</dt><dd>" + locale.format(new Date(graphic.attributes.LAST_UPDATED_DATE), {datePattern:'MMM dd, yyyy.', selector:'date'}) + "</dd>":"") + 
                          (graphic.attributes.INV_PRIORITY?"<dt>Priority</dt><dd>" + graphic.attributes.INV_PRIORITY + "</dd>":"") +
                          (graphic.attributes.PROJ_NUM?"<dt>Project #</dt><dd>" + graphic.attributes.PROJ_NUM + "</dd>":"") + 
                          (graphic.attributes.INV_OWNER?"<dt>Owner</dt><dd>" + graphic.attributes.INV_OWNER + "</dd>":"") + 
                          (graphic.attributes.INV_PUBLIC_CONTACT_NAME?"<dt>Contact</dt><dd>" + graphic.attributes.INV_PUBLIC_CONTACT_NAME:"") + 
                          (graphic.attributes.INV_PUBLIC_CONTACT_PHONE?"<br><a href='tel:" + graphic.attributes.INV_PUBLIC_CONTACT_PHONE + "'>" + graphic.attributes.INV_PUBLIC_CONTACT_PHONE + "</a>":"") + 
                          (graphic.attributes.INV_PUBLIC_CONTACT_EMAIL?"<br><a href='mailto:" + graphic.attributes.INV_PUBLIC_CONTACT_EMAIL + "'>" + graphic.attributes.INV_PUBLIC_CONTACT_EMAIL + "</a>":"") + 
                          (graphic.attributes.INV_PUBLIC_CONTACT_NAME?"</dd>":"") + 
                          (graphic.attributes.INV_WEB_SITE?"<dt>Website</dt><dd>" + "<a href='" + graphic.attributes.INV_WEB_SITE + "' target='_blank'>More information</a>" + "</dd>":"") + 
                          (graphic.attributes.INV_PTPWU_WORK_ID?"<dt>PTP Work Unit</dt><dd>" +"<form name='workunit' id='workunit' target='_blank' method='post' " + 
                                         "action='https://insideto-secure.toronto.ca/wes/ptp/projecttracking/cpca/cpcaBasicInfo4GCC.jsp'>" +
                                        "<input type='hidden' id='skipMYPTP' name='skipMYPTP' value='1' />" +
                                        "<input type='hidden' id='ptpWorkId' name='ptpWorkId' value='" + graphic.attributes.INV_PTPWU_WORK_ID + "' />" +
                                        "</form><a href=\"#\" onclick=\"document.getElementById(\'workunit\').submit()\">" + graphic.attributes.INV_PTPWU_PROJECT_CODE + "</a></dd>" +
                                        "<dt> </dt><dd><form name='statusres' id='statusres' target='_blank' method='post' " + 
                                         "action='https://insideto-secure.toronto.ca/wes/ptp/projecttracking/cpca/cpcaCoordination4GCC.jsp'>" +
                                        "<input type='hidden' id='skipMYPTP' name='skipMYPTP' value='1' />" +
                                        "<input type='hidden' id='ptpWorkId' name='ptpWorkId' value='" + graphic.attributes.INV_PTPWU_WORK_ID + "' />" +  
                                        "</form><a href=\"#\" onclick=\"document.getElementById(\'statusres\').submit()\">Coordination Status and Resolution</a></dd>":"") +  
                          (graphic.attributes.INV_PTPDB_WORK_ID?"<dt>PTP Delivery Bundle</dt><dd>" +"<form name='delbundle' id='delbundle' target='_blank' method='post' " + 
                                         "action='https://insideto-secure.toronto.ca/wes/ptp/projecttracking/cpca/cpcaBasicInfo4GCC.jsp'>" +
                                        "<input type='hidden' id='skipMYPTP' name='skipMYPTP' value='1' />" +
                                        "<input type='hidden' id='ptpWorkId' name='ptpWorkId' value='" + graphic.attributes.INV_PTPDB_WORK_ID + "' />" + 
                                        "</form><a href=\"#\" onclick=\"document.getElementById(\'delbundle\').submit()\">"+ graphic.attributes.INV_PTPDB_PROJECT_CODE + "</a></dd>":"") +
                          (graphic.attributes.WORK_ID?"<dt>IGE Work ID</dt><dd>" + graphic.attributes.WORK_ID + "</dd>":"") +               
                      "</dl>";

        var contract = "<dl>" +
                          (graphic.attributes.CONTR_STATE?"<dt>Contract state</dt><dd>" + graphic.attributes.CONTR_STATE + "</dd>":"") + 
                          (graphic.attributes.CONTR_NUMBER?"<dt>Contract #</dt><dd>" + graphic.attributes.CONTR_NUMBER + "</dd>":"") + 
                          (graphic.attributes.CONTR_AWARD_DATE?"<dt>Award date</dt><dd>" + locale.format(new Date(graphic.attributes.CONTR_AWARD_DATE), {datePattern:'MMM dd, yyyy.', selector:'date'})  + "</dd>":"") + 
                          (graphic.attributes.CONTR_SUBSTAN_PERFORM_DATE?"<dt>Substantial performance date</dt><dd>" + locale.format(new Date(graphic.attributes.CONTR_SUBSTAN_PERFORM_DATE), {datePattern:'MMM dd, yyyy.', selector:'date'})  + "</dd>":"") + 
                          (graphic.attributes.CONTR_TEND_ADVERT_RFP_ISS_DATE?"<dt>Tender/RFP issue date</dt><dd>" + locale.format(new Date(graphic.attributes.CONTR_TEND_ADVERT_RFP_ISS_DATE), {datePattern:'MMM dd, yyyy.', selector:'date'}) + "</dd>":"") + 
                          (graphic.attributes.CONTR_TEND_CLOS_RFP_CLOS_DATE?"<dt>Tender/RFP closing date</dt><dd>" + locale.format(new Date(graphic.attributes.CONTR_TEND_CLOS_RFP_CLOS_DATE), {datePattern:'MMM dd, yyyy.', selector:'date'})  + "</dd>":"") + 
                          (graphic.attributes.CONTR_WARRANTY_EXPIRY_DATE?"<dt>Warranty expiry date</dt><dd>" + locale.format(new Date(graphic.attributes.CONTR_WARRANTY_EXPIRY_DATE), {datePattern:'MMM dd, yyyy.', selector:'date'}) + "</dd>":"") + 
                          (graphic.attributes.DESIGN_START_DATE?"<dt>Design start date</dt><dd>" + locale.format(new Date(graphic.attributes.DESIGN_START_DATE), {datePattern:'MMM dd, yyyy.', selector:'date'})  + "</dd>":"") + 
                          (graphic.attributes.DESIGN_COMPLETION_DATE?"<dt>Design end date</dt><dd>" + locale.format(new Date(graphic.attributes.DESIGN_COMPLETION_DATE), {datePattern:'MMM dd, yyyy.', selector:'date'})  + "</dd>":"") + 
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
        if ($("#map").attr("data-zoom") < 5) {
          $("#toggleAllPrograms, #toggleAllConflict, #toggleAllOtherInfo").button("option", "disabled", true);
        } else {
          $("#toggleAllPrograms, #toggleAllConflict, #toggleAllOtherInfo").button("option", "disabled", false);
        }
        if ($('#toggleCategoryHeading').children("span").text().indexOf("Collapse") >= 0) {
          $('#toggleCategoryHeading').click();
        }
        if ($('#toggleOtherInfoHeading').children("span").text().indexOf("Collapse") >= 0) {
          $('#toggleOtherInfoHeading').click();
        }
        this.buildLayer("category");
      }
    });
  });