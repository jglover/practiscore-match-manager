/* global io, moment */
/* global _:false */
/* jshint devel: true */

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
      { name: 'match_name',       type: 'string' },
      { name: 'match_date',       type: 'string' },
      { name: 'match_discipline', type: 'string' },
      { name: 'match_modified',   type: 'string' },
      { name: 'match_filename',   type: 'string' },
      { name: 'match_file',       type: 'string' },
      { name: 'match_uuid',       type: 'string' },
    ],
    addrow: function (rowid, newdata, position, commit) {
      commit (true);
    },
    updaterow: function (rowid, newdata, commit) {
      commit (true);
    },
    deleterow: function (rowid, commit) {
      commit (true);
    },
  };

  var fileAdapter = new $.jqx.dataAdapter (fileSource);

  $(grid).css ({opacity: 0.0});

  //
  //
  //
  $(grid).on ('bindingcomplete', function () {
    var totalWidth = 0;

    $(grid).jqxGrid ('localizestrings', {filterselectstring: ' '});
    $(grid).jqxGrid ('sortby', 'match_modified', 'desc');

    if ($(grid).jqxGrid ('getboundrows').length > 0) {
      $(grid).jqxGrid ('autoresizecolumns');

      _.each (fileSource.datafields, function (item) {
        totalWidth += $(grid).jqxGrid ('getcolumnproperty', item.name, 'width');
      });

      $(grid).jqxGrid ({width: totalWidth});

      _.each (fileSource.datafields, function (item) {
        $(grid).jqxGrid ('setcolumnproperty', item.name, 'width',
          $(grid).jqxGrid ('getcolumnproperty', item.name, 'width'));
      });
    } else {
      $(grid).jqxGrid ({width: 424});
      $(grid).jqxGrid ('setcolumnproperty', 'match_name',       'width', 112);
      $(grid).jqxGrid ('setcolumnproperty', 'match_date',       'width',  80);
      $(grid).jqxGrid ('setcolumnproperty', 'match_discipline', 'width',  98);
      $(grid).jqxGrid ('setcolumnproperty', 'match_modified',   'width', 134);
      $(grid).jqxGrid ('setcolumnproperty', 'match_filename',   'width',  80);
    }

    $(grid).jqxGrid ('refreshdata');
    $(grid).css ({opacity: 1.0});
  });

  $(grid).on ('rowdoubleclick', function (event) {
    App.loadFile (event.args.rowindex, $(grid).jqxGrid ('getrowdata', event.args.rowindex));
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
      case 'Load this match' :
        App.loadFile (rowIndex, match);
        break;
      case 'Delete this match' :
        App._delete = {rowIndex: rowIndex, match: match};
        $('#confirmDeleteWindow').jqxWindow ('open');
        break;
      default :
        break;
    }
  });

  $('#confirmLoadWindow').jqxWindow ({
    height: 154,
    width: 270,
    resizable: false,
    autoOpen: false,
    isModal: true,
    modalOpacity: 0.50,
    showCloseButton: false,
    okButton: $('#buttonLoadOK'),
    cancelButton: $('#buttonLoadCancel'),
    initContent: function () {
      $('#buttonLoadOK').jqxButton ({width: 65});
      $('#buttonLoadCancel').jqxButton ({width: 65});
      $('#buttonLoadCancel').focus();
    },
  });

  $('#confirmLoadWindow').on ('close', function (event) {
    if ((event.type === 'close') && (event.args.dialogResult.OK)) {
      $('#msgDiv').html ('Loading match...').show ();
      $(grid).jqxGrid ('showloadelement');
      App.socket.emit ('file:ssi:load', {file: App._load.match.match_file}, function (data) {
        if (data.err)
          $('#msgDiv').text ('System Error: ' + data.err).show ();
        else {
          $('#msgDiv').html ('Match successfully loaded').show ();
          $('#matchname').text (data.matchName);
        }
        $(grid).jqxGrid ('hideloadelement');
        delete App._load;
      });
    } else {
      $(grid).jqxGrid ('hideloadelement');
      delete App._load;
    }
  });

  $('#confirmDeleteWindow').jqxWindow ({
    height: 124,
    width: 240,
    resizable: false,
    autoOpen: false,
    isModal: true,
    modalOpacity: 0.50,
    showCloseButton: false,
    okButton: $('#buttonDeleteOK'),
    cancelButton: $('#buttonDeleteCancel'),
    initContent: function () {
      $('#buttonDeleteOK').jqxButton ({width: 65});
      $('#buttonDeleteCancel').jqxButton ({width: 65});
      $('#buttonDeleteCancel').focus();
    },
  });

  $('#confirmDeleteWindow').on ('close', function (event) {
    if ((event.type === 'close') && (event.args.dialogResult.OK)) {
      App.socket.emit ('file:ssi:delete', {file: App._delete.match.match_file}, function (data) {
        if (data.err)
          $('#msgDiv').text ('System Error: ' + data.err).show ();
        else {
          $('#msgDiv').text (App._delete.match.match_filename + ' deleted').show ();
          $('#matchname').text (data.matchName);
          $(grid).jqxGrid ('deleterow', App._delete.rowIndex);
        }
        delete App._delete;
      });
    }
  });

  //
  //  Fuckery to make the grid size to the available screen space.
  //
  App.createGrid = function () {
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
      ready: function () {
        App.gridReady = true;
      },
      columns: [
        { text: 'Name',           datafield:  'match_name',       cellsalign: 'center', width: 112 },
        { text: 'Date',           datafield:  'match_date',       cellsalign: 'center', width:  80 },
        { text: 'Type',           datafield:  'match_discipline', cellsalign: 'center', width:  98 },
        { text: 'Last Modified',  datafield:  'match_modified',   cellsalign: 'center', width: 134 },
        { text: 'File Name',      datafield:  'match_filename',   cellsalign: 'center', width:  80 },
        { text: 'Full File Name', datafield:  'match_file',       cellsalign: 'left',   width:   0, minwidth: 0, maxwidth: 0, hidable: true, hidden: true, },
        { text: 'UUID',           datafield:  'match_uuid',       cellsalign: 'left',   width:   0, minwidth: 0, maxwidth: 0, hidable: true, hidden: true, },
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

    if (true) {
      var contentOffset = $('#content').offset ().top;
      var copyrightHeight = $('#copyright').height ();
      var viewportHeight = new $.jqx.response ().viewPort.height;
      var viewportRemaining = viewportHeight - (contentOffset + copyrightHeight);
      var usedSpace  = $(grid).jqxGrid ('columnsheight')   +  // 25
                       $(grid).jqxGrid ('filterrowheight') +  // 31
                       $(grid).jqxGrid ('statusbarheight') +  // 34
                       $(grid).jqxGrid ('pagerheight');       // 28
      var rowHeight  = $(grid).jqxGrid ('rowsheight');        // 25
      var availableRows = Math.round ((viewportRemaining - usedSpace) / rowHeight);
      var newPagesize = availableRows - (availableRows % 5);
      var newHeight = (newPagesize * rowHeight) + usedSpace;

      $(grid).jqxGrid ({
        height: newHeight,
        pagesize: newPagesize,
        pagesizeoptions: [newPagesize]
      });
    }
  };

  App.loadFile = function (rowIndex, match) {
    if (App._saveCurrent) {
      App._load = {rowIndex: rowIndex, match: match};
      $('#confirmLoadWindow').jqxWindow ('open');
    } else {
      $('#msgDiv').html ('Loading match...').show ();
      $(grid).jqxGrid ('showloadelement');

      App.socket.emit ('file:ssi:load', {file: match.match_file}, function (data) {
        if (data.err)
          $('#msgDiv').text ('System Error: ' + data.err).show ();
        else {
          $('#msgDiv').html ('Match successfully loaded').show ();
          $('#matchname').text (data.matchName);
        }
        $(grid).jqxGrid ('hideloadelement');
      });
    }
  };

  App.listFiles = function () {
    App.socket.emit ('file:ssi:list', function (data) {
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

      App.createGrid ();
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
  App.socket.on ('ssi_directory_changed', App.listFiles);
  App.socket.emit ('log:log', {'msg': 'File->Import->Shoot\'n-Score-It'});
});

