/* global pmelib, io, moment, vsprintf */
/* global _:false */
/* jshint devel: true */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {
    vars: {
      deviceInfo: {},
      matchInfo: {},
      scanInProgress: false,
      gridsort: {
        datafield: null,
        sortdirection: null,
      },
    },
    controls: {
      contextMenu: null,
      popupDeviceInfo: null,
    },
  };
  var grid = $('#devicesGrid');

  var devicesSource = {
    localdata: [],
    datatype: 'array',
    datafields: [
      { name: 'autopoll',     type: 'boolean' },
      { name: 'lastheard',    type: 'string'  },
      { name: 'nextpoll',     type: 'string'  },
      { name: 'interval',     type: 'number'  },
      { name: 'available',    type: 'boolean' },
      { name: 'hidden',       type: 'boolean' },
      { name: 'deviceType',   type: 'string'  },
      { name: 'ps_battery',   type: 'string'  },
      { name: 'ps_haslogs',   type: 'boolean' },
      { name: 'ps_host',      type: 'string'  },
      { name: 'ps_matchid',   type: 'string'  },
      { name: 'ps_matchname', type: 'string'  },
      { name: 'ps_modified',  type: 'string'  },
      { name: 'ps_name',      type: 'string'  },
      { name: 'ps_nameshort', type: 'string'  },
      { name: 'ps_uniqueid',  type: 'string'  },
      { name: 'oktosync',     type: 'boolean' },
      { name: 'oktopoll',     type: 'boolean' },
      { name: 'oktoloadlogs', type: 'boolean' },
      { name: 'oktoautopoll', type: 'boolean' },
    ],
  };

  var devicesAdapter = new $.jqx.dataAdapter (devicesSource, {
    beforeLoadComplete: function (records) {
      App.vars.hiddenDevices = _.any (records, 'hidden', true);
      return _.filter (_.sortBy (records, 'ps_name'), 'hidden', false);
    }
  });

  //
  //
  //
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

  $(grid).on ('bindingcomplete', function () {
    var rows =  $(grid).jqxGrid ('getrows');

    if (rows.length) {
      _.each (['ps_nameshort', 'ps_matchname'], function (columnName) {
        var widest = 0;
        _.each (rows, function (row) {
          widest = _.max ([pmelib.getWidthOfText (row [columnName]) + 6, widest]);
        });
        $(grid).jqxGrid ('setcolumnproperty', columnName, 'width', widest);
      });
    }

    $(grid).jqxGrid ({width: _.sum ($(grid).jqxGrid ('columns').records, 'width')});
    $(grid).jqxGrid ('localizestrings', {filterselectstring: ' '});
    App.gridResizeHeight ();
  });

  var columnsrenderer = function (value) {
    return '<div class="centerheader">' + value + '</div>';
  };

  $(grid).jqxGrid ({
    width: 900,
    height: 100,
    autoheight: true,
    source: devicesAdapter,
    sortable: true,
    showsortmenuitems: false,
    showsortcolumnbackground: false,
    filterable: true,
    autoshowfiltericon: true,
    showfilterrow: true,
    showfiltercolumnbackground: false,
    columnsreorder: true,
    columnsresize: true,
    pageable: true,
    scrollmode: 'logical',
    altrows: true,
    editable: false,
    selectionmode: 'singlerow',
    showstatusbar: true,
    columnsheight: 26, // Changed from 26 to 31 in 4.1.2
    pagerheight: 29,   // Changed from 29 to 35 in 4.1.2
    rowsheight: 25,    // Changed from 25 to 28 in 4.1.2
    enablehover: false,
    columns: [
      {
        text:          'IP Address',
        width:         120,
        datafield:     'ps_host',
        renderer:      columnsrenderer,
        cellsrenderer: function (row, columnField, value, defaultHTML, columnProperties) {
                         return '<div class="fixgrid deviceipaddress" ' +
                                  'style="text-align: ' + columnProperties.cellsalign + ';">' +
                                  value +
                                '</div>';
                       },
      }, {
        text:          'Device Name',
        width:         100,
        datafield:     'ps_nameshort',
        renderer:      columnsrenderer,
      }, {
        text:          'Platform',
        width:         70,
        datafield:     'deviceType',
        renderer:      columnsrenderer,
        filtertype:    'checkedlist',
      }, {
        text:          'Battery',
        width:         60,
        datafield:     'ps_battery',
        renderer:      columnsrenderer,
        cellsalign:    'right',
        cellsrenderer: function (row, columnField, value, defaultHTML, columnProperties) {
                         return '<div class="fixgrid" ' +
                                  'style="text-align: ' + columnProperties.cellsalign + ';">' +
                                  value + '%' +
                                '</div>';
                       },
      }, {
        text:          'Match Name',
        width:         90,
        datafield:     'ps_matchname',
        renderer:      columnsrenderer,
        rendered:      function (element) {
                         $(element).jqxTooltip ({position: 'mouse', content: $(element).text ()});
                       },
      }, {
        text:          'Last Modified',
        width:         150,
        datafield:     'ps_modified',
        renderer:      columnsrenderer,
        cellsrenderer: function (row, columnField, value, defaultHTML, columnProperties) {
                         return '<div class="fixgrid" ' +
                                  'style="text-align: ' + columnProperties.cellsalign + ';">' +
                                  value.substring (0, 19) +
                                '</div>';
                       },
      }, {
        text:          'Sync',
        width:         50,
        datafield:     'oktosync',
        renderer:      columnsrenderer,
        filterable:    false,
        cellsalign:    'center',
        cellsrenderer: function (row, columnField, value, defaultHTML, columnProperties) {
                         return '<div class="fixgrid" ' +
                                  'style="text-align: ' + columnProperties.cellsalign + ';">' +
                                  (value ? '<a href="#">Sync<a/>' : '(n/a)') +
                                 '</div>';
                       },
      }, {
        text:          'Poll',
        width:         50,
        datafield:     'oktopoll',
        renderer:      columnsrenderer,
        filterable:    false,
        cellsalign:    'center',
        cellsrenderer: function (row, columnField, value, defaultHTML, columnProperties) {
                         return '<div class="fixgrid" ' +
                                  'style="text-align: ' + columnProperties.cellsalign + ';">' +
                                  (value ? '<a href="#">Poll<a/>' : '(n/a)') +
                                 '</div>';
                       },
      }, {
        text:          'Logs',
        width:         50,
        datafield:     'oktoloadlogs',
        filterable:    false,
        renderer:      columnsrenderer,
        cellsalign:    'center',
        cellsrenderer: function (row, columnField, value, defaultHTML, columnProperties) {
                         return '<div class="fixgrid" ' +
                                  'style="text-align: ' + columnProperties.cellsalign + ';">' +
                                  (value ? '<a href="#">Load<a/>' : '(n/a)') +
                                '</div>';
                       },
      }, {
        text:          'Auto Poll',
        width:         70,
        datafield:     'oktoautopoll',
        renderer:      columnsrenderer,
        filtertype:    'checkedlist',
        cellsalign:    'center',
        cellsrenderer: function (row, columnField, value, defaultHTML, columnProperties, device) {
                         return '<div class="fixgrid" ' +
                                  'style="text-align: ' + columnProperties.cellsalign + ';">' +
                                  (value ? '<input type="checkbox"' + (device.autopoll ? ' checked="yes"' : '') + '>' : '(n/a)') +
                                '</div>';
                       },
      }, {
        text:          'Available',
        width:         70,
        datafield:     'available',
        renderer:      columnsrenderer,
        filtertype:    'checkedlist',
        cellsalign:    'center',
        cellsrenderer: function (row, columnField, value, defaultHTML, columnProperties) {
                         return '<div class="fixgrid" ' +
                                  'style="text-align: ' + columnProperties.cellsalign + ';">' +
                                  (value ? 'Yes' : 'No') +
                                '</div>';
                       },
      },
    ],
    renderstatusbar: function (statusbar) {
      var container          = $('<div id="btncontainer"></div>');
      var clearButton        = $('<div class="btndiv" id="btnClear"><span class="btnspan">Clear</span></div>');
      var scanButton         = $('<div class="btndiv" id="btnScan"><span class="btnspan">Scan</span></div>');
      var pollAllButton      = $('<div class="btndiv" id="btnPollAll"><span class="btnspan">Poll All</span></div>');
      var clearFiltersButton = $('<div class="btndiv"><span class="btnspan">Clear Filters</span></div>');
      var resetSortButton    = $('<div class="btndiv"><span class="btnspan">Reset Sort</span></div>');
      var unhideAllButton    = $('<div class="btndiv" id="btnUnhideAll"><span class="btnspan">Unhide All</span></div>');

      container.append (clearButton);
      container.append (scanButton);
      container.append (pollAllButton);
      container.append (clearFiltersButton);
      container.append (resetSortButton);
      container.append (unhideAllButton);
      statusbar.append (container);

      clearButton.jqxButton ({theme: 'default', width: 60, height: 20, disabled: true});
      scanButton.jqxButton ({theme: 'default', width: 60, height: 20, disabled: false});
      pollAllButton.jqxButton ({theme: 'default', width: 60, height: 20, disabled: true});
      clearFiltersButton.jqxButton ({theme: 'default', width: 90, height: 20});
      resetSortButton.jqxButton ({theme: 'default', width: 90, height: 20});
      unhideAllButton.jqxButton ({theme: 'default', width: 90, height: 20});

      clearButton.click (function () {
        App.socket.emit ('device:clear', function (data) {
          App.updateMessage (data.msg);
        });
      });
      scanButton.click (function () {
        App.socket.emit ('device:scan');
      });
      pollAllButton.click (function () {
        App.socket.emit ('device:pollall', function (data) {
          App.updateMessage (data.msg);
        });
      });
      clearFiltersButton.click (function () {
        $(grid).jqxGrid ('clearfilters', true);
      });
      resetSortButton.click (function () {
        $(grid).jqxGrid ('removesort');
      });
      unhideAllButton.click (function () {
        App.socket.emit ('device:unhideall', function (data) {
          App.updateMessage (data.msg);
        });
      });
    },
  });

  $(grid).on ('sort', function (event) {
    App.vars.gridsort.datafield = event.args.sortinformation.sortcolumn;
    App.vars.gridsort.sortdirection = event.args.sortinformation.sortdirection.ascending ? 'asc' : 'desc';
  });

  $(grid).on ('contextmenu', function () {
    return false;
  });

  $(grid).on ('cellclick', function (event) {
    if (!event.args.rightclick) {
      var rowindex = event.args.rowindex;
      var datafield = event.args.datafield;
      var value = event.args.value;
      var row = $(grid).jqxGrid ('getrowdata', rowindex);

      if (_.isBoolean (value) && value) {
        switch (datafield) {
          case 'oktosync' :
            App.vars.syncDevice = row;
            $('#confirmSyncWindow').jqxWindow ('open');
            break;

          case 'oktopoll' :
            App.socket.emit ('device:poll', {deviceid: row.ps_uniqueid}, function (data) {
              App.updateMessage (data.msg);
            });
            App.updateMessage ('Poll request sent to %s @ %s', [row.ps_nameshort, row.ps_host]);
            break;

          case 'oktoloadlogs' :
            App.socket.emit ('sync:logs', {deviceid: row.ps_uniqueid}, function (data) {
              App.updateMessage (data.msg);
            });
            App.updateMessage ('Log sync request sent to %s @ %s', [row.ps_nameshort, row.ps_host]);
            break;

          case 'oktoautopoll' :
            App.socket.emit ('device:autopoll', {deviceid: row.ps_uniqueid, state: !row.autopoll}, function (data) {
              App.updateMessage (data.msg);
            });
            break;

          default :
            break;
        }
      }
    }
  });

  $(grid).on ('rowclick', function (event) {
    if (event.args.rightclick) {
      var rowindex = event.args.rowindex;
      var row = $(grid).jqxGrid ('getrowdata', rowindex);
      $(grid).jqxGrid ('selectrow', rowindex);
      $('#contextDeviceSync').toggle (row.oktosync);
      $('#contextDevicePoll').toggle (row.oktoautopoll);
      $('#contextDeviceLogs').toggle (row.oktoautopoll);
      $('#contextDeviceAutopollState').text (row.autopoll ? 'Disable' : 'Enable');
      $('#contextDeviceAutopoll').toggle (row.oktoautopoll);
      $('#contextDeviceUnhideAll').toggle (App.vars.hiddenDevices);
      var scrollTop = $(window).scrollTop ();
      var scrollLeft = $(window).scrollLeft ();
      var contextMenu = App.contextMenuInit ();
      $(contextMenu).jqxMenu ('open', parseInt (event.args.originalEvent.clientX) + 5 + scrollLeft, parseInt (event.args.originalEvent.clientY) + 5 + scrollTop);
      return false;
    }
  });

  //
  //  Defer setting up right-click context menu until needed
  //
  App.contextMenuInit = function () {
    if (App.controls.contextMenu)
      return App.controls.contextMenu;

    var contextMenu = $('#contextMenu').jqxMenu ({
      width: 220,
      height: null,
      autoOpenPopup: false,
      mode: 'popup'
    });

    $(contextMenu).on ('closed', function () {
      $(grid).jqxGrid ('unselectrow', $(grid).jqxGrid ('getselectedrowindex'));
    });

    $(contextMenu).on ('itemclick', function (event) {
      var rowindex = $(grid).jqxGrid ('getselectedrowindex');
      var row = $(grid).jqxGrid ('getrowdata', rowindex);

      switch (event.args.id) {
        case 'contextDeviceDetails' :
          var popupDeviceInfo = App.popupDeviceInfoInit ();
          $(popupDeviceInfo).jqxWindow ('title', row.ps_nameshort);
          $(popupDeviceInfo).jqxWindow ('open');
          break;

        case 'contextDevicePoll' :
          App.socket.emit ('device:poll', {deviceid: row.ps_uniqueid}, function (data) {
            App.updateMessage (data.msg);
          });
          App.updateMessage ('Poll request sent to %s @ %s', [row.ps_nameshort, row.ps_host]);
          break;

        case 'contextDeviceLogs' :
          App.socket.emit ('sync:logs', {deviceid: row.ps_uniqueid}, function (data) {
            App.updateMessage (data.msg);
          });
          App.updateMessage ('Log sync request sent to %s @ %s', [row.ps_nameshort, row.ps_host]);
          break;

        case 'contextDeviceSync' :
          App.vars.syncDevice = row;
          $('#confirmSyncWindow').jqxWindow ('open');
          break;

        case 'contextDeviceAutopoll' :
          App.socket.emit ('device:autopoll', {deviceid: row.ps_uniqueid, state: !row.autopoll}, function (data) {
            App.updateMessage (data.msg);
          });
          break;

        case 'contextDeviceHide' :
          App.socket.emit ('device:hide', {deviceid: row.ps_uniqueid, state: true}, function (data) {
            App.updateMessage (data.msg);
          });
          break;

        case 'contextDeviceUnhideAll' :
          App.socket.emit ('device:unhideall', function (data) {
            App.updateMessage (data.msg);
          });
          break;

        case 'contextDeviceForcePoll' :
          App.socket.emit ('device:poll', {deviceid: row.ps_uniqueid}, function (data) {
            App.updateMessage (data.msg);
          });
          App.updateMessage ('Force poll request sent to %s @ %s', [row.ps_nameshort, row.ps_host]);
          break;

        default :
          break;
      }
    });

    return (App.controls.contextMenu = contextMenu);
  };

  //
  //  Defer initialization of popup device info until it's needed
  //
  App.popupDeviceInfoInit = function () {
    if (App.controls.popupDeviceInfo)
      return App.controls.popupDeviceInfo;

    var popupDeviceInfo = $('#popupDeviceInfo').jqxWindow ({
      width: 400,
      height: 400,
      resizable: false,
      isModal: true,
      autoOpen: false,
      modalOpacity: 0.25,
      showCloseButton: true,
      title: 'Device Information',
    });

    $('#popupDeviceInfo').on ('open', function () {
    });

    return (App.controls.popupDeviceInfo = popupDeviceInfo);
  };

  $('#confirmSyncWindow').jqxWindow ({
    height: 139,
    width: 270,
    resizable: false,
    autoOpen: false,
    isModal: true,
    modalOpacity: 0.50,
    showCloseButton: false,
    okButton: $('#buttonSyncOK'),
    cancelButton: $('#buttonSyncCancel'),
    initContent: function () {
      $('#buttonSyncOK').jqxButton ({width: 65});
      $('#buttonSyncCancel').jqxButton ({width: 65});
      $('#buttonSyncCancel').focus();
    },
  });

  $('#confirmSyncWindow').on ('close', function (event) {
    if ((event.type === 'close') && (event.args.dialogResult.OK)) {
      var client = App.vars.syncDevice;
      $(grid).jqxGrid ('showloadelement');
      App.socket.emit ('device:autopoll:none', function (data) {
        App.updateMessage (data.msg);
        App.updateMessage ('Sync request sent to %s @ %s', [client.ps_nameshort, client.ps_host]);
        App.socket.emit ('sync:match', {deviceid: client.ps_uniqueid}, function (data) {
          $(grid).jqxGrid ('hideloadelement');
          App.updateMessage (data.msg);
          App.updateGrid ();
        });
      });
    } else {
      $(grid).jqxGrid ('hideloadelement');
      delete App.vars.syncDevice;
    }
  });

  //
  //
  //
  App.updateMessage = function (m, a) {
    if (m)
      $('#clientMsg').text (vsprintf (m, a || [])).show ();
    else
      $('#clientMsg').hide ();
  };

  App.disableButtons = function () {
    $('#clientTime').hide ();
    $('#btnClear').jqxButton ({disabled: true});
    $('#btnScan').jqxButton ({disabled: true});
    $('#btnPollAll').jqxButton ({disabled: true});
    $('#btnUnhideAll').jqxButton ({disabled: true});
  };

  App.updateButtons = function (updateScanTime) {
    if (updateScanTime)
      $('#clientTime').text ('Last scan at ' + (new Date ()).toTimeString ().substr (0, 8)).show ();
    $('#matchname').text (App.vars.matchInfo.name);
    $('#btnClear').jqxButton ({disabled: _.size (App.vars.deviceInfo) === 0});
    $('#btnScan').jqxButton ({disabled: App.vars.scanInProgress});
    $('#btnPollAll').jqxButton ({disabled: !_.any (App.vars.deviceInfo, function (d) {return d.oktoautopoll && d.autopoll;})});
    $('#btnUnhideAll').jqxButton ({disabled: !App.vars.hiddenDevices});
  };

  //
  //
  //
  App.updateGrid = function (fromWho) {
    fromWho = fromWho;
    App.socket.emit ('device:info', function (data) {
      App.vars.deviceInfo = data.deviceinfo || {};
      App.vars.matchInfo = data.matchinfo || {};
      App.vars.scanInProgress = data.scaninprogress || false;

      _.each (App.vars.deviceInfo, function (d) {
        d.samematch = d.ps_matchid === App.vars.matchInfo.id;
        d.oktosync = d.available;
        d.oktopoll = d.available && d.samematch;
        d.oktoloadlogs = d.available && d.samematch && d.ps_haslogs;
        d.oktoautopoll = d.available && d.samematch;
        d.ps_modified = moment.utc (d.ps_modified.replace (/(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}).*/, "$1T$2Z")).local ().format ('YYYY-MM-DD HH:mm:ss');
      });

      devicesSource.localdata = App.vars.deviceInfo;
      $(grid).jqxGrid ({source: devicesAdapter});

      if (App.vars.gridsort.datafield)
        $(grid).jqxGrid ('sortby', App.vars.gridsort.datafield, App.vars.gridsort.sortdirection || 'asc');

      App.updateButtons ();

      $('.deviceipaddress').each (function () {
        var ipAddress = $(this).text ().match (/(\d+)\.(\d+)$/);
        var syncCode = (('0' + parseInt (ipAddress [1]).toString (16)).substr (-2) + ('0' + parseInt (ipAddress [2]).toString (16)).substr (-2)).toUpperCase ();
        $(this).jqxTooltip ({
          position: 'left',
          content: 'Sync code is ' + syncCode,
          autoHideDelay: 0
        });
      });

      if (!_.size (App.vars.deviceInfo))
        App.updateMessage ("No devices present -- Click 'Scan'");
    });
  };

  //
  //
  //
  App.socketConnectMsg = function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();
    $('#clientTime').hide ();
    App.updateGrid ('socketConnectMsg');
  };

  App.socketDisconnectMsg = function () {
    $('#confirmSyncWindow').jqxWindow ('hide');
    $('#popupDeviceInfo').jqxWindow ('hide');
    $('#contextMenu').jqxWindow ('hide');
    $(grid).jqxGrid ('clear');
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
    App.vars.deviceInfo = {};
    App.vars.matchInfo = {};
  };

  //
  //
  //
  App.deviceSyncStatusMsg = function (client) {
    console.log ("Received 'device_sync_status'");
    console.log (client.msg);
    if (client.matchchanged)
      App.updateGrid ('deviceSyncStatusMsg');

    App.updateMessage (client.msg);
    $('#matchname').text (client.match_name);
  };

  App.refreshMatchData = function () {
    App.socket.emit ('match:get', {options: {match: true}}, function (data) {
      $('#matchname').text (data.matchData.m.match_name);
      App.updateGrid ('refreshMatchData');
    });
  };

  App.deviceScanStatusMsg = function (param) {
    if (param.msg)
      App.updateMessage (param.msg);

    if (param.action)
      switch (param.action) {
        case 'start' :
        case 'inprogress' :
          App.vars.scanInProgress = true;
          App.disableButtons ();
          break;

        case 'complete' :
          App.vars.scanInProgress = false;
          App.updateButtons (true);
          break;

        case 'other' :
          break;

        default :
          break;
      }
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnectMsg);
  App.socket.on ('disconnect', App.socketDisconnectMsg);
  App.socket.on ('device_sync_status', App.deviceSyncStatusMsg);
  App.socket.on ('device_scan_status', App.deviceScanStatusMsg);
  App.socket.on ('device_info', function () {App.updateGrid ('device_info');});
  App.socket.on ('device_online', function () {App.updateGrid ('device_online');});
  App.socket.on ('device_offline', function () {App.updateGrid ('device_offline');});
  App.socket.on ('device_hide', function () {App.updateGrid ('device_hide');});
  App.socket.on ('device_synced', function () {App.updateGrid ('device_synced');});
  App.socket.on ('match_updated', App.refreshMatchData);
  App.socket.on ('reload', App.refreshMatchData);

  App.socket.emit ('log:log', {msg: 'Manage->Devices'});

  window.onerror = function (msg, url, line, col, error) {
    if (App.socket) {
      App.socket.emit ('errorlog:error', {
        msg: msg,
        url: url,
        line: line,
        col: col,
        stack: error.stack,
      });
    } else {
      alert ('An internal error has occurred. Please check the javascript console for errors');
    }

    return false;
  };
});
