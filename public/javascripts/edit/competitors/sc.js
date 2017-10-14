/* jshint devel:true */
/* global io */
/* global _:false */
/* global performance */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
    inlineediting: $('#pmmui').attr ('inlineediting') === "true" ? true : false,
    usecategorylist: $('#pmmui').attr ('usecategorylist') === "true" ? true : false,
  };

  $.jqx.theme = pmmui.theme;

  var grid = $('#competitorsGrid');
  var App = {
    matchData: {
      m: {
        match_shooters: [],
      },
    },
    controls: {
      contextMenu: null,
      popupEdit: null,
      popupSquads: null,
    }
  };
  var editVars = {
    inlineEditing: pmmui.inlineediting,     // 0 = Popup, 1 = Inline
    useCategoryList: pmmui.usecategorylist, // 0 = traditional, 1 = category dropdown list
    filtersEnabled: false,                  // 0 = Disabled, 1 = Enabled
    hideDQed: false,
    hideDeleted: false,
    rowIndex: {},
    isEditing: false,
    editingRowindex: -1,
    editingDatafield: null,
    ddeRowindex: {},
    errorDisplayed: false,
    selectedRowindex: 0,
    selectedDatafield: 'sh_pos',
    popupMode: '',
    popupRowIndex: -1,
    popupDataRecord: {},
  };

  var states = [
    { value: '',   label: '' },
    { value: 'AK', label: 'Alaska' },
    { value: 'AL', label: 'Alabama' },
    { value: 'AR', label: 'Arkansas' },
    { value: 'AZ', label: 'Arizona' },
    { value: 'CA', label: 'California' },
    { value: 'CO', label: 'Colorado' },
    { value: 'CT', label: 'Connecticut' },
    { value: 'DE', label: 'Delaware' },
    { value: 'FL', label: 'Florida' },
    { value: 'GA', label: 'Georgia' },
    { value: 'HI', label: 'Hawaii' },
    { value: 'IA', label: 'Iowa' },
    { value: 'ID', label: 'Idaho' },
    { value: 'IL', label: 'Illinois' },
    { value: 'IN', label: 'Indiana' },
    { value: 'KS', label: 'Kansas' },
    { value: 'KY', label: 'Kentucky' },
    { value: 'LA', label: 'Louisiana' },
    { value: 'MA', label: 'Massachusetts' },
    { value: 'MD', label: 'Maryland' },
    { value: 'ME', label: 'Maine' },
    { value: 'MI', label: 'Michigan' },
    { value: 'MN', label: 'Minnesota' },
    { value: 'MO', label: 'Missouri' },
    { value: 'MS', label: 'Mississippi' },
    { value: 'MT', label: 'Montana' },
    { value: 'NC', label: 'North Carolina' },
    { value: 'ND', label: 'North Dakota' },
    { value: 'NE', label: 'Nebraska' },
    { value: 'NH', label: 'New Hampshire' },
    { value: 'NJ', label: 'New Jersey' },
    { value: 'NM', label: 'New Mexico' },
    { value: 'NV', label: 'Nevada' },
    { value: 'NY', label: 'New York' },
    { value: 'OH', label: 'Ohio' },
    { value: 'OK', label: 'Oklahoma' },
    { value: 'OR', label: 'Oregon' },
    { value: 'PA', label: 'Pennsylvania' },
    { value: 'RI', label: 'Rhode Island' },
    { value: 'SC', label: 'South Carolina' },
    { value: 'SD', label: 'South Dakota' },
    { value: 'TN', label: 'Tennessee' },
    { value: 'TX', label: 'Texas' },
    { value: 'UT', label: 'Utah' },
    { value: 'VA', label: 'Virginia' },
    { value: 'VT', label: 'Vermont' },
    { value: 'WA', label: 'Washington' },
    { value: 'WI', label: 'Wisconsin' },
    { value: 'WV', label: 'West Virginia' },
    { value: 'WY', label: 'Wyoming' },
    { value: 'GU', label: 'Guam' },
    { value: 'PR', label: 'Puerto Rico' },
    { value: 'VI', label: 'Virgin Islands' },
  ];
  var yesno = [
    { value: false, label: 'No',  display: '&nbsp;', },
    { value: true,  label: 'Yes', display: 'Y',      },
  ];
  var genders = [
    { value: 'MALE',   label: 'Male',   display: '&nbsp;', },
    { value: 'FEMALE', label: 'Female', display: 'Y',      },
  ];
  var ages = [
    { value: 'ADULT',   label: 'Adult',        display: '&nbsp;',       },
    { value: 'PRETEEN', label: 'Preteen',      display: 'Preteen',      },
    { value: 'JUNIOR',  label: 'Junior',       display: 'Junior',       },
    { value: 'SENIOR',  label: 'Senior',       display: 'Senior',       },
    { value: 'SUPSNR',  label: 'Super Senior', display: 'Super Senior', },
  ];
  var prefixes = [
    { value: '',    label: '(no number)',               display: '&nbsp;', },
    { value: 'A',   label: 'A (Annual)',                display: 'A',      },
    { value: 'B',   label: 'B (Benefactor)',            display: 'B',      },
    { value: 'CA',  label: 'CA (Charter Annual)',       display: 'CA',     },
    { value: 'CAL', label: 'CAL (Charter Annual Life)', display: 'CAL',    },
    { value: 'CL',  label: 'CL (Charter Life)',         display: 'CL',     },
    { value: 'F',   label: 'F (Annual Foreign)',        display: 'F',      },
    { value: 'FL',  label: 'FL (Foreign Life)',         display: 'FL',     },
    { value: 'FY',  label: 'FY (Five Year)',            display: 'FY',     },
    { value: 'FYF', label: 'FYF (Five Year Foreign)',   display: 'FYF',    },
    { value: 'L',   label: 'L (Life)',                  display: 'L',      },
    { value: 'PEN', label: 'Pen (Pending)',             display: 'Pen',    },
    { value: 'RD',  label: 'RD (Regional Director)',    display: 'RD',     },
    { value: 'S',   label: 'S (Sponsor)',               display: 'S',      },
    { value: 'TY',  label: 'TY (Three Year)',           display: 'TY',     },
    { value: 'TYF', label: 'TYF (Three Year Foreign)',  display: 'TYF',    },
  ];

  var filterRefreshList = [
    { sh_st: function () { return _.uniq (_.sortBy (_.pluck (App.matchData.m.match_shooters, 'sh_st')), true); }},
  ];

  //
  //
  //
  var statesSource = {
    datatype: 'array',
    datafields: [
      { name: 'value', type: 'string' },
      { name: 'label', type: 'string' }
    ],
    localdata: states,
  };

  var statesAdapter = new $.jqx.dataAdapter (statesSource, {
    autoBind: true
  });

  var yesnoSource = {
    datatype: 'array',
    datafields: [
      { name: 'value',   type: 'boolean' },
      { name: 'label',   type: 'string'  },
      { name: 'display', type: 'string'  }
    ],
    localdata: yesno,
  };

  var yesnoAdapter = new $.jqx.dataAdapter (yesnoSource, {
    autoBind: true
  });

  var gendersSource = {
    datatype: 'array',
    datafields: [
      { name: 'value',   type: 'string' },
      { name: 'label',   type: 'string' },
      { name: 'display', type: 'string' }
    ],
    localdata: genders,
  };

  var gendersAdapter = new $.jqx.dataAdapter (gendersSource, {
    autoBind: true
  });

  var agesSource = {
    datatype: 'array',
    datafields: [
      { name: 'value',   type: 'string' },
      { name: 'label',   type: 'string' },
      { name: 'display', type: 'string' }
    ],
    localdata: ages,
  };

  var agesAdapter = new $.jqx.dataAdapter (agesSource, {
    autoBind: true
  });

  var categoriesSource = {
    datatype: 'array',
    datafields: [
      { name: 'value',   type: 'string' },
      { name: 'label',   type: 'string' },
      { name: 'display', type: 'string' }
    ],
    localdata: [],
  };

  var categoriesAdapter = new $.jqx.dataAdapter (categoriesSource, {
    autoBind: true
  });

  var classesSource = {
    datatype: 'array',
    datafields: [
      { name: 'value',   type: 'string' },
      { name: 'label',   type: 'string' },
    ],
    localdata: [],
  };

  var classesAdapter = new $.jqx.dataAdapter (classesSource, {
    autoBind: true
  });

  var divisionsSource = {
    datatype: 'array',
    datafields: [
      { name: 'value',   type: 'string' },
      { name: 'label',   type: 'string' },
    ],
    localdata: [],
  };

  var divisionsAdapter = new $.jqx.dataAdapter (divisionsSource, {
    autoBind: true
  });

  var prefixesSource = {
    datatype: 'array',
    datafields: [
      { name: 'value',   type: 'string' },
      { name: 'label',   type: 'string' },
      { name: 'display', type: 'string' }
    ],
    localdata: prefixes,
  };

  var prefixesAdapter = new $.jqx.dataAdapter (prefixesSource, {
    autoBind: true
  });

  var shooterSource = {
    datatype: 'array',
    datafields: [
      { name: 'sh_addr1',     type: 'string'  },
      { name: 'sh_addr2',     type: 'string'  },
      { name: 'sh_age',       type: 'string'  },
      { name: 'sh_city',      type: 'string'  },
      { name: 'sh_del',       type: 'boolean' },
      { name: 'sh_dq',        type: 'boolean' },
      { name: 'sh_dvp',       type: 'string'  },
      { name: 'sh_eml',       type: 'string'  },
      { name: 'sh_fn',        type: 'string'  },
      { name: 'sh_frn',       type: 'boolean' },
      { name: 'sh_gen',       type: 'string'  },
      { name: 'sh_grd',       type: 'string'  },
      { name: 'sh_id',        type: 'string'  },
      { name: 'sh_law',       type: 'boolean' },
      { name: 'sh_lge',       type: 'boolean' },
      { name: 'sh_lgp',       type: 'boolean' },
      { name: 'sh_ln',        type: 'string'  },
      { name: 'sh_mil',       type: 'boolean' },
      { name: 'sh_ph',        type: 'string'  },
      { name: 'sh_pos',       type: 'number'  },
      { name: 'sh_sqd',       type: 'number'  },
      { name: 'sh_st',        type: 'string'  },
      { name: 'sh_wlk',       type: 'boolean' },
      { name: 'sh_zipcode',   type: 'string'  },
      { name: 'sh_print',     type: 'boolean' },

      { name: 'sh_ctgs',      type: 'array'   },
      { name: 'sh_ctgs_fmt',  type: 'string'  },

      { name: 'sh_age_fmt',   value: 'sh_age',   values: { source: agesAdapter.records,      value: 'value', name: 'label' }},
      { name: 'sh_del_fmt',   value: 'sh_del',   values: { source: yesnoAdapter.records,     value: 'value', name: 'label' }},
      { name: 'sh_dq_fmt',    value: 'sh_dq',    values: { source: yesnoAdapter.records,     value: 'value', name: 'label' }},
      { name: 'sh_dvp_fmt',   value: 'sh_dvp',   values: { source: divisionsAdapter.records, value: 'value', name: 'label' }},
      { name: 'sh_frn_fmt',   value: 'sh_frn',   values: { source: yesnoAdapter.records,     value: 'value', name: 'label' }},
      { name: 'sh_gen_fmt',   value: 'sh_gen',   values: { source: gendersAdapter.records,   value: 'value', name: 'label' }},
      { name: 'sh_grd_fmt',   value: 'sh_grd',   values: { source: classesAdapter.records,   value: 'value', name: 'label' }},
      { name: 'sh_here_fmt',  value: 'sh_here',  values: { source: yesnoAdapter.records,     value: 'value', name: 'label' }},
      { name: 'sh_law_fmt',   value: 'sh_law',   values: { source: yesnoAdapter.records,     value: 'value', name: 'label' }},
      { name: 'sh_lge_fmt',   value: 'sh_lge',   values: { source: yesnoAdapter.records,     value: 'value', name: 'label' }},
      { name: 'sh_lgp_fmt',   value: 'sh_lgp',   values: { source: yesnoAdapter.records,     value: 'value', name: 'label' }},
      { name: 'sh_mil_fmt',   value: 'sh_mil',   values: { source: yesnoAdapter.records,     value: 'value', name: 'label' }},
      { name: 'sh_paid_fmt',  value: 'sh_paid',  values: { source: yesnoAdapter.records,     value: 'value', name: 'label' }},
      { name: 'sh_staff_fmt', value: 'sh_staff', values: { source: yesnoAdapter.records,     value: 'value', name: 'label' }},
      { name: 'sh_wlk_fmt',   value: 'sh_wlk',   values: { source: yesnoAdapter.records,     value: 'value', name: 'label' }},
      { name: 'sh_print_fmt', value: 'sh_print', values: { source: yesnoAdapter.records,     value: 'value', name: 'label' }},
    ],
    localdata: [],
    addrow: function (rowid, newdata, position, commit) {
      var startTime = performance.now ();

      App.socket.emit ('shooter:add', {shooter: newdata}, function (data) {
        if (data.err) {
          editVars.errorDisplayed = true;
          _.each (data.err, function (e) {
            $(grid).jqxGrid ('showvalidationpopup', rowid, e.field, e.errmsg);
          });
          commit (false);
        } else {
          App.matchData.m.match_shooters.push (data.shooter);
          commit (true);
        }

        $('#timeButtonText').text ((performance.now () - startTime).toFixed (3) + 'ms');
      });
    },
    updaterow: function (rowid, newdata, commit) {
      var shooter = App.matchData.m.match_shooters [rowid];
      var startTime = performance.now ();

      //
      //  Have to set it directly into shooter because _.merge won't merge the
      //  empty array in newdata over the populated array in shooter
      //
      if (!_.isUndefined (editVars.sh_ctgs)) {
        delete newdata.sh_ctgs;
        shooter.sh_ctgs = editVars.sh_ctgs;
        shooter.prefer = 'tags';
      }

      App.socket.emit ('shooter:save', {shooter: _.merge (_.clone (shooter, true), newdata)}, function (data) {
        delete editVars.sh_ctgs;
        if (data.err) {
          editVars.errorDisplayed = true;
          _.each (data.err, function (e) {
            $(grid).jqxGrid ('showvalidationpopup', rowid, e.field, e.errmsg);
          });
          commit (false);
        } else if (data.changed) {
          App.matchData.m.match_shooters [rowid] = data.shooter;
          commit (false);
          $(grid).jqxGrid ('updatebounddata', 'cells');
        }

        $('#timeButtonText').text ((performance.now () - startTime).toFixed (3) + 'ms');
      });
    },
  };

  var shooterAdapter = new $.jqx.dataAdapter (shooterSource, {
    beforeLoadComplete: function (records) {
      if (editVars.hideDQed)
        records = _.filter (records, 'sh_dq', false);
      if (editVars.hideDeleted)
        records = _.filter (records, 'sh_del', false);

      return records;
    },
  });

  var cellsrendererFunc = function (row, columnField, value, defaultHTML, columnProperties, shooter, remap) {
    var html1;
    var html2;

    if (!_.isUndefined (remap))
      value = _.result (_.find (remap, 'label', value), 'display');

    if (columnField === 'sh_ctgs_fmt') {
      try {
        value = shooter.sh_ctgs.join (',');
      } catch (e) {
        console.log ('cellsrenderFunc(): sh_ctgs.join() exception, shooter=');
        console.dir (shooter);
        value = '';
      }
    }

    html1 = '<div class="competitor';
    html2 = '" style="text-align: ' + columnProperties.cellsalign + ';">' + (value || '&nbsp;') + '</div>';

    if (shooter) {
      if (shooter.sh_dq) {
        html1  = '<div class="competitorDQ">' + html1;
        html2 += '</div>';
      } else if (shooter.sh_del) {
        html1  = '<div class="competitorDel">' + html1;
        html2 += '</div>';
      }
    }

    return html1 + html2;
  };

  var dropdownCreateEditor = function (rowIndex, cellValue, editor, options) {
    editor.jqxDropDownList (_.merge ({
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

  var dropdownCheckboxInitEditor = function (rowIndex, cellValue, editor) {
    var datafield = this.datafield;
    var items = editor.jqxDropDownList ('getItems');
    var values = App.matchData.m.match_shooters [rowIndex].sh_ctgs;

    editVars.ddeRowindex [datafield] = rowIndex;
    editVars.ddeEditor = editor;

    editor.off ('select');
    editor.on ('select', function (event) {
      editVars.sh_ctgs = _.pluck (editor.jqxDropDownList ('getCheckedItems'), 'value');

      if (event.args && !_.isUndefined (editVars.ddeRowindex [datafield]) && (editVars.ddeRowindex [datafield] !== -1))
        window.setTimeout (function () {
          $(grid).jqxGrid ('endcelledit', rowIndex, datafield, false);
        }, 10);
    });

    //
    //  Issue - We want to populate 'sh_ctgs' with the list of checked items
    //  from this dropdown list. We can get the list of items, but there's no
    //  good way to add that to the data being passed to the shooterSource
    //  updaterow() method. To get around this, store it in the editVars
    //  object, and the updaterow() method will check for it's existence
    //
    editor.off ('close');
    editor.on ('close', function () {
      editVars.sh_ctgs = _.pluck (editor.jqxDropDownList ('getCheckedItems'), 'value');

      if (!_.isUndefined (editVars.ddeRowindex [datafield]) && (editVars.ddeRowindex [datafield] !== -1))
        window.setTimeout (function () {
          $(grid).jqxGrid ('endcelledit', rowIndex, datafield, false);
        }, 10);
    });

    editor.jqxDropDownList ('uncheckAll');

    for (var j = 0; j < values.length; j++)
      for (var i = 0; i < items.length; i++)
        if (items [i].label === values [j])
          editor.jqxDropDownList ('checkIndex', i);

    editor.jqxDropDownList ('open');
  };

  //
  //
  //
  var autocompleteResults = [];
  var autocompleteNameAdapter = function (query, response, field) {
    return new $.jqx.dataAdapter ({
      datatype: 'json',
      datafields: [
        { name: 'id' },
        { name: 'sh_fn' },
        { name: 'sh_ln' },
        { name: 'sh_id' },
      ],
      url: 'http://' + window.location.host + '/ajax/namesearch',
      data: {
        maxrows: 10,
      },
    }, {
      autoBind: true,
      formatData: function (data) {
        data.field = field.replace (/-/, '_');
        data.match = query;
        data.type = 'startswith';
        return data;
      },
      loadComplete: function (records) {
        autocompleteResults = records.matches || [];
        if (!records.err && records.matches) {
          var list = $.map (records.matches, function (shooter) {
            return {
              label: shooter.sh_fn + ' ' + shooter.sh_ln + (shooter.sh_id.length ? ' (' + shooter.sh_id + ')' : ''),
              value: shooter.id,
            };
          });
          response (list);
        } else
          $('#ec-' + field).jqxInput ({opened: false});
      },
    });
  };
  var autocompleteLastNameAdapter = function (query, response) {
    return autocompleteNameAdapter (query, response, 'sh-ln');
  };
  var autocompleteFirstNameAdapter = function (query, response) {
    return autocompleteNameAdapter (query, response, 'sh-fn');
  };

  var fillPopupFields = function (dataRecord) {
    var scsaNumberRE = /([A-Za-z]+)(\d+)/;
    var scsaPrefix = dataRecord.sh_id.match (scsaNumberRE);
    var scsaNumber;
    var phoneNumberRE = /(\d{3}).*(\d{3}).*(\d{4})/;
    var phoneNumber = dataRecord.sh_ph.match (phoneNumberRE);

    if (scsaPrefix && (scsaPrefix.length === 3)) {
      scsaNumber = scsaPrefix [2];
      scsaPrefix = scsaPrefix [1].toUpperCase ();
    } else {
      scsaNumber = '';
      scsaPrefix = '';
    }

    phoneNumber = (phoneNumber && (phoneNumber.length === 4)) ? phoneNumber [1] + '-' + phoneNumber [2] + '-' + phoneNumber [3] : null;

    $('#ec-sh-ln').jqxInput ('val', dataRecord.sh_ln);
    $('#ec-sh-fn').jqxInput ('val', dataRecord.sh_fn);
    $('#ec-sh-id-prefix').jqxDropDownList ('selectIndex', _.findIndex (prefixes, 'value', scsaPrefix));
    $('#ec-sh-id-num').jqxInput ('val', scsaNumber);

    $('#ec-sh-dvp').val (dataRecord.sh_dvp);
    $('#ec-sh-grd').val (dataRecord.sh_grd);

    $('#ec-sh-sqd').jqxNumberInput ('val', dataRecord.sh_sqd);
    $('#ec-sh-age').val (dataRecord.sh_age);
    $('#ec-sh-gen').val (dataRecord.sh_gen);

    $('#ec-sh-frn').val (dataRecord.sh_frn);
    $('#ec-sh-law').val (dataRecord.sh_law);
    $('#ec-sh-mil').val (dataRecord.sh_mil);

    $('#ec-sh-staff').val (dataRecord.sh_staff);
    $('#ec-sh-paid').val (dataRecord.sh_paid);
    $('#ec-sh-here').val (dataRecord.sh_here);

    $('#ec-sh-wlk').val (dataRecord.sh_wlk);
    $('#ec-sh-dq').val (dataRecord.sh_dq);
    $('#ec-sh-del').val (dataRecord.sh_del);

    $('#ec-sh-lge').val (dataRecord.sh_lge);
    $('#ec-sh-lgp').val (dataRecord.sh_lgp);

    $('#ec-sh-ph').jqxMaskedInput (phoneNumber ? 'val' : 'clear', phoneNumber);
    $('#ec-sh-eml').jqxInput ('val', dataRecord.sh_eml);

    $('#ec-sh-addr1').jqxInput ('val', dataRecord.sh_addr1);
    $('#ec-sh-addr2').jqxInput ('val', dataRecord.sh_addr2);

    $('#ec-sh-city').jqxInput ('val', dataRecord.sh_city);
    $('#ec-sh-st').val (dataRecord.sh_st);
    $('#ec-sh-zipcode').jqxMaskedInput (dataRecord.sh_zipcode.length ? 'val' : 'clear', dataRecord.sh_zipcode);

    //
    //  Naturally, jqWidgets makes what should be easy as difficult as possible
    //
    var ddl = $('#ec-sh-ctgs');
    var items = ddl.jqxDropDownList ('getItems');
    var values = editVars.popupDataRecord.sh_ctgs || [];

    ddl.off ('close');
    ddl.on ('close', function () {
      editVars.sh_ctgs = _.pluck (ddl.jqxDropDownList ('getCheckedItems'), 'value');
    });

    ddl.jqxDropDownList ('uncheckAll');

    for (var j = 0; j < values.length; j++)
      for (var i = 0; i < items.length; i++)
        if (items [i].label === values [j])
          ddl.jqxDropDownList ('checkIndex', i);

    return dataRecord;
  };

  var populatePopupFields = function () {
    fillPopupFields (editVars.popupDataRecord);
  };

  var autocompleteShooter = function (id) {
    var shooter = _.find (autocompleteResults, 'id', id);

    if (shooter)
      App.socket.emit ('shooter:new', function (data) {
        shooter = _.merge (data.shooter, shooter);
        fillPopupFields (shooter);
        $('#popupEdit').jqxValidator ('hide');
      });
    else {
      // alert ('Eeek! autocompleteShooter() was passed a id that doesn\'t exist!');
      console.log ('Eeek! autocompleteShooter() was passed a id that doesn\'t exist!');
      console.log ('id=%s', id);
      console.log ('autocompleteResults -->');
      console.dir (autocompleteResults);
    }
  };

  var openPopupEditorAdd = function () {
    var popupEdit = App.popupEditInit ();

    App.socket.emit ('shooter:maxnameslength', function (data) {
      var nameMaxwidth = data.maxwidth * 8;

      editVars.popupRowIndex = -1;
      editVars.popupMode = 'add';

      $('#ec-sh-fn').jqxInput ({source: autocompleteFirstNameAdapter, dropDownWidth: nameMaxwidth});
      $('#ec-sh-ln').jqxInput ({source: autocompleteLastNameAdapter, dropDownWidth: nameMaxwidth});

      App.socket.emit ('shooter:new', function (data) {
        var shooter = data.shooter;

        editVars.popupDataRecord = shooter;

        shooter.sh_age_fmt =   _.result (_.find (ages, 'value', shooter.sh_age), 'label');
        shooter.sh_del_fmt =   _.result (_.find (yesno, 'value', shooter.sh_del), 'label');
        shooter.sh_dq_fmt  =   _.result (_.find (yesno, 'value', shooter.sh_dq), 'label');
        shooter.sh_dvp_fmt =   _.result (_.find (divisionsSource.localdata, 'value', shooter.sh_dvp), 'label');
        shooter.sh_frn_fmt =   _.result (_.find (yesno, 'value', shooter.sh_frn), 'label');
        shooter.sh_gen_fmt =   _.result (_.find (genders, 'value', shooter.sh_gen), 'label');
        shooter.sh_grd_fmt =   _.result (_.find (classesSource.localdata, 'value', shooter.sh_grd), 'label');
        shooter.sh_here_fmt =  _.result (_.find (yesno, 'value', shooter.sh_here), 'label');
        shooter.sh_law_fmt =   _.result (_.find (yesno, 'value', shooter.sh_law), 'label');
        shooter.sh_lge_fmt =   _.result (_.find (yesno, 'value', shooter.sh_lge), 'label');
        shooter.sh_lgp_fmt =   _.result (_.find (yesno, 'value', shooter.sh_lgp), 'label');
        shooter.sh_mil_fmt =   _.result (_.find (yesno, 'value', shooter.sh_mil), 'label');
        shooter.sh_paid_fmt =  _.result (_.find (yesno, 'value', shooter.sh_paid), 'label');
        shooter.sh_staff_fmt = _.result (_.find (yesno, 'value', shooter.sh_staff), 'label');
        shooter.sh_wlk_fmt =   _.result (_.find (yesno, 'value', shooter.sh_wlk), 'label');

        populatePopupFields ();

        $(popupEdit).jqxWindow ('title', 'Adding Competitor #' + shooter.sh_pos);
        $(popupEdit).jqxWindow ('open');
      });
    });
  };

  var openPopupEditorEdit = function (rowIndex) {
    var popupEdit = App.popupEditInit ();

    editVars.popupRowIndex = rowIndex;
    editVars.popupMode = 'edit';
    editVars.popupDataRecord = App.matchData.m.match_shooters [rowIndex];

    populatePopupFields ();

    $('#ec-sh-fn').jqxInput ({source: []});
    $('#ec-sh-ln').jqxInput ({source: []});

    $(popupEdit).jqxWindow ('title', 'Editing Competitor #' + (rowIndex + 1) + ' -- ' + editVars.popupDataRecord.sh_fn + ' ' + editVars.popupDataRecord.sh_ln);
    $(popupEdit).jqxWindow ('open');
  };

  //
  //
  //
  App.adjustGridHeight = function () {
    var v = {};
    v.viewportHeight = Math.ceil (new $.jqx.response ().viewPort.height);
    v.contentOffset = Math.ceil ($('#content').offset ().top);
    v.copyrightHeight = $('#copyright').height () + 16;      // 24 (plus 16 for margin-top)
    v.rowsHeight = $(grid).jqxGrid ('rowsheight');           // 25
    v.columnsHeight = $(grid).jqxGrid ('columnsheight') + 1; // 25 (26 actual)
    v.filterrowHeight = $(grid).jqxGrid ('filterrowheight'); // 31
    v.statusbarHeight = $(grid).jqxGrid ('statusbarheight'); // 34
    v.pagerHeight = $(grid).jqxGrid ('pagerheight') + 1;     // 28 (29 actual)
    v.filterrowVisible = $(grid).jqxGrid ('showfilterrow');
    v.statusbarVisible = $(grid).jqxGrid ('showstatusbar');
    v.pagerVisible = $(grid).jqxGrid ('pageable');

    v.usedHeight = v.columnsHeight;

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

  //
  //  Show grid, and configure for inline editing
  //
  $(grid).on ('bindingcomplete', function () {
    $(grid).jqxGrid ('localizestrings', {filterselectstring: ' '});
    App.adjustGridHeight ();
  });

  //
  //  Fuckery to make the grid size to the available screen space.
  //
  $(grid).jqxGrid ({
    width: $('#jqxMenu').jqxMenu ('width'),
    height: 100,
    autoheight: true,
    source: shooterAdapter,
    sortable: true,
    showsortmenuitems: false,
    showsortcolumnbackground: false,
    filterable: editVars.filtersEnabled,
    autoshowfiltericon: true,
    showfilterrow: editVars.filtersEnabled,
    showfiltercolumnbackground: false,
    columnsreorder: true,
    columnsresize: true,
    pageable: true,
    scrollmode: 'logical',
    altrows: true,
    enablekeyboarddelete: false,
    editable: editVars.inlineEditing,
    editmode: 'dblclick',
    selectionmode: 'singlecell',
    showstatusbar: true,
    columnsheight: 26, // Changed from 26 to 31 in 4.1.2
    pagerheight: 29,   // Changed from 29 to 35 in 4.1.2
    rowsheight: 25,    // Changed from 25 to 28 in 4.1.2
    columns: [
      {
        text:            '#',
        datafield:       'sh_pos',
        width:           35,
        cellsalign:      'right',
        cellsrenderer:   cellsrendererFunc,
        editable:        false,
        filtercondition: 'equal',
      },
      {
        text:            'Last Name',
        datafield:       'sh_ln',
        cellsrenderer:   cellsrendererFunc,
        validation:      function (cell, value) {
                           if (!value.length)
                             return ({result: false, message: 'Last name is required'});
                           if (value.search (/[^A-Za-z0-9\., -]/) !== -1)
                             return ({result: false, message: 'Last name may only contain the characters A-Z, a-z, 0-9, period, dash, comma and space'});
                           return true;
                         },
      },
      {
        text:            'First Name',
        datafield:       'sh_fn',
        cellsrenderer:   cellsrendererFunc,
        validation:      function (cell, value) {
                           var regex = /[^A-Za-z0-9\. -()]/;
                           if (!value.length)
                             return ({result: false, message: 'First name is required'});
                           if (regex.test (value))
                             return ({result: false, message: 'First name may only contain the characters A-Z, a-z, 0-9, period, dash, open/close parenthesis, and space'});
                           return true;
                         },
      },
      {
        text:            'SCSA',
        datafield:       'sh_id',
        width:           80,
        cellsrenderer:   cellsrendererFunc,
        validation:      function (cell, value) {
                           var regex = /^(?:A|B|CA|CAL|CL|F|FL|FY|FYF|L|PEN|RD|S|TY|TYF)[0-9]{1,6}$/;
                           var text = value.trim ().toUpperCase ();
                           if (!text.length)
                             return true;
                           if (!regex.test (text))
                             return ({result: false, message: 'Invalid SCSA number'});

                           var rowData = $(grid).jqxGrid ('getrowdata', cell.row);
                           var sh_fn = rowData.sh_fn.toUpperCase ();
                           var sh_ln = rowData.sh_ln.toUpperCase ();
                           var count = 0;

                           _.each (App.matchData.m.match_shooters, function (s) {
                             if ((text === s.sh_id) && ((sh_fn !== s.sh_fn.toUpperCase ()) || (sh_ln !== s.sh_ln.toUpperCase ())))
                               ++count;
                           });
                           if (count)
                             return ({result: false, message: 'This SCSA # is in use by a competitor with a different name'});

                           cell.value = text;
                           return true;
                         },
        geteditorvalue:  function (row, cellValue, editor) {
                           return editor.val ().toUpperCase ();
                         },
      },
      {
        text:            'Division',
        datafield:       'sh_dvp',
        displayfield:    'sh_dvp_fmt',
        width:           137,
        cellsrenderer:   cellsrendererFunc,
        columntype:      'dropdownlist',
        filtertype:      'checkedlist',
        filteritems:     divisionsAdapter,
        validation:      function (cell, value) {
                           if (value.length === 0)
                             return ({result: false, message: 'Division cannot be blank'});
                           return true;
                         },
        createeditor:    function (rowIndex, cellValue, editor) {
                           dropdownCreateEditor (rowIndex, cellValue, editor, {
                             dropDownWidth: 140,
                             source: divisionsAdapter,
                           });
                         },
        initeditor:      dropdownInitEditor,
      },
      {
        text:            'Class',
        datafield:       'sh_grd',
        displayfield:    'sh_grd_fmt',
        width:           54,
        cellsalign:      'center',
        cellsrenderer:   cellsrendererFunc,
        columntype:      'dropdownlist',
        filtertype:      'checkedlist',
        filteritems:     classesAdapter,
        validation:      function (cell, value) {
                           if (value.length === 0)
                             return ({result: false, message: 'Class cannot be blank'});
                           return true;
                         },
        createeditor:    function (rowIndex, cellValue, editor) {
                           dropdownCreateEditor (rowIndex, cellValue, editor, {
                             source: classesAdapter,
                           });
                         },
        initeditor:      dropdownInitEditor,
      },
      {
        text:            'Squad',
        datafield:       'sh_sqd',
        width:           60,
        cellsalign:      'right',
        cellsrenderer:   cellsrendererFunc,
        filtercondition: 'equal',
        validation:      function (cell, value) {
                           value = value.trim ();
                           if (value.length === 0)
                             return ({result: false, message: 'Squad number cannot be empty (use 0 for no squad)'});
                           if (value.search (/[^0-9]/) !== -1)
                             return ({result: false, message: 'Squad number contains non-numeric characters'});
                           if (value.length > 4)
                             return ({result: false, message: 'Squad number must be 0..9999'});
                           return true;
                         },
      },
      {
        hidden:          !editVars.useCategoryList,
        text:            'Categories',
        datafield:       'sh_ctgs_fmt',
        width:           200,
        cellsrenderer:   cellsrendererFunc,
        columntype:      'template',
        filtertype:      'checkedlist',
        filteritems:     categoriesAdapter,
        createeditor:    function (rowIndex, cellValue, editor) {
                           dropdownCreateEditor (rowIndex, cellValue, editor, {
                             checkboxes: true,
                             source: categoriesAdapter,
                           });
                         },
        initeditor:      dropdownCheckboxInitEditor,
        geteditorvalue:  function (row, cellvalue, editor) {
                           return editor.val ();
                         },
      },
      {
        hidden:          editVars.useCategoryList,
        text:            'Age',
        datafield:       'sh_age',
        displayfield:    'sh_age_fmt',
        width:           95,
        cellsrenderer:   function (row, columnField, value, defaultHTML, columnProperties, shooter) {
                           return cellsrendererFunc (row, columnField, value, defaultHTML, columnProperties, shooter, ages);
                         },
        columntype:      'dropdownlist',
        filtertype:      'checkedlist',
        filteritems:     agesAdapter,
        createeditor:    function (rowIndex, cellValue, editor) {
                           dropdownCreateEditor (rowIndex, cellValue, editor, {
                             source: agesAdapter,
                           });
                         },
        initeditor:      dropdownInitEditor,
      },
      {
        hidden:          editVars.useCategoryList,
        text:            'Female',
        datafield:       'sh_gen',
        displayfield:    'sh_gen_fmt',
        width:           68,
        cellsalign:      'center',
        cellsrenderer:   function (row, columnField, value, defaultHTML, columnProperties, shooter) {
                           return cellsrendererFunc (row, columnField, value, defaultHTML, columnProperties, shooter, genders);
                         },
        columntype:      'dropdownlist',
        filtertype:      'checkedlist',
        filteritems:     gendersAdapter,
        createeditor:    function (rowIndex, cellValue, editor) {
                           dropdownCreateEditor (rowIndex, cellValue, editor, {
                             source: gendersAdapter,
                           });
                         },
        initeditor:      dropdownInitEditor,
      },
      {
        hidden:          editVars.useCategoryList,
        text:            'Law',
        datafield:       'sh_law',
        displayfield:    'sh_law_fmt',
        width:           47,
        cellsalign:      'center',
        cellsrenderer:   function (row, columnField, value, defaultHTML, columnProperties, shooter) {
                           return cellsrendererFunc (row, columnField, value, defaultHTML, columnProperties, shooter, yesno);
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
      {
        hidden:          editVars.useCategoryList,
        text:            'Military',
        datafield:       'sh_mil',
        displayfield:    'sh_mil_fmt',
        width:           68,
        cellsalign:      'center',
        cellsrenderer:   function (row, columnField, value, defaultHTML, columnProperties, shooter) {
                           return cellsrendererFunc (row, columnField, value, defaultHTML, columnProperties, shooter, yesno);
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
      {
        hidden:          editVars.useCategoryList,
        text:            'Foreign',
        datafield:       'sh_frn',
        displayfield:    'sh_frn_fmt',
        width:           68,
        cellsalign:      'center',
        cellsrenderer:   function (row, columnField, value, defaultHTML, columnProperties, shooter) {
                           return cellsrendererFunc (row, columnField, value, defaultHTML, columnProperties, shooter, yesno);
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
      {
        text:            'Email',
        datafield:       'sh_eml',
        cellsrenderer:   cellsrendererFunc,
      },
      {
        text:            'Phone',
        datafield:       'sh_ph',
        width:           102,
        cellsrenderer:   function (row, columnField, value, defaultHTML, columnProperties, shooter) {
                           var phoneNumberRE = /(\d{3}).*(\d{3}).*(\d{4})/;
                           var phoneNumber = value.match (phoneNumberRE);

                           if (phoneNumber && (phoneNumber.length === 4))
                             value = phoneNumber [1] + '-' + phoneNumber [2] + '-' + phoneNumber [3];

                           return cellsrendererFunc (row, columnField, value, defaultHTML, columnProperties, shooter);
                         },
      },
      {
        text:            'State',
        datafield:       'sh_st',
        width:           55,
        cellsalign:      'center',
        cellsrenderer:   cellsrendererFunc,
        columntype:      'dropdownlist',
        filtertype:      'checkedlist',
        filteritems:     filterRefreshList.sh_st,
        createfilterwidget: function (column, columnElement, widget) {
                          $(widget).jqxDropDownList ('emptyString', '(no state)');
                         },
        createeditor:    function (rowIndex, cellValue, editor) {
                           dropdownCreateEditor (rowIndex, cellValue, editor, {
                             dropDownWidth: 135,
                             source: statesAdapter,
                             selectionRenderer: function (htmlString) {
                               htmlString.text (_.result (_.find (states, 'label', htmlString.text ()), 'value'));
                               htmlString.css ({'padding': '5px'});
                               return htmlString;
                             }
                           });
                         },
        initeditor:      dropdownInitEditor,
        geteditorvalue:  function (row, cellValue, editor) {
                           return editor.val ();
                         },
      },
      {
        text:            'Walk-On',
        datafield:       'sh_wlk',
        displayfield:    'sh_wlk_fmt',
        width:           75,
        cellsalign:      'center',
        cellsrenderer:   function (row, columnField, value, defaultHTML, columnProperties, shooter) {
                           return cellsrendererFunc (row, columnField, value, defaultHTML, columnProperties, shooter, yesno);
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
      {
        text:            'DQ',
        datafield:       'sh_dq',
        displayfield:    'sh_dq_fmt',
        width:           40,
        cellsalign:      'center',
        cellsrenderer:   function (row, columnField, value, defaultHTML, columnProperties, shooter) {
                           return cellsrendererFunc (row, columnField, value, defaultHTML, columnProperties, shooter, yesno);
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
      {
        text:            'Deleted',
        datafield:       'sh_del',
        displayfield:    'sh_del_fmt',
        width:           70,
        cellsalign:      'center',
        cellsrenderer:   function (row, columnField, value, defaultHTML, columnProperties, shooter) {
                           return cellsrendererFunc (row, columnField, value, defaultHTML, columnProperties, shooter, yesno);
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
      {
        hidden:          true,
        text:            'Print',
        datafield:       'sh_print',
        displayfield:    'sh_print_fmt',
        width:           60,
        cellsalign:      'center',
        cellsrenderer:   function (row, columnField, value, defaultHTML, columnProperties, shooter) {
                           return cellsrendererFunc (row, columnField, value, defaultHTML, columnProperties, shooter, yesno);
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
      }
    ],
    renderstatusbar: function (statusbar) {
      var container          = $('<div id="btncontainer"></div>');
      var addButton          = $('<div class="btndiv"><img style="position: relative; margin-top: 2px;" src="/javascripts/libs/jqwidgets/images/add.png"/><span style="margin-left: 4px; position: relative; top: -3px;">Add</span></div>');
      var editModeButton     = $('<div class="btndiv"><span class="btnspan">Edit: <span id="modeButtonText">' + (editVars.inlineEditing ? 'Inline' : 'Popup') + '</span></span></div>');
      var filterModeButton   = $('<div class="btndiv"><span class="btnspan">Filters: <span id="filterButtonText">' + (editVars.filtersEnabled ? 'On' : 'Off') + '</span></span></div>');
      var clearFiltersButton = $('<div class="btndiv"><span class="btnspan">Clear Filters</span></div>');
      var resetSortButton    = $('<div class="btndiv"><span class="btnspan">Reset Sort</span></div>');
      var hideDQedButton     = $('<div class="btndiv"><span class="btnspan"><span id="dqedButtonText">' + (editVars.hideDQed ? 'Show' : 'Hide') + '</span> DQed</span></div>');
      var hideDeletedButton  = $('<div class="btndiv"><span class="btnspan"><span id="deletedButtonText">' + (editVars.hideDeleted ? 'Show' : 'Hide') + '</span> Deleted</span></div>');
      var timeButton         = $('<div style="float: right; margin-left: 5px;"><span class="btnspan"><span id="timeButtonText">0ms</span></span></div>');

      container.append (addButton);
      container.append (editModeButton);
      container.append (filterModeButton);
      container.append (clearFiltersButton);
      container.append (resetSortButton);
      container.append (hideDQedButton);
      container.append (hideDeletedButton);
      container.append (timeButton);
      statusbar.append (container);

      addButton.jqxButton ({theme: 'default', width: 60, height: 20});
      editModeButton.jqxButton ({theme: 'default', width: 90, height: 20});
      filterModeButton.jqxButton ({theme: 'default', width: 90, height: 20});
      clearFiltersButton.jqxButton ({theme: 'default', width: 90, height: 20, disabled: !editVars.filtersEnabled});
      resetSortButton.jqxButton ({theme: 'default', width: 90, height: 20});
      hideDQedButton.jqxButton ({theme: 'default', width: 90, height: 20});
      hideDeletedButton.jqxButton ({theme: 'default', width: 100, height: 20});
      timeButton.jqxButton ({theme: 'default', width: 90, height: 20});

      addButton.click (function () {
        openPopupEditorAdd ();
      });
      editModeButton.click (function () {
        editVars.inlineEditing = !editVars.inlineEditing;
        $('#modeButtonText').text (editVars.inlineEditing ? 'Inline' : 'Popup');
        $(grid).jqxGrid ({editable: editVars.inlineEditing});
      });
      filterModeButton.click (function () {
        editVars.filtersEnabled = !editVars.filtersEnabled;
        $('#filterButtonText').text (editVars.filtersEnabled ? 'On' : 'Off');
        $(grid).jqxGrid ({filterable: editVars.filtersEnabled, showfilterrow: editVars.filtersEnabled});
        clearFiltersButton.jqxButton ({disabled: !editVars.filtersEnabled});
        App.adjustGridHeight ();
      });
      clearFiltersButton.click (function () {
        $(grid).jqxGrid ('clearfilters', true);
      });
      resetSortButton.click (function () {
        $(grid).jqxGrid ('removesort');
      });
      hideDQedButton.click (function () {
        editVars.hideDQed = !editVars.hideDQed;
        $('#dqedButtonText').text (editVars.hideDQed ? 'Show' : 'Hide');
        $(grid).jqxGrid ({source: shooterAdapter});
      });
      hideDeletedButton.click (function () {
        editVars.hideDeleted = !editVars.hideDeleted;
        $('#deletedButtonText').text (editVars.hideDeleted ? 'Show' : 'Hide');
        $(grid).jqxGrid ({source: shooterAdapter});
      });
    },
  });

  $(grid).on ('rowdoubleclick', function (event) {
    if ($(grid).jqxGrid ('editable') === false)
      openPopupEditorEdit (event.args.rowindex);
  });

  //
  //  cellselect occurs for each clicking in a double-click before beginning a
  //  cell edit. If a user tries to click out of a cell while in edit mode, we
  //  want to send endcelledit. However, if we're clicking back INTO a cell
  //  that we're already editing, we don't want to send endcelledit.
  //
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
      if (editVars.ddeEditor)
        editVars.ddeEditor.jqxDropDownList ('close');

      editVars.ddeEditor = null;
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
      App.socket.emit ('shooter:print:inqueue', function (data) {
        $(grid).jqxGrid ('selectionmode', 'singlerow');
        $(grid).jqxGrid ('selectrow', event.args.rowindex);
        $('#contextEditCompetitorNum').text (event.args.rowindex + 1);
        $('#contextAddCompetitorNum').text ($(grid).jqxGrid ('getdatainformation').rowscount + 1);
        $('#contextPrintCountNum').text (data.inqueue || 0);
        $('#contextPrintListAdd').toggle (!App.matchData.m.match_shooters [event.args.rowindex].sh_print);
        $('#contextPrintListRemove').toggle (App.matchData.m.match_shooters [event.args.rowindex].sh_print);
        var scrollTop = $(window).scrollTop ();
        var scrollLeft = $(window).scrollLeft ();
        var contextMenu = App.contextMenuInit ();
        $(contextMenu).jqxMenu ('open', parseInt (event.args.originalEvent.clientX) + 5 + scrollLeft, parseInt (event.args.originalEvent.clientY) + 5 + scrollTop);
      });

      return false;
    }
  });

  App.switchToPagedMode = function () {
    $(grid).jqxGrid ({pageable: true, autoheight: true});
    $('#competitorsGrid .jqx-grid-pager').show (); // FIXME: 3.8.0 jqxGrid bug
    App.adjustGridHeight ();
  };

  App.switchToScrollMode = function () {
    $(grid).jqxGrid ({pageable: false, autoheight: false});
    $('#competitorsGrid .jqx-grid-pager').hide (); // FIXME: 3.8.0 jqxGrid bug
    App.adjustGridHeight ();
  };

  //
  //  Defer setting up right-click context menu until needed
  //
  App.contextMenuInit = function () {
    if (App.controls.contextMenu)
      return App.controls.contextMenu;

    var contextMenu = $('#contextMenu').jqxMenu ({
      width: 250,
      height: null,
      autoOpenPopup: false,
      mode: 'popup'
    });

    _.each (['sh_pos','sh_ln','sh_fn','sh_id','sh_dvp_fmt','sh_grd','sh_sqd','sh_ctgs_fmt','sh_age_fmt','sh_gen_fmt','sh_law_fmt','sh_mil_fmt','sh_frn_fmt','sh_eml','sh_ph','sh_st','sh_wlk_fmt','sh_dq_fmt','sh_del_fmt','sh_print_fmt'], function (n) {
      var sc = $('#sc_' + n);
      $(sc).jqxCheckBox ({checked: $(grid).jqxGrid ('iscolumnvisible', n)});
      $(sc).on ('change', function (event) {
        $(grid).jqxGrid ('beginupdate');
        $(grid).jqxGrid (event.args.checked ? 'showcolumn' : 'hidecolumn', $(this).attr ('id').slice (3));
        $(grid).jqxGrid ('endupdate');
      });
    });

    $(contextMenu).on ('closed', function () {
      $(grid).jqxGrid ('selectionmode', 'singlecell');
    });

    $('#contextNormalizeCase').each (function () {
      $(this).jqxTooltip ({
        width: 200,
        position: 'default',
        content: 'These options will normalize the first name, last name, address 1, address 2, and city fields to the correct form, where only the first letter of each is capitalized.',
        showDelay: 500,
        autoHideDelay: 0
      });
    });

    $('#contextDepersonalize').each (function () {
      $(this).jqxTooltip ({
        width: 200,
        position: 'default',
        content: 'These options will strip the competitor\'s email, phone number and address information (note that email and phone logging will be disabled)',
        showDelay: 500,
        autoHideDelay: 0
      });
    });

    $('#contextStripBadMembershipNumber').each (function () {
      $(this).jqxTooltip ({
        width: 200,
        position: 'default',
        content: 'These options will strip the competitor\'s SCSA number if it is improperly formatted (contains \'NONE\', \'PEN\', phone number, etc)',
        showDelay: 500,
        autoHideDelay: 0
      });
    });

    $('#contextObliterate').each (function () {
      $(this).jqxTooltip ({
        width: 200,
        position: 'default',
        content: 'Unlike marking a competitor as deleted, this will actually remove them from the match completely. This option is only enabled when the selected competitor has no scores.',
        showDelay: 500,
        autoHideDelay: 0
      });
    });

    $(contextMenu).on ('itemclick', function (event) {
      var rowIndex = $(grid).jqxGrid ('getselectedrowindex');

      switch (event.args.id) {
        case 'contextEditCompetitor' :
          openPopupEditorEdit (rowIndex);
          break;

        case 'contextAddCompetitor' :
          openPopupEditorAdd ();
          break;

        case 'contextNormalizeCaseThis' :
          App.socket.emit ('shooter:namecase:single', {uid: App.matchData.m.match_shooters [rowIndex].sh_uid}, function (data) {
            if (!data.err) {
              if (data.shooter) {
                App.matchData.m.match_shooters [rowIndex] = data.shooter;
                $(grid).jqxGrid ('updatebounddata', 'cells');
              } else {
                alert ('Eeek! data.shooter came back null! Report the Javascript console contents to JC.');
                console.log ('App.matchData.m.match_shooters [%s] -->', rowIndex);
                console.dir (App.matchData.m.match_shooters [rowIndex]);
                console.log ('data -->');
                console.dir (data);
              }
            } else
              alert (data.err);
          });
          break;
        case 'contextNormalizeCaseAll' :
          $(grid).jqxGrid ('showloadelement');
          App.socket.emit ('shooter:namecase:all', function (data) {
            if (!data.err) {
//              App.matchData.m = data.matchdef.m;
              shooterSource.localdata = data.matchdef.m.match_shooters;
              $(grid).jqxGrid ('updatebounddata', 'cells');
            } else
              alert (data.err);
            $(grid).jqxGrid ('hideloadelement');
          });
          break;

        case 'contextDepersonalizeThis' :
          App.socket.emit ('shooter:depersonalize:single', {uid: App.matchData.m.match_shooters [rowIndex].sh_uid}, function (data) {
            if (!data.err) {
              if (data.shooter) {
                App.matchData.m.match_shooters [rowIndex] = data.shooter;
                $(grid).jqxGrid ('updatebounddata', 'cells');
              } else {
                alert ('Eeek! data.shooter came back null! Report the Javascript console contents to JC.');
                console.log ('App.matchData.m.match_shooters [%s] -->', rowIndex);
                console.dir (App.matchData.m.match_shooters [rowIndex]);
                console.log ('data -->');
                console.dir (data);
              }
            } else
              alert (data.err);
          });
          break;
        case 'contextDepersonalizeAll' :
          $(grid).jqxGrid ('showloadelement');
          App.socket.emit ('shooter:depersonalize:all', function (data) {
            if (!data.err) {
              App.matchData.m = data.matchdef.m;
              shooterSource.localdata = data.matchdef.m.match_shooters;
              $(grid).jqxGrid ('updatebounddata', 'cells');
            } else
              alert (data.err);
          });
          break;

        case 'contextStripBadMembershipNumberThis' :
          App.socket.emit ('shooter:stripbadmembershipnumber:single', {uid: App.matchData.m.match_shooters [rowIndex].sh_uid}, function (data) {
            if (!data.err) {
              if (data.shooter) {
                App.matchData.m.match_shooters [rowIndex] = data.shooter;
                $(grid).jqxGrid ('updatebounddata', 'cells');
              } else {
                alert ('Eeek! data.shooter came back null! Report the Javascript console contents to JC.');
                console.log ('App.matchData.m.match_shooters [%s] -->', rowIndex);
                console.dir (App.matchData.m.match_shooters [rowIndex]);
                console.log ('data -->');
                console.dir (data);
              }
            } else
              alert (data.err);
          });
          break;
        case 'contextStripBadMembershipNumberAll' :
          $(grid).jqxGrid ('showloadelement');
          App.socket.emit ('shooter:stripbadmembershipnumber:all', function (data) {
            if (!data.err) {
              App.matchData.m = data.matchdef.m;
              shooterSource.localdata = data.matchdef.m.match_shooters;
              $(grid).jqxGrid ('updatebounddata', 'cells');
            } else
              alert (data.err);
          });
          break;

        case 'contextPrintListAdd' :
          App.socket.emit ('shooter:print:add', {uid: App.matchData.m.match_shooters [rowIndex].sh_uid}, function (data) {
            if (!data.err) {
              App.matchData.m.match_shooters [rowIndex] = data.shooter;
              $(grid).jqxGrid ('updatebounddata', 'cells');
            } else
              alert (data.err);
          });
          break;
        case 'contextPrintListRemove' :
          App.socket.emit ('shooter:print:remove', {uid: App.matchData.m.match_shooters [rowIndex].sh_uid}, function (data) {
            if (!data.err) {
              App.matchData.m.match_shooters [rowIndex] = data.shooter;
              $(grid).jqxGrid ('updatebounddata', 'cells');
            } else
              alert (data.err);
          });
          break;
        case 'contextPrintListClear' :
          $(grid).jqxGrid ('showloadelement');
          App.socket.emit ('shooter:print:clear', function (data) {
            if (!data.err) {
              App.matchData.m = data.matchdef.m;
              shooterSource.localdata = data.matchdef.m.match_shooters;
              $(grid).jqxGrid ('updatebounddata', 'cells');
            } else
              alert (data.err);
            $(grid).jqxGrid ('hideloadelement');
          });
          break;

        case 'contextSwitchPaged' :
          App.switchToPagedMode ();
          $('#contextSwitchPaged').jqxGrid ('disabled', true);
          $('#contextSwitchScroll').jqxGrid ('disabled', false);
          break;
        case 'contextSwitchScroll' :
          App.switchToScrollMode ();
          $('#contextSwitchPaged').jqxGrid ('disabled', false);
          $('#contextSwitchScroll').jqxGrid ('disabled', true);
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

        case 'contextCategoryViewTraditional' :
          $(grid).jqxGrid ('beginupdate');
          $(grid).jqxGrid ('hidecolumn', 'sh_ctgs_fmt');
          _.each (['sh_age', 'sh_gen', 'sh_law', 'sh_mil', 'sh_frn'], function (field) {
            $(grid).jqxGrid ('showcolumn', field);
          });
          $(grid).jqxGrid ('endupdate');
          $('[hide-if-ucl]').show ();
          $('[show-if-ucl]').hide ();
          break;
        case 'contextCategoryViewPractiscore' :
          $(grid).jqxGrid ('beginupdate');
          $(grid).jqxGrid ('showcolumn', 'sh_ctgs_fmt');
          _.each (['sh_age', 'sh_gen', 'sh_law', 'sh_mil', 'sh_frn'], function (field) {
            $(grid).jqxGrid ('hidecolumn', field);
          });
          $(grid).jqxGrid ('endupdate');
          $('[hide-if-ucl]').hide ();
          $('[show-if-ucl]').show ();
          break;
        case 'contextCategoryViewBoth' :
          $(grid).jqxGrid ('beginupdate');
          _.each (['sh_ctgs_fmt', 'sh_age', 'sh_gen', 'sh_law', 'sh_mil', 'sh_frn'], function (field) {
            $(grid).jqxGrid ('showcolumn', field);
          });
          $(grid).jqxGrid ('endupdate');
          $('[hide-if-ucl]').hide ();
          $('[show-if-ucl]').show ();
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
      width: 850,
      height: 386,
      maxWidth: 1000,
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
      title: editVars.popupMode === 'edit' ? 'Edit Competitor' : 'Add Competitor',
    });

    $('#ec-sh-ln').jqxInput ({width: 200, height: 25, maxLength: 20, source: autocompleteLastNameAdapter});
    $('#ec-sh-fn').jqxInput ({width: 170, height: 25, maxLength: 15, source: autocompleteFirstNameAdapter});
    $('#ec-sh-id-prefix').jqxDropDownList ({width: 50, autoDropDownHeight: true, dropDownWidth: 180, source: prefixesAdapter});
    $('#ec-sh-id-num').jqxInput ({width: 55, height: 25, maxLength: 6});

    $('#ec-sh-dvp').jqxDropDownList ({width: 155, autoDropDownHeight: true, dropDownWidth: 140, source: divisionsAdapter });
    $('#ec-sh-grd').jqxDropDownList ({width: 50, autoDropDownHeight: true, source: classesAdapter});

    $('#ec-sh-sqd').jqxNumberInput ({width: 60, decimalDigits: 0, min: 0, max: 9999, inputMode: 'simple', spinButtons: true});
    $('#ec-sh-age').jqxDropDownList ({width: 115, autoDropDownHeight: true, source: agesAdapter});
    $('#ec-sh-gen').jqxDropDownList ({width: 75, autoDropDownHeight: true, source: gendersAdapter});
    $('#ec-sh-ctgs').jqxDropDownList ({width: 170, autoDropDownHeight: true, enableBrowserBoundsDetection: true, displayMember: 'label', valueMember: 'value', checkboxes: true, source: categoriesAdapter, placeHolder: ''});

    $('#ec-sh-law').jqxDropDownList ({width: 50, autoDropDownHeight: true, source: yesnoAdapter});
    $('#ec-sh-mil').jqxDropDownList ({width: 50, autoDropDownHeight: true, source: yesnoAdapter});
    $('#ec-sh-frn').jqxDropDownList ({width: 50, autoDropDownHeight: true, source: yesnoAdapter});

    $('#ec-sh-staff').jqxDropDownList ({width: 50, autoDropDownHeight: true, source: yesnoAdapter});
    $('#ec-sh-paid').jqxDropDownList ({width: 50, autoDropDownHeight: true, source: yesnoAdapter});
    $('#ec-sh-here').jqxDropDownList ({width: 50, autoDropDownHeight: true, source: yesnoAdapter});

    $('#ec-sh-wlk').jqxDropDownList ({width: 50, autoDropDownHeight: true, source: yesnoAdapter});
    $('#ec-sh-dq').jqxDropDownList ({width: 50, autoDropDownHeight: true, source: yesnoAdapter});
    $('#ec-sh-del').jqxDropDownList ({width: 50, autoDropDownHeight: true, source: yesnoAdapter});

    $('#ec-sh-lge').jqxDropDownList ({width: 50, autoDropDownHeight: true, source: yesnoAdapter});
    $('#ec-sh-lgp').jqxDropDownList ({width: 50, autoDropDownHeight: true, source: yesnoAdapter});

    $('#ec-sh-ph').jqxMaskedInput ({width: 96, mask: '###-###-####'});
    $('#ec-sh-eml').jqxInput ({width: 200, height: 25, maxLength: 50});

    $('#ec-sh-addr1').jqxInput ({width: 200, height: 25, maxLength: 30});
    $('#ec-sh-addr2').jqxInput ({width: 200, height: 25, maxLength: 30});

    $('#ec-sh-city').jqxInput ({width: 200, height: 25, maxLength: 30});
    $('#ec-sh-st').jqxDropDownList ({width: 135, source: statesAdapter});
    $('#ec-sh-zipcode').jqxMaskedInput ({width: 83, mask: '#####-####'});

    $('#popupEdit').on ('open', function () {
      $('#ec-sh-ln').jqxInput ('focus');
    });

    $('#popupEdit').on ('close', function () {
      $('#popupEdit').jqxValidator ('hide');
    });

    $("[id^='ec-']").on ('focus', function () {
      $(this).addClass ('jqx-menu-item-top-hover-' + pmmui.theme);
    });
    $("[id^='ec-']").on ('focusout', function () {
      $(this).removeClass ('jqx-menu-item-top-hover-' + pmmui.theme);
    });

    $('#ec-resetButton').on ('click', function () {
      $('#popupEdit').jqxValidator ('hide');
      populatePopupFields ();
    });

    $('#ec-cancelButton').on ('click', function () {
      $('#popupEdit').jqxValidator ('hide');
    });

    $('#ec-saveButton').on ('click', function () {
      $('#popupEdit').jqxValidator ('validate');
    });

    $('#ec-sh-ln').on ('select', function (event) {
      if (event && event.args && event.args.value)
        autocompleteShooter (parseInt (event.args.value));
    });

    $('#ec-sh-fn').on ('select', function (event) {
      if (event && event.args && event.args.value)
        autocompleteShooter (parseInt (event.args.value));
    });

    $('#ec-sh-id-prefix').on ('change close', function () {
      var item = $('#ec-sh-id-prefix').jqxDropDownList ('getSelectedItem');

      $('#ec-sh-id-prefix').jqxDropDownList ('setContent', item.value);

      if (item.value === '') {
        $('#ec-sh-id-num').jqxInput ('val', '');
        $('#ec-sh-id-num').jqxInput ('disabled', true);
        $('#popupEdit').jqxValidator ('hideHint', '#ec-sh-id-num');
      } else
        $('#ec-sh-id-num').jqxInput ('disabled', false);
    });

    $('#ec-sh-sqd').on ('dblclick', function () {
      var offset = $('#popupEdit').offset ();
      var popupSquads = App.popupSquadsInit ();

      $(popupSquads).jqxWindow ({position: {x: offset.left + 220, y: offset.top + 67}});
      $(popupSquads).jqxWindow ('open');
    });

    if (editVars.useCategoryList) {
      $('[hide-if-ucl]').hide ();
      $('[show-if-ucl]').show ();
    } else {
      $('[hide-if-ucl]').show ();
      $('[show-if-ucl]').hide ();
    }

    $(popupEdit).jqxValidator ({
      focus: true,
      closeOnClick: false,
      onSuccess: function () {
        var dataRecord = editVars.popupDataRecord;

        $(popupEdit).jqxWindow ('close');

        dataRecord.sh_addr1   = $('#ec-sh-addr1').val ();
        dataRecord.sh_addr2   = $('#ec-sh-addr2').val ();
        dataRecord.sh_age     = $('#ec-sh-age').val ();
        dataRecord.sh_city    = $('#ec-sh-city').val ();
        dataRecord.sh_ctgs    = _.pluck ($('#ec-sh-ctgs').jqxDropDownList ('getCheckedItems'), 'label');
        dataRecord.sh_del     = $('#ec-sh-del').jqxDropDownList ('getSelectedItem').value;
        dataRecord.sh_dq      = $('#ec-sh-dq').jqxDropDownList ('getSelectedItem').value;
        dataRecord.sh_dvp     = $('#ec-sh-dvp').jqxDropDownList ('getSelectedItem').value;
        dataRecord.sh_eml     = $('#ec-sh-eml').val ();
        dataRecord.sh_fn      = $('#ec-sh-fn').val ();
        dataRecord.sh_frn     = $('#ec-sh-frn').jqxDropDownList ('getSelectedItem').value;
        dataRecord.sh_gen     = $('#ec-sh-gen').jqxDropDownList ('getSelectedItem').value;
        dataRecord.sh_grd     = $('#ec-sh-grd').jqxDropDownList ('getSelectedItem').value;
        dataRecord.sh_here    = $('#ec-sh-here').jqxDropDownList ('getSelectedItem').value;
        dataRecord.sh_id      = $('#ec-sh-id-prefix').val () + $('#ec-sh-id-num').val ();
        dataRecord.sh_law     = $('#ec-sh-law').jqxDropDownList ('getSelectedItem').value;
        dataRecord.sh_lge     = $('#ec-sh-lge').jqxDropDownList ('getSelectedItem').value;
        dataRecord.sh_lgp     = $('#ec-sh-lgp').jqxDropDownList ('getSelectedItem').value;
        dataRecord.sh_ln      = $('#ec-sh-ln').val ();
        dataRecord.sh_mil     = $('#ec-sh-mil').jqxDropDownList ('getSelectedItem').value;
        dataRecord.sh_paid    = $('#ec-sh-paid').jqxDropDownList ('getSelectedItem').value;
        dataRecord.sh_ph      = $('#ec-sh-ph').val ().replace (/[^0-9]/g, '');
        dataRecord.sh_sqd     = parseInt ($('#ec-sh-sqd').val ());
        dataRecord.sh_st      = $('#ec-sh-st').jqxDropDownList ('getSelectedItem').value;
        dataRecord.sh_staff   = $('#ec-sh-staff').jqxDropDownList ('getSelectedItem').value;
        dataRecord.sh_wlk     = $('#ec-sh-wlk').jqxDropDownList ('getSelectedItem').value;
        dataRecord.sh_zipcode = $('#ec-sh-zipcode').val ().replace (/[^0-9]/g, '');

        dataRecord.sh_age_fmt = $('#ec-sh-age').jqxDropDownList ('getSelectedItem').label;
        dataRecord.sh_del_fmt = $('#ec-sh-del').jqxDropDownList ('getSelectedItem').label;
        dataRecord.sh_dq_fmt  = $('#ec-sh-dq').jqxDropDownList ('getSelectedItem').label;
        dataRecord.sh_dvp_fmt = $('#ec-sh-dvp').jqxDropDownList ('getSelectedItem').label;
        dataRecord.sh_frn_fmt = $('#ec-sh-frn').jqxDropDownList ('getSelectedItem').label;
        dataRecord.sh_gen_fmt = $('#ec-sh-gen').jqxDropDownList ('getSelectedItem').label;
        dataRecord.sh_grd_fmt = $('#ec-sh-grd').jqxDropDownList ('getSelectedItem').label;
        dataRecord.sh_here_fmt = $('#ec-sh-here').jqxDropDownList ('getSelectedItem').label;
        dataRecord.sh_law_fmt = $('#ec-sh-law').jqxDropDownList ('getSelectedItem').label;
        dataRecord.sh_lge_fmt = $('#ec-sh-lge').jqxDropDownList ('getSelectedItem').label;
        dataRecord.sh_lgp_fmt = $('#ec-sh-lgp').jqxDropDownList ('getSelectedItem').label;
        dataRecord.sh_mil_fmt = $('#ec-sh-mil').jqxDropDownList ('getSelectedItem').label;
        dataRecord.sh_paid_fmt = $('#ec-sh-paid').jqxDropDownList ('getSelectedItem').label;
        dataRecord.sh_staff_fmt = $('#ec-sh-staff').jqxDropDownList ('getSelectedItem').label;
        dataRecord.sh_wlk_fmt = $('#ec-sh-wlk').jqxDropDownList ('getSelectedItem').label;

        if (editVars.popupMode === 'edit')
          $(grid).jqxGrid ('updaterow', editVars.popupRowIndex, dataRecord);
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
              }, 10, $(grid).jqxGrid ('getrows').length);
            })();
          }
        }
        else
          alert ('WTF?!? editVars.popupMode isn\'t edit or add!');

        editVars.popupRowIndex = -1;
      },
      rules: [
        {
          input:    '#ec-sh-ln',
          position: 'bottom',
          message:  'Last name is required',
          action:   'keyup, blur',
          rule:     'required'
        },
        {
          input:    '#ec-sh-ln',
          position: 'bottom',
          message:  'Last name may only contain the characters A-Z, a-z, 0-9, period, dash, comma, and space',
          action:   'keyup, blur',
          rule:     function (input) {
                      return (input.val ().search (/[^A-Za-z0-9\., -]/) === -1) ? true : false;
                    }
        },
        {
          input:    '#ec-sh-fn',
          position: 'bottom',
          message:  'First name is required',
          action:   'keyup, blur',
          rule:     'required'
        },
        {
          input:    '#ec-sh-fn',
          position: 'bottom',
          message:  'First name may only contain the characters A-Z, a-z, 0-9, period, dash and space',
          action:   'keyup, blur',
          rule:     function (input) {
                      return (input.val ().search (/[^A-Za-z0-9\. -]/) === -1) ? true : false;
                    }
        },
        {
          input:    '#ec-sh-dvp',
          position: 'bottom',
          message:  'A valid division must be selected',
          rule:      function (input) {
                       return (input.val ().trim ().length === 0) ? false : true;
                     }
        },
        {
          input:    '#ec-sh-grd',
          position: 'bottom',
          message:  'A valid class must be selected',
          rule:      function (input) {
                       return (input.val ().trim ().length === 0) ? false : true;
                     }
        },
        {
          input:    '#ec-sh-eml',
          position: 'bottom',
          message:  'Not a correctly formatted email address',
          action:   'keyup',
          rule:     'email'
        },
        {
          input:    '#ec-sh-ph',
          position: 'bottom',
          message:  'Not a correctly formatted phone number',
          action:   'valuechanged, blur',
          rule:     function (input) {
                      var phone = input.val ();
                      return (!phone.search (/\d{3}-\d{3}-\d{4}/) || !phone.search (/_{3}-_{3}-_{4}/)) ? true : false;
                    }
        },
        {
          input:    '#ec-sh-zipcode',
          position: 'bottom',
          message:  'Not a correctly formatted ZIP Code(tm)',
          action:   'valuechanged, blur',
          rule:     function (input) {
                      var zip = input.val ();
                      return (!zip.search (/\d{5}-_{4}/) || !zip.search (/\d{5}-\d{4}/) || !zip.search (/_{5}-_{4}/)) ? true : false;
                    }
        },
        {
          input:    '#ec-sh-id-num',
          position: 'bottom',
          message:  'Number portion cannot be blank when prefix is present',
          action:   'valuechanged, blur',
          rule:     function (input) {
                      var num = input.val ().trim ();
                      var prefix = $('#ec-sh-id-prefix').val ().trim ();
                      return ((prefix !== '') && (num.length === 0)) ? false : true;
                    }
        },
        {
          input:    '#ec-sh-id-num',
          position: 'bottom',
          message:  'Number portion may only contain the digits 0-9',
          action:   'valuechanged, blur',
          rule:     function (input) {
                      var num = input.val ().trim ();
                      var prefix = $('#ec-sh-id-prefix').val ().trim ();
                      return ((!prefix.length && !num.length) || (num.match (/^[0-9]{1,9}$/))) ? true : false;
                    }
        },
        {
          input:    '#ec-sh-id-num',
          position: 'bottom',
          message:  'This SCSA # is in use by a competitor with a different name',
          action:   'valuechanged, blur',
          rule:     function (input) {
                      var num = input.val ().trim ();
                      var prefix = $('#ec-sh-id-prefix').val ().trim ();
                      var count = 0;

                      if ((prefix !== '') && (num.length !== 0)) {
                        var sh_id = prefix + num.toString ();
                        var sh_ln = $('#ec-sh-ln').val ().trim ().toUpperCase ();
                        var sh_fn = $('#ec-sh-fn').val ().trim ().toUpperCase ();
                        var sh_uid = editVars.popupDataRecord.sh_uid;

                        _.each (App.matchData.m.match_shooters, function (s) {
                          if ((sh_id === s.sh_id) && (sh_uid !== s.sh_uid) && ((sh_fn !== s.sh_fn.toUpperCase ()) || (sh_ln !== s.sh_ln.toUpperCase ())))
                            ++count;
                        });
                      }

                      return count ? false : true;
                    }
        },
      ]
    });

    return (App.controls.popupEdit = popupEdit);
  };

  //
  //  Defer initialization of popup squads until it's needed
  //
  App.popupSquadsInit = function () {
    if (App.controls.popupSquads)
      return App.controls.popupSquads;

    var popupSquads = $('#popupSquads').jqxWindow ({
      width: 400,
      height: 400,
      resizable: false,
      isModal: true,
      autoOpen: false,
      modalOpacity: 0.25,
      showCloseButton: true,
      title: 'Squad Distribution'
    });

    $('#popupSquads').on ('open', function () {
      if (App.matchData.m.match_shooters.length) {
        var squads = {};
        var source = [];
        var longestLabel = 0;
        _.each (App.matchData.m.match_shooters, function (shooter) {
          squads [shooter.sh_sqd] = squads [shooter.sh_sqd] || [];
          squads [shooter.sh_sqd].push (shooter);
        });
        _.each (_.sortBy (_.keys (squads), function (n) { return parseInt (n);}), function (squadKey) {
          var squad = squads [squadKey];
          var shooterList = [];
          _.each (_.sortByAll (squad, ['sh_ln', 'sh_fn']), function (shooter) {
            var label = shooter.sh_fn +
                        ' ' +
                        shooter.sh_ln +
                        ' (' +
                        (shooter.sh_id.length ? shooter.sh_id + ', ' : '') +
                        _.result (_.find (divisionsSource.localdata, 'value', shooter.sh_dvp), 'label') +
                        ')';
            if (label.length > longestLabel)
              longestLabel = label.length;
            shooterList.push ({
              label: label,
              value: shooter.sh_sqd
            });
          });
          source.push ({
            label: 'Squad ' + squadKey + ' (' + squad.length + ')',
            items: shooterList,
            value: squadKey
          });
        });

        longestLabel = (longestLabel + 3) * 8;
        $('#sp-tree').jqxTree ({source: source, width: longestLabel});
        $('#sp-noCompetitors').hide ();
        $('#sp-tree').show ();
        $('#popupSquads').jqxWindow ({height: 400, width: longestLabel + 10});
      } else {
        $('#sp-tree').hide ();
        $('#sp-noCompetitors').show ();
        $('#popupSquads').jqxWindow ({height: 70, width: 210});
      }
    });

    $('#popupSquads').on ('close', function () {
      $('#ec-sh-sqd').jqxNumberInput ('focus');
      $('#ec-sh-sqd').jqxNumberInput ('val', $('#ec-sh-sqd').jqxNumberInput ('val'));
    });

    $('#sp-tree').jqxTree ({
      width: $('#popupSquads').jqxWindow ('width') - 10,
      height: $('#popupSquads').jqxWindow ('height'),
      source: []
    });

    $('#sp-tree').on ('select', function (event) {
      var args = event.args;
      var item = $(this).jqxTree ('getItem', args.element);
      $('#popupSquads').jqxWindow ('close');
      $('#ec-sh-sqd').jqxNumberInput ('val', item.value);
    });

    return (App.controls.popupSquads = popupSquads);
  };

  //
  //
  //
  App.refreshMatchData = function () {
    App.socket.emit ('match:get', {options: {match: true}}, function (data) {
      App.matchData = data.matchData;
      $('#matchname').text (data.matchData.m.match_name);

      var setValues = function (object) {
        return {value: object.ps_name, label: object.pmm_name};
      };

      categoriesSource.localdata = _.map (_.filter (data.matchData.m._categories, {enabled: true}), setValues);
      classesSource.localdata = _.map (_.filter (data.matchData.m._classes, {enabled: true}), setValues);
      divisionsSource.localdata = _.map (_.filter (data.matchData.m._divisions, {enabled: true}), setValues);

      categoriesAdapter.dataBind ();
      classesAdapter.dataBind ();
      divisionsAdapter.dataBind ();

      shooterSource.datafields [_.findIndex (shooterSource.datafields, {name: 'sh_grd_fmt'})].values.source = classesAdapter.records;
      shooterSource.datafields [_.findIndex (shooterSource.datafields, {name: 'sh_dvp_fmt'})].values.source = divisionsAdapter.records;

      shooterSource.localdata = data.matchData.m.match_shooters;
      $(grid).jqxGrid ({source: shooterAdapter});
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
    $('#popupEdit').jqxValidator ('hide');
    $('#popupEdit').jqxWindow ('close');
    $('#popupSquads').jqxWindow ('close');
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  };

  App.competitorUpdated = function (param) {
    if (param.shooter) {
      if (param.shooter.sh_uid) {
        var index = _.findIndex (App.matchData.m.match_shooters, 'sh_uid', param.shooter.sh_uid);

        if (index !== -1)
          App.matchData.m.match_shooters [index] = param.shooter;
        else
          App.matchData.m.match_shooters.push (param.shooter);

        $(grid).jqxGrid ('endcelledit', editVars.selectedRowindex, editVars.selectedDatafield, true);
        $(grid).jqxGrid ('updatebounddata', 'cells');
      } else
        alert ('competitorUpdated() has shooter with no UID');
    } else
      alert ('competitorUpdated() has no param!');
  };

  App.reload = function () {
    alert ('New match loaded, reloading editing page!');
    window.location.href = 'http://' + window.location.host + '/edit/competitors';
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_updated', App.refreshMatchData);
  App.socket.on ('competitor_updated', App.competitorUpdated);
  App.socket.on ('competitor_added', App.competitorUpdated);
  App.socket.on ('reload', App.reload);

  App.socket.emit ('log:log', {msg: 'Edit/View->Competitors (SC)'});

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
