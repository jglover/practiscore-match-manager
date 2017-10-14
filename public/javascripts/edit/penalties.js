/* global io */
/* global _:false */
/* jshint devel: true */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
    inlineediting: $('#pmmui').attr ('inlineediting') === "true" ? true : false,
  };

  $.jqx.theme = pmmui.theme;

  var App = {
    penalties: [],
    controls: {
      contextMenu: null,
      popupEdit: null,
    }
  };
  var grid = $('#penaltiesGrid');
  var editVars = {
    inlineEditing: pmmui.inlineediting, // 0 = Popup, 1 = Inline
    isEditing: false,
    editingRowindex: -1,
    editingDatafield: null,
    ddeRowindex: {},
    errorDisplayed: false,
    selectedRowindex: 0,
    selectedDatafield: 'name',
    contextMenuOpen: false,
    popupDataRecord: {},
  };

  var yesno = [
    { value: false, label: 'No',  display: '&nbsp;', },
    { value: true,  label: 'Yes', display: 'Y',      },
  ];

  var yesnoSource = {
    datatype: 'array',
    datafields: [
      { name: 'value',   type: 'boolean' },
      { name: 'label',   type: 'string'  },
      { name: 'display', type: 'string'  }
    ],
    localdata: yesno
  };

  var yesnoAdapter = new $.jqx.dataAdapter (yesnoSource, {
    autoBind: true
  });

  var penaltiesAdapter;
  var penaltiesSource = {
    localdata: [],
    datatype: 'array',
    datafields: [
      { name: 'name',     type: 'string',  },
      { name: 'value',    type: 'string',  },
      { name: 'enabled',  type: 'boolean', },
      { name: 'readonly', type: 'boolean', },
      { name: 'uuid',     type: 'string',  },

      { name: 'enabled_fmt',  value: 'enabled', values: {source: yesnoAdapter.records, value: 'value', name: 'label'}},
    ],
    addrow: function (rowid, newdata, position, commit) {
      var temp = [];
      temp.push ({
        name: newdata.name,
        value: newdata.value,
        enabled: true,
        readonly: false,
      });
      App.socket.emit ('penalties:add', {penalty: temp}, function (data) {
        if (data.err) {
          editVars.errorDisplayed = true;
          _.each (data.err, function (e) {
            $(grid).jqxGrid ('showvalidationpopup', rowid, e.field, e.errmsg);
          });
          commit (false);
        } else {
          commit (false);
          penaltiesSource.localdata = data.penalties;
          $(grid).jqxGrid ({source: penaltiesAdapter});
        }
      });
    },
    updaterow: function (rowid, newdata, commit) {
      var temp = [];
      temp.push (newdata);
      App.socket.emit ('penalties:modify', {penalty: temp}, function (data) {
        if (data.err) {
          editVars.errorDisplayed = true;
          _.each (data.err, function (e) {
            $(grid).jqxGrid ('showvalidationpopup', rowid, e.field, e.errmsg);
          });
          commit (false);
        } else {
          commit (false);
          penaltiesSource.localdata = data.penalties;
          $(grid).jqxGrid ({source: penaltiesAdapter});
        }
      });
    },
    deleterow: function (rowid, commit) {
      var temp = [];
      temp.push ($(grid).jqxGrid ('getrowdatabyid', rowid));
      App.socket.emit ('penalties:delete', {penalty: temp}, function (data) {
        if (data.err)
          commit (false);
        else {
          commit (false);
          penaltiesSource.localdata = data.penalties;
          $(grid).jqxGrid ({source: penaltiesAdapter});
        }
      });
    },
  };

  penaltiesAdapter = new $.jqx.dataAdapter (penaltiesSource);

  //
  //
  //
  var populatePopupFields = function () {
    $('#ec-name').jqxInput ('val', editVars.popupDataRecord.name);
    $('#ec-value').jqxInput ('val', editVars.popupDataRecord.value);
    $('#ec-enabled').val (editVars.popupDataRecord.enabled);
  };

  var openPopupEditorAdd = function () {
    var popupEdit = App.popupEditInit ();

    editVars.popupRowId = null;
    editVars.popupMode = 'add';
    editVars.popupDataRecord = {
      name: '',
      value: '',
      enabled: true,
      enabled_fmt: _.result (_.find (yesno, 'value', true), 'label'),
    };

    populatePopupFields ();

    $(popupEdit).jqxWindow ('title', 'Add Class');
    $(popupEdit).jqxWindow ('open');
  };

  var openPopupEditorEdit = function (rowIndex) {
    var popupEdit = App.popupEditInit ();

    editVars.popupRowId = $(grid).jqxGrid ('getrowid', rowIndex);
    editVars.popupMode = 'edit';
    editVars.popupDataRecord = $(grid).jqxGrid ('getrowdatabyid', editVars.popupRowId);

    populatePopupFields ();

    $(popupEdit).jqxWindow ('title', 'Editing Class #' + (rowIndex + 1));
    $(popupEdit).jqxWindow ('open');
  };

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
    var cols = $(grid).jqxGrid ('columns');
    $(grid).jqxGrid ('localizestrings', {filterselectstring: ' '});
    $(grid).jqxGrid ({width: _.sum (cols.records, 'width')});
    App.gridResizeHeight ();
  });

  var dropdownCreateEditor = function (rowIndex, cellValue, editor, options) {
    editor.jqxDropDownList (_.merge ({
      autoOpen: false,
      autoDropDownHeight: true,
      enableBrowserBoundsDetection: true,
      displayMember: 'label',
      valueMember: 'value',
    },
    options || {}));
  };

  var dropdownInitEditor = function (rowIndex, cellValue, editor) {
    var datafield = this.datafield;
    editVars.ddeRowindex [datafield] = rowIndex;

    editor.off ('select');
    editor.on ('select', function (event) {
      if (event.args && !_.isUndefined (editVars.ddeRowindex [datafield]) && (editVars.ddeRowindex [datafield] !== -1))
        window.setTimeout (function () {
          $(grid).jqxGrid ('endcelledit', rowIndex, datafield, false);
        }, 10);
    });

    editor.off ('close');
    editor.on ('close', function () {
      if (!_.isUndefined (editVars.ddeRowindex [datafield]) && (editVars.ddeRowindex [datafield] !== -1))
        window.setTimeout (function () {
          $(grid).jqxGrid ('endcelledit', rowIndex, datafield, false);
        }, 10);
    });

    editor.jqxDropDownList ('open');
  };

  var gridColumns = [
      {
        text:            'Penalty Name',
        datafield:       'name',
        width:           300,
        cellsalign:      'left',
        validation:      function (cell, value) {
                           if (!value.length)
                             return ({result: false, message: 'Penalty name is required'});
                           if (value.search (/[^A-Za-z0-9 ]/) !== -1)
                             return ({result: false, message: 'Penalty name may only contain the characters A-Z, a-z, 0-9, and space'});
                           return true;
                         },
      }, {
        text:            'Value',
        datafield:       'value',
        width:           130,
        cellsalign:      'left',
        validation:      function (cell, value) {
                           if (!value.length)
                             return ({result: false, message: 'Value is required'});
                           if (value.search (/[^0-9]/) !== -1)
                             return ({result: false, message: 'Value may only contain the numbers 0-9'});
                           return true;
                         },
      }, {
        text:            'Enabled',
        datafield:       'enabled',
        displayfield:    'enabled_fmt',
        width:           70,
        cellsalign:      'center',
        columntype:      'dropdownlist',
        createeditor:    function (rowIndex, cellValue, editor) {
                           dropdownCreateEditor (rowIndex, cellValue, editor, {
                             source: yesnoAdapter,
                           });
                         },
        initeditor:      dropdownInitEditor,
      },
    ];

  $(grid).jqxGrid ({
    width: 600,
    height: 100,
    autoheight: true,
    source: penaltiesAdapter,
    sortable: false,
    filterable: false,
    showfilterrow: false,
    columnsreorder: false,
    columnsresize: true,
    pageable: false,
    scrollmode: 'logical',
    altrows: true,
    editable: true,
    selectionmode: 'singlerow',
    editmode: 'dblclick',
    showstatusbar: true,
    columnsheight: 26, // Changed from 26 to 31 in 4.1.2
    pagerheight: 29,   // Changed from 29 to 35 in 4.1.2
    rowsheight: 25,    // Changed from 25 to 28 in 4.1.2
    columns: gridColumns,
    rendered: function () {
      if (editVars.contextMenuOpen) {
        $('body').css ('cursor', 'default');
        return;
      }

      var gridCells = $(grid).find ('.jqx-grid-cell');
      var gridLocation = $(grid).offset ();
      var disabled = $(grid).jqxGrid ('getrows').length <= 1;
      var dragRow;

      gridCells.jqxDragDrop ({
        restricter: {
          left: gridLocation.left,
          top: gridLocation.top + $(grid).jqxGrid ('columnsheight') + 1,
          width: gridLocation.left,
          height: gridLocation.top + $(grid).jqxGrid ('columnsheight') + 1 + (($(grid).jqxGrid ('getrows').length - 1) * 25),
        },
        disabled: disabled,
        cursor: disabled ? 'arrow' : 'move',
        appendTo: 'body',
        dragZIndex: 99999,
        dropAction: 'none',
        initFeedback: function (feedback) {
          feedback.height (25);
          feedback.width ($(grid).width ());
          feedback.css ('background', '#aaa');
        }
      });

      gridCells.off ('dragStart');
      gridCells.on ('dragStart', function (event) {
        var position = $.jqx.position (event.args);
        var cell = $(grid).jqxGrid ('getcellatposition', position.left, position.top);
        var feedback = $(this).jqxDragDrop ('feedback');
        var feedbackContent = $(this).parent ().clone ();
        var feedbackHTML = '';

        dragRow = cell.row;

        $.each (feedbackContent.children (), function (index) {
          feedbackHTML += ('<td style="width:' + gridColumns [index].width + 'px; text-align:' + gridColumns [index].cellsalign + ';">' + $(this).text () + '</td>');
        });

        feedback.html ('<table><tr>' + feedbackHTML + '</tr></table>');
      });

      gridCells.off ('dragEnd');
      gridCells.on ('dragEnd', function (event) {
        var position = $.jqx.position (event.args);
        var cell = grid.jqxGrid ('getcellatposition', position.left, position.top);
        var dropRow = parseInt (cell.row);
        var dragRowData = $(grid).jqxGrid ('getrowdata', dragRow);
        var dropRowData = $(grid).jqxGrid ('getrowdata', dropRow);

        if (!_.isNaN (dropRow)) {
          App.socket.emit ('penalties:move', {from: dragRowData, to: dropRowData}, function (data) {
            if (data.changed) {
              penaltiesSource.localdata = data.penalties;
              $(grid).jqxGrid ({source: penaltiesAdapter});
            }
          });
        }
      });
    },
    renderstatusbar: function (statusbar) {
      var container      = $('<div style="overflow: hidden; position: relative; margin: 0px; padding-top: 3px;"></div>');
      var addButton      = $('<div style="float: left; margin-left: 3px;"><img style="position: relative; margin-top: 2px;" src="/javascripts/libs/jqwidgets/images/add.png"/><span style="margin-left: 4px; position: relative; top: -3px;">Add</span></div>');
      var editModeButton = $('<div style="float: left; margin-left: 5px;"><span style="margin-left: 4px; position: relative; top: 2px;">Edit: <span id="modeButtonText">' + (editVars.inlineEditing ? 'Inline' : 'Popup') + '</span></span></div>');

      container.append (addButton);
      container.append (editModeButton);
      statusbar.append (container);

      addButton.jqxButton ({theme: 'default', width: 60, height: 20});
      editModeButton.jqxButton ({theme: 'default', width: 90, height: 20});

      addButton.click (function () {
        openPopupEditorAdd ();
      });
      editModeButton.click (function () {
        editVars.inlineEditing = !editVars.inlineEditing;
        $('#modeButtonText').text (editVars.inlineEditing ? 'Inline' : 'Popup');
        $(grid).jqxGrid ({editable: editVars.inlineEditing});
      });
    },
  });

  $(grid).on ('rowdoubleclick', function (event) {
    if ($(grid).jqxGrid ('editable') === false)
      openPopupEditorEdit (event.args.rowindex);
  });

  $(grid).on ('cellselect', function (event) {
    if (event.args) {
      var rowindex = event.args.rowindex;
      var datafield = event.args.datafield;

      if (editVars.isEditing && ((rowindex !== editVars.selectedRowindex) || (datafield !== editVars.selectedDatafield)))
        $(grid).jqxGrid ('endcelledit', editVars.editingRowindex, editVars.editingDatafield, false);

      editVars.selectedRowindex = rowindex;
      editVars.selectedDatafield = datafield;
    }

    if (editVars.errorDisplayed) {
      $(grid).jqxGrid ('hidevalidationpopups');
      editVars.errorDisplayed = false;
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
      editVars.editingRowindex = -1;
      editVars.editingDatafield = '';
      editVars.ddeRowindex [event.args.datafield] = -1;
    }
  });

  $(grid).on ('contextmenu', function () {
    return false;
  });

  $(grid).on ('cellclick', function (event) {
    if (event.args.rightclick && !$(grid).find ('.jqx-grid-validation').length) {
      var rowindex = event.args.rowindex;
      var readonly = $(grid).jqxGrid ('getrowdatabyid', rowindex).readonly;
      editVars.contextMenuOpen = true;
      $(grid).jqxGrid ('render');
      $(grid).jqxGrid ('selectrow', rowindex);
      $('#contextEditClassNum').text (rowindex + 1);
      $('#contextAddClassNum').text ($(grid).jqxGrid ('getdatainformation').rowscount + 1);
      $('#contextDeleteClassNum').text (rowindex + 1);
      var scrollTop = $(window).scrollTop ();
      var scrollLeft = $(window).scrollLeft ();
      var contextMenu = App.contextMenuInit ();
      $(contextMenu).jqxMenu ('open', parseInt (event.args.originalEvent.clientX) + 5 + scrollLeft, parseInt (event.args.originalEvent.clientY) + 5 + scrollTop);
      $(contextMenu).jqxMenu ('disable', 'contextEditClass', readonly);
      $(contextMenu).jqxMenu ('disable', 'contextDeleteClass', readonly);
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
      width: 200,
      height: null,
      autoOpenPopup: false,
      mode: 'popup'
    });

    $(contextMenu).on ('closed', function () {
      editVars.contextMenuOpen = false;
      $(grid).jqxGrid ('render');
    });

    $(contextMenu).on ('itemclick', function (event) {
      var selectedrowindex = $(grid).jqxGrid ('getselectedrowindex');
      var rowid = $(grid).jqxGrid ('getrowid', selectedrowindex);

      switch (event.args.id) {
        case 'contextEditClass' :
          openPopupEditorEdit (selectedrowindex);
          break;

        case 'contextAddClass' :
          openPopupEditorAdd ();
          break;

        case 'contextDeleteClass' :
          $(grid).jqxGrid ('deleterow', rowid);
          break;

        case 'contextEditModeInline' :
          editVars.inlineEditing = true;
          $('#modeButtonText').text ('Inline');
          $(grid).jqxGrid ({editable: editVars.inlineEditing});
          break;
        case 'contextEditModePopup' :
          editVars.inlineEditing = false;
          $('#modeButtonText').text ('Popup');
          $(grid).jqxGrid ({editable: editVars.inlineEditing});
          break;
        default :
          break;
      }
    });

    return (App.controls.contextMenu = contextMenu);
  };

  //
  //  Popup editing window is deferred until first time used. Then we create
  //  the pop-up window and the fields in the window.
  //
  App.popupEditInit = function () {
    if (App.controls.popupEdit)
      return App.controls.popupEdit;

    var popupEdit = $('#popupEdit').jqxWindow ({
      width: 622,
      height: 168,
      maxWidth: 860,
      resizable: false,
      isModal: true,
      autoOpen: false,
      modalOpacity: 0.50,
      showCloseButton: false,
      cancelButton: $('#ec-cancelButton'),
      initContent: function () {
        $('#ec-resetButton').jqxButton ({width: 65});
        $('#ec-cancelButton').jqxButton ({width: 65});
        $('#ec-saveButton').jqxButton ({width: 65});
      },
      title: editVars.popupMode === 'edit' ? 'Edit Stage' : 'Add Stage',
    });

    $('#ec-name').jqxInput ({width: 300, height: 25, maxLength: 50});
    $('#ec-value').jqxInput ({width: 100, height: 25, maxLength: 30});
    $('#ec-enabled').jqxDropDownList ({width: 50, autoDropDownHeight: true, source: yesnoAdapter});

    $(popupEdit).on ('open', function () {
      $('#ec-name').jqxInput ('focus');
    });

    $(popupEdit).on ('close', function () {
      $(popupEdit).jqxValidator ('hide');
    });

    $("[id^='ec-']").on ('focus', function () {
      $(this).addClass ('jqx-menu-item-top-hover-' + pmmui.theme);
    });
    $("[id^='ec-']").on ('focusout', function () {
      $(this).removeClass ('jqx-menu-item-top-hover-' + pmmui.theme);
    });

    $('#ec-resetButton').on ('click', function () {
      $(popupEdit).jqxValidator ('hide');
      populatePopupFields ();
    });

    $('#ec-cancelButton').on ('click', function () {
      $(popupEdit).jqxValidator ('hide');
    });

    $('#ec-saveButton').on ('click', function () {
      $(popupEdit).jqxValidator ('validate');
    });

    $(popupEdit).jqxValidator ({
      focus: true,
      closeOnClick: false,
      onSuccess: function () {
        var dataRecord = editVars.popupDataRecord;

        $(popupEdit).jqxWindow ('close');

        dataRecord.name        = $('#ec-name').val ();
        dataRecord.value       = $('#ec-value').val ();
        dataRecord.enabled     = $('#ec-enabled').jqxDropDownList ('getSelectedItem').value;
        dataRecord.enabled_fmt = $('#ec-enabled').jqxDropDownList ('getSelectedItem').label;

        if (editVars.popupMode === 'edit')
          $(grid).jqxGrid ('updaterow', editVars.popupRowId, dataRecord);
        else if (editVars.popupMode === 'add') {
          if ($(grid).jqxGrid ('addrow', null, dataRecord) === true) {
            (function timerLoop () {
              //
              //  This lovely bit of hackery because jqxGrid hasn't necessarily
              //  finished updating the grid at this point. We want to make sure
              //  the new row is visible, but it has to in the grid before the
              //  call will work.  So we check every 10ms if the number of rows
              //  has changed, and once it (finally) has, we ensure it's visible.
              //
              setTimeout (function (originalLastIndex) {
                if (originalLastIndex !== $(grid).jqxGrid ('getrows').length)
                  $(grid).jqxGrid ('ensurerowvisible', originalLastIndex);
                else
                  timerLoop ();
              }, 100, $(grid).jqxGrid ('getrows').length);
            })();
          }
        }

        editVars.popupRowId = null;
      },
      rules: [
        {
          input:    '#ec-name',
          position: 'bottom',
          message:  'Penalty name is required',
          action:   'keyup, blur',
          rule:     'required'
        }, {
          input:    '#ec-name',
          position: 'bottom',
          message:  'Penalty name may only contain the characters A-Z, a-z, 0-9, and space',
          action:   'keyup, blur',
          rule:     function (input) {
                      return (input.val ().search (/[^A-Za-z0-9 ]/) === -1) ? true : false;
                    }
        }, {
          input:    '#ec-value',
          position: 'bottom',
          message:  'Value is required',
          action:   'keyup, blur',
          rule:     'required'
        }, {
          input:    '#ec-value',
          position: 'bottom',
          message:  'Value may only contain the characters A-Z and 0-9',
          action:   'keyup, blur',
          rule:     function (input) {
                      return (input.val ().search (/[^A-Z0-9]/) === -1) ? true : false;
                    }
        },
      ]
    });

    return (App.controls.popupEdit = popupEdit);
  };

  //
  //
  //
  App.refreshMatchData = function () {
    App.socket.emit ('penalties:get', function (data) {
      penaltiesSource.localdata = [];
      _.each (data.penalties, function (penalty) {
        penaltiesSource.localdata.push ({
          name:     penalty.name,
          value:    penalty.value,
          enabled:  penalty.enabled,
          readonly: penalty.readonly,
          uuid:     penalty.uuid,
        });
      });
      $(grid).jqxGrid ({source: penaltiesAdapter});

      App.socket.emit ('match:name', function (data) {
        $('#matchname').text (data.matchname);
      });
    });
  };

  //
  //
  //
  App.socketConnect = function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();

    App.refreshMatchData ();
  };

  App.socketDisconnect = function () {
    $(grid).jqxGrid ('clear');
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  };

  App.reload = function () {
    window.location.href = 'http://' + window.location.host + '/edit/penalties';
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('penalties_updated', App.refreshMatchData);
  App.socket.on ('match_updated', App.refreshMatchData);
  App.socket.on ('reload', App.reload);
  App.socket.emit ('log:log', {'msg': 'View/Edit->Penalties'});

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
