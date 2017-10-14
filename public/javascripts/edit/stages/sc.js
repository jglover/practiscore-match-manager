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
    matchData: {
      m: {
        match_stages: [],
      },
    },
    controls: {
      contextMenu: null,
      popupEdit: null,
    }
  };
  var grid = $('#stagesGrid');
  var editVars = {
    inlineEditing: pmmui.inlineediting, // 0 = Popup, 1 = Inline
    filtersEnabled: false, // 0 = Disabled, 1 = Enabled
    rowIndex: {},
    isEditing: false,
    editingRowindex: -1,
    editingDatafield: null,
    ddeRowindex: {},
    errorDisplayed: false,
    selectedRowindex: 0,
    selectedDatafield: 'stage_number',
    popupMode: '',
    popupRowIndex: -1,
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

  var classifiercode = [
    { value: '',       label: '(none)',                name: '',              display: '&nbsp;', strings: 0, classifier: false },
    { value: 'SC-101', label: 'SC-101 (5 To Go)',      name: '5 To Go',       display: 'SC-101', strings: 5, classifier: true  },
    { value: 'SC-102', label: 'SC-102 (Showdown)',     name: 'Showdown',      display: 'SC-102', strings: 5, classifier: true  },
    { value: 'SC-103', label: 'SC-103 (Smoke & Hope)', name: 'Smoke & Hope',  display: 'SC-103', strings: 5, classifier: true  },
    { value: 'SC-104', label: 'SC-104 (Outer Limits)', name: 'Outer Limits',  display: 'SC-104', strings: 4, classifier: true  },
    { value: 'SC-105', label: 'SC-105 (Accelerator)',  name: 'Accelerator',   display: 'SC-105', strings: 5, classifier: true  },
    { value: 'SC-106', label: 'SC-106 (The Pendulum)', name: 'The Pendulum',  display: 'SC-106', strings: 5, classifier: true  },
    { value: 'SC-107', label: 'SC-107 (Speed Option)', name: 'Speed Option',  display: 'SC-107', strings: 5, classifier: true  },
    { value: 'SC-108', label: 'SC-108 (Roundabout)',   name: 'Roundabout',    display: 'SC-108', strings: 5, classifier: true  },
  ];

  var classifiercodeSource = {
    datatype: 'array',
    datafields: [
      { name: 'value',      type: 'string'  },
      { name: 'label',      type: 'string'  },
      { name: 'display',    type: 'string'  },
      { name: 'strings',    type: 'number'  },
      { name: 'classifier', type: 'boolean' },
    ],
    localdata: classifiercode
  };

  var classifiercodeAdapter = new $.jqx.dataAdapter (classifiercodeSource, {
    autoBind: true
  });

  var stagesSource = {
    localdata: [],
    datatype: 'array',
    datafields: [
      { name: 'stage_number',         type: 'number',  },
      { name: 'stage_name',           type: 'string',  },
      { name: 'stage_strings',        type: 'number',  },
      { name: 'stage_classifier',     type: 'boolean', },
      { name: 'stage_classifiercode', type: 'string',  },
      { name: 'stage_deleted',        type: 'boolean', },

      { name: 'stage_classifier_fmt',     value: 'stage_classifier',     values: {source: yesnoAdapter.records, value: 'value', name: 'label'}},
      { name: 'stage_classifiercode_fmt', value: 'stage_classifiercode', values: {source: classifiercodeAdapter.records, value: 'value', name: 'label'}},
      { name: 'stage_deleted_fmt',        value: 'stage_deleted',        values: {source: yesnoAdapter.records, value: 'value', name: 'label'}},
    ],
    addrow: function (rowid, newdata, position, commit) {
      App.socket.emit ('stage:add', {stage: newdata}, function (data) {
        if (data.err) {
          editVars.errorDisplayed = true;
          _.each (data.err, function (e) {
            $(grid).jqxGrid ('showvalidationpopup', rowid, e.field, e.errmsg);
          });
          commit (false);
        } else {
          App.matchData.m.match_stages.push (data.stage);
          commit (true);
        }
      });
    },
    updaterow: function (rowid, newdata, commit) {
      var stage = App.matchData.m.match_stages [rowid];

      App.socket.emit ('stage:save', {stage: _.merge (_.clone (stage, true), newdata)}, function (data) {
        if (data.err) {
          editVars.errorDisplayed = true;
          _.each (data.err, function (e) {
            $(grid).jqxGrid ('showvalidationpopup', rowid, e.field, e.errmsg);
          });
          commit (false);
        } else if (data.changed) {
          App.matchData.m.match_stages [rowid] = data.stage;
          commit (true);
          $(grid).jqxGrid ('updatebounddata', 'cells');
        }
      });
    },
  };

  var stagesAdapter = new $.jqx.dataAdapter (stagesSource, {
    beforeLoadComplete: function (records) {
      _.each (records, function (record) {
        if (_.isUndefined (record.stage_deleted))
          record.stage_deleted = false;
        if (_.isUndefined (record.stage_classifier))
          record.stage_classifier = false;
        if (!record.stage_classifier)
          record.stage_classifiercode = '';
      });

      return records;
    },
  });

  //
  //
  //
  var fillPopupFields = function (dataRecord) {
    $('#ec-sh-name').jqxInput ('val', dataRecord.stage_name);
    $('#ec-sh-strings').jqxNumberInput ('val', dataRecord.stage_strings);
    $('#ec-sh-classifier').val (dataRecord.stage_classifier);
    $('#ec-sh-classifiercode').val (dataRecord.stage_classifiercode);
    $('#ec-sh-deleted').val (dataRecord.stage_deleted);

    return dataRecord;
  };

  var populatePopupFields = function () {
    fillPopupFields (editVars.popupDataRecord);
  };

  var openPopupEditorAdd = function () {
    var popupEdit = App.popupEditInit ();

    editVars.popupRowIndex = -1;
    editVars.popupMode = 'add';

    App.socket.emit ('stage:new', function (data) {
      var stage = data.stage;

      editVars.popupDataRecord = stage;

      stage.stage_classifier_fmt =     _.result (_.find (yesno, 'value', stage.stage_classifier), 'label');
      stage.stage_classifiercode_fmt = _.result (_.find (classifiercode, 'value', stage.stage_classifiercode), 'label');
      stage.stage_deleted_fmt =        _.result (_.find (yesno, 'value', stage.stage_deleted), 'label');

      populatePopupFields ();

      $(popupEdit).jqxWindow ('title', 'Adding Stage #' + stage.stage_number);
      $(popupEdit).jqxWindow ('open');
    });
  };

  var openPopupEditorEdit = function (rowIndex) {
    var popupEdit = App.popupEditInit ();

    editVars.popupRowIndex = rowIndex;
    editVars.popupMode = 'edit';
    editVars.popupDataRecord = App.matchData.m.match_stages [rowIndex];

    populatePopupFields ();

    $(popupEdit).jqxWindow ('title', 'Editing Stage #' + (rowIndex + 1));
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

  var cellsrendererFunc = function (row, columnField, value, defaultHTML, columnProperties, stage, remap) {
    var html1;
    var html2;

    if (!_.isUndefined (remap))
      value = _.result (_.find (remap, 'label', value), 'display');

    html1 = '<div class="stage';
    html2 = '" style="text-align: ' + columnProperties.cellsalign + ';">' + (value || '&nbsp;') + '</div>';

    if (stage && stage.stage_deleted) {
      html1  = '<div class="stageDel">' + html1;
      html2 += '</div>';
    }

    return html1 + html2;
  };

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

  $(grid).jqxGrid ({
    width: 600,
    height: 100,
    autoheight: true,
    source: stagesAdapter,
    sortable: true,
    showsortmenuitems: false,
    filterable: editVars.filtersEnabled,
    autoshowfiltericon: true,
    showfilterrow: editVars.filtersEnabled,
    columnsreorder: true,
    columnsresize: true,
    pageable: true,
    scrollmode: 'logical',
    altrows: true,
    enablekeyboarddelete: false,
    editable: editVars.inlineEditing,
    selectionmode: 'singlecell',
    editmode: 'dblclick',
    showstatusbar: true,
    columnsheight: 26, // Changed from 26 to 31 in 4.1.2
    pagerheight: 29,   // Changed from 29 to 35 in 4.1.2
    rowsheight: 25,    // Changed from 25 to 28 in 4.1.2
    columns: [
      {
        text:            '#',
        datafield:       'stage_number',
        width:           35,
        cellsalign:      'right',
        cellsrenderer:   cellsrendererFunc,
        editable:        false,
        filtercondition: 'equal',
      }, {
        text:            'Name',
        datafield:       'stage_name',
        width:           200,
        cellsrenderer:   cellsrendererFunc,
      }, {
        text:            'Strings',
        datafield:       'stage_strings',
        width:           60,
        cellsalign:      'right',
        cellsrenderer:   cellsrendererFunc,
        filtercondition: 'equal',
        validation:      function (cell, value) {
                           value = value.trim ();
                           if (value.length === 0)
                             return ({result: false, message: 'String cannot be empty'});
                           if (value.search (/[^0-9]/) !== -1)
                             return ({result: false, message: 'String contains non-numeric characters'});
                           if ((value.length > 2) || (parseInt (value) < 1))
                             return ({result: false, message: 'String must be 1..99'});
                           return true;
                         },
      }, {
        text:            'Classifier',
        datafield:       'stage_classifier',
        displayfield:    'stage_classifier_fmt',
        width:           70,
        cellsalign:      'center',
        cellsrenderer:   function (row, columnField, value, defaultHTML, columnProperties, stage) {
                           return cellsrendererFunc (row, columnField, value, defaultHTML, columnProperties, stage, yesno);
                         },
        columntype:      'dropdownlist',
        filtertype:      'checkedlist',
        filteritems:     _.pluck (yesno, 'label'),
        createeditor:    function (rowIndex, cellValue, editor) {
                           dropdownCreateEditor (rowIndex, cellValue, editor, {
                             source: yesnoAdapter,
                           });
                         },
        initeditor:      dropdownInitEditor,
      }, {
        text:            'Classifier Code',
        datafield:       'stage_classifiercode',
        displayfield:    'stage_classifiercode_fmt',
        width:           135,
        cellsalign:      'center',
        cellsrenderer:   function (row, columnField, value, defaultHTML, columnProperties, stage) {
                           return cellsrendererFunc (row, columnField, value, defaultHTML, columnProperties, stage, classifiercode);
                         },
        columntype:      'dropdownlist',
        filtertype:      'checkedlist',
        filteritems:     _.pluck (classifiercode, 'label'),
        createeditor:    function (rowIndex, cellValue, editor) {
                           dropdownCreateEditor (rowIndex, cellValue, editor, {
                             source: classifiercodeAdapter,
                             dropDownWidth: 190,
                           });
                         },
        initeditor:      dropdownInitEditor,
      }, {
        text:            'Deleted',
        datafield:       'stage_deleted',
        displayfield:    'stage_deleted_fmt',
        width:           70,
        cellsalign:      'center',
        cellsrenderer:   function (row, columnField, value, defaultHTML, columnProperties, stage) {
                           return cellsrendererFunc (row, columnField, value, defaultHTML, columnProperties, stage, yesno);
                         },
        columntype:      'dropdownlist',
        filtertype:      'checkedlist',
        filteritems:     _.pluck (yesno, 'label'),
        createeditor:    function (rowIndex, cellValue, editor) {
                           dropdownCreateEditor (rowIndex, cellValue, editor, {
                             source: yesnoAdapter,
                           });
                         },
        initeditor:      dropdownInitEditor,
      },
    ],
    renderstatusbar: function (statusbar) {
      var container          = $('<div style="overflow: hidden; position: relative; margin: 0px; padding-top: 3px;"></div>');
      var addButton          = $('<div style="float: left; margin-left: 3px;"><img style="position: relative; margin-top: 2px;" src="/javascripts/libs/jqwidgets/images/add.png"/><span style="margin-left: 4px; position: relative; top: -3px;">Add</span></div>');
      var editModeButton     = $('<div style="float: left; margin-left: 5px;"><span style="margin-left: 4px; position: relative; top: 2px;">Edit: <span id="modeButtonText">' + (editVars.inlineEditing ? 'Inline' : 'Popup') + '</span></span></div>');
      var clearFiltersButton = $('<div style="float: left; margin-left: 5px;"><span style="margin-left: 4px; position: relative; top: 2px;">Clear Filters</span></div>');
      var resetSortButton    = $('<div style="float: left; margin-left: 5px;"><span style="margin-left: 4px; position: relative; top: 2px;">Reset Sort</span></div>');

      container.append (addButton);
      container.append (editModeButton);
      container.append (clearFiltersButton);
      container.append (resetSortButton);
      statusbar.append (container);

      addButton.jqxButton ({theme: 'default', width: 60, height: 20});
      editModeButton.jqxButton ({theme: 'default', width: 90, height: 20});
      clearFiltersButton.jqxButton ({theme: 'default', width: 90, height: 20, disabled: !editVars.filtersEnabled});
      resetSortButton.jqxButton ({theme: 'default', width: 90, height: 20});

      addButton.click (function () {
        openPopupEditorAdd ();
      });
      editModeButton.click (function () {
        editVars.inlineEditing = !editVars.inlineEditing;
        $('#modeButtonText').text (editVars.inlineEditing ? 'Inline' : 'Popup');
        $(grid).jqxGrid ({editable: editVars.inlineEditing});
      });
      clearFiltersButton.click (function () {
        $(grid).jqxGrid ('clearfilters', true);
      });
      resetSortButton.click (function () {
        $(grid).jqxGrid ('removesort');
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

  $(grid).on ('cellvaluechanged', function (event) {
    if (event.args.datafield === 'stage_classifiercode') {
      if (event.args.newvalue.value !== event.args.oldvalue) {
        var classifier = _.find (classifiercode, 'value', event.args.newvalue.value);

        if (classifier && classifier.strings) {
          $(grid).jqxGrid ('setcellvalue', event.args.rowindex, 'stage_name', classifier.name);
          $(grid).jqxGrid ('setcellvalue', event.args.rowindex, 'stage_strings', classifier.strings);
          $(grid).jqxGrid ('setcellvalue', event.args.rowindex, 'stage_classifier', classifier.classifier);
          $(grid).jqxValidator ('hide');
        }
      }
    }
  });

  $(grid).on ('contextmenu', function () {
    return false;
  });

  $(grid).on ('cellclick', function (event) {
    if (event.args.rightclick && !$(grid).find ('.jqx-grid-validation').length) {
      var rowindex = event.args.rowindex;
      var row = $(grid).jqxGrid ('getrowdata', rowindex);
      $(grid).jqxGrid ('selectionmode', 'singlerow');
      $(grid).jqxGrid ('selectrow', rowindex);
      $('#contextEditStageNum').text (rowindex + 1);
      $('#contextAddStageNum').text ($(grid).jqxGrid ('getdatainformation').rowscount + 1);
      $('#contextDeleteStageNum').text (rowindex + 1);
      $('#contextUndeleteStageNum').text (rowindex + 1);
      $('#contextDeleteStage').toggle (!row.stage_deleted);
      $('#contextUndeleteStage').toggle (row.stage_deleted);
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
      width: 200,
      height: null,
      autoOpenPopup: false,
      mode: 'popup'
    });

    $(contextMenu).on ('closed', function () {
      $(grid).jqxGrid ('selectionmode', 'singlecell');
    });

    $(contextMenu).on ('itemclick', function (event) {
      var selectedrowindex = $(grid).jqxGrid ('getselectedrowindex');
      var rowid = $(grid).jqxGrid ('getrowid', selectedrowindex);
      var row = $(grid).jqxGrid ('getrowdata', selectedrowindex);

      switch (event.args.id) {
        case 'contextEditStage' :
          openPopupEditorEdit (selectedrowindex);
          break;

        case 'contextAddStage' :
          openPopupEditorAdd ();
          break;

        case 'contextDeleteStage' :
          row.stage_deleted = true;
          $(grid).jqxGrid ('updaterow', rowid, row);
          break;
        case 'contextUndeleteStage' :
          row.stage_deleted = false;
          $(grid).jqxGrid ('updaterow', rowid, row);
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
      height: 141,
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

    $('#ec-sh-name').jqxInput ({width: 200, height: 25, maxLength: 30});
    $('#ec-sh-strings').jqxNumberInput ({width: 50, decimalDigits: 0, min: 1, max: 99, inputMode: 'simple', spinButtons: true});
    $('#ec-sh-classifier').jqxDropDownList ({width: 50, autoDropDownHeight: true, source: yesnoAdapter});
    $('#ec-sh-classifiercode').jqxDropDownList ({width: 190, autoDropDownHeight: true, source: classifiercodeAdapter});

    $(popupEdit).on ('open', function () {
      $('#ec-sh-name').jqxInput ('focus');
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

    $('#ec-sh-classifiercode').on ('select', function (event) {
      var classifier = _.find (classifiercode, 'value', event.args.item.value);

      if (classifier && classifier.strings) {
        $('#ec-sh-name').jqxInput ('val', classifier.name);
        $('#ec-sh-strings').jqxNumberInput ('val', classifier.strings);
        $('#ec-sh-classifier').jqxDropDownList ('selectIndex', _.findIndex (yesno, 'value', classifier.classifier));
        $(popupEdit).jqxValidator ('hide');
      }
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

        dataRecord.stage_name           = $('#ec-sh-name').val ();
        dataRecord.stage_strings        = parseInt ($('#ec-sh-strings').val ());
        dataRecord.stage_classifier     = $('#ec-sh-classifier').jqxDropDownList ('getSelectedItem').value;
        dataRecord.stage_classifiercode = $('#ec-sh-classifiercode').jqxDropDownList ('getSelectedItem').value;

        dataRecord.stage_classifier_fmt     = $('#ec-sh-classifier').jqxDropDownList ('getSelectedItem').label;
        dataRecord.stage_classifiercode_fmt = $('#ec-sh-classifiercode').jqxDropDownList ('getSelectedItem').label;

        if (editVars.popupMode === 'edit')
          $(grid).jqxGrid ('updaterow', $(grid).jqxGrid ('getrowid', editVars.popupRowIndex), dataRecord);
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
        else
          alert ('WTF?!? editVars.popupMode isn\'t edit or add!');

        editVars.popupRowIndex = -1;
      },
      rules: [
        {
          input:    '#ec-sh-name',
          position: 'bottom',
          message:  'Stage name is required',
          action:   'keyup, blur',
          rule:     'required'
        },
        /*
        {
          input:    '#ec-sh-name',
          position: 'bottom',
          message:  'Stage name may only contain the characters A-Z, a-z, 0-9, period, dash, comma, and space',
          action:   'keyup, blur',
          rule:     function (input) {
                      return (input.val ().search (/[^A-Za-z0-9\., -]/) === -1) ? true : false;
                    }
        },
        */
      ]
    });

    return (App.controls.popupEdit = popupEdit);
  };

  //
  //
  //
  App.refreshMatchData = function () {
    App.socket.emit ('match:get', {options: {match: true}}, function (data) {
      App.matchData = data.matchData;
      $('#matchname').text (App.matchData.m.match_name);

      stagesSource.localdata = App.matchData.m.match_stages;
      $(grid).jqxGrid ({source: stagesAdapter});
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
    $('#popupEdit').jqxValidator ('hide');
    $(grid).jqxGrid ('clear');
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  };

  App.reload = function () {
    window.location.href = 'http://' + window.location.host + '/edit/stages';
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_updated', App.refreshMatchData);
  App.socket.on ('reload', App.reload);
  App.socket.emit ('log:log', {'msg': 'View/Edit->Stages (SC)'});
});
