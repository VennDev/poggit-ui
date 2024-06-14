/*
 * Copyright 2016-2018 Poggit
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

$(function() {
    var sortMethods = [
        {category: "state-change-date", direction: "desc"}
    ];

    function filterReleaseResults() {
        var selectedName = $("#pluginSearch").val();
        var selectedNameMode = $("#pluginSearchField").val();
        var selectedCat = $('#category-list').val();
        var selectedCatName = $('#category-list option:selected').text();
        var selectedAPI = $('#api-list').val();
        var selectedAPIIndex = $('#api-list').prop('selectedIndex');
        if(selectedCat > 0) {
            $('#category-list').attr('style', 'background-color: #FF3333');
        }
        else {
            $('#category-list').attr('style', 'background-color: #FFFFFF');
        }
        if(selectedAPIIndex > 0) {
            $('#api-list').attr('style', 'background-color: #FF3333');
        }
        else {
            $('#api-list').attr('style', 'background-color: #FFFFFF');
        }
        var mainReleaseList = $("#main-release-list");
        if(!$.isEmptyObject(mainReleaseList.data('paginate'))) mainReleaseList.data('paginate').kill();

        $('.plugin-entry').each(function(idx, el) {
            var name = selectedNameMode === "plugin" ? $(el).find('.plugin-name a').text() : $(el).find('.plugin-author').text();
            var cats = $(el).children('#plugin-categories');
            var catArray = cats.attr("value").split(',');
            var apis = $(el).children('#plugin-apis');
            var apiJSON = apis.attr("value");
            var json = JSON.stringify(eval('(' + apiJSON + ')'));
            var apiArray = $.parseJSON(json);
            var compatibleAPI = false;
            for(var i = 0; i < apiArray.length; i++) {
                var sinceOk = compareApis(apiArray[i][0], selectedAPI);
                var tillOk = compareApis(apiArray[i][1], selectedAPI);
                if(sinceOk <= 0 && tillOk >= 0) {
                    compatibleAPI = true;
                    break;
                }
            }
            var nameMatch = name.toLowerCase().indexOf(selectedName.toLowerCase()) >= 0;
            $(el).attr("hidden", !nameMatch || !catArray.includes(selectedCat) && Number(selectedCat) !== 0 || selectedAPIIndex > 0 && !compatibleAPI);
        });

        sortReleases();

        var mainReleaseList = $("#main-release-list");
        var visiblePlugins = mainReleaseList.find('.plugin-entry:visible').length;
        if(visiblePlugins === 0) {
            $("#no-plugins").show();
        } else {
            $("#no-plugins").hide();
        }
        if(visiblePlugins > 24 && getParameterByName("usePages", sessionData.opts.usePages !== false ? "on" : "off") === "on") {
            mainReleaseList.paginate({
                perPage: 24,
                scope: '.plugin-entry:visible'
            });
        }
    }

    function sortReleases() {
        var mainReleaseList = $("#main-release-list");
        if(!$.isEmptyObject(mainReleaseList.data('paginate'))) mainReleaseList.data('paginate').kill();
        mainReleaseList.find("> div").sortElements(function(a, b) {
            // Force featured on top.
            if(a.getAttribute("data-state") === PoggitConsts.ReleaseState.featured.toString()) {
                if(b.getAttribute("data-state") !== PoggitConsts.ReleaseState.featured.toString()) return -1;
            }else if(b.getAttribute("data-state") === PoggitConsts.ReleaseState.featured.toString()) return 1;

            for(var i in sortMethods) {
                var method = sortMethods[i];
                var da = a.getAttribute("data-" + method.category);
                var db = b.getAttribute("data-" + method.category);
                var signum;
                if(method.category === "name") {
                    signum = da.toLowerCase() > db.toLowerCase() ? 1 : -1;
                } else if(method.category === "mean-review") {
                    signum = (da === "NAN" ? 2.5 : Number(da)) > (db === "NAN" ? 2.5 : Number(db)) ? 1 : -1;
                } else {
                    signum = Number(da) > Number(db) ? 1 : -1;
                }
                if(da !== db) {
                    return method.direction === "asc" ? signum : -signum;
                }
            }
            return 1;
        });
        var visiblePlugins = mainReleaseList.find('.plugin-entry:visible').length;
        if(visiblePlugins > 24 && getParameterByName("usePages", sessionData.opts.usePages !== false ? "on" : "off") === "on") {
            mainReleaseList.paginate({
                perPage: 24,
                scope: '.plugin-entry:visible'
            });
        }
    }

    function replicateSortRow() {
        var row = $(".release-sort-row-template").clone();
        row.removeClass("release-sort-row-template");
        row.find(".release-sort-row-close").click(function() {
            row.remove();
            updateSortRowClose();
        });
        row.appendTo($("#release-sort-list"));

        updateSortRowClose();
    }

    function updateSortRowClose() {
        $(".release-sort-row-close").css("display", $(".release-sort-row").length > 2 ? "inline" : "none");
    }

    $(".release-filter-select").change(filterReleaseResults);

    if($('#main-release-list').find('> div').length > 0) {
        filterReleaseResults();
    }

    var sortDialog = $("#release-sort-dialog");
    sortDialog.dialog({
        position: modalPosition,
        autoOpen: false,
        modal: true,
        width: 'auto',
        height: 'auto',
        buttons: {
            Sort: function() {
                sortMethods = [];
                $(".release-sort-row:not(.release-sort-row-template)").each(function() {
                    sortMethods.push({
                        category: $(this).find(".release-sort-category").val(),
                        direction: $(this).find(".release-sort-direction").val()
                    });
                });
                sortReleases();
                sortDialog.dialog("close");
            }
        },
        open: function(event, ui) {
            $('.ui-widget-overlay').bind('click', function() {
                $("#release-sort-dialog").dialog('close');
            });
        }
    });

    replicateSortRow();

    $("#release-sort-row-add").click(replicateSortRow);

    $("#release-sort-button").click(function() {
        sortDialog.dialog("open");
    });

    var pluginSearch = $("#pluginSearch");
    pluginSearch.on("input", (event) => {
        filterReleaseResults();
    });

    $("#pluginSearchField").on("change", (event) => {
        filterReleaseResults();
    });

    if(!window.matchMedia('(max-width: 900px)').matches) {
        pluginSearch.focus();
    }
});
