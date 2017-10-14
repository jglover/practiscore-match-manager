/* jshint devel:true */
/* global io,sprintf */
/* global _:false */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
    usecategorylist: $('#pmmui').attr ('usecategorylist') === "true" ? true : false,
  };

  $.jqx.theme = pmmui.theme;

  var tabNumber_Competitor = 0;
  var tabNumber_Squads = 1;
  var tabNumber_Options = 2;

  var editVars = {
    matchtype: $('#pmmui').attr ('pmmmatchtype'),
    useCategoryList: pmmui.usecategorylist,
    pageHeight: 588,
    updateSquadsTab: true,
    competitor: {},
    competitorBackup: {},
    openTrees: {},
    squadTabTreeSelectEvent: false,
    competitorListSelectEvent: false,
    accounting: {},
    competitors: null,
    matchID: null,
    options: {
      sortMethod: 'name',
      sortReverse: false,
      hideDeleted: false,
      hidePresent: false,
      squadsTabCollapseAll: false,
      squadsMultipleOpen: false,
      squadsUseShowList: false,
      squadsShowList: {},
      squadsHideUnshown: false,
      competitorNoAutocomplete: false,
      accountingPanelHide: false,
    },
    tabsInitialized: {},
  };

  var matchtypes = ['gadpa', 'idpa', 'sc', 'tp', 'tpp', 'uspsa'];

  switch (editVars.matchtype) {
    case 'gadpa': editVars.matchIsGADPA = true; break;
    case 'idpa':  editVars.matchIsIDPA  = true; break;
    case 'sc':    editVars.matchIsSC    = true; break;
    case 'tp':    editVars.matchIsTP    = true; break;
    case 'tpp':   editVars.matchIsTPP   = true; break;
    case 'uspsa': editVars.matchIsUSPSA = true; break;
  }

  $('[delete-if-' + ((editVars.matchIsSC || editVars.matchIsUSPSA) ? '' : 'not-') + 'uspsasc]').remove ();

  _.each (matchtypes, function (matchtype) {
    if (matchtype !== editVars.matchtype)
      $('[delete-if-not-' + matchtype + ']').remove ();
  });
  _.each (matchtypes, function (matchtype) {
    if (matchtype === editVars.matchtype)
      $('[delete-if-' + matchtype + ']').remove ();
  });

  //
  //  Only Steel Challenge and USPSA allow traditional age/gender/LEO/etc,
  //  because those match types have specific rules. If using one of those
  //  match types and they want to use unrecognized ages and such, then
  //  they'll need to enable using the category list in the UI config
  //
  if (!editVars.matchIsSC && !editVars.matchIsUSPSA)
    editVars.useCategoryList = true;

  //
  //  If we're using the category list, delete the traditional age/gender/etc
  //  elements. If we're not, then delete the fields for category lists.
  //
  $(editVars.useCategoryList ? '[delete-if-ucl]' : '[delete-if-not-ucl]').remove ();

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
  var competitorSort = [
    { value: 'name',                 label: 'Name'                    },
    { value: 'nothere_here_deleted', label: 'Not Here, Here, Deleted' },
    { value: 'nothere_deleted_here', label: 'Not Here, Deleted, Here' },
    { value: 'here_nothere_deleted', label: 'Here, Not Here, Deleted' },
    { value: 'here_deleted_nothere', label: 'Here, Deleted, Not Here' },
    { value: 'deleted_here_nothere', label: 'Deleted, Here, Not Here' },
    { value: 'deleted_nothere_here', label: 'Deleted, Not Here, Here' },
  ];
  var genders = [
    { value: 'MALE',   label: 'Male',   display: '&nbsp;', },
    { value: 'FEMALE', label: 'Female', display: 'Y',      },
  ];
  var ages = [
    { value: 'ADULT',  label: 'Adult',        display: '&nbsp;',       },
    { value: 'JUNIOR', label: 'Junior',       display: 'Junior',       },
    { value: 'SENIOR', label: 'Senior',       display: 'Senior',       },
    { value: 'SUPSNR', label: 'Super Senior', display: 'Super Senior', },
  ];
  var powerfactors = [
    { value: 'MINOR', label: 'Minor', },
    { value: 'MAJOR', label: 'Major', },
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

  var competitorSortSource = {
    datatype: 'array',
    datafields: [
      { name: 'value',   type: 'string' },
      { name: 'label',   type: 'string' },
    ],
    localdata: competitorSort,
  };

  var competitorSortAdapter = new $.jqx.dataAdapter (competitorSortSource, {
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

  var powerfactorsSource = {
    datatype: 'array',
    datafields: [
      { name: 'value',   type: 'string' },
      { name: 'label',   type: 'string' },
      { name: 'display', type: 'string' }
    ],
    localdata: powerfactors,
  };

  var powerfactorsAdapter = new $.jqx.dataAdapter (powerfactorsSource, {
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

  var competitorSource = {
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
      { name: 'sh_here',      type: 'boolean' },
      { name: 'sh_id',        type: 'string'  },
      { name: 'sh_law',       type: 'boolean' },
      { name: 'sh_lge',       type: 'boolean' },
      { name: 'sh_lgp',       type: 'boolean' },
      { name: 'sh_ln',        type: 'string'  },
      { name: 'sh_mil',       type: 'boolean' },
      { name: 'sh_num',       type: 'number'  },
      { name: 'sh_paid',      type: 'boolean' },
      { name: 'sh_pf',        type: 'string'  },
      { name: 'sh_ph',        type: 'string'  },
      { name: 'sh_pos',       type: 'number'  },
      { name: 'sh_sqd',       type: 'number'  },
      { name: 'sh_staff',     type: 'boolean' },
      { name: 'sh_st',        type: 'string'  },
      { name: 'sh_uid',       type: 'string'  },
      { name: 'sh_uuid',      type: 'string'  },
      { name: 'sh_wlk',       type: 'boolean' },
      { name: 'sh_zipcode',   type: 'string'  },
      { name: 'sh_print',     type: 'boolean' },

      { name: 'sh_lnfnid',    type: 'string'  },
      { name: 'sh_ctgs',      type: 'array'   },
      { name: 'sh_ctgs_fmt',  type: 'string'  },

      { name: 'sh_age_fmt',   value: 'sh_age',   values: { source: agesAdapter.records,         value: 'value', name: 'label' }},
      { name: 'sh_del_fmt',   value: 'sh_del',   values: { source: yesnoAdapter.records,        value: 'value', name: 'label' }},
      { name: 'sh_dq_fmt',    value: 'sh_dq',    values: { source: yesnoAdapter.records,        value: 'value', name: 'label' }},
      { name: 'sh_dvp_fmt',   value: 'sh_dvp',   values: { source: divisionsAdapter.records,    value: 'value', name: 'label' }},
      { name: 'sh_frn_fmt',   value: 'sh_frn',   values: { source: yesnoAdapter.records,        value: 'value', name: 'label' }},
      { name: 'sh_gen_fmt',   value: 'sh_gen',   values: { source: gendersAdapter.records,      value: 'value', name: 'label' }},
      { name: 'sh_grd_fmt',   value: 'sh_grd',   values: { source: classesAdapter.records,      value: 'value', name: 'label' }},
      { name: 'sh_here_fmt',  value: 'sh_here',  values: { source: yesnoAdapter.records,        value: 'value', name: 'label' }},
      { name: 'sh_law_fmt',   value: 'sh_law',   values: { source: yesnoAdapter.records,        value: 'value', name: 'label' }},
      { name: 'sh_lge_fmt',   value: 'sh_lge',   values: { source: yesnoAdapter.records,        value: 'value', name: 'label' }},
      { name: 'sh_lgp_fmt',   value: 'sh_lgp',   values: { source: yesnoAdapter.records,        value: 'value', name: 'label' }},
      { name: 'sh_mil_fmt',   value: 'sh_mil',   values: { source: yesnoAdapter.records,        value: 'value', name: 'label' }},
      { name: 'sh_paid_fmt',  value: 'sh_paid',  values: { source: yesnoAdapter.records,        value: 'value', name: 'label' }},
      { name: 'sh_pf_fmt',    value: 'sh_pf',    values: { source: powerfactorsAdapter.records, value: 'value', name: 'label' }},
      { name: 'sh_staff_fmt', value: 'sh_staff', values: { source: yesnoAdapter.records,        value: 'value', name: 'label' }},
      { name: 'sh_wlk_fmt',   value: 'sh_wlk',   values: { source: yesnoAdapter.records,        value: 'value', name: 'label' }},
      { name: 'sh_print_fmt', value: 'sh_print', values: { source: yesnoAdapter.records,        value: 'value', name: 'label' }},
    ],
    localdata: [],
  };

  var competitorAdapter = new $.jqx.dataAdapter (competitorSource);

  var competitorSearchSource = {
    datatype: 'array',
    datafields: [
      { name: 'sh_del',    type: 'boolean' },
      { name: 'sh_here',   type: 'boolean' },
      { name: 'sh_lnfnid', type: 'string'  },
      { name: 'sh_uid',    type: 'string'  },
    ],
    localdata: [],
  };

  var competitorSearchAdapter = new $.jqx.dataAdapter (competitorSearchSource);

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
          var list = $.map (records.matches, function (competitor) {
            return {
              label: competitor.sh_fn + ' ' + competitor.sh_ln + (competitor.sh_id.length ? ' (' + competitor.sh_id + ')' : ''),
              value: competitor.id,
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

  //
  //
  //
  var saveCheckinSettings = function () {
    var settings = {};

    $('[config-save]').each (function () {
      var id = $(this).attr ('id');
      var controltype = $(this).attr ('controltype');

      if (controltype === 'checkbox')
        settings [id] = $(this).jqxCheckBox ('checked');
      else if (controltype === 'radiobutton')
        settings [id] = $(this).jqxRadioButton ('checked');
      else if (controltype === 'input')
        settings [id] = $(this).jqxInput ('val');
      else if ((controltype === 'numberinput') || (controltype === 'joginput'))
        settings [id] = $(this).jqxNumberInput ('val');
      else if (controltype === 'dropdownlist')
        settings [id] = $(this).jqxDropDownList ('getSelectedItem').value;
      else
        alert ('Eeek! ' + id + ' isn\'t checkbox, radiobutton, input, numberinput, joginput, or dropdownlist!', id);
    });

    editVars.socket.emit ('settings:checkin:save', {
      uuid: editVars.matchID,
      settings: {
        optionsControls: settings,
        optionsSettings: editVars.options,
      },
    }, function (data) {
      if (data.err)
        alert ('Error saving checkin settings: ' + data.err);
    });

    return settings;
  };

  var loadCheckinSettings = function (savedVars) {
    savedVars = savedVars || {};
    editVars.optionsControls = savedVars.optionsControls || {};
    editVars.options = savedVars.optionsSettings || editVars.options;

    $('#panel-accounting').toggle (!editVars.options.accountingPanelHide);
  };

  //
  //  Update competitor list box with all competitors matching first name, last
  //  name, membership number, phone, and email
  //
  var updateCompetitorListBox = function () {
    var input = $('#input-search').val ();
    var regex = new RegExp (input, "i");

    competitorSearchSource.localdata = _.filter (competitorAdapter.records, function (competitor) {
      return competitor.sh_lnfnid.match (regex) || competitor.sh_ph.match (regex) || competitor.sh_eml.match (regex);
    });

    competitorSearchAdapter.dataBind ();

    $('#listbox-competitors').jqxListBox ('refresh');

    if (editVars.competitor && editVars.competitor.sh_uid) {
      $('#listbox-competitors').jqxListBox ('selectItem', $('#listbox-competitors').jqxListBox ('getItemByValue', editVars.competitor.sh_uid));
    }
  };

  //
  //  Update the summary window. Could probably be optimized not to run if
  //  nothing's changed, but meh...  Does assume that competitorAdapter is
  //  current.
  //
  var updateSummaryWindow = function () {
    var squadsTotal = {};
    var squadsHere = {};
    var squadsNotHere = {};
    var squadsDeleted = {};
    var squadsNotDeleted = {};
    var totalHere = 0;
    var totalNotHere = 0;
    var totalDeleted = 0;
    var totalNotDeleted = 0;
    var squadSmallestCount = 1000000;
    var squadLargestCount = 0;

    _.each (editVars.competitors, function (competitor) {
      var squad = parseInt (competitor.sh_sqd);

      squadsTotal [squad] = squadsTotal [squad] || 0;
      squadsTotal [squad]++;

      if (!competitor.sh_del) {
        if (competitor.sh_here) {
          squadsHere [squad] = squadsHere [squad] || 0;
          squadsHere [squad]++;
          totalHere++;
        } else {
          squadsNotHere [squad] = squadsNotHere [squad] || 0;
          squadsNotHere [squad]++;
          totalNotHere++;
        }
        squadsNotDeleted [squad] = squadsNotDeleted [squad] || 0;
        squadsNotDeleted [squad]++;
        totalNotDeleted++;
      } else {
        squadsDeleted [squad] = squadsDeleted [squad] || 0;
        squadsDeleted [squad]++;
        totalDeleted++;
      }
    });

    _.each (squadsNotDeleted, function (squadCount) {
      if (squadCount < squadSmallestCount)
        squadSmallestCount = squadCount;
      if (squadCount > squadLargestCount)
        squadLargestCount = squadCount;
    });

    $('#summaryCompetitorsTotal').text (editVars.competitors.length);
    $('#summaryCompetitorsPresent').text (totalHere);
    $('#summaryCompetitorsNotPresent').text (totalNotHere);
    $('#summaryCompetitorsDeleted').text (totalDeleted);
    $('#summaryCompetitorsNotDeleted').text (totalNotDeleted);
    $('#summarySquadSmallest').text (squadSmallestCount);
    $('#summarySquadLargest').text (squadLargestCount);
    $('#summarySquadDelta').text (squadLargestCount - squadSmallestCount);
    $('#summarySquadAverage').text (parseInt (totalNotDeleted / _.keys (squadsNotDeleted).length));

    var squadsPerColumn = 5;
    var squadsList = _.keys (squadsNotDeleted);
    var numberOfSquads = squadsList.length;
    var tabCols = Math.ceil (numberOfSquads / squadsPerColumn);
    var tbody = document.createElement ('tbody');
    var tr = document.createElement ('tr');
    var td = document.createElement ('td');

    td.innerHTML = sprintf ('Squads (%s)', numberOfSquads);
    td.colSpan = tabCols * 2;
    td.style.fontWeight = 'bold';
    td.style.fontSize = 'larger';
    td.style.textAlign = 'center';
    td.style.paddingBottom = '5px';
    tr.appendChild (td);
    tbody.appendChild (tr);

    for (var row = 0; row < squadsPerColumn; row++) {
      tr = document.createElement ('tr');

      for (var col = 0; col < tabCols; col++) {
        var index = (col * squadsPerColumn) + row;
        var squadNo = squadsList [index];

        if (index < numberOfSquads) {
          td = document.createElement ('td');
          td.innerHTML = squadNo;
          td.style.textAlign = 'right';

          if (col > 0)
            td.style.paddingLeft = '12px';

          tr.appendChild (td);
          td = document.createElement ('td');
          td.innerHTML = sprintf ('(%s/%s)', squadsHere [squadNo] || 0, squadsNotDeleted [squadNo] || 0);
          td.style.textAlign = 'right';
          td.style.paddingLeft = '3px';
        } else {
          td = document.createElement ('td');
          td.innerHTML = '&nbsp';
          td.colSpan = 2;
        }

        tr.appendChild (td);
      }

      tbody.appendChild (tr);
    }

    $('#summarySquadSpread').html (tbody);
  };

  //
  //  Fill in the editing fields with the data in the passed competitor record
  //
  var populateCompetitorControls = function (record) {
    var uspsaNumberRE = /([A-Za-z]+)(\d+)/;
    var uspsaPrefix;
    var uspsaNumber;
    var phoneNumberRE = /(\d{3}).*(\d{3}).*(\d{4})/;
    var phoneNumber;

    if (_.keys (record).length) {
      phoneNumber = record.sh_ph.match (phoneNumberRE);
      phoneNumber = (phoneNumber && (phoneNumber.length === 4)) ? phoneNumber [1] + '-' + phoneNumber [2] + '-' + phoneNumber [3] : null;

      if (editVars.matchIsUSPSA || editVars.matchIsSC) {
        uspsaPrefix = record.sh_id.match (uspsaNumberRE);

        if (uspsaPrefix && (uspsaPrefix.length === 3)) {
          uspsaNumber = uspsaPrefix [2];
          uspsaPrefix = uspsaPrefix [1].toUpperCase ();
        } else {
          uspsaNumber = '';
          uspsaPrefix = '';
        }
      }

      $('#form-competitor').data ('disable-events', true);

      $('[tab-competitor-button]').jqxButton ({disabled: false});
      $('[tab-competitor-dropdownchecklist]').each (function () {$(this).jqxDropDownList ({disabled: false});});
      $('[tab-competitor-dropdownlist]').jqxDropDownList ({disabled: false});
      $('[tab-competitor-input]').jqxInput ({disabled: false});
      $('[tab-competitor-maskedinput]').jqxMaskedInput ({disabled: false});
      $('[tab-competitor-numberinput]').jqxNumberInput ({disabled: false});
      $('[panel-practiscore-checkbox]').jqxCheckBox ({disabled: false}); // FIXME: Needs to be less specific
      $('[panel-accounting-radiobutton]').jqxRadioButton ({disabled: false}); // FIXME: Needs to be less specific

      $('#ec-sh-ln').jqxInput ('val', record.sh_ln);
      $('#ec-sh-fn').jqxInput ('val', record.sh_fn);
      $('#ec-sh-id-prefix').each (function () {$(this).jqxDropDownList ('selectIndex', _.findIndex (prefixes, 'value', uspsaPrefix));});
      $('#ec-sh-id-num').each (function () {$(this).jqxInput ('val', uspsaNumber);});
      $('#ec-sh-id').each (function () {$(this).jqxInput ('val', record.sh_id);});

      $('#ec-sh-dvp').val (record.sh_dvp);
      $('#ec-sh-pf').each (function () {
        $(this).val (record.sh_pf);
        if ((record.sh_dvp === 'CO') || (record.sh_dvp === 'PROD')) // FIXME: When we use full division names
          $(this).jqxDropDownList ({disabled: true});
      });
      $('#ec-sh-grd').val (record.sh_grd);

      $('#ec-sh-sqd').jqxNumberInput ('val', record.sh_sqd);
      $('#ec-sh-age').each (function () {$(this).val (record.sh_age);});
      $('#ec-sh-gen').each (function () {$(this).val (record.sh_gen);});
      $('#ec-sh-ctgs').each (function () {
        var items = $(this).jqxDropDownList ('getItems');
        var values = record.sh_ctgs || [];
        $(this).jqxDropDownList ('uncheckAll');
        for (var j = 0; j < values.length; j++)
          for (var i = 0; i < items.length; i++)
            if (items [i].label === values [j])
              $(this).jqxDropDownList ('checkIndex', i);
      });

      $('#ec-sh-law').each (function () {$(this).val (record.sh_law);});
      $('#ec-sh-mil').each (function () {$(this).val (record.sh_mil);});
      $('#ec-sh-frn').each (function () {$(this).val (record.sh_frn);});

      $('#ec-sh-wlk').val (record.sh_wlk);
      $('#ec-sh-dq').val (record.sh_dq);
      $('#ec-sh-del').val (record.sh_del);

      $('#ec-sh-num').each (function () {$(this).val (record.sh_num);});
      $('#ec-sh-lge').val (record.sh_lge);
      $('#ec-sh-lgp').val (record.sh_lgp);

      $('#ec-sh-ph').jqxMaskedInput (phoneNumber ? 'val' : 'clear', phoneNumber);
      $('#ec-sh-eml').jqxInput ('val', record.sh_eml);

      $('#ec-sh-addr1').jqxInput ('val', record.sh_addr1);
      $('#ec-sh-addr2').jqxInput ('val', record.sh_addr2);

      $('#ec-sh-city').jqxInput ('val', record.sh_city);
      $('#ec-sh-st').val (record.sh_st);
      $('#ec-sh-zipcode').jqxMaskedInput (record.sh_zipcode.length ? 'val' : 'clear', record.sh_zipcode);

      $('#ec-sh-here').jqxCheckBox ({checked: record.sh_here});
      $('#ec-sh-paid').jqxCheckBox ({checked: record.sh_paid});
      $('#ec-sh-staff').jqxCheckBox ({checked: record.sh_staff});
      $('#ec-amount-leomil').jqxRadioButton ({checked: record.sh_law || record.sh_mil});

      if (editVars.accounting [record.sh_uid]) {
        var accounting = editVars.accounting [record.sh_uid];

        if (_.isNull (accounting.amount)) {
          $('[panel-accounting-radiobutton][id^="ec-amount-"]').each (function () {
            $(this).jqxRadioButton ('uncheck');
          });
        } else
            $('#ec-amount-' + accounting.amount).jqxRadioButton ('check');

        if (_.isNull (accounting.paid)) {
          $('[panel-accounting-radiobutton][id^="ec-paid-"]').each (function () {
            $(this).jqxRadioButton ('uncheck');
          });
        } else
            $('#ec-paid-' + accounting.paid).jqxRadioButton ('check');
      }
    }

    $('#form-competitor').jqxValidator ('hide');
    $('#status-message').hide ();
    $('#form-competitor').data ('disable-events', false);
  };

  //
  //  Populates the competitor tab based on the mode in the options.mode
  //  parameter. Add and edit will use the competitor record passed in
  //  options.competitor, and updates the editVars.competitor so 'cancel' will
  //  reset the editing fields. Fill is used when creating a new competitor
  //  entry from an auto-complete name. Cancel is for when cancel is clicked to
  //  reset the edited fields.
  //
  var populateCompetitorTab = function (options) {
    var record;

    if (!options || !options.mode)
      return;

    switch (options.mode) {
      case 'add' :
      case 'edit' :
        record = editVars.competitor = options.competitor;
        editVars.competitorBackup = _.clone (record);
        editVars.mode = options.mode;
        break;
      case 'fill' :
        record = options.competitor;
        break;
      case 'reset' :
        record = editVars.competitor = editVars.competitorBackup;
        break;
      case 'refresh' :
        record = editVars.competitor;
        break;
      default :
        alert ('Unknown mode passed in options.mode');
        return;
    }

    if (record)
      populateCompetitorControls (record);
  };

  var updateCompetitorTab = function () {
    populateCompetitorTab ({mode: 'refresh'});
  };

  var resetCompetitorTab = function () {
    populateCompetitorTab ({mode: 'reset'});
  };

  //
  //
  //
  var refreshCompetitorAdapter = function (competitorRecords) {
    var fieldList = [];
    var orderList = [];
    var fixupFunction = function (competitor) {
      try {
        competitor.sh_lnfnid = competitor.sh_ln + ', ' + competitor.sh_fn + (competitor.sh_id.length ? ' (' + competitor.sh_id + ')' : '');
        competitor.sh_xhere = competitor.sh_here & !competitor.sh_del;
      } catch (e) {
        console.log ('Shooter %s %s has a problem', competitor.sh_fn, competitor.sh_ln);
        console.log (e);
        alert ('Please check javascript console');
      }
    };
    var filterFunction = function (competitor) {
      var keep = true;

      if (editVars.options.hideDeleted)
        keep = keep & !competitor.sh_del;
      if (editVars.options.hidePresent)
        keep = keep & !competitor.sh_here;
      if (editVars.options.squadsUseShowList && !editVars.options.squadsShowList [competitor.sh_sqd] && editVars.options.squadsHideUnshown)
        keep = false;

      return keep;
    };

    //
    //  Deleted overrides the here/not-here status for the purposes of sorting
    //
    switch (editVars.options.sortMethod) {
      case 'name' :
        fieldList = ['sh_lnfnid'];
        orderList = [editVars.options.sortReverse ? 'desc' : 'asc'];
        break;

      case 'nothere_here_deleted' :
        fieldList = ['sh_del', 'sh_xhere', 'sh_lnfnid'];
        orderList = [   'asc',      'asc', editVars.options.sortReverse ? 'desc' : 'asc'];
        break;

      case 'nothere_deleted_here' :
        fieldList = ['sh_xhere', 'sh_del', 'sh_lnfnid'];
        orderList = [     'asc',    'asc', editVars.options.sortReverse ? 'desc' : 'asc'];
        break;

      case 'here_nothere_deleted' :
        fieldList = ['sh_del', 'sh_xhere', 'sh_lnfnid'];
        orderList = [   'asc',     'desc', editVars.options.sortReverse ? 'desc' : 'asc'];
        break;

      case 'here_deleted_nothere' :
        fieldList = ['sh_xhere', 'sh_del', 'sh_lnfnid'];
        orderList = [    'desc',   'desc', editVars.options.sortReverse ? 'desc' : 'asc'];
        break;

      case 'deleted_here_nothere' :
        fieldList = ['sh_del', 'sh_xhere', 'sh_lnfnid'];
        orderList = [  'desc',     'desc', editVars.options.sortReverse ? 'desc' : 'asc'];
        break;

      case 'deleted_nothere_here' :
        fieldList = ['sh_del', 'sh_xhere', 'sh_lnfnid'];
        orderList = [  'desc',      'asc', editVars.options.sortReverse ? 'desc' : 'asc'];
        break;

      default :
        alert ('Invalid sort key!');
        fieldList = ['sh_lnfnid'];
        orderList = [editVars.options.sortReverse ? 'desc' : 'asc'];
    }

    competitorSource.localdata = _.chain (competitorRecords)
      .each (fixupFunction)
      .filter (filterFunction)
      .sortByOrder (fieldList, orderList)
      .value ();

    if (editVars.competitor && editVars.competitor.sh_uid)
      editVars.competitor = _.find (editVars.competitors, 'sh_uid', editVars.competitor.sh_uid);

    competitorAdapter.dataBind ();

    updateCompetitorListBox ();
    updateSummaryWindow ();
    updateCompetitorTab ();
  };

  //
  //
  //
  var addCompetitor = function (competitor, callback) {
    editVars.socket.emit ('shooter:add', {shooter: competitor}, function (data) {
      if (data.err) {
        $('#status-message').html ('Eeek! Error occurred adding competitor. Check console window.').show ();
        console.log (data.err);
      } else {
        editVars.competitors.push (data.shooter);
        editVars.updateSquadsTab = true;
        refreshCompetitorAdapter (editVars.competitors);
      }

      if (callback)
        callback (data.err, competitor);
    });
  };

  var saveCompetitor = function (competitor, callback) {
    editVars.socket.emit ('shooter:save', {shooter: competitor}, function (data) {
      if (data.err) {
        $('#status-message').html ('Eeek! Error occurred updating competitor. Check console window.').show ();
        console.log (data.err);
      } else if (data.changed) {
        editVars.competitors [_.findIndex (editVars.competitors, {'sh_uid': data.shooter.sh_uid})] = data.shooter;
        editVars.updateSquadsTab = true;
        refreshCompetitorAdapter (editVars.competitors);
      }

      if (callback)
        callback (data.err, data.shooter);
    });
  };

  var autocompleteShooter = function (id) {
    var competitor = _.find (autocompleteResults, 'id', id);

    if (competitor)
      editVars.socket.emit ('shooter:new', function (data) {
        competitor = _.merge (data.shooter, competitor);
        populateCompetitorTab ({competitor: competitor, mode: 'fill'});
      });
    else {
      // alert ('Eeek! autocompleteShooter() was passed a id that doesn\'t exist!');
      console.log ('Eeek! autocompleteShooter() was passed a id that doesn\'t exist!');
      console.log ('id=%s', id);
      console.log ('autocompleteResults -->');
      console.dir (autocompleteResults);
    }
  };

  //
  //  Given a competitor UUID, remove the source fields so that typing in the
  //  first or last name fields won't bring the matches from the global
  //  competitor database, populate the editing fields, select the tab, and
  //  finally set the focus to the last name field.
  //
  var selectCompetitorInListBox = function (sh_uid, focus) {
    $('#ec-sh-fn').jqxInput ({source: []});
    $('#ec-sh-ln').jqxInput ({source: []});

    populateCompetitorTab ({competitor: _.find (editVars.competitors, 'sh_uid', sh_uid), mode: 'edit'});

    $('#form-competitor').data ('form-has-data', true);
    $('#tabs-center').jqxTabs ('select', 0);

    if (focus)
      $('#ec-sh-ln').jqxInput ('focus');
  };

  //
  //
  //
  var makeTreeHeader = function (squadNumber, callback) {
    var squad = _.chain (editVars.competitors)
                 .filter ('sh_sqd', squadNumber)
                 .filter ('sh_del', false).value ();
    var here = _.filter (squad, 'sh_here', true);
    var label = sprintf ('Squad %s (%s of %s)', squadNumber, here.length, squad.length);
    var value = 'header-' + squadNumber;

    callback (squadNumber, squad.length, label, value);
  };

  //
  //  Create and initialize all our various controls on the tabs. The code for
  //  each tab is only called when the tab is actually selected (lazy loading)
  //
  var initWidgets = function (tabNumber) {
    if (editVars.tabsInitialized [tabNumber])
      alert ('WTF? This tab has already been initialized!');
    editVars.tabsInitialized [tabNumber] = true;

    switch (tabNumber) {
      case tabNumber_Competitor :
        $('#ec-sh-fn').jqxInput ({width: 170, height: 25, maxLength: 15});
        $('#ec-sh-ln').jqxInput ({width: 200, height: 25, maxLength: 20});
        $('#ec-sh-id-prefix').each (function () {$(this).jqxDropDownList ({width: 50, autoDropDownHeight: true, dropDownWidth: 180, source: prefixesAdapter});});
        $('#ec-sh-id-num').each (function () {$(this).jqxInput ({width: 55, height: 25, maxLength: 6});});
        $('#ec-sh-id').each (function () {$(this).jqxInput ({width: 112, height: 25, maxLength: 10});});

        $('#ec-sh-dvp').jqxDropDownList ({width: 110, autoDropDownHeight: true, dropDownWidth: 95, source: divisionsAdapter });
        $('#ec-sh-pf').each (function () {$(this).jqxDropDownList ({width: 65, autoDropDownHeight: true, dropDownWidth: 50, source: powerfactorsAdapter});});
        $('#ec-sh-grd').jqxDropDownList ({width: 50, autoDropDownHeight: true, source: classesAdapter});

        $('#ec-sh-sqd').jqxNumberInput ({width: 60, decimalDigits: 0, min: 0, max: 9999, inputMode: 'simple', spinButtons: true});
        $('#ec-sh-age').each (function () {$(this).jqxDropDownList ({width: 115, autoDropDownHeight: true, source: agesAdapter});});
        $('#ec-sh-gen').each (function () {$(this).jqxDropDownList ({width: 75, autoDropDownHeight: true, source: gendersAdapter});});
        $('#ec-sh-ctgs').each (function () {$(this).jqxDropDownList ({width: 170, autoDropDownHeight: true, enableBrowserBoundsDetection: true, displayMember: 'label', valueMember: 'value', checkboxes: true, source: categoriesAdapter, placeHolder: ''});});

        $('#ec-sh-law').each (function () {$(this).jqxDropDownList ({width: 50, autoDropDownHeight: true, source: yesnoAdapter});});
        $('#ec-sh-mil').each (function () {$(this).jqxDropDownList ({width: 50, autoDropDownHeight: true, source: yesnoAdapter});});
        $('#ec-sh-frn').each (function () {$(this).jqxDropDownList ({width: 50, autoDropDownHeight: true, source: yesnoAdapter});});

        $('#ec-sh-wlk').jqxDropDownList ({width: 50, autoDropDownHeight: true, source: yesnoAdapter});
        $('#ec-sh-dq').jqxDropDownList ({width: 50, autoDropDownHeight: true, source: yesnoAdapter});
        $('#ec-sh-del').jqxDropDownList ({width: 50, autoDropDownHeight: true, source: yesnoAdapter});

        $('#ec-sh-num').each (function () {$(this).jqxInput ({width: 50, height: 25, maxLength: 4});});
        $('#ec-sh-lge').jqxDropDownList ({width: 50, autoDropDownHeight: true, source: yesnoAdapter});
        $('#ec-sh-lgp').jqxDropDownList ({width: 50, autoDropDownHeight: true, source: yesnoAdapter});

        $('#ec-sh-ph').jqxMaskedInput ({width: 96, mask: '###-###-####'});
        $('#ec-sh-eml').jqxInput ({width: 200, height: 25, maxLength: 50});

        $('#ec-sh-addr1').jqxInput ({width: 200, height: 25, maxLength: 30});
        $('#ec-sh-addr2').jqxInput ({width: 200, height: 25, maxLength: 30});

        $('#ec-sh-city').jqxInput ({width: 200, height: 25, maxLength: 30});
        $('#ec-sh-st').jqxDropDownList ({width: 135, source: statesAdapter});
        $('#ec-sh-zipcode').jqxMaskedInput ({width: 83, mask: '#####-####'});

        $('#ec-new').jqxButton ({width: 65});
        $('#ec-cancel').jqxButton ({width: 65});
        $('#ec-save').jqxButton ({width: 65});

        $('[form-competitor][id^="ec-"]').on ('focus', function () {
          $(this).addClass ('jqx-menu-item-top-hover-' + pmmui.theme);
        });

        $('[form-competitor][id^="ec-"]').on ('focusout', function () {
          $(this).removeClass ('jqx-menu-item-top-hover-' + pmmui.theme);
        });

        $('#ec-sh-ln').on ('select', function (event) {
          if (event && event.args && event.args.value && !editVars.options.competitorNoAutocomplete)
            autocompleteShooter (parseInt (event.args.value));
        });

        $('#ec-sh-fn').on ('select', function (event) {
          if (event && event.args && event.args.value && !editVars.options.competitorNoAutocomplete)
            autocompleteShooter (parseInt (event.args.value));
        });

        if (editVars.matchIsUSPSA || editVars.matchIsSC) {
          $('#ec-sh-id-prefix').on ('change close', function () {
            var item = $('#ec-sh-id-prefix').jqxDropDownList ('getSelectedItem');

            $('#ec-sh-id-prefix').jqxDropDownList ('setContent', item.value);

            if (item.value === '') {
              $('#ec-sh-id-num').jqxInput ('val', '');
              $('#ec-sh-id-num').jqxInput ('disabled', true);
              $('#form-competitor').jqxValidator ('hideHint', '#ec-sh-id-num');
            } else
              $('#ec-sh-id-num').jqxInput ('disabled', false);
          });

          if (editVars.matchIsUSPSA) {
            $('#ec-sh-dvp').on ('change', function (event) {
              if ((event.args.item.label === 'Carry Optics') || (event.args.item.label === 'Production')) {
                $('#ec-sh-pf').jqxDropDownList ('selectItem', 'MINOR');
                $('#ec-sh-pf').jqxDropDownList ('disabled', true);
              } else {
                $('#ec-sh-pf').jqxDropDownList ('selectItem', editVars.competitor.sh_pf_fmt);
                $('#ec-sh-pf').jqxDropDownList ('disabled', false);
              }
            });
          }
        }

        $('[tab-competitor-button]').jqxButton ({disabled: true});
        $('[tab-competitor-dropdownchecklist]').each (function () {$(this).jqxDropDownList ({disabled: true, placeHolder: ''});});
        $('[tab-competitor-dropdownlist]').jqxDropDownList ({disabled: true, placeHolder: ''});
        $('[tab-competitor-input]').jqxInput ({disabled: true});
        $('[tab-competitor-maskedinput]').jqxMaskedInput ({disabled: true});
        $('[tab-competitor-numberinput]').jqxNumberInput ({disabled: true});

        $('#ec-new').jqxButton ({disabled: false});

        //
        //  'New' button on competitor editing form clicked
        //
        $('#ec-new').on ('click', function () {
          editVars.socket.emit ('shooter:maxnameslength', function (data) {
            var nameMaxwidth = data.maxwidth * 8;

            if (!editVars.options.competitorNoAutocomplete) {
              $('#ec-sh-fn').jqxInput ({source: autocompleteFirstNameAdapter, dropDownWidth: nameMaxwidth});
              $('#ec-sh-ln').jqxInput ({source: autocompleteLastNameAdapter, dropDownWidth: nameMaxwidth});
            }

            editVars.socket.emit ('shooter:new', function (data) {
              var competitor = data.shooter;

              competitor.sh_age_fmt = _.result (_.find (ages, 'value', competitor.sh_age), 'label');
              competitor.sh_del_fmt = _.result (_.find (yesno, 'value', competitor.sh_del), 'label');
              competitor.sh_dq_fmt  = _.result (_.find (yesno, 'value', competitor.sh_dq), 'label');
              competitor.sh_dvp_fmt = _.result (_.find (divisionsSource.localdata, 'value', competitor.sh_dvp), 'label');
              competitor.sh_frn_fmt = _.result (_.find (yesno, 'value', competitor.sh_frn), 'label');
              competitor.sh_gen_fmt = _.result (_.find (genders, 'value', competitor.sh_gen), 'label');
              competitor.sh_grd_fmt = _.result (_.find (classesSource.localdata, 'value', competitor.sh_grd), 'label');
              competitor.sh_law_fmt = _.result (_.find (yesno, 'value', competitor.sh_law), 'label');
              competitor.sh_lge_fmt = _.result (_.find (yesno, 'value', competitor.sh_lge), 'label');
              competitor.sh_lgp_fmt = _.result (_.find (yesno, 'value', competitor.sh_lgp), 'label');
              competitor.sh_mil_fmt = _.result (_.find (yesno, 'value', competitor.sh_mil), 'label');
              competitor.sh_pf_fmt  = _.result (_.find (powerfactors, 'value', competitor.sh_pf), 'label');
              competitor.sh_wlk_fmt = _.result (_.find (yesno, 'value', competitor.sh_wlk), 'label');

              populateCompetitorTab ({competitor: competitor, mode: 'add'});

              $('#listbox-competitors').jqxListBox ('clearSelection');
              $('#form-competitor').data ('form-has-data', false);
              $('[tab-competitor-button]').jqxButton ({disabled: false});
              $('[panel-practiscore-checkbox]').jqxCheckBox ({disabled: true});
              $('[panel-accounting-radiobutton]').jqxRadioButton ({disabled: true});
              $('#ec-sh-ln').jqxInput ('focus');
            });
          });
        });

        $('#ec-save').on ('click', function () {
          $('#form-competitor').jqxValidator ('validate');
        });

        $('#ec-cancel').on ('click', function () {
          resetCompetitorTab ();
        });
        break;

      case tabNumber_Squads :
        //
        // When expanding or collapsing the 'Squad n (x of y)' headers in Squads tab,
        // save the state of the header so we can restore it if we have to update the
        // jqxTree() controls.
        //
        $('[id^="tree-squads-"]').on ('expand', function (event) {
          if (!editVars.options.squadsMultipleOpen) {
            var treeid = '#' + $(this).attr ('id');

            editVars.openTrees [treeid] = editVars.openTrees [treeid] || {};

            _.each (editVars.openTrees [treeid], function (element, elementid) {
              if (elementid !== event.args.element.id)
                $(treeid).jqxTree ('collapseItem', editVars.openTrees [treeid][elementid]);
            });

            editVars.openTrees [treeid][event.args.element.id] = event.args.element;
          }
        });

        $('[id^="tree-squads-"]').on ('collapse', function (event) {
          delete editVars.openTrees ['#' + $(this).attr ('id')][event.args.element.id];
        });

        //
        //  If a 'Squad n (x of y)' header is selected, then toggle it's
        //  expanded/collapsed state. If it's a competitor name, we want to select
        //  the competitor in the jqxListBox() on the left, then switch to the
        //  'Competitor' tab in the center.
        //
        $('[id^="tree-squads-"]').on ('select', function (event) {
          var item = $(this).jqxTree ('getItem', event.args.element);
          var listboxItem;

          if (item.level === 0)
            $(this).jqxTree (item.isExpanded ? 'collapseItem' : 'expandItem');
          else {
            if ((listboxItem = $('#listbox-competitors').jqxListBox ('getItemByValue', item.value))) {
              editVars.squadTabTreeSelectEvent = true;
              $('#listbox-competitors').jqxListBox ('selectItem', listboxItem);
              selectCompetitorInListBox (item.value, true);
            }
          }
        });

        //
        //  jqxTree() won't generate a select event if clicking on the aready
        //  selected name, but it will cause a click event. Unfortunately, we also
        //  get the click event after a select event, so we need to ignore that one.
        //
        $('[id^="tree-squads-"]').on ('click', '.jqx-tree-item-selected', function (event) {
          if (!editVars.squadTabTreeSelectEvent) {
            var item = $('#' + event.delegateTarget.id).jqxTree ('getSelectedItem');
            var listboxItem = $('#listbox-competitors').jqxListBox ('getItemByValue', item.value);

            if (listboxItem) {
              $('#listbox-competitors').jqxListBox ('selectItem', listboxItem);
              selectCompetitorInListBox (item.value, true);
            }
          }

          editVars.squadTabTreeSelectEvent = false;
        });

        $('[id^="tree-squads-"]').on ('dragStart', function (item) {
          if (item.args.value.substr (0, 6) === 'header')
            return false;
          return true;
        });

        $('[id^="tree-squads-"]').on ('dragEnd', function () {
          if (editVars.treeFix) {
            var treeFix = editVars.treeFix;
            var dragItems = $(treeFix.dragTree).jqxTree ('getItems');
            var dropItems = $(treeFix.dropTree).jqxTree ('getItems');
            var newLabel = {
                label:    treeFix.dragItem.label,
                value:    treeFix.dragItem.value,
                icon:     treeFix.dragItem.icon,
                iconsize: treeFix.dragItem.iconsize,
              };
            var first = _.findIndex (dropItems, 'value', 'header-' + treeFix.dropSquad) + 1;
            var last;

            for (last = first; (last < dropItems.length) && (dropItems [last].value.substr (0, 6) !== 'header'); last++)
              ;

            var index = _.chain (dropItems)
                         .slice (first, last)
                         .pluck ('label')
                         .push (treeFix.dragItem.label)
                         .sort ()
                         .indexOf (treeFix.dragItem.label)
                         .value ();

            $(treeFix.dropTree).jqxTree (index ? 'addAfter' : 'addBefore', newLabel, dropItems [first + (index ? (index - 1) : 0)].element);
            $(treeFix.dragTree).jqxTree ('removeItem', treeFix.dragItem.element);

            makeTreeHeader (treeFix.dragSquad, function (squadNumber, isNotEmpty, label, value) {
              var dragHeader = _.result (_.find (dragItems, 'value', value), 'element');
              var dropHeader = _.result (_.find (dropItems, 'value', value), 'element');

              if (isNotEmpty) {
                $(treeFix.dragTree).jqxTree ('updateItem', dragHeader, {label: label});
                $(treeFix.dropTree).jqxTree ('updateItem', dropHeader, {label: label});
              } else {
                $(treeFix.dragTree).jqxTree ('removeItem', dragHeader);
                $(treeFix.dropTree).jqxTree ('removeItem', dropHeader);
              }
            });

            makeTreeHeader (treeFix.dropSquad, function (squadNumber, isNotEmpty, label, value) {
              var dragHeader = _.result (_.find (dragItems, 'value', value), 'element');
              var dropHeader = _.result (_.find (dropItems, 'value', value), 'element');

              if (isNotEmpty) {
                $(treeFix.dragTree).jqxTree ('updateItem', dragHeader, {label: label});
                $(treeFix.dropTree).jqxTree ('updateItem', dropHeader, {label: label});
              } else {
                $(treeFix.dragTree).jqxTree ('removeItem', dragHeader);
                $(treeFix.dropTree).jqxTree ('removeItem', dropHeader);
              }
            });

            delete editVars.treeFix;
          }
        });

        break;

      case tabNumber_Options:
        $('#tab-options [controltype="dropdownlist"]').jqxDropDownList ({width: 200, autoDropDownHeight: true, source: competitorSortAdapter, selectedIndex: 0});
        $('#tab-options [controltype="checkbox"]').jqxCheckBox ({width: 70, height: 20});
        $('#tab-options [controltype="input"]').jqxInput ({width: 200, height: 25, maxLength: 50});

        _.each (editVars.optionsControls, function (value, id) {
          var controltype = id.match (/^(\w+)-?/) [1];

          if (controltype === 'checkbox')
            $('#' + id).each (function () {$(this).jqxCheckBox ({checked: value});});
          else if (controltype === 'radiobutton')
            $('#' + id).each (function () {$(this).jqxRadioButton ({checked: value});});
          else if (controltype === 'input')
            $('#' + id).each (function () {$(this).jqxInput ('val', value);});
          else if ((controltype === 'numberinput') || (controltype === 'joginput'))
            $('#' + id).each (function () {$(this).jqxNumberInput ({value: value});});
          else if (controltype === 'dropdownlist')
            $('#' + id).each (function () {$(this).jqxDropDownList ('selectItem', $(this).jqxDropDownList ('getItemByValue', value));});
          else
            alert ('Eeek! ' + id + ' isn\'t checkbox, radiobutton, input, numberinput, joginput, or dropdownlist!', id);
        });

        //
        //  Event handlers for controls on options tab
        //
        $('#dropdownlist-options-sort-key').on ('select', function (event) {
          if (event.args) {
            editVars.options.sortMethod = event.args.item.value;
            refreshCompetitorAdapter (editVars.competitors);
          }
        });

        $('#checkbox-options-sort-reverse').on ('change', function (event) {
          editVars.options.sortReverse = event.args.checked;
          refreshCompetitorAdapter (editVars.competitors);
        });

        $('#checkbox-options-hide-deleted').on ('change', function (event) {
          editVars.options.hideDeleted = event.args.checked;
          refreshCompetitorAdapter (editVars.competitors);
        });

        $('#checkbox-options-hide-present').on ('change', function (event) {
          editVars.options.hidePresent = event.args.checked;
          refreshCompetitorAdapter (editVars.competitors);
        });

        $('#checkbox-options-squads-multipleopen').on ('change', function (event) {
          if (!(editVars.options.squadsMultipleOpen = event.args.checked))
            editVars.options.squadsTabCollapseAll = true;
        });

        $('#checkbox-options-squads-useshowlist').on ('change', function (event) {
          editVars.options.squadsUseShowList = event.args.checked;
          $('#input-options-squads-showlist').jqxInput ({disabled: !event.args.checked});
          $('#checkbox-options-squads-hideunshown').jqxCheckBox ({disabled: !event.args.checked});
          $('[options-squads-useshowlist-fade]').css ({opacity: !editVars.options.squadsUseShowList? 0.55 : 1.00});
          refreshCompetitorAdapter (editVars.competitors);
          editVars.updateSquadsTab = true;
        });


        $('#checkbox-options-squads-hideunshown').on ('change', function (event) {
          editVars.options.squadsHideUnshown = event.args.checked;
          refreshCompetitorAdapter (editVars.competitors);
        });

        $('#checkbox-options-competitor-noautocomplete').on ('change', function (event) {
          editVars.options.competitorNoAutocomplete = event.args.checked;
        });

        $('#checkbox-options-accounting-panelhide').on ('change', function (event) {
          editVars.options.accountingPanelHide = event.args.checked;
          $('#panel-accounting').toggle (!editVars.options.accountingPanelHide);
        });

        //
        //  If any control other than the jqxInput changes, perform a validation
        //  so that we save our settings changes to the database.
        //
        $('#form-options [controltype="checkbox"], [controltype="dropdownlist"]').on ('change', function () {
          $('#form-options').jqxValidator ('validate');
        });

        $('#form-options').jqxValidator ({
          focus: true,
          closeOnClick: false,
          onSuccess: function () {
            var err = false;
            var data = $('#input-options-squads-showlist').val ();

            editVars.updateSquadsTab = true;
            editVars.options.squadsShowList = {};

            if (data.length) {
              _.each (data.split (','), function (num) {
                if (/^-?\d+$/.exec (num))
                  editVars.options.squadsShowList [parseInt (num)] = true;
                else {
                  var range = /(-?\d+)-(-?\d+)/.exec (num);

                  if (range) {
                    _.each (_.range (parseInt (range [1]), parseInt (range [2]) + 1), function (index) {
                      editVars.options.squadsShowList [index] = true;
                    });
                  } else {
                    err = true;
                    console.log ('Got something unexpected, num=\'%s\'', num);
                    alert ('Unexpected value encountered. Please report this to JC');
                  }
                }
              });
            }
            if (!err)
              saveCheckinSettings ();
          },
          onError: function () {
            $('#tabs-center').jqxTabs ('select', 3);
          },
          rules: [{
            input:    '#input-options-squads-showlist',
            action:   'blur',
            position: 'bottom',
            message:  'Must be a comma or space separated list of numbers',
            rule:     function (input) {
              var data = input.val ().trim ().replace (/,/g, ' ').replace (/\s+/g, ',').replace (/^\s+/, '').replace (/\s+$/, '');
              var regex = /^(-?\d+(--?\d+)?,\s?)*-?\d+(--?\d+)?$/;

              if (data.length && !regex.exec (data))
                return false;

              $(input).val (data);

              return true;
            },
          }, {
            input:    '#input-options-squads-showlist',
            action:   'blur',
            position: 'bottom',
            message:  'Start cannot be greater than end in a range',
            rule:     function (input) {
              var valid = true;

              _.each (input.val ().split (','), function (num) {
                var range = /(-?\d+)-(-?\d+)/.exec (num);

                if (range && (parseInt (range [2]) < parseInt (range [1])))
                  valid = false;
              });

              return valid;
            },
          }],
        });
        break;

      default :
        break;
    }
  };

  $('#input-search').jqxInput ({
    width: 265,
    height: 25,
    placeHolder: 'Search...',
    searchMode: 'none',
  });

  $('#listbox-competitors').jqxListBox ({
    width: 265,
    height: editVars.pageHeight - ($('#input-search').jqxInput ('height') + 10),
    source: competitorSearchAdapter,
    incrementalSearch: false,
    selectedIndex: -1,
    displayMember: 'sh_lnfnid',
    valueMember: 'sh_uid',
    renderer: function (index, label) {
      var item = competitorSearchAdapter.records [index];
      if (_.isNull (item))
        return '';
      if (item.sh_del)
        return '<span class="pmm-checkmark-space pmm-checkmark-deleted">' + label + '</span>';

      return '<span class="pmm-checkmark-space' + (item.sh_here ? ' pmm-checkmark-present">' : '">') + label + '</span>';
    },
  });

  $('#tabs-center').jqxTabs ({
    width: 794,
    height: editVars.pageHeight - 200,
    position: 'top',
    initTabContent: initWidgets,
  });

  var validatorRules = [{
      matchtype:  {all: true},
      input:      '#ec-sh-ln',
      position:   'bottom',
      message:    'Last name is required',
      action:     'keyup, blur',
      rule:       'required'
    }, {
      matchtype:  {all: true},
      input:      '#ec-sh-ln',
      position:   'bottom',
      message:    'Last name may only contain the characters A-Z, a-z, 0-9, period, dash, comma, pound, parenthesis, and space',
      action:     'keyup, blur',
      rule:       function (input) {
                    return (input.val ().search (/[^A-Za-z0-9\., #()-]/) === -1) ? true : false;
                  }
    }, {
      matchtype:  {all: true},
      input:      '#ec-sh-fn',
      position:   'bottom',
      message:    'First name is required',
      action:     'keyup, blur',
      rule:       'required'
    }, {
      matchtype:  {all: true},
      input:      '#ec-sh-fn',
      position:   'bottom',
      message:    'First name may only contain the characters A-Z, a-z, 0-9, period, dash, pound, parenthesis, and space',
      action:     'keyup, blur',
      rule:       function (input) {
                    return (input.val ().search (/[^A-Za-z0-9#()\. -]/) === -1) ? true : false;
                  }
    }, {
      matchtype:  {all: true},
      input:      '#ec-sh-dvp',
      position:   'bottom',
      message:    'A valid division must be selected',
      rule:        function (input) {
                     return (input.val ().trim ().length === 0) ? false : true;
                   }
    }, {
      matchtype:  {all: true},
      input:      '#ec-sh-grd',
      position:   'bottom',
      message:    'A valid class must be selected',
      rule:        function (input) {
                     return (input.val ().trim ().length === 0) ? false : true;
                   }
    }, {
      matchtype:  {all: true},
      input:      '#ec-sh-eml',
      position:   'bottom',
      message:    'Not a correctly formatted email address',
      action:     'keyup',
      rule:       'email'
    }, {
      matchtype:  {all: true},
      input:      '#ec-sh-ph',
      position:   'bottom',
      message:    'Not a correctly formatted phone number',
      action:     'valuechanged, blur',
      rule:       function (input) {
                    var phone = input.val ();
                    return (!phone.search (/\d{3}-\d{3}-\d{4}/) || !phone.search (/_{3}-_{3}-_{4}/)) ? true : false;
                  }
    }, {
      matchtype:  {all: true},
      input:      '#ec-sh-zipcode',
      position:   'bottom',
      message:    'Not a correctly formatted ZIP Code(tm)',
      action:     'valuechanged, blur',
      rule:       function (input) {
                    var zip = input.val ();
                    return (!zip.search (/\d{5}-_{4}/) || !zip.search (/\d{5}-\d{4}/) || !zip.search (/_{5}-_{4}/)) ? true : false;
                  }
    }, {
      matchtype:  {uspsa: true},
      input:      '#ec-sh-num',
      position:   'bottom',
      message:    'EZWS # cannot be blank (use -1 for no number)',
      action:     'valuechanged, blur',
      rule:       'required',
    }, {
      matchtype:  {uspsa: true},
      input:      '#ec-sh-num',
      position:   'bottom',
      message:    'EZWS # must be -1, or 1..9999',
      action:     'valuechanged, blur',
      rule:       function (input) {
                    var text = input.val ().trim ();
                    var sh_num = parseInt (text);
                    return (text.match (/^[-]?[0-9]{1,4}$/) && ((sh_num === -1) || ((sh_num >= 1) && (sh_num <= 9999)))) ? true : false;
                  }
    }, {
      matchtype:  {uspsa: true},
      input:      '#ec-sh-num',
      position:   'bottom',
      message:    'This EZWS # is already in use by another competitor',
      action:     'valuechanged, blur',
      rule:       function (input) {
                    var sh_num = parseInt (input.val ().trim ());
                    var count = 0;

                    if (sh_num !== -1) {
                      var sh_uid = editVars.competitor.sh_uid;

                      _.each (editVars.competitors, function (s) {
                        if ((sh_num === s.sh_num) && (sh_uid !== s.sh_uid))
                          ++count;
                      });
                    }

                    return count ? false : true;
                  }
    }, {
      matchtype:  {uspsa: true, sc: true},
      input:      '#ec-sh-id-num',
      position:   'bottom',
      message:    'Number portion cannot be blank when prefix is present',
      action:     'valuechanged, blur',
      rule:       function (input) {
                    var num = input.val ().trim ();
                    var prefix = $('#ec-sh-id-prefix').val ().trim ();
                    return ((prefix !== '') && (num.length === 0)) ? false : true;
                  }
    }, {
      matchtype:  {uspsa: true, sc: true},
      input:      '#ec-sh-id-num',
      position:   'bottom',
      message:    'Number portion may only contain the digits 0-9',
      action:     'valuechanged, blur',
      rule:       function (input) {
                    var num = input.val ().trim ();
                    var prefix = $('#ec-sh-id-prefix').val ().trim ();
                    return ((!prefix.length && !num.length) || (num.match (/^[0-9]{1,9}$/))) ? true : false;
                  }
    }, {
      matchtype:  {uspsa: true, sc: true},
      input:      '#ec-sh-id-num',
      position:   'bottom',
      message:    'This number is in use by a competitor with a different name',
      action:     'valuechanged, blur',
      rule:       function (input) {
                    var num = input.val ().trim ();
                    var prefix = $('#ec-sh-id-prefix').val ().trim ();
                    var count = 0;

                    if ((prefix !== '') && (num.length !== 0)) {
                      var sh_id = prefix + num.toString ();
                      var sh_ln = $('#ec-sh-ln').val ().trim ().toUpperCase ();
                      var sh_fn = $('#ec-sh-fn').val ().trim ().toUpperCase ();
                      var sh_uid = editVars.competitor.sh_uid;

                      _.each (editVars.competitors, function (s) {
                        if ((sh_id === s.sh_id) && (sh_uid !== s.sh_uid) && ((sh_fn !== s.sh_fn.toUpperCase ()) || (sh_ln !== s.sh_ln.toUpperCase ())))
                          ++count;
                      });
                    }

                    return count ? false : true;
                  }
    }, {
      matchtype:  {tp: true, tpp: true, tgn: true},
      input:      '#ec-sh-id',
      position:   'bottom',
      message:    'Membership number may only contain the characters A-Z, a-z, 0-9, dash, and space',
      action:     'keyup, blur',
      rule:       function (input) {
                    return (input.val ().search (/[^A-Za-z0-9 -]/) === -1) ? true : false;
                  }
    }, {
      matchtype:  {tp: true, tpp: true, tgn: true},
      input:      '#ec-sh-id',
      position:   'bottom',
      message:    'This number is in use by a competitor with a different name',
      action:     'valuechanged, blur',
      rule:       function (input) {
                    var sh_id = input.val ().trim ();
                    var count = 0;

                    if (sh_id.length) {
                      var sh_ln = $('#ec-sh-ln').val ().trim ().toUpperCase ();
                      var sh_fn = $('#ec-sh-fn').val ().trim ().toUpperCase ();
                      var sh_uid = editVars.competitor.sh_uid;

                      _.each (editVars.competitors, function (s) {
                        if ((sh_id === s.sh_id) && (sh_uid !== s.sh_uid) && ((sh_fn !== s.sh_fn.toUpperCase ()) || (sh_ln !== s.sh_ln.toUpperCase ())))
                          ++count;
                      });
                    }

                    return count ? false : true;
                  }
    },
  ];

  _.eachRight (validatorRules, function (rule, index) {
    if (!rule.matchtype [editVars.matchtype])
      validatorRules.splice (index, 1);
  });

  $('#form-competitor').jqxValidator ({
    focus: true,
    closeOnClick: false,
    onSuccess: function () {
      var competitor = editVars.competitor;
      var updateListBox = false;

      //
      //  Changes that make us need to update the squads tab
      //
      editVars.updateSquadsTab |= (competitor.sh_del !== $('#ec-sh-del').jqxDropDownList ('getSelectedItem').value);
      editVars.updateSquadsTab |= (competitor.sh_here !== $('#ec-sh-here').val ());
      editVars.updateSquadsTab |= (competitor.sh_sqd !== parseInt ($('#ec-sh-sqd').val ()));

      //
      //  Changes that make us need to update the list box
      //
      updateListBox = updateListBox || (competitor.sh_del !== $('#ec-sh-del').jqxDropDownList ('getSelectedItem').value);
      updateListBox = updateListBox || (competitor.sh_here !== $('#ec-sh-here').val ());
      updateListBox = updateListBox || (competitor.sh_fn !== $('#ec-sh-fn').val ().trim ());
      updateListBox = updateListBox || (competitor.sh_ln !== $('#ec-sh-ln').val ().trim ());

      //
      //  Get the fields from the edit form
      //
      competitor.sh_fn      = $('#ec-sh-fn').val ().trim ();
      competitor.sh_ln      = $('#ec-sh-ln').val ().trim ();
      $('#ec-sh-id').each (function () {
        var thisid = $(this).val ().trim ();
        updateListBox = updateListBox || (competitor.sh_id !== thisid);
        competitor.sh_id = thisid;
      });
      $('#ec-sh-id-prefix').each (function () {
        var thisid = $(this).val ().trim () + $('#ec-sh-id-num').val ().trim ();
        updateListBox = updateListBox || (competitor.sh_id !== thisid);
        competitor.sh_id = thisid;
      });

      competitor.sh_dvp     = $('#ec-sh-dvp').jqxDropDownList ('getSelectedItem').value;
      $('#ec-sh-pf').each (function () {competitor.sh_pf = $(this).jqxDropDownList ('getSelectedItem').value;});
      competitor.sh_grd     = $('#ec-sh-grd').jqxDropDownList ('getSelectedItem').value;

      competitor.sh_sqd     = parseInt ($('#ec-sh-sqd').val ());
      $('#ec-sh-age').each (function () {competitor.sh_age = $(this).val ().trim ();});
      $('#ec-sh-gen').each (function () {competitor.sh_gen = $(this).jqxDropDownList ('getSelectedItem').value;});
      $('#ec-sh-ctgs').each (function () {competitor.sh_ctgs = _.pluck ($(this).jqxDropDownList ('getCheckedItems'), 'label');});

      $('#ec-sh-law').each (function () {competitor.sh_law = $(this).jqxDropDownList ('getSelectedItem').value;});
      $('#ec-sh-mil').each (function () {competitor.sh_mil = $(this).jqxDropDownList ('getSelectedItem').value;});
      $('#ec-sh-frn').each (function () {competitor.sh_frn = $(this).jqxDropDownList ('getSelectedItem').value;});

      competitor.sh_wlk     = $('#ec-sh-wlk').jqxDropDownList ('getSelectedItem').value;
      competitor.sh_dq      = $('#ec-sh-dq').jqxDropDownList ('getSelectedItem').value;
      competitor.sh_del     = $('#ec-sh-del').jqxDropDownList ('getSelectedItem').value;

      competitor.sh_staff   = $('#ec-sh-staff').val (); // Comes from the top-right panel
      competitor.sh_paid    = $('#ec-sh-paid').val ();  // Comes from the top-right panel
      competitor.sh_here    = $('#ec-sh-here').val ();  // Comes from the top-right panel

      $('#ec-sh-num').each (function () {competitor.sh_num = parseInt ($(this).val ());});
      competitor.sh_lge     = $('#ec-sh-lge').jqxDropDownList ('getSelectedItem').value;
      competitor.sh_lgp     = $('#ec-sh-lgp').jqxDropDownList ('getSelectedItem').value;

      competitor.sh_eml     = $('#ec-sh-eml').val ().trim ();
      competitor.sh_ph      = $('#ec-sh-ph').val ().replace (/[^0-9]/g, '');

      competitor.sh_addr1   = $('#ec-sh-addr1').val ().trim ();
      competitor.sh_addr2   = $('#ec-sh-addr2').val ().trim ();

      competitor.sh_city    = $('#ec-sh-city').val ().trim ();
      competitor.sh_st      = $('#ec-sh-st').jqxDropDownList ('getSelectedItem').value;
      competitor.sh_zipcode = $('#ec-sh-zipcode').val ().replace (/[^0-9]/g, '');

      competitor.sh_del_fmt = $('#ec-sh-del').jqxDropDownList ('getSelectedItem').label;
      competitor.sh_dq_fmt  = $('#ec-sh-dq').jqxDropDownList ('getSelectedItem').label;
      competitor.sh_dvp_fmt = $('#ec-sh-dvp').jqxDropDownList ('getSelectedItem').label;
      competitor.sh_grd_fmt = $('#ec-sh-grd').jqxDropDownList ('getSelectedItem').label;
      competitor.sh_lge_fmt = $('#ec-sh-lge').jqxDropDownList ('getSelectedItem').label;
      competitor.sh_lgp_fmt = $('#ec-sh-lgp').jqxDropDownList ('getSelectedItem').label;
      competitor.sh_wlk_fmt = $('#ec-sh-wlk').jqxDropDownList ('getSelectedItem').label;

      $('#ec-sh-age').each (function () {competitor.sh_age_fmt = $(this).jqxDropDownList ('getSelectedItem').label;});
      $('#ec-sh-gen').each (function () {competitor.sh_gen_fmt = $(this).jqxDropDownList ('getSelectedItem').label;});
      $('#ec-sh-frn').each (function () {competitor.sh_frn_fmt = $(this).jqxDropDownList ('getSelectedItem').label;});
      $('#ec-sh-law').each (function () {competitor.sh_law_fmt = $(this).jqxDropDownList ('getSelectedItem').label;});
      $('#ec-sh-mil').each (function () {competitor.sh_mil_fmt = $(this).jqxDropDownList ('getSelectedItem').label;});

      if (editVars.matchIsUSPSA || editVars.matchIsSC)
        if (((competitor.sh_dvp === 'PROD') || (competitor.sh_dvp === 'CO')) && (competitor.sh_pf !== 'MINOR')) // FIXME: When we use full division names
          competitor.sh_pf = 'MINOR';

      $('#ec-sh-ctgs').each (function () {competitor.prefer = 'tags';});

      if (editVars.mode === 'edit') {
        saveCompetitor (competitor, function (err, savedCompetitor) {
          if (!err) {
            populateCompetitorTab ({competitor: savedCompetitor, mode: 'edit'});
            $('#status-message').html ('Competitor updated').show ();
          }
        });
      } else if (editVars.mode === 'add') {
        addCompetitor (competitor, function (err, newCompetitor) {
          if (!err) {
            populateCompetitorTab ({competitor: newCompetitor, mode: 'edit'});
            $('#status-message').html ('Competitor added').show ();
          }
        });
      } else
        alert ('WTF?!? editVars.mode isn\'t edit or add!');
    },
    rules: validatorRules,
  });

  $('[id^="panel-squads-"]').each (function () {
    $(this).jqxPanel ({
      width: (794 - 34) / 2,
      height: $('#tabs-center').jqxTabs ('height') - 55, // 55 is height of header + margins
    });
  });

  //
  //  The dragEnd function always returns false. The parameters are captured,
  //  and the actual move is done when the dragEnd event fires.
  //
  $('[id^="tree-squads-"]').each (function () {
    var dragTree = this;

    $(this).jqxTree ({
      width:      '100%',
      height:     '100%',
      allowDrag:  true,
      allowDrop:  true,
      toggleMode: 'click',
      dragStart:  function (item) {
                    return item.value.substr (0, 6) !== 'header';
                  },
      dragEnd:    function (dragItem, dropItem, args, dropPosition, dropTree) {
                    var regex = /header-(\d+)$/g;
                    var competitor = _.find (editVars.competitors, 'sh_uid', dragItem.value);
                    var dragSquad = competitor.sh_sqd;
                    var dropSquad = regex.exec (dropItem.value);
                    var item;

                    if (((dropPosition === 'after') || (dropPosition === 'before')) && _.isNull (dropItem.parentElement)) {
                      item = $(dropTree).jqxTree ('getItem', dropItem.element);
                      if (dropPosition === 'before')
                        if (item.value.substr (0, 6) !== 'header') {
                          item = item.parentElement;
                          alert ('Wasn\'t expecting this!');
                        } else {
                          var dropItems = $(dropTree).jqxTree ('getItems');
                          var index = _.findIndex (dropItems, 'value', item.value) - 1;

                          for (; (index >= 0) && (dropItems [index].value.substr (0, 6) !== 'header'); index--)
                            ;

                          if (index === -1)
                            return false;

                          item = $(dropTree).jqxTree ('getItem', dropItems [index].element);
                        }

                      if (!item || !item.isExpanded)
                        return false;

                      dropItem = item;
                    }

                    dropSquad = _.isArray (dropSquad) ? parseInt (dropSquad [1]) : _.result (_.find (editVars.competitors, 'sh_uid', dropItem.value), 'sh_sqd');

                    if (dragSquad === dropSquad)
                      return false;

                    editVars.treeFix = {
                      dragTree:  dragTree,
                      dragItem:  dragItem,
                      dropTree:  dropTree,
                      dropItem:  dropItem,
                      dragSquad: dragSquad,
                      dropSquad: dropSquad,
                    };

                    competitor.sh_sqd = dropSquad;

                    saveCompetitor (competitor);

                    return false;
                  },
    });
  });

  //
  //  Create the practiscore and accounting panel, then add the classes so they
  //  have the same look as the header over the tabs.
  //
  $('#window-summary').jqxWindow ({
    width: 795,
    height: editVars.pageHeight - ($('#tabs-center').jqxTabs ('height') + 12),
    showCollapseButton: true,
    showCloseButton: false,
    resizable: false,
    draggable: false,
    animationType: 'none',
    collapseAnimationDuration: 0,
    position: {
      x: $('#tabs-center').position ().left - 60,
      y: $('#tabs-center').position ().top + $('#tabs-center').jqxTabs ('height') + 2,
    },
  });

  //
  //  Height of window, adjusted for height of header
  //
  editVars.expandedHeight = $('#window-summary').jqxWindow ('height') - 26;
  editVars.expandedPosition = $('#window-summary').jqxWindow ('position');

  //
  //  Because the summary window gets moved to the bottom of the screen when
  //  it's collapsed, change the collapse arrow to an up arrow so it's a little
  //  more intuitive.
  //
  $('#window-summary').find ('[class*="jqx-icon-arrow-"]').each (function () {
    $(this).attr ('class', this.className.replace (/jqx-icon-arrow-up-/g, 'jqx-icon-arrow-down-'));
  });

  var changeCollapseArrowStyleTo = function (direction) {
    $('#window-summary').find ('[class*="jqx-icon-arrow-"]').each (function () {
      if (direction === 'up') {
        $(this).attr ('class', this.className.replace (/jqx-icon-arrow-down-/g, 'jqx-icon-arrow-up-'));
        $(this).attr ('class', this.className.replace (/collapsed/g, 'expanded'));
      } else
        $(this).attr ('class', this.className.replace (/jqx-icon-arrow-up-/g, 'jqx-icon-arrow-down-'));
    });
  };

  var resizeCenterTabs = function (adjustment) {
    var tabs = $('#tabs-center');
    var height = $(tabs).jqxTabs ('height');

    $(tabs).jqxTabs ('height', height + adjustment);

    $('[id^="panel-squads-"]').each (function () {
      $(this).jqxPanel ({
        height: $(tabs).jqxTabs ('height') - 55, // 55 is height of header + margins
      });
    });
  };

  var resizeSummaryWindow = function (adjustment) {
    $('#window-summary').jqxWindow ({
      position: {
        x: editVars.expandedPosition.x,
        y: editVars.expandedPosition.y + adjustment,
      }
    });
  };

  $('#window-summary').on ('collapse', function () {
    resizeSummaryWindow (editVars.expandedHeight);
    resizeCenterTabs (editVars.expandedHeight);
    changeCollapseArrowStyleTo ('up');
  });

  $('#window-summary').on ('expand', function () {
    resizeSummaryWindow (0);
    resizeCenterTabs (0 - editVars.expandedHeight);
    changeCollapseArrowStyleTo ('down');
  });

  $('#panel-practiscore').jqxPanel ({
    width: 213,
    height: 94,
  });

  $('#panel-accounting').jqxPanel ({
    width: 213,
    height: editVars.pageHeight - ($('#panel-practiscore').jqxPanel ('height') + 12),
  });

  $('#header-practiscore').addClass ('jqx-tabs-headerWrapper jqx-tabs-header jqx-tabs-header-' + $.jqx.theme + ' jqx-widget-header jqx-widget-header-' + $.jqx.theme + ' jqx-rc-t jqx-rc-t-' + $.jqx.theme);
  $('[panel-practiscore-checkbox]').jqxCheckBox ({disabled: true, width: 70, height: 20});

  $('#header-accounting').addClass ('jqx-tabs-headerWrapper jqx-tabs-header jqx-tabs-header-' + $.jqx.theme + ' jqx-widget-header jqx-widget-header-' + $.jqx.theme + ' jqx-rc-t jqx-rc-t-' + $.jqx.theme);
  $('[panel-accounting-radiobutton]').jqxRadioButton ({disabled: true, width: 110, height: 20, animationShowDelay: 50, animationHideDelay: 50});
  $('[panel-accounting-radiobutton-amount]').jqxRadioButton ({groupName: 'amount'});
  $('[panel-accounting-radiobutton-paid]').jqxRadioButton ({groupName: 'paid'});

  $('#jqxLoader').jqxLoader ({
    text: '',
    width: 60,
    height: 60,
  });

  //
  //  Search box handles page-up, page-down, home, end, up-arrow and down-arrow
  //  keys
  //
  $('#input-search').on ('keyup search', function (event) {
    var items;
    var select;
    var input = $('#input-search').val ();
    var listbox = $('#listbox-competitors');
    var index = $(listbox).jqxListBox ('getSelectedIndex');

    //
    // Search box empty     - no selected entry - Select first entry
    // Search box empty     -    selected entry - Edit selected entry
    // Search box not empty - no selected entry - Select first entry
    // Search box not empty -    selected entry - Edit selected entry
    //
    if (event.which !== 13) {
      if (event.type === 'search') {
        if (!input || !input.length) {
          updateCompetitorListBox ();
          index = $(listbox).jqxListBox ('getSelectedIndex');
        }
        if (index === -1)
          $(listbox).jqxListBox ('selectIndex', 0);
        else
          selectCompetitorInListBox ($(listbox).jqxListBox ('getItem', index).value, true);
      } else {
        items = $(listbox).jqxListBox ('getItems').length;

        switch (event.which) {
          case 33 : // Page-up
            index = _.max ([0, index]);
            select = _.max ([index - 23, 0]);
            break;
          case 34 : // Page-down
            index = _.max ([-1, index]);
            select = _.min ([index + 23, items - 1]);
            break;
          case 35 : // End
            select = items - 1;
            break;
          case 36 : // Home
            select = 0;
            break;
          case 38 : // Up-arrow
            index = _.max ([0, index]);
            select = _.max ([index - 1, 0]);
            break;
          case 40 : // Down-arrow
            index = _.max ([-1, index]);
            select = _.min ([index + 1, items - 1]);
            break;
          default :
            select = -1;
            break;
        }

        if (select > -1) {
          $(listbox).jqxListBox ('selectIndex', select);
          $(listbox).jqxListBox ('ensureVisible', select);

          items = $(listbox).jqxListBox ('getSelectedItem');

          if (items && items.value)
            selectCompetitorInListBox (items.value, false);
        } else {
          updateCompetitorListBox ();
        }
      }
    }
  });

  //
  //  Suppress context menu. Need to know how to detect right-click to prevent
  //  'select' event from doing anything.
  //
  $('#listbox-competitors').on ('contextmenu', function () {
    return false;
  });

  //
  //  A competitor in the list box was selected. Populate their information
  //  into the editing form, then switch to the competitor tab.
  //
  $('#listbox-competitors').on ('select', function (event) {
    if (event.args && event.args.originalEvent && event.args.originalEvent.which && (event.args.originalEvent.which === 1)) { // FIXME: What is 1?
      if ($(this).find ('.jqx-listitem-state-selected').length)
        editVars.competitorListSelectEvent = true;
      selectCompetitorInListBox (event.args.item.value, true);
    }
  });

  //
  //  jqxListBox() won't generate a select event if clicking on the aready
  //  selected name, but it will cause a click event. Unfortunately, we also
  //  get the click event after a select event, so we need to ignore that one.
  //
  $('#listbox-competitors').on ('click', '.jqx-listitem-state-selected', function () {
    if (!editVars.competitorListSelectEvent) {
      $('#tabs-center').jqxTabs ('select', 0);
      $('#ec-sh-ln').jqxInput ('focus');
    }

    editVars.competitorListSelectEvent = false;
  });

  $('#tabs-center').on ('selected', function (event) {
    if (event.args.item === tabNumber_Competitor) {
      if ($('#form-competitor').data ('form-has-data')) {
        $('[panel-practiscore-checkbox]').jqxCheckBox ({disabled: false});
        $('[panel-accounting-radiobutton]').jqxRadioButton ({disabled: false});
      }
    } else if (event.args.item === tabNumber_Squads) {
      if (editVars.options.squadsTabCollapseAll) {
        $('[id^="tree-squads-"]').each (function () {
          $(this).jqxTree ('collapseAll');
        });

        editVars.options.squadsTabCollapseAll = false;
      }

      if (editVars.updateSquadsTab) {
        var squads = {};
        var source = [];

        $('#jqxLoader').jqxLoader ('open');

        _.each (editVars.competitors, function (competitor) {
          if (!competitor.sh_del) {
            squads [competitor.sh_sqd] = squads [competitor.sh_sqd] || [];
            squads [competitor.sh_sqd].push (competitor);
          }
        });

        _.each (squads, function (squad, squadNumber) {
          squadNumber = parseInt (squadNumber);

          if (!editVars.options.squadsUseShowList || editVars.options.squadsShowList [squadNumber]) {
            squads [squadNumber] = squad = _.sortBy (squad, 'sh_lnfnid');

            makeTreeHeader (squadNumber, function (squadNumber, isNotEmpty, label, value) {
              source.push ({
                label: label,
                value: value,
                items: _.map (squad, function (competitor) {
                  return {
                    icon: competitor.sh_here ? '/images/checkmark-green.png' : '/images/checkmark-transparent.png',
                    iconsize: 14,
                    label: competitor.sh_lnfnid,
                    // html: '<span class="pmm-checkmark-space' + (competitor.sh_here ? ' pmm-checkmark-present">' : '">') + competitor.sh_lnfnid + '</span>',
                    value: competitor.sh_uid,
                  };
                }),
              });
            });
          }
        });

        //
        //  Refresh each squad tree with the updated data. Get a list of
        //  expanded tabs in the tree (should be only one, but we're trying to
        //  be flexible), and save the part of the header that won't change
        //  ("Squad 6 ("). Reset the source on the tree, which will change all
        //  the element IDs.  Then seach the rebuilt tree for a matching
        //  header, and call the 'expandItem' method on the match. If the squad
        //  disappears, we shouldn't get an error.
        //
        $('[id^="tree-squads-"]').each (function () {
          var self = this;
          var regex = /^(.* \()/;
          var labels = [];

          _.each (_.filter ($(self).jqxTree ('getItems'), {isExpanded: true}), function (item) {
            labels.push (regex.exec (item.label) [1]);
          });

          $(self).jqxTree ({source: source});

          _.each (labels, function (label) {
            _.each (_.filter ($(self).jqxTree ('getItems'), function (item) {
                      return item.label.indexOf (label) === 0;
                    }), function (item) {
              $(self).jqxTree ('expandItem', item.element);
            });
          });
        });

        $('#jqxLoader').jqxLoader ('close');

        editVars.updateSquadsTab = false;
      }
    } else if (event.args.item === tabNumber_Options) {
      $('#input-options-squads-showlist').jqxInput ({disabled: !editVars.options.squadsUseShowList});
      $('#checkbox-options-squads-hideunshown').jqxCheckBox ({disabled: !editVars.options.squadsUseShowList});
      $('[options-squads-useshowlist-fade]').css ({opacity: !editVars.options.squadsUseShowList? 0.55 : 1.00});
    }
  });

  //
  //  If the competitor tab is not selected (visible), then disable the
  //  practiscore and accounting panels on the far right.
  //
  $('#tabs-center').on ('unselected', function (event) {
    if (event.args.item === tabNumber_Competitor) {
      $('[panel-practiscore-checkbox]').jqxCheckBox ({disabled: true});
      $('[panel-accounting-radiobutton]').jqxRadioButton ({disabled: true});
    }
  });

  //
  //  Clicking buttons in the practiscore and accounting panels causes an
  //  immediate update. We do this so the user doesn't need to hit save after
  //  marking them as here, staff, etc.
  //
  $('[panel-accounting-radiobutton-amount]').on ('checked', function () {
    if (!$('#form-competitor').data ('disable-events')) {
      var regex = /-(\w+)$/g;
      var id = $(this).attr ('id');
      var amount = regex.exec (id) [1];
      editVars.accounting [editVars.competitor.sh_uid].amount = amount;
    }
  });

  $('[panel-accounting-radiobutton-paid]').on ('checked', function () {
    if (!$('#form-competitor').data ('disable-events')) {
      var regex = new RegExp (/-(\d+)$/);
      var id = $(this).attr ('id');
      var paid = regex.exec (id) [1];
      editVars.accounting [editVars.competitor.sh_uid].paid = paid;
      $('#ec-sh-paid').jqxCheckBox ({checked: true});
    }
  });

  //
  //  These are the 3 controls in the Practiscore panel
  //
  $('#ec-sh-here,#ec-sh-paid,#ec-sh-staff').on ('change', function () {
    if (!$('#form-competitor').data ('disable-events'))
      $('#form-competitor').jqxValidator ('validate');
  });

  var refreshMatchData = function () {
    editVars.socket.emit ('match:get', {options: {match: true}}, function (data) {
      editVars.matchID = data.matchData.m.match_id;
      editVars.competitors = data.matchData.m.match_shooters;

      _.each (editVars.competitors, function (competitor) {
        editVars.accounting [competitor.sh_uid] = {amount: null, paid: null};
      });

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

      competitorSource.datafields [_.findIndex (competitorSource.datafields, {name: 'sh_grd_fmt'})].values.source = classesAdapter.records;
      competitorSource.datafields [_.findIndex (competitorSource.datafields, {name: 'sh_dvp_fmt'})].values.source = divisionsAdapter.records;

      editVars.socket.emit ('settings:checkin:load', {uuid: editVars.matchID}, function (data) {
        if (data.err)
          alert ('Error loading check-in settings: ' + data.err);
        else {
          loadCheckinSettings (data.settings);
          refreshCompetitorAdapter (editVars.competitors);
        }
      });
    });
  };

  //
  //
  //
  var socketConnectMsg = function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();

    refreshMatchData ();
  };

  var socketDisconnectMsg = function () {
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  };

  var competitorUpdated = function (param) {
    if (param.shooter) {
      if (param.shooter.sh_uid) {
        var index = _.findIndex (editVars.competitors, 'sh_uid', param.shooter.sh_uid);

        if (index !== -1)
          editVars.competitors [index] = param.shooter;
        else
          editVars.competitors.push (param.shooter);

        refreshCompetitorAdapter (editVars.competitors);

        if (editVars.competitor && (editVars.competitor.sh_uid === param.shooter.sh_uid))
          populateCompetitorTab ({competitor: _.find (editVars.competitors, {sh_uid: param.shooter.sh_uid}), mode: 'edit'});
      } else
        alert ('competitorUpdated() has shooter with no UID');
    } else
      alert ('competitorUpdated() has no param!');
  };

  var reload = function () {
    window.location.href = 'http://' + window.location.host + '/manage/checkin';
  };

  editVars.socket = io.connect ();
  editVars.socket.on ('connect', socketConnectMsg);
  editVars.socket.on ('disconnect', socketDisconnectMsg);
  editVars.socket.on ('competitors_updated', refreshMatchData);
  editVars.socket.on ('competitor_updated', competitorUpdated);
  editVars.socket.on ('competitor_added', competitorUpdated);
  editVars.socket.on ('reload', reload);

  editVars.socket.emit ('log:log', {msg: 'Manage->Devices'});

  window.onerror = function (msg, url, line, col, error) {
    if (editVars.socket) {
      editVars.socket.emit ('errorlog:error', {
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
