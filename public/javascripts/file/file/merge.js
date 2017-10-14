/* global io, moment */
/* global _:false */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};
  var grid = $('#fileGrid');

  var fileSource = {
    localdata: [],
    datatype: 'json',
    datafields: [
      { name: 'match_name',       type: 'string', width: 112 },
      { name: 'match_date',       type: 'string', width:  80 },
      { name: 'match_discipline', type: 'string', width:  98 },
      { name: 'match_modified',   type: 'string', width: 134 },
      { name: 'match_filename',   type: 'string', width:  80 },
      { name: 'match_file',       type: 'string', width:   0 },
      { name: 'match_uuid',       type: 'string', width:   0 },
    ],
  };

  var fileAdapter = new $.jqx.dataAdapter (fileSource, {
    beforeLoadComplete: function (records) {
      return _.sortBy (records, function (n) {
        return n.match_modified;
      }).reverse ();
    },
  });

  //
  //
  //
  App.gridResizeWidth = function () {
    var cols = $(grid).jqxGrid ('columns');

    $(grid).jqxGrid ('localizestrings', {filterselectstring: ' '});

    if ($(grid).jqxGrid ('getboundrows').length > 0) {

      $(grid).jqxGrid ('autoresizecolumns');
      $(grid).jqxGrid ({width: _.sum (cols.records, 'width')});

      _.each (cols.records, function (col) {
        $(grid).jqxGrid ('setcolumnproperty', col.datafield, 'width',
          $(grid).jqxGrid ('getcolumnproperty', col.datafield, 'width'));
      });
    } else {
      $(grid).jqxGrid ({width: _.sum (fileSource.datafields, 'width')});

      _.each (cols.records, function (col) {
        $(grid).jqxGrid ('setcolumnproperty', col.datafield, 'width', fileSource.datafields [cols.datafield]);
      });
    }
  };

  App.gridResizeHeight = function () {
    var v = {};
    v.viewportHeight = Math.ceil (new $.jqx.response ().viewPort.height);
    v.contentOffset = Math.ceil ($('#content').offset ().top);
    v.msgHeight = $('#msgDiv').height () + 16;               // 19 (plus 16 for margin-top)
    v.copyrightHeight = $('#copyright').height () + 16;      // 24 (plus 16 for margin-top)
    v.rowsHeight = $(grid).jqxGrid ('rowsheight');           // 25
    v.columnsHeight = $(grid).jqxGrid ('columnsheight') + 1; // 25 (26 actual)
    v.filterrowHeight = $(grid).jqxGrid ('filterrowheight'); // 31
    v.statusbarHeight = $(grid).jqxGrid ('statusbarheight'); // 34
    v.pagerHeight = $(grid).jqxGrid ('pagerheight') + 1;     // 28 (29 actual)
    v.filterrowVisible = $(grid).jqxGrid ('showfilterrow');
    v.statusbarVisible = $(grid).jqxGrid ('showstatusbar');
    v.pagerVisible = $(grid).jqxGrid ('pageable');

    v.usedHeight = v.msgHeight;
    v.usedHeight += v.columnsHeight;

    if (v.filterrowVisible)
      v.usedHeight += v.filterrowHeight;
    if (v.statusbarVisible)
      v.usedHeight += v.statusbarHeight;
    if (v.pagerVisible)
      v.usedHeight += v.pagerHeight;

    v.viewportRemaining = v.viewportHeight - (v.contentOffset + v.copyrightHeight);
    v.possibleRows = (v.viewportRemaining - v.usedHeight) / v.rowsHeight;
    v.actualRows = Math.floor (v.possibleRows);

    v.newPagesize = v.actualRows - (v.actualRows % 5);
    v.newHeight = (v.newPagesize * v.rowsHeight) + v.usedHeight;

    $(grid).jqxGrid ({
      height: v.newHeight,
      pagesize: v.newPagesize,
      pagesizeoptions: [v.newPagesize]
    });
  };

  App.gridResizeBoth = function () {
    App.gridResizeHeight ();
    App.gridResizeWidth ();
  };

  //
  //
  //
  $(grid).css ({opacity: 0.0});

  $(grid).on ('bindingcomplete', function () {
    App.gridResizeBoth ();
  });

  $(window).resize (_.debounce (App.gridResizeBoth, 250));

  $(grid).on ('rowdoubleclick', function (event) {
    App.mergeFile ($(grid).jqxGrid ('getrowdata', event.args.rowindex));
  });

  //
  //  Setup right-click context menu
  //
  var contextMenu = $('#contextMenu').jqxMenu ({
    width: 200,
    height: null,
    autoOpenPopup: false,
    mode: 'popup'
  });

  $(grid).on ('contextmenu', function () {
    return false;
  });

  $(grid).on ('cellclick', function (event) {
    if (event.args.rightclick) {
      $(grid).jqxGrid ('selectrow', event.args.rowindex, event.args.datafield);
      var scrollTop = $(window).scrollTop ();
      var scrollLeft = $(window).scrollLeft ();
      contextMenu.jqxMenu ('open', parseInt (event.args.originalEvent.clientX) + 5 + scrollLeft, parseInt (event.args.originalEvent.clientY) + 5 + scrollTop);
      return false;
    }
  });

  $('#contextMenu').on ('itemclick', function (event) {
    var rowIndex = $(grid).jqxGrid ('getselectedrowindex');
    var match = $(grid).jqxGrid ('getrowdata', rowIndex);

    switch ($.trim ($(event.args).text ())) {
      case 'Merge this fragment' :
        App.mergeFile (match);
        break;
      default :
        break;
    }
  });

  $('#confirmMergeWindow').jqxWindow ({
    height: 154,
    width: 270,
    resizable: false,
    autoOpen: false,
    isModal: true,
    modalOpacity: 0.50,
    showCloseButton: false,
    okButton: $('#buttonMergeOK'),
    cancelButton: $('#buttonMergeCancel'),
    initContent: function () {
      $('#buttonMergeOK').jqxButton ({width: 65});
      $('#buttonMergeCancel').jqxButton ({width: 65});
      $('#buttonMergeCancel').focus();
    },
  });

  $('#confirmMergeWindow').on ('close', function (event) {
    if ((event.type === 'close') && (event.args.dialogResult.OK)) {
      $('#msgDiv').html ('Merging match...').show ();
      $(grid).jqxGrid ('showloadelement');
      App.socket.emit ('file:psc:merge', {file: App._merge.match.match_file}, function (data) {
        if (data.err)
          $('#msgDiv').text ('System Error: ' + data.err).show ();
        else {
          $('#msgDiv').html ('Match successfully merged').show ();
          $('#matchname').text (data.matchName);
        }
        $(grid).jqxGrid ('hideloadelement');
        delete App._merge;
      });
    } else {
      $(grid).jqxGrid ('hideloadelement');
      delete App._merge;
    }
  });

  $(grid).jqxGrid ({
    width: 424,
    height: 100,
    source: fileAdapter,
    sortable: true,
    showsortmenuitems: false,
    filterable: true,
    autoshowfiltericon: true,
    showfilterrow: true,
    columnsreorder: true,
    pageable: true,
    autoheight: true,
    altrows: true,
    editable: false,
    selectionmode: 'singlerow',
    showstatusbar: true,
    columnsheight: 26, // Changed from 26 to 31 in 4.1.2
    pagerheight: 29,   // Changed from 29 to 35 in 4.1.2
    rowsheight: 25,    // Changed from 25 to 28 in 4.1.2
    columns: [
      { text: 'Name',          datafield:  'match_name',       cellsalign: 'center', width: 112 },
      { text: 'Date',          datafield:  'match_date',       cellsalign: 'center', width:  80 },
      { text: 'Type',          datafield:  'match_discipline', cellsalign: 'center', width:  98 },
      { text: 'Last Modified', datafield:  'match_modified',   cellsalign: 'center', width: 134 },
      { text: 'File Name',     datafield:  'match_filename',   cellsalign: 'center', width:  80 },
    ],
    renderstatusbar: function (statusbar) {
      var container          = $('<div style="overflow: hidden; position: relative; margin: 0px; padding-top: 3px;"></div>');
      var clearFiltersButton = $('<div style="float: left; margin-left: 3px;"><span style="margin-left: 4px; position: relative; top: 2px;">Clear Filters</span></div>');
      var resetSortButton    = $('<div style="float: left; margin-left: 5px;"><span style="margin-left: 4px; position: relative; top: 2px;">Reset Sort</span></div>');

      container.append (clearFiltersButton);
      container.append (resetSortButton);
      statusbar.append (container);

      clearFiltersButton.jqxButton ({theme: 'default', width: 90, height: 20});
      resetSortButton.jqxButton ({theme: 'default', width: 90, height: 20});

      clearFiltersButton.click (function () {
        $(grid).jqxGrid ('clearfilters', true);
      });
      resetSortButton.click (function () {
        $(grid).jqxGrid ('sortby', 'match_modified', 'desc');
      });
    },
  });

  App.mergeFile = function (match) {
    if (App._saveCurrent) {
      App._merge = {match: match};
      $('#confirmMergeWindow').jqxWindow ('open');
    } else {
      $('#msgDiv').html ('Merging match...').show ();
      $(grid).jqxGrid ('showloadelement');

      App.socket.emit ('file:psc:merge', {file: match.match_file}, function (data) {
        if (data.err)
          $('#msgDiv').text ('System Error: ' + data.err).show ();
        else {
          $('#msgDiv').html ('Match successfully merged').show ();
          $('#matchname').text (data.matchName);
        }
        $(grid).jqxGrid ('hideloadelement');
      });
    }
  };

  App.listFiles = function () {
    App.socket.emit ('file:psc:list', {matchUUID: true}, function (data) {
      if (data.err)
        $('#msgDiv').text (data.err).show ();
      else if (data.saveCurrent)
        $('#msgDiv').html ('<b>Current match has not been saved! Maybe go save it first?</b>').show ();
      else
        $('#msgDiv').hide ();

      $('#matchname').text (data.matchName);

      App._saveCurrent = data.saveCurrent;

      _.each (data.files, function (file) {
        file.match_modified = moment.utc (file.match_modified.replace (/(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}).*/, "$1T$2Z")).local ().format ('YYYY-MM-DD HH:mm:ss');
      });

      fileSource.localdata = data.files;

      $(grid).jqxGrid ('updatebounddata', 'cells');
      $(grid).jqxGrid ('clearselection');
      $(grid).css ({opacity: 1.0});
    });
  };

  //
  //
  //
  App.socketConnect = function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();

    App.listFiles ();
  };

  App.socketDisconnect = function () {
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('reload', App.listFiles);
  App.socket.on ('psc_directory_changed', App.listFiles);
  App.socket.emit ('log:log', {'msg': 'File->File->Merge Fragment'});
});
