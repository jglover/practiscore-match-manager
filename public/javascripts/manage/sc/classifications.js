/* global io, pmelib, sprintf */
/* global _:false */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};
  var grid;

  var classificationsSource = {
    localdata: [],
    datatype: 'array',
    datafields: [
      { name: 'value',   type: 'string' },
      { name: 'label',   type: 'string' }
    ],
  };

  var classificationsAdapter = new $.jqx.dataAdapter (classificationsSource, {
    beforeLoadComplete: function (ignore, records) {
      var newRecords = [{value: 0, label: 'Latest'}];
      _.each (records, function (record, index) {
        var date = record.last_updated.substr (0, 10);
        if (index === 0)
          newRecords [0].value = date;
        newRecords.push ({
          value: date,
          label: date,
        });
      });
      return newRecords;
    },
    loadComplete: function (records) {
      $('#button-get').jqxButton ({disabled: false});
      $('#dropdownlist-set').jqxDropDownList ({disabled: !records.length});
      $('#button-apply').jqxButton ({disabled: !records.length});
    },
  });

  var changesSource = {
    localdata: [],
    datatype: 'array',
    datafields: [
      { name: 'name',     type: 'string', },
      { name: 'scsa',     type: 'string', },
      { name: 'division', type: 'string', },
      { name: 'oldClass', type: 'string', },
      { name: 'newClass', type: 'string', },
      { name: 'notes',    type: 'string', },
    ],
  };

  var changesAdapter = new $.jqx.dataAdapter (changesSource, {
    loadComplete: function (records) {
      var widths = {};
      var finalWidth = 0;
      var columns = [
        { text: 'Name',     datafield: 'name',     width: 0 },
        { text: 'SCSA #',   datafield: 'scsa',     width: 0 },
        { text: 'Division', datafield: 'division', width: 0 },
        { text: 'Old',      datafield: 'oldClass', width: 0 },
        { text: 'New',      datafield: 'newClass', width: 0 },
        { text: 'Notes',    datafield: 'notes',    width: 0 },
      ];
      _.each (columns, function (column) {
        column.width = _.max ([pmelib.getWidthOfText (column.text) + 20, column.width]);
      });
      _.each (records, function (record) {
        _.each (record, function (value, field) {
          widths [field] = _.max ([pmelib.getWidthOfText (value) + 10, (widths [field] || 0)]);
        });
      });
      _.each (columns, function (column) {
        column.width = _.max ([column.width, widths [column.datafield]]);
        finalWidth += column.width;
      });

      if (!grid) {
        grid = $('#changesGrid');

        $(grid).on ('bindingcomplete', function () {
          var filterrowHeight = $(grid).jqxGrid ('filterrowheight'); // 31
          var columnsHeight = $(grid).jqxGrid ('columnsheight') + 1; // 25 (26 actual)
          var rowsHeight = $(grid).jqxGrid ('rowsheight');           // 25
          var scrollbarSize = $(grid).jqxGrid ('scrollbarsize') + 4; // 15 (19 actual)
          var windowAdjust = 27 + 6 + 6;                             // 27 window header, 6 padding either side of grid

          var finalHeight = filterrowHeight + columnsHeight + (rowsHeight * _.min ([20, records.length]));

          $(grid).jqxGrid ({
            width: finalWidth + ((records.length <= 20) ? 0 : scrollbarSize),
            height: finalHeight,
          });
          $('#changesWindow').jqxWindow ({
            width: 'auto',
            height: $(grid).jqxGrid ('height') + windowAdjust,
            position: 'center',
          });
        });

        $(grid).on ('cellclick', function (event) {
          if (event.args && !event.args.rightclick) {
            var datafield = event.args.datafield;
            var value = event.args.value;
            var rowindex = event.args.rowindex;
            var url;

            if ((datafield === 'scsa') && value.length && (value !== 'PEN'))
              url = 'https://steelchallenge.com/steel-challenge-summary.php?scsa=' + value;

            if (url) {
              $(grid).jqxGrid ('clearselection');
              $(grid).jqxGrid ('selectrow', rowindex);
              window.open (url, 'SCSA Lookup');
            }
          }
        });

        $(grid).jqxGrid ({
          width: 100,
          height: 100,
          sortable: true,
          showsortmenuitems: false,
          filterable: true,
          autoshowfiltericon: true,
          showfilterrow: true,
          columnsreorder: false,
          columnsresize: false,
          pageable: false,
          scrollmode: 'logical',
          altrows: true,
          editable: false,
          selectionmode: 'none',
          showstatusbar: false,
          columnsheight: 26, // Changed from 26 to 31 in 4.1.2
          pagerheight: 29,   // Changed from 29 to 35 in 4.1.2
          rowsheight: 25,    // Changed from 25 to 28 in 4.1.2
          columns: columns,
        });
      }
    },
  });

  $('[controltype=button]').each (function () {
    $(this).jqxButton ({
      disabled: true,
      width: $(this).attr ('button-width'),
    });
  });

  $('#dropdownlist-set').jqxDropDownList ({
    disabled: true,
    height: 22,
    width: 110,
    autoDropDownHeight: true,
    source: classificationsAdapter,
    selectedIndex: 0,
  });

  $('#button-get').click (function () {
    $('[update-tr], [view-tr]').hide ();
    App.inputDisable ();
    App.socket.on ('status', function (data) {
      $('#getMsg').text (data.status);
      $('[getmsg-tr]').show ();
    });
    App.socket.emit ('classifications:get:sc', function (data) {
      if (data.err)
        $('#getMsg').text (data.msg);
      else
        $('#getMsg').html (data.records + ' classification updates retrieved from SteelChallenge.com<br />' +
          'Classifications last updated on ' + data.updated.substr (0, 10));
      App.socket.removeAllListeners ('status');
      App.inputEnable ();
      App.getAvailableUpdates ();
    });
  });

  $('#button-apply').click (function () {
    $('[view-tr], [update-tr]').hide ();
    App.inputDisable ();
    App.socket.on ('status', function (data) {
      $('#updateMsg').text (data.status);
      $('[update-tr]').show ();
    });
    App.socket.emit ('shooter:classifications:update',
      {
      },
      function (data) {
        if (data.err)
          $('#updateMsg').text (data.err);
        else if (data.msg)
          $('#updateMsg').text (data.msg);
        else {
          var changes = data.changes;
          var expired = _.filter (changes, 'expired', true).length;
          var classChanged = _.filter (changes, 'classChanged', true).length;
          var notFound = _.filter (changes, 'notFound', true).length;
          var table = [{count: classChanged, text: sprintf ('competitor%s updated', (classChanged !== 1) ? 's' : '')}];

          if (data.changes.length) {
            if (expired)
              table.push ({count: expired, text: sprintf ('expired membership%s', (expired !== 1) ? 's' : '')});
            if (classChanged)
              table.push ({count: classChanged, text: sprintf ('class change%s', (classChanged !== 1) ? 's' : '')});
            if (notFound)
              table.push ({count: notFound, text: sprintf ('SCSA number%s not found', (notFound !== 1) ? 's' : '')});

            changesSource.localdata = changes;
            $('#changesGrid').jqxGrid ({source: changesAdapter});
            $('[view-tr]').show ();
          }

          if (table.length) {
            var html = '<table class="changes">';
            _.each (table, function (t) {
              html += '<tr><td style="text-align: right;">' + t.count + '</td><td style="text-align: left;">' + t.text + '</td></tr>';
            });
            html += '</table>';

            $('#updateMsg').html (html);
          }
        }
        $('[update-tr]').show ();
        App.socket.removeAllListeners ('status');
        App.inputEnable ();
    });
  });

  $('#button-screen').click (function () {
    $('#changesWindow').jqxWindow ('open');
  });

  $('#button-print-preview').click (function () {
    var rows = $(grid).jqxGrid ('getrows');
    var fragment = document.createDocumentFragment ();
    var table = document.createElement ('table');
    var thead = document.createElement ('thead');
    var tbody = document.createElement ('tbody');
    var tr = document.createElement ('tr');
    var th, td;

    _.each (['Name', 'SCSA #', 'Division', 'Old', 'New', 'Notes'], function (f) {
      th = document.createElement ('th');
      th.innerHTML = f;
      tr.appendChild (th);
    });
    thead.appendChild (tr);

    _.each (rows, function (row) {
      tr = document.createElement ('tr');

      _.each (['name', 'scsa', 'division', 'oldClass', 'newClass', 'notes'], function (f) {
        td = document.createElement ('td');
        td.innerHTML = row [f];
        tr.appendChild (td);
      });

      tbody.appendChild (tr);
    });

    table.className = 'print';
    table.appendChild (thead);
    table.appendChild (tbody);
    fragment.appendChild (table);

    $('#printing').empty ().append (fragment);

    window.print ();
  });

  $('#changesWindow').jqxWindow ({
    width: 'auto',
    height: 'auto',
    resizable: false,
    isModal: true,
    autoOpen: false,
    modalOpacity: 0.50,
    showCloseButton: true,
    title: 'Changed shooters',
  });

  //
  //
  //
  App.inputDisable = function () {
    $('[controltype=ddl]').jqxDropDownList ({disabled: true});
    $('[controltype=button]').jqxButton ({disabled: true});
  };

  App.inputEnable = function () {
    $('[controltype=ddl]').jqxDropDownList ({disabled: false});
    $('[controltype=button]').jqxButton ({disabled: false});
  };

  App.getAvailableUpdates = function () {
    App.socket.emit ('classifications:available:sc', function (data) {
      if (!data.err) {
        classificationsSource.localdata = data.records;
        classificationsAdapter.dataBind ();

        $('[no-classifications-fade]').css ({opacity: !data.records.length ? 0.55 : 1.00});
        $('[no-classifications-disable-ddl]').jqxDropDownList ('disabled', !data.records.length);
        $('[no-classifications-disable-button]').jqxButton ('disabled', !data.records.length);
      }
    });
  };

  App.refreshMatchData = function () {
    App.socket.emit ('match:name', function (data) {
      $('#matchname').text (data.matchname);
    });

    App.getAvailableUpdates ();
  };

  App.socketConnect = function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();

    App.refreshMatchData ();
  };

  App.socketDisconnect = function () {
    $('#message').text ('');
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  };

  App.reload = function () {
    window.location.href = 'http://' + window.location.host + '/manage/sc/classifications';
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_updated', App.refreshMatchData);
  App.socket.on ('reload', App.reload);
  App.socket.emit ('log:log', {msg: 'Manage->SteelChallenge.com/Update Classifications'});
});
