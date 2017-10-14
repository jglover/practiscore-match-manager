/* global io, pmelib, sprintf */
/* global _:false */
/* jshint devel: true */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};
  var grid;
  var editVars = {
    isEditing: false,
    editingRowindex: -1,
    editingDatafield: null,
  };

  var textToPasteBuffer = function (text) {
    var textArea = document.createElement ("textarea");

    textArea.style.position = 'fixed';
    textArea.style.top = 0;
    textArea.style.left = 0;
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = 0;
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';

    textArea.value = text;

    document.body.appendChild (textArea);

    textArea.select ();

    try {
      var successful = document.execCommand ('copy');
      var msg = successful ? 'successful' : 'unsuccessful';
      console.log ('Copying text command was ' + msg);
    } catch (err) {
      console.log ('Oops, unable to copy');
    }

    document.body.removeChild (textArea);
  };

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
      $('#checkbox-verify').jqxCheckBox ({disabled: !records.length});
      $('#checkbox-add').jqxCheckBox ({disabled: !records.length});
      $('#button-apply').jqxButton ({disabled: !records.length});
    },
  });

  var changesSource = {
    localdata: [],
    datatype: 'array',
    datafields: [
      { name: 'sh_uid',   type: 'string',  },
      { name: 'name',     type: 'string',  },
      { name: 'uspsaNum', type: 'string',  },
      { name: 'division', type: 'string',  },
      { name: 'oldClass', type: 'string',  },
      { name: 'newClass', type: 'string',  },
      { name: 'note',     type: 'string',  },
      { name: 'email',    type: 'string',  },
      { name: 'expired',  type: 'boolean', },
    ],
  };

  var changesAdapter = new $.jqx.dataAdapter (changesSource, {
    loadComplete: function (records) {
      var widths = {};
      var finalWidth = 0;
      var columns = [
        { text: 'Name',     datafield: 'name',     width: 0 },
        { text: 'USPSA #',  datafield: 'uspsaNum', width: 0 },
        { text: 'Division', datafield: 'division', width: 0 },
        { text: 'Old',      datafield: 'oldClass', width: 0 },
        { text: 'New',      datafield: 'newClass', width: 0 },
        { text: 'Notes',    datafield: 'note',     width: 0 },
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

        $(grid).on ('contextmenu', function () {
          return false;
        });

        $(grid).on ('cellclick', function (event) {
          if (event.args && !editVars.isEditing) {
            if (event.args.rightclick) {
              if (event.args.datafield === 'uspsaNum')
                $(grid).jqxGrid ('begincelledit', event.args.rowindex, event.args.datafield);
            } else {
              var datafield = event.args.datafield;
              var value = event.args.value;
              var rowindex = event.args.rowindex;
              var url;

              if (datafield === 'name')
                url = 'http://www.uspsa.org/lookup-by-name.php?exp=on&name=' + value.split (',') [0];
              else if ((datafield === 'uspsaNum') && value.length && (value !== 'PEN'))
                url = 'http://www.uspsa.org/uspsa-classifer-lookup-results.php?number=' + value;

              if (url) {
                $(grid).jqxGrid ('clearselection');
                $(grid).jqxGrid ('selectrow', rowindex);
                window.open (url, 'USPSA Lookup');
              }
            }
          }
        });

        $(grid).on ('cellbeginedit', function (event) {
          editVars.isEditing = true;
          editVars.editingRowindex = event.args.rowindex;
          editVars.editingDatafield = event.args.datafield;
        });

        $(grid).on ('cellendedit', function (event) {
          if (event.args) {
            editVars.isEditing = false;
            editVars.editingRowindex = 0;
            editVars.editingDatafield = null;

            if (event.args.datafield === 'uspsaNum') {
              var value = event.args.value;
              var oldvalue = event.args.oldvalue;
              var rowdata = event.args.row;

              if (value !== oldvalue) {
                App.socket.emit ('shooter:validate', {shooter: {'sh_id': value}}, function (data) {
                  if (data.err) {
                    rowdata.uspsaNum = oldvalue;
                    $(grid).jqxGrid ('updatebounddata', 'cells');
                    alert (data.errorList.join ('<br>'));
                  } else {
                    App.socket.emit ('shooter:get', {uid: rowdata.sh_uid}, function (data) {
                      data.shooter.sh_id = value;
                      App.socket.emit ('shooter:save', {shooter: data.shooter}, function (data) {
                        if (data.err) {
                          rowdata.uspsaNum = oldvalue;
                          $(grid).jqxGrid ('updatebounddata', 'cells');
                          alert (data.err);
                        }
                      });
                    });
                  }
                });
              }
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
          enablekeyboarddelete: false,
          editable: true,
          editmode: 'programmatic',
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

  $('#ec-uspsanum').jqxInput ({width: 75, height: 25, maxLength: 9});
  $('#ec-uspsapw').jqxInput ({width: 250, height: 25, maxLength: 20});

  $("[id^='ec-']").on ('focus', function () {
    $(this).addClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $("[id^='ec-']").on ('focusout', function () {
    $(this).removeClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $("[id^='ec-uspsa']").on ('blur, keyup', function () {
    App.setApplyButtonState ();
  });

  $('[controltype=checkbox]').jqxCheckBox ({
    disabled: true,
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
    App.socket.emit ('classifications:get:uspsa', function (data) {
      if (data.err)
        $('#getMsg').text (data.msg);
      else
        $('#getMsg').html (data.records + ' classification updates retrieved from USPSA.org<br />' +
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
        uspsanum: $('#ec-uspsanum').jqxInput ('val'),
        uspsapw: $('#ec-uspsapw').jqxInput ('val'),
        verify: $('#checkbox-verify').jqxCheckBox ('val'),
        addVerified: $('#checkbox-add').jqxCheckBox ('val'),
      }, function (data) {
        if (data.err)
          $('#updateMsg').html (data.err);
        else if (data.msg)
          $('#updateMsg').html (data.msg);
        else {
          var changes = data.changes;
          var uspsaNumChanged = _.filter (changes, 'uspsaNumChanged', true).length;
          var expired = _.filter (changes, 'expired', true).length;
          var classChanged = _.filter (changes, 'classChanged', true).length;
          var unclassified = _.filter (changes, 'unclassified', true).length;
          var notFound = _.filter (changes, 'notFound', true).length;
          var invalid = _.filter (changes, 'invalid', true).length;
          var table = [{count: classChanged, text: sprintf ('competitor%s updated', (classChanged !== 1) ? 's' : '')}];

          if (data.changes.length) {
            if (uspsaNumChanged)
              table.push ({count: uspsaNumChanged, text: sprintf ('USPSA number%s changed', (uspsaNumChanged !== 1) ? 's' : '')});
            if (expired)
              table.push ({count: expired, text: sprintf ('expired membership%s', (expired !== 1) ? 's' : '')});
            if (classChanged)
              table.push ({count: classChanged, text: sprintf ('class change%s', (classChanged !== 1) ? 's' : '')});
            if (unclassified)
              table.push ({count: unclassified, text: sprintf (' with no classification for division')});
            if (notFound)
              table.push ({count: notFound, text: sprintf ('USPSA number%s or division%s not found', (notFound !== 1) ? 's' : '', (notFound !== 1) ? 's' : '')});
            if (invalid)
              table.push ({count: invalid, text: sprintf ('invalid USPSA number%s', (invalid !== 1) ? 's' : '')});

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

          $('#button-email').jqxButton ({disabled: !expired});
        }

        $('[update-tr]').show ();
        App.socket.removeAllListeners ('status');
        App.inputEnable ();
    });
  });

  $('#checkbox-verify').on ('change', function (event) {
    $('[no-verify-fade]').css ({opacity: !event.args.checked ? 0.55 : 1.00});
    $('#checkbox-add').jqxCheckBox ('disabled', !event.args.checked);

    if (event.args.checked)
      $('#uspsaLogin').fadeIn ("fast");
    else
      $('#uspsaLogin').fadeOut ("fast");

    App.setApplyButtonState ();
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

    _.each (['Name', 'USPSA #', 'Division', 'Old', 'New', 'Notes'], function (f) {
      th = document.createElement ('th');
      th.innerHTML = f;
      tr.appendChild (th);
    });
    thead.appendChild (tr);

    _.each (rows, function (row) {
      tr = document.createElement ('tr');

      _.each (['name', 'uspsaNum', 'division', 'oldClass', 'newClass', 'note'], function (f) {
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

  $('#button-email').click (function () {
    var records = $(grid).jqxGrid ('getrows');
    var html = [];
    var text = [];
    var msg = 'The list of email addresses below have been automagically<br>' +
              'copied to the clipboard, suitable for pasting into an email<br>' +
              'client\'s TO or BCC field.<br><br>';

    _.each (records, function (record) {
      if (record.expired && record.email && record.email.length) {
        html.push (sprintf ('"%s (%s)" <%s>', record.name, record.uspsaNum, record.email).replace (/ /g, '&nbsp;').replace (/</g, '&lt;').replace (/>/g, '&gt;'));
        text.push (sprintf ('"%s (%s)" <%s>', record.name, record.uspsaNum, record.email));
      }
    });

    $('#emailWindow').jqxWindow ('setContent', msg.replace (/ /g, '&nbsp;') + html.join (',<br>'));
    $('#emailWindow').jqxWindow ('open');

    textToPasteBuffer (text.join (','));
  });

  $('#changesWindow').jqxWindow ({
    width: 'auto',
    height: 'auto',
    resizable: false,
    isModal: false,
    autoOpen: false,
    showCloseButton: true,
  });

  $('#emailWindow').jqxWindow ({
    width: 'auto',
    height: 'auto',
    resizable: false,
    isModal: false,
    autoOpen: false,
    showCloseButton: true,
  });

  //
  //
  //
  App.inputDisable = function () {
    $('[controltype=ddl]').jqxDropDownList ({disabled: true});
    $('[controltype=button]').jqxButton ({disabled: true});
    $('[controltype=checkbox]').jqxCheckBox ({disabled: true});
  };

  App.inputEnable = function () {
    $('[controltype=ddl]').jqxDropDownList ({disabled: false});
    $('[controltype=button]').jqxButton ({disabled: false});
    $('[controltype=checkbox]').jqxCheckBox ({disabled: false});
  };

  App.getAvailableUpdates = function () {
    App.socket.emit ('classifications:available:uspsa', function (data) {
      if (!data.err) {
        classificationsSource.localdata = data.records;
        classificationsAdapter.dataBind ();

        $('[no-classifications-fade]').css ({opacity: !data.records.length ? 0.55 : 1.00});
        $('[no-classifications-disable-ddl]').jqxDropDownList ('disabled', !data.records.length);
        $('[no-classifications-disable-checkbox]').jqxCheckBox ('disabled', !data.records.length);

        App.setApplyButtonState ();
        // $('[no-classifications-disable-button]').jqxButton ('disabled', !data.records.length);
      }
    });
  };

  App.setApplyButtonState = function () {
    var disableButton = false;

    if (!classificationsSource.localdata.length)
      disableButton = true;
    else if ($('#checkbox-verify').jqxCheckBox ('val')) {
      var uspsanumHasLen = $('#ec-uspsanum').jqxInput ('val').length ? true : false;
      var uspsapwHasLen = $('#ec-uspsapw').jqxInput ('val').length ? true : false;

      if ((uspsanumHasLen && !uspsapwHasLen) || (!uspsanumHasLen && uspsapwHasLen))
        disableButton = true;
    }

    $('#button-apply').jqxButton ({disabled: disableButton});
  };

  App.refreshMatchData = function () {
    App.socket.emit ('match:name', function (data) {
      $('#matchname').text (data.matchname);
    });

    App.socket.emit ('config:request', function (data) {
      if (!data.err) {
        $('#checkbox-verify').jqxCheckBox (data.config._download.verifyUSPSA ? 'check' : 'uncheck');
        $('#checkbox-add').jqxCheckBox (data.config._download.addVerifiedUSPSA ? 'check' : 'uncheck');
      }

      App.getAvailableUpdates ();
    });
  };

  App.socketConnect = function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();

    App.refreshMatchData ();
  };

  App.socketDisconnect = function () {
    $('[message]').text ('');
    $('#changesWindow').jqxWindow ('close');
    $('#emailWindow').jqxWindow ('close');
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  };

  App.reload = function () {
    window.location.href = 'http://' + window.location.host + '/manage/uspsa/classifications';
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_updated', App.refreshMatchData);
  App.socket.on ('reload', App.reload);
  App.socket.emit ('log:log', {msg: 'Manage->USPSA.org->Update Classifications'});
});
