/* global io, pmelib, sprintf */
/* global console: false, _: false */
/* jshint devel: true */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};

  var states = {
    'AK': 'Alaska',
    'AL': 'Alabama',
    'AR': 'Arkansas',
    'AZ': 'Arizona',
    'CA': 'California',
    'CO': 'Colorado',
    'CT': 'Connecticut',
    'DE': 'Delaware',
    'FL': 'Florida',
    'GA': 'Georgia',
    'HI': 'Hawaii',
    'IA': 'Iowa',
    'ID': 'Idaho',
    'IL': 'Illinois',
    'IN': 'Indiana',
    'KS': 'Kansas',
    'KY': 'Kentucky',
    'LA': 'Louisiana',
    'MA': 'Massachusetts',
    'MD': 'Maryland',
    'ME': 'Maine',
    'MI': 'Michigan',
    'MN': 'Minnesota',
    'MO': 'Missouri',
    'MS': 'Mississippi',
    'MT': 'Montana',
    'NC': 'North Carolina',
    'ND': 'North Dakota',
    'NE': 'Nebraska',
    'NH': 'New Hampshire',
    'NJ': 'New Jersey',
    'NM': 'New Mexico',
    'NV': 'Nevada',
    'NY': 'New York',
    'OH': 'Ohio',
    'OK': 'Oklahoma',
    'OR': 'Oregon',
    'PA': 'Pennsylvania',
    'RI': 'Rhode Island',
    'SC': 'South Carolina',
    'SD': 'South Dakota',
    'TN': 'Tennessee',
    'TX': 'Texas',
    'UT': 'Utah',
    'VA': 'Virginia',
    'VT': 'Vermont',
    'WA': 'Washington',
    'WI': 'Wisconsin',
    'WV': 'West Virginia',
    'WY': 'Wyoming',
    'GU': 'Guam',
    'PR': 'Puerto Rico',
    'VI': 'Virgin Islands',
  };

  _.mixin ({
    'sortKeysBy': function (obj, comparator) {
      var keys = _.sortBy (_.keys (obj), function (key) {
        return comparator ? comparator (obj [key], key) : key;
      });

      return _.object (keys, _.map (keys, function (key) {
        return obj [key];
      }));
    }
  });

  //
  //
  //
  App.calculateStatistics = function () {
    App.stats = {};
    App.stats.divisionTotals = {};
    App.stats.classTotals = {};
    App.stats.categoryTotals = {};
    App.stats.stateTotals = {};
    App.stats.areaTotals = {};
    App.stats.registeredShooters = App.matchData.m.match_shooters.length;
    App.stats.deletedShooters = _.filter (App.matchData.m.match_shooters, 'sh_del', true).length;
    App.stats.activeShooters = App.stats.registeredShooters - App.stats.deletedShooters;

    pmelib.removeDeletedShooters (App.matchData);

    App.stats.dqedShooters = _.filter (App.matchData.m.match_shooters, 'sh_dq', true).length;
    App.stats.foreignShooters = _.filter (App.matchData.m.match_shooters, 'sh_frn', true).length;

    _.each (App.matchData.m.match_shooters, function (shooter) {
      _.each (shooter.sh_ctgs, function (category) {
        App.stats.categoryTotals [category] = (App.stats.categoryTotals [category] || 0) + 1;
      });
      App.stats.stateTotals [shooter.sh_st] = (App.stats.stateTotals [shooter.sh_st] || 0) + 1;
      App.stats.areaTotals [shooter.sh_area] = (App.stats.areaTotals [shooter.sh_area] || 0) + 1;
      App.stats.classTotals [shooter.sh_grd] = (App.stats.classTotals [shooter.sh_grd] || 0) + 1;
      App.stats.divisionTotals [shooter.sh_dvp] = (App.stats.divisionTotals [shooter.sh_dvp] || 0) + 1;
    });
  };

  App.consoleStatistics = function () {
    console.log ("Match totals -->");
    console.log (sprintf ("  %3d total shooters in match", App.stats.registeredShooters));
    console.log (sprintf ("  %3d active shooters in match", App.stats.activeShooters));
    console.log (sprintf ("  %3d deleted shooters in match", App.stats.deletedShooters));
    console.log (sprintf ("  %3d DQ'ed shooters in match", App.stats.dqedShooters));

    console.log ("Division totals -->");
    _.each (_.sortKeysBy (App.stats.divisionTotals), function (value, key) {
      console.log (sprintf ("  %3d in %s", value, key));
    });

    console.log ("Class totals -->");
    _.each (_.sortKeysBy (App.stats.classTotals), function (value, key) {
      console.log (sprintf ("  %3d in %s class", value, key));
    });

    console.log ("Category totals -->");
    _.each (_.sortKeysBy (App.stats.categoryTotals), function (value, key) {
      console.log (sprintf ("  %3d in %s", value, key));
    });

    console.log ("State totals -->");
    _.each (_.sortKeysBy (App.stats.stateTotals), function (value, key) {
      if (key.length)
        console.log (sprintf ("  %3d from %s", value, key));
    });

    console.log ("Area totals -->");
    _.each (_.sortKeysBy (App.stats.areaTotals), function (value, key) {
      console.log (sprintf ("  %3d from area %s", value, key));
    });

    console.log ("Foreign totals -->");
    console.log (sprintf ("  %3d non-foreign active shooters", App.stats.activeShooters - App.stats.foreignShooters));
    console.log (sprintf ("  %3d foreign active shooters", App.stats.foreignShooters));

    if (App.stats.categoryTotals.Foreign !== _.filter (App.matchData.m.match_shooters, 'sh_frn', true).length)
      alert ('Inconsistency in sh_ctgs and sh_frn!');
    if (App.stats.categoryTotals ['Law Enforcement'] !== _.filter (App.matchData.m.match_shooters, 'sh_law', true).length)
      alert ('Inconsistency in sh_ctgs and sh_law!');
    if (App.stats.categoryTotals.Military !== _.filter (App.matchData.m.match_shooters, 'sh_mil', true).length)
      alert ('Inconsistency in sh_ctgs and sh_mil!');
    if (App.stats.categoryTotals.Lady !== _.filter (App.matchData.m.match_shooters, {'sh_gen': 'FEMALE'}).length)
      alert ('Inconsistency in sh_ctgs and sh_gen (Female)!');
    if (App.stats.categoryTotals.Junior !== _.filter (App.matchData.m.match_shooters, {'sh_age': 'JUNIOR'}).length)
      alert ('Inconsistency in sh_ctgs and sh_age (Junior)');
    if (App.stats.categoryTotals.Senior !== _.filter (App.matchData.m.match_shooters, {'sh_age': 'SENIOR'}).length)
      alert ('Inconsistency in sh_ctgs and sh_age (Senior)');
    if (App.stats.categoryTotals ['Super Senior'] !== _.filter (App.matchData.m.match_shooters, {'sh_age': 'SUPSNR'}).length)
      alert ('Inconsistency in sh_ctgs and sh_age (Super Senior)');
  };

  //
  //
  //
  App.putPageBreak = function () {
    var fragment = document.createDocumentFragment ();
    var divnp = document.createElement ('div');

    divnp.setAttribute ('section', 'header-rule');
    divnp.className = 'no-print';

    fragment.appendChild (divnp);

    return fragment;
  };

  App.putHeader = function () {
    var div = document.createElement ('div');

    div.setAttribute ('section', 'header');
    div.className = 'nobreak';

    return div;
  };

  //
  //
  //
  App.displayMatchInfo = function (pv) {
    var divnb  = document.createElement ('div');
    var divbr  = document.createElement ('div');
    var br     = document.createElement ('br');
    var h1Name = document.createElement ('h1');
    var h1Club = document.createElement ('h1');
    var h1Date = document.createElement ('h1');
    var h1Code = document.createElement ('h1');

    divbr.appendChild (br);

    h1Name.innerHTML = pv.matchName;
    h1Club.innerHTML = pv.clubName;
    h1Date.innerHTML = pv.matchDate;
    h1Code.innerHTML = pv.clubCode;

    divnb.setAttribute ('section', 'title-page');
    divnb.className = 'no-break';
    divnb.appendChild (divbr);
    divnb.appendChild (h1Name);
    divnb.appendChild (h1Club);
    divnb.appendChild (h1Date);
    divnb.appendChild (h1Code);
    divnb.appendChild (divbr);
    divnb.appendChild (divbr);
    divnb.appendChild (divbr);
    divnb.appendChild (divbr);

    return divnb;
  };

  App.displayOverallStatistics = function () {
    var fragment = document.createDocumentFragment ();
    var div = document.createElement ('div');
    var table = document.createElement ('table');
    var thead = document.createElement ('thead');
    var tbody = document.createElement ('tbody');
    var tr, th, td;

    tr = document.createElement ('tr');
    th = document.createElement ('th');
    th.innerHTML = 'Match Totals';
    th.setAttribute ('colSpan', 2);
    tr.appendChild (th);
    thead.appendChild (tr);

    tr = document.createElement ('tr');
    td = document.createElement ('td');
    td.innerHTML = 'Registered Shooters';
    td.className = 'left';
    tr.appendChild (td);
    td = document.createElement ('td');
    td.innerHTML = App.stats.registeredShooters;
    td.className = 'right';
    tr.appendChild (td);
    tbody.appendChild (tr);

    tr = document.createElement ('tr');
    td = document.createElement ('td');
    td.innerHTML = 'Active Shooters';
    td.className = 'left';
    tr.appendChild (td);
    td = document.createElement ('td');
    td.innerHTML = App.stats.activeShooters;
    td.className = 'right';
    td.style.cssText = 'text-align: right;';
    tr.appendChild (td);
    tbody.appendChild (tr);

    tr = document.createElement ('tr');
    td = document.createElement ('td');
    td.innerHTML = 'Deleted Shooters';
    td.className = 'left';
    tr.appendChild (td);
    td = document.createElement ('td');
    td.innerHTML = App.stats.deletedShooters;
    td.className = 'right';
    tr.appendChild (td);
    tbody.appendChild (tr);

    tr = document.createElement ('tr');
    td = document.createElement ('td');
    td.innerHTML = 'Foreign Shooters';
    td.className = 'left';
    tr.appendChild (td);
    td = document.createElement ('td');
    td.innerHTML = App.stats.foreignShooters;
    td.className = 'right';
    tr.appendChild (td);
    tbody.appendChild (tr);

    tr = document.createElement ('tr');
    td = document.createElement ('td');
    td.innerHTML = 'DQ\'ed Shooters';
    td.className = 'left';
    tr.appendChild (td);
    td = document.createElement ('td');
    td.innerHTML = App.stats.dqedShooters;
    td.className = 'right';
    tr.appendChild (td);
    tbody.appendChild (tr);

    table.className = 'stats';
    table.appendChild (thead);
    table.appendChild (tbody);

    div.style.cssText = 'padding-top: 15px; padding-bottom: 15px';
    div.appendChild (table);

    fragment.appendChild (App.putHeader ());
    fragment.appendChild (div);
    fragment.appendChild (App.putPageBreak ());

    return fragment;
  };

  App.displayDivisionStatistics = function () {
    var fragment = document.createDocumentFragment ();
    var div = document.createElement ('div');
    var table = document.createElement ('table');
    var thead = document.createElement ('thead');
    var tbody = document.createElement ('tbody');
    var tr, th, td;

    tr = document.createElement ('tr');
    th = document.createElement ('th');
    th.innerHTML = 'Division Totals';
    th.setAttribute ('colSpan', 2);
    tr.appendChild (th);
    thead.appendChild (tr);

    _.each (_.sortKeysBy (App.stats.divisionTotals), function (value, key) {
      tr = document.createElement ('tr');
      td = document.createElement ('td');
      td.innerHTML = App.matchData.l.divisions [key] || 'WTF?!?';
      td.className = 'left';
      tr.appendChild (td);
      td = document.createElement ('td');
      td.innerHTML = value;
      td.className = 'right';
      tr.appendChild (td);
      tbody.appendChild (tr);
    });

    table.className = 'stats';
    table.appendChild (thead);
    table.appendChild (tbody);

    div.style.cssText = 'padding-top: 15px; padding-bottom: 15px';
    div.appendChild (table);

    fragment.appendChild (App.putHeader ());
    fragment.appendChild (div);
    fragment.appendChild (App.putPageBreak ());

    return fragment;
  };

  App.displayClassStatistics = function () {
    var fragment = document.createDocumentFragment ();
    var div = document.createElement ('div');
    var table = document.createElement ('table');
    var thead = document.createElement ('thead');
    var tbody = document.createElement ('tbody');
    var tr, th, td;

    tr = document.createElement ('tr');
    th = document.createElement ('th');
    th.innerHTML = 'Class Totals';
    th.setAttribute ('colSpan', 2);
    tr.appendChild (th);
    thead.appendChild (tr);

    _.each (['G', 'M', 'A', 'B', 'C', 'D', 'U'], function (key) {
      tr = document.createElement ('tr');
      td = document.createElement ('td');
      td.innerHTML = App.matchData.l.classes [key] || 'WTF?!?';
      td.className = 'left';
      tr.appendChild (td);
      td = document.createElement ('td');
      td.innerHTML = App.stats.classTotals [key];
      td.className = 'right';
      tr.appendChild (td);
      tbody.appendChild (tr);
    });

    table.className = 'stats';
    table.appendChild (thead);
    table.appendChild (tbody);

    div.style.cssText = 'padding-top: 15px; padding-bottom: 15px';
    div.appendChild (table);

    fragment.appendChild (App.putHeader ());
    fragment.appendChild (div);
    fragment.appendChild (App.putPageBreak ());

    return fragment;
  };

  App.displayCategoryStatistics = function () {
    var fragment = document.createDocumentFragment ();
    var div = document.createElement ('div');
    var table = document.createElement ('table');
    var thead = document.createElement ('thead');
    var tbody = document.createElement ('tbody');
    var tr, th, td;

    tr = document.createElement ('tr');
    th = document.createElement ('th');
    th.innerHTML = 'Category Totals';
    th.setAttribute ('colSpan', 2);
    tr.appendChild (th);
    thead.appendChild (tr);

    _.each (_.sortKeysBy (App.stats.categoryTotals), function (value, key) {
      tr = document.createElement ('tr');
      td = document.createElement ('td');
      td.innerHTML = key;
      td.className = 'left';
      tr.appendChild (td);
      td = document.createElement ('td');
      td.innerHTML = value;
      td.className = 'right';
      tr.appendChild (td);
      tbody.appendChild (tr);
    });

    table.className = 'stats';
    table.appendChild (thead);
    table.appendChild (tbody);

    div.style.cssText = 'padding-top: 15px; padding-bottom: 15px';
    div.appendChild (table);

    fragment.appendChild (App.putHeader ());
    fragment.appendChild (div);
    fragment.appendChild (App.putPageBreak ());

    return fragment;
  };

  App.displayStateStatistics = function () {
    var fragment = document.createDocumentFragment ();
    var div = document.createElement ('div');
    var table = document.createElement ('table');
    var thead = document.createElement ('thead');
    var tbody = document.createElement ('tbody');
    var tr, th, td;

    tr = document.createElement ('tr');
    th = document.createElement ('th');
    th.innerHTML = 'State Totals';
    th.setAttribute ('colSpan', 2);
    tr.appendChild (th);
    thead.appendChild (tr);

    _.each (_.sortKeysBy (App.stats.stateTotals), function (value, key) {
      if (key.length) {
        tr = document.createElement ('tr');
        td = document.createElement ('td');
        td.innerHTML = sprintf ('%s (%s)', (states [key] || 'WTF?!?'), key);
        td.className = 'left';
        tr.appendChild (td);
        td = document.createElement ('td');
        td.innerHTML = value;
        td.className = 'right';
        tr.appendChild (td);
        tbody.appendChild (tr);
      }
    });

    table.className = 'stats';
    table.appendChild (thead);
    table.appendChild (tbody);

    div.style.cssText = 'padding-top: 15px; padding-bottom: 15px';
    div.appendChild (table);

    fragment.appendChild (App.putHeader ());
    fragment.appendChild (div);
    fragment.appendChild (App.putPageBreak ());

    return fragment;
  };

  App.displayAreaStatistics = function () {
    var fragment = document.createDocumentFragment ();
    var div = document.createElement ('div');
    var table = document.createElement ('table');
    var thead = document.createElement ('thead');
    var tbody = document.createElement ('tbody');
    var tr, th, td;
    var areaToStatesList = [];

    _.each (App.matchData.l.areaMap, function (area, state) {
      areaToStatesList [+area] = areaToStatesList [+area] || [];
      areaToStatesList [+area].push (state);
    });
    _.each (areaToStatesList, function (stateList, index) {
       areaToStatesList [index] = _.sortBy (stateList).join (',');
    });

    tr = document.createElement ('tr');
    th = document.createElement ('th');
    th.innerHTML = 'Area Totals';
    th.setAttribute ('colSpan', 2);
    tr.appendChild (th);
    thead.appendChild (tr);

    _.each (_.sortKeysBy (App.stats.areaTotals), function (value, key) {
      if (+key !== 0) {
        tr = document.createElement ('tr');
        td = document.createElement ('td');
        td.innerHTML = sprintf ('Area %s (%s)', key, areaToStatesList [+key]);
        td.className = 'left';
        tr.appendChild (td);
        td = document.createElement ('td');
        td.innerHTML = value;
        td.className = 'right';
        tr.appendChild (td);
        tbody.appendChild (tr);
      }
    });

    table.className = 'stats';
    table.appendChild (thead);
    table.appendChild (tbody);

    div.style.cssText = 'padding-top: 15px; padding-bottom: 15px';
    div.appendChild (table);

    fragment.appendChild (App.putHeader ());
    fragment.appendChild (div);
    fragment.appendChild (App.putPageBreak ());

    return fragment;
  };

  //
  //
  //
  App.displayPagePresentation = function (pv) {
    var bodyFragment = document.createDocumentFragment ();
    var matchFragment = document.createDocumentFragment ();
    var statisticsFragment = document.createDocumentFragment ();

    //
    //  Create the match info and configuration fragments
    //
    matchFragment.appendChild (App.displayMatchInfo (pv));

    if (pv.overall)
      statisticsFragment.appendChild (App.displayOverallStatistics ());

    if (pv.division)
      statisticsFragment.appendChild (App.displayDivisionStatistics ());

    if (pv.classs)
      statisticsFragment.appendChild (App.displayClassStatistics ());

    if (pv.category)
      statisticsFragment.appendChild (App.displayCategoryStatistics ());

    if (pv.state)
      statisticsFragment.appendChild (App.displayStateStatistics ());

    if (pv.area)
      statisticsFragment.appendChild (App.displayAreaStatistics ());

    //
    //  And this is the actual order we display them in
    //
    bodyFragment.appendChild (matchFragment);
    bodyFragment.appendChild (statisticsFragment);

    $('#statistics').empty ().append (bodyFragment);
  };

  //
  //
  //
  App.errorMessage = function (msg) {
    var p = document.createElement ('p');
    p.innerHTML = msg;
    p.id = 'errorMessage';
    $('#statistics').empty ().append (p).show ();
  };

  //
  //
  //
  App.displayStatistics = function (pv) {
    if (!App.matchData || !App.matchData.m || !App.matchData.m.match_shooters || !App.matchData.m.match_shooters.length)
      return App.errorMessage ('Nothing to do, no competitors present!');

    App.calculateStatistics ();
    App.displayPagePresentation (pv);

    if (pv.console)
      App.consoleStatistics ();
  };

  //
  //
  //
  App.saveStatisticsSettings = function () {
    var settings = {};

    $('[settings-save]').each (function () {
      var id = $(this).attr ('id');
      var controltype = $(this).attr ('controltype');

      if (controltype === 'checkbox')
        settings [id] = $(this).jqxCheckBox ('checked');
      else if (controltype === 'radiobutton')
        settings [id] = $(this).jqxRadioButton ('checked');
      else if (controltype === 'numberinput')
        settings [id] = $(this).jqxNumberInput ('val');
      else if (controltype === 'textinput')
        settings [id] = $(this).jqxInput ('val');
      else if (controltype === 'dropdownlist') {
        if ($(this).jqxDropDownList ('getSelectedItem'))
          settings [id] = $(this).jqxDropDownList ('getSelectedItem').value;
      } else {
        console.log ('Eeek! ' + id + ' isn\'t checkbox, radiobutton, numberinput, or textinput!', id);
        alert ('Eeek! ' + id + ' isn\'t checkbox, radiobutton, numberinput, or textinput!', id);
      }
    });

    App.socket.emit ('settings:statistics:save', {
      uuid: App.matchData.m.match_id,
      settings: settings,
    }, function (data) {
      if (data.err) {
        console.log ('Error saving statistics settings: ' + data.err);
        alert ('Error saving statistics settings: ' + data.err);
      }
    });

    return settings;
  };

  App.loadStatisticsSettings = function (savedVars) {
    _.each (savedVars, function (value, id) {
      var controltype = id.match (/^(\w+)-?/) [1];

      try {
        if (controltype === 'checkbox')
          $('#' + id).jqxCheckBox ({checked: value});
        else if (controltype === 'radiobutton')
          $('#' + id).jqxRadioButton ({checked: value});
        else if (controltype === 'numberinput')
          $('#' + id).jqxNumberInput ('val', value);
        else if (controltype === 'textinput')
          $('#' + id).jqxInput ('val', value);
        else if (controltype === 'dropdownlist') {
          if (value)
            $('#' + id).val (value);
        } else {
          console.log ('Eeek! ' + id + ' isn\'t checkbox, radiobutton, numberinput, or textinput!', id);
          alert ('Eeek! ' + id + ' isn\'t checkbox, radiobutton, numberinput, or textinput!', id);
        }
      } catch (e) {
        console.log ('No longer used id found in configuration settings (\'%s\')', id);
      }
    });
  };

  App.updatePrintVariables = function () {
    var pv = {};

    pv.console = false;

    pv.matchName = App.matchData.m.match_name;
    pv.matchDate = App.matchData.m.match_date;
    pv.clubName  = $('#textinput-club-name').jqxInput ('val');
    pv.clubCode  = $('#textinput-club-code').jqxInput ('val');

    pv.overall = $('#checkbox-print-overall').jqxCheckBox ('checked');
    pv.division = $('#checkbox-print-division').jqxCheckBox ('checked');
    pv.classs = $('#checkbox-print-class').jqxCheckBox ('checked');
    pv.category = $('#checkbox-print-category').jqxCheckBox ('checked');
    pv.state = $('#checkbox-print-state').jqxCheckBox ('checked');
    pv.area = $('#checkbox-print-area').jqxCheckBox ('checked');

    if (pv.console)
      console.dir (pv);

    App.saveStatisticsSettings ();

    return pv;
  };

  //
  //
  //
  App.updateButtonStates = function () {
    var printEnabled = false;

    if (!$('#textinput-club-name').jqxInput ('val').length)
      $('#textinput-club-name').jqxInput ('val', App.matchData.m.match_clubname || '');
    if (!$('#textinput-club-code').jqxInput ('val').length)
      $('#textinput-club-code').jqxInput ('val', App.matchData.m.match_clubcode || '');

    $('[id^=checkbox-print-').each (function () {
      printEnabled |= $(this).jqxCheckBox ('checked');
    });

    $('[no-sections-fade]').css ({opacity: !printEnabled ? 0.55 : 1.00});
    $('[controltype=button]').jqxButton ('disabled', !printEnabled);
  };

  //
  //
  //
  App.initializeControls = function () {
    $('[controltype=checkbox]').jqxCheckBox ();
    $('[checkbox-is-selected]').jqxCheckBox ({checked: true});

    $('[controltype=button]').each (function () {
      $(this).jqxButton ({
        width: $(this).attr ('button-width'),
      });
    });

    $("[controltype=checkbox], [controltype=radiobutton]").each (function () {
      $(this).on ('click', function () {
        App.updateButtonStates ();
      });
    });

    $('[controltype=textinput]').each (function () {
      $(this).jqxInput ({
        height: 25,
        width: $(this).attr ('textinput-width'),
        minLength: 1,
        maxLength: $(this).attr ('textinput-maxlen'),
      });
    });

    $('#button-screen').on ('click', function () {
      App.displayStatistics (App.updatePrintVariables ());

      var html =
        '<html lang="en"><head>' +
          document.head.innerHTML +
        '</head><body>' +
          $('#statistics').html () +
        '</body></html>';

      window.open ().document.write (html);
    });

    $('#button-print-preview').on ('click', function () {
      App.displayStatistics (App.updatePrintVariables ());
      window.print ();
    });
  };

  //
  //
  //
  App.socketConnect = function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();

    App.socket.emit ('match:get', {options: {all: true}}, function (data) {
      App.matchData = data.matchData;
      $('#matchname').text (App.matchData.m.match_name);

      App.socket.emit ('settings:statistics:load', {
        uuid: App.matchData.m.match_id
      }, function (data) {
        App.initializeControls ();

        if (data.err) {
          console.log ('Error loading statistics settings: ' + data.err);
          alert ('Error loading statistics settings: ' + data.err);
        } else if (data.settings)
          App.loadStatisticsSettings (data.settings);

        App.updateButtonStates ();
        $('#settings').show ();
      });
    });
  };

  App.socketDisconnect = function () {
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  };

  App.matchUpdated = function () {
    App.matchDataChanged = true;
  };

  App.reload = function () {
    alert ('New match loaded, reloading statistics page!');
    window.location.href = 'http://' + window.location.host + '/reports/stats';
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_updated', App.matchUpdated);
  App.socket.on ('reload', App.reload);

  App.socket.emit ('log:log', {msg: 'Reports->Stats'});

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
