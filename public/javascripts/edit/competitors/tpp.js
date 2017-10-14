/* global io, Validator */
/* global _:false */

$(function () {
  'use strict';

  var App = {};

  App.popupShooterIndex = -1;
  App.remapNone        = function (p) { return p; };
  App.remapBoolean     = function (p) { return p ? 'Y' : ''; };
  App.remapFemale      = function (p) { return (p === 'FEMALE') ? 'Y' : ''; };
  App.remapAge         = function (p) { return (p === 'JUNIOR') ? 'Junior' : (p === 'ADULT') ? '' : (p === 'SENIOR') ? 'Senior' : (p === 'SUPSNR') ? 'Super Senior' : '???'; };

  App.colorNone    = function (tr, td, p) { tr = tr; td = td; p = p; };
  App.colorDQ      = function (tr, td, p) { tr = tr; td = td; if (p) tr.setAttribute ('class', 'red'); };
  App.colorDeleted = function (tr, td, p) { td = td; if (p && !tr.getAttribute ('class')) tr.setAttribute ('class', 'yellow'); };

  var desc = [{ n: '#',            f: 'sh_pos',  m: App.remapNone,         c: App.colorNone,    w: 17, }, // 17/26
              { n: 'First Name',   f: 'sh_fn',   m: App.remapNone,         c: App.colorNone,    w: 93, }, // 93/102
              { n: 'Last Name',    f: 'sh_ln',   m: App.remapNone,         c: App.colorNone,    w: 90, }, // 89/98
              { n: 'Membership #', f: 'sh_id',   m: App.remapNone,         c: App.colorNone,    w: 65, }, // 65/74
              { n: 'Female',       f: 'sh_gen',  m: App.remapFemale,       c: App.colorNone,    w: 63, }, // 63/72
              { n: 'Age',          f: 'sh_age',  m: App.remapAge,          c: App.colorNone,    w: 39, }, // 39/48
              { n: 'Law',          f: 'sh_law',  m: App.remapBoolean,      c: App.colorNone,    w: 39, }, // 39/48
              { n: 'Military',     f: 'sh_mil',  m: App.remapBoolean,      c: App.colorNone,    w: 62, }, // 62/71
              { n: 'Foreign',      f: 'sh_frn',  m: App.remapBoolean,      c: App.colorNone,    w: 67, }, // 67/76
              { n: 'Squad',        f: 'sh_sqd',  m: App.remapNone,         c: App.colorNone,    w: 58, }, // 58/67
              { n: 'Division',     f: 'sh_dvp',  m: App.remapNone,         c: App.colorNone,    w: 70, }, // 70/79
              { n: 'Class',        f: 'sh_grd',  m: App.remapNone,         c: App.colorNone,    w: 51, }, // 51/60
              { n: 'eMail',        f: 'sh_eml',  m: App.remapNone,         c: App.colorNone,    w: 47, }, // 47/56
              { n: 'Phone',        f: 'sh_ph',   m: App.remapNone,         c: App.colorNone,    w: 58, }, // 58/67
              { n: 'State',        f: 'sh_st',   m: App.remapNone,         c: App.colorNone,    w: 58, }, // 58/67 ??
              { n: 'Walk-On',      f: 'sh_wlk',  m: App.remapBoolean,      c: App.colorNone,    w: 80, }, // 80/89
              { n: 'DQ',           f: 'sh_dq',   m: App.remapBoolean,      c: App.colorDQ,      w: 32, }, // 32/41
              { n: 'Deleted',      f: 'sh_del',  m: App.remapBoolean,      c: App.colorDeleted, w: 66, }, // 66/75
             ];

  App.fixupShooters = function () {
    var shooters = App.matchData.m.match_shooters;
    var phoneNumberRE = /(\d\d\d)(\d\d\d)(\d\d\d\d)/;

    _.each (shooters, function (shooter) {
      var phoneNumber = shooter.sh_ph.match (phoneNumberRE);

      if (phoneNumber && (phoneNumber.length === 4))
        shooter.sh_ph = phoneNumber [1] + '-' + phoneNumber [2] + '-' + phoneNumber [3];
    });
  };

/*
  //
  //  For numeric fields, make sure number, and that the value is between the
  //  lower and upper bounds.
  //
  App.checkNumberRange = function (e, lower, upper) {
    e = +e;

    if (!_.isNumber (e) || _.isNaN (e))
      return false;
    if ((e < lower) || (e > upper))
      return false;

    return true;
  };

  //
  //  Expects an IP address with a range, e.g. 172.16.0.1/12. Validate that all
  //  fields are present, and range check each portion.
  //
  App.checkIsIPV4 = function (ipaddress) {
    var blocks = ipaddress.split (/\.|\//);

    if (blocks.length === 5) {
      if (!App.checkNumberRange (blocks.pop (), 0, 32))
        return false;

      return blocks.every (function (block) {
        return App.checkNumberRange (block, 0, 255);
      });
    }

    return false;
  };

  //
  //  Validate single field, returning true if good, false if bad.
  //
  App.validateField = function (field, callback) {
    var value  = $(field).val ();
    var format = $(field).attr ('format');
    var textRegex    = /[^a-zA-Z0-9 _#:'!\.]/;
    var nameRegex    = /[^a-zA-Z ,\.]/;
    var addressRegex = /[^a-zA-Z0-9 #\.]/;
    var cityRegex    = /[^a-zA-Z \.]/;
    var phoneRegex   = /[^0-9-]/;
    var emailRegex   = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    var error = false;
    var errtext;

    if (format === 'iprange') {
      error = App.checkIsIPV4 (value);
      errtext = 'Improperly formatted IPV4 address (must be in aaa.bbb.ccc.ddd/nn format)';
    } else if (format === 'portnumber') {
      error = App.checkNumberRange (value, 1024, 65535);
      errtext = 'Invalid port range or illegal character(s) present (must be 1024..65535)';
    } else if (format === 'integer') {
      error = App.checkNumberRange (value, $(field).attr ('min'), $(field).attr ('max'));
      errtext = 'Value out of range or non-numeric character(s) present (must be ' + $(field).attr ('min') + '..' + $(field).attr ('max') + ')';
    } else if (format === 'text') {
      error = !textRegex.test (value);
      errtext = 'Illegal character(s) in input field';
    } else if (format === 'name') {
      error = !nameRegex.test (value);
      errtext = 'Illegal character(s) in name field';
    } else if (format === 'address') {
      error = !addressRegex.test (value);
      errtext = 'Illegal character(s) in address field';
    } else if (format === 'city') {
      error = !cityRegex.test (value);
      errtext = 'Illegal character(s) in city name';
    } else if (format === 'phone') {
      error = !phoneRegex.test (value);
      errtext = 'Illegal character(s) in phone number (must be aaa-eee-nnnn)';
    } else if (format === 'email') {
      error = !emailRegex.test (value);
      errtext = 'Improperly formatted email address or illegal character(s) present';
    } else
      alert ('Unknown field type for field: ' + format);

    if (callback)
      callback (error, field, value, format, errtext);

    return error;
  };
*/

  //
  //
  //
  App.createTableHeader = function () {
    var tr, th;

    tr = document.createElement ('tr');

    for (var i = 0; i < desc.length; i++) {
      th = document.createElement ('th');
      th.innerHTML = desc [i].n;
      th.style.minWidth = desc [i].w + 'px';
      th.setAttribute ('data-placeholder', '[All]');
      tr.appendChild (th);
    }

    return tr;
  };

  App.createTableRow = function (shooter) {
    var tr, td;

    tr = document.createElement ('tr');
    tr.setAttribute ('shooter', shooter.sh_pos - 1);

    for (var i = 0; i < desc.length; i++) {
      td = document.createElement ('td');
      td.innerHTML = desc [i].m (shooter [desc [i].f]);

      desc [i].c (tr, td, shooter [desc [i].f]);
      tr.appendChild (td);
    }

    return tr;
  };

  App.updateTableRow = function (shooterIndex) {
    var shooter = App.matchData.m.match_shooters [shooterIndex];

    _.each ($('[shooter="' + shooterIndex + '"] td'), function (td, i) {
      $(td).text (desc [i].m (desc [i].f ? shooter [desc [i].f] : shooterIndex));
    });
  };

  App.populateForm = function (shooterIndex) {
    var shooter = App.matchData.m.match_shooters [shooterIndex];

    //
    //  Reset all error things, deselect all options selected (so we don't get duplicates)
    //
    $('#popup-error-div').hide ();
    $('#popup-form *').removeClass ('ui-state-error').removeAttr ('disabled');
    $('#popup-form option').prop ('selected', false);

    //
    //  Grouped by field type, not entry order
    //
    $('#ecFirstName').val  (shooter.sh_fn      || '');
    $('#ecLastName').val   (shooter.sh_ln      || '');
    $('#ecMembership').val (shooter.sh_id      || '');
    $('#ecSquad').val      (shooter.sh_sqd     || '');
    $('#ecPhone').val      (shooter.sh_ph      || '');
    $('#ecEmail').val      (shooter.sh_eml     || '');
    $('#ecAddr1').val      (shooter.sh_addr1   || '');
    $('#ecAddr2').val      (shooter.sh_addr2   || '');
    $('#ecCity').val       (shooter.sh_city    || '');
    $('#ecZipCode').val    (shooter.sh_zipcode || '');

    $('#ecDivision option').filter (function ()    { return $(this).val () === shooter.sh_dvp; }).prop ('selected', true);
    $('#ecClass option').filter (function ()       { return $(this).val () === shooter.sh_grd; }).prop ('selected', true);
    $('#ecGender option').filter (function ()      { return $(this).val () === shooter.sh_gen; }).prop ('selected', true);
    $('#ecAge option').filter (function ()         { return $(this).val () === shooter.sh_age; }).prop ('selected', true);
    $('#ecMilitary option').filter (function ()    { return $(this).val () === (shooter.sh_mil ? 'YES' : 'NO'); }).prop ('selected', true);
    $('#ecLaw option').filter (function ()         { return $(this).val () === (shooter.sh_law ? 'YES' : 'NO'); }).prop ('selected', true);
    $('#ecForeign option').filter (function ()     { return $(this).val () === (shooter.sh_frn ? 'YES' : 'NO'); }).prop ('selected', true);
    $('#ecDeleted option').filter (function ()     { return $(this).val () === (shooter.sh_del ? 'YES' : 'NO'); }).prop ('selected', true);
    $('#ecDQ option').filter (function ()          { return $(this).val () === (shooter.sh_dq  ? 'YES' : 'NO'); }).prop ('selected', true);
    $('#ecWalkon option').filter (function ()      { return $(this).val () === (shooter.sh_wlk ? 'YES' : 'NO'); }).prop ('selected', true);
    $('#ecState option').filter (function ()       { return $(this).val () === (shooter.sh_st || ''); }).prop ('selected', true);
  };

  //
  //  More agressive validation will be done by the server. This basically
  //  makes sure they don't do anything really stupid
  //
  App.validateCompetitor = function () {
    var errList = [];
    var pText = '';

    _.each ($('#popup-form [format]'), function (field) {
      Validator.jqtest (field, function (err, errtext, name) {
        if (err)
          errList.push ({name: name, errtext: errtext});
      });
    });

    _.each (errList, function (el, i) {
      $(el.name).addClass ('ui-state-error');
      pText += ((i ? '<br />' : '') + el.errtext);
    });

    $('#popup-error-p').html (pText);
    $('#popup-error-div').toggle (errList.length ? true : false);

    return errList.length ? true : false;
  };

  App.saveCompetitor = function (shooterIndex) {
    var shooter = App.matchData.m.match_shooters [shooterIndex];

    if (App.validateCompetitor (shooterIndex, shooter))
      return true;

    shooter.sh_fn  = $('#ecFirstName').val ().trim ();
    shooter.sh_ln  = $('#ecLastName').val ().trim ();
    shooter.sh_id  = $('#ecMembership').val ().trim ();
    shooter.sh_sqd = $('#ecSquad').val ().trim () * 1;
    shooter.sh_ph  = $('#ecPhone').val ().trim ();
    shooter.sh_eml = $('#ecEmail').val ().trim ();
    shooter.sh_st  = $('#ecState').val ().trim ();
    shooter.sh_dvp = $('#ecDivision option:selected').val ().trim ();
    shooter.sh_grd = $('#ecClass option:selected').val ().trim ();
    shooter.sh_gen = $('#ecGender option:selected').val ().trim ();
    shooter.sh_age = $('#ecAge option:selected').val ().trim ();
    shooter.sh_mil = $('#ecMilitary option:selected').val () === 'YES' ? true : false;
    shooter.sh_law = $('#ecLaw option:selected').val () === 'YES' ? true : false;
    shooter.sh_frn = $('#ecForeign option:selected').val () === 'YES' ? true : false;
    shooter.sh_del = $('#ecDeleted option:selected').val () === 'YES' ? true : false;
    shooter.sh_dq  = $('#ecDQ option:selected').val () === 'YES' ? true : false;
    shooter.sh_wlk = $('#ecWalkon option:selected').val () === 'YES' ? true : false;

    App.updateTableRow (shooterIndex);

    App.socket.emit ('shooter:save', {shooter: shooter});

    return false;
  };

  App.createTable = function () {
    var popupDialog;
    var shooters;
    var bodyFragment = document.createDocumentFragment ();
    var table = document.createElement ('table');
    var thead = document.createElement ('thead');
    var tbody = document.createElement ('tbody');

    if (!App.matchData || !App.matchData.m || !App.matchData.m.match_shooters || !App.matchData.m.match_shooters.length) {
      $('#competitorsTableDiv').hide ();
      $('#competitorMessage').text ('(No competitors defined)').show ();
      return;
    }

    table.setAttribute ('id', 'competitorsTable');
    thead.appendChild (App.createTableHeader ());

    shooters = App.matchData.m.match_shooters;

    _.each (shooters, function (shooter) {
      bodyFragment.appendChild (App.createTableRow (shooter));
    });

    tbody.appendChild (bodyFragment);
    table.appendChild (thead);
    table.appendChild (tbody);

    $('#competitorsTableDiv').empty ().append (table);

    $('#competitorsTable').tablesorter (
    {
      theme: 'jui',
      fixedWidth: false,
      headerTemplate: '{content} {icon}',
      sortList: [
        [0,0]
      ],
      emptyTo: 'none',
      widgets: ['saveSort', 'filter', 'uitheme', 'zebra'],
      widgetOptions: {
        zebra: ['even', 'odd'],
        saveSort: true,
        filter_hideFilters: true,
        filter_functions: {
           0: false, // Number
           1: false, // First Name
           2: false, // Last Name
           3: false, // Membership
           4: { // Female
            'Yes' : function (e) { return e === 'Y'; },
            'No'  : function (e) { return e === ''; },
          },
           5: { // Age
            'Junior'        : function (e) { return e === 'Junior'; },
            'Adult'         : function (e) { return e === ''; },
            'Senior'        : function (e) { return e === 'Senior'; },
            'Super Senior'  : function (e) { return e === 'Super Senior'; },
          },
           6: { // Law
            'Yes' : function (e) { return e === 'Y'; },
            'No'  : function (e) { return e === ''; },
          },
           7: { // Military
            'Yes' : function (e) { return e === 'Y'; },
            'No'  : function (e) { return e === ''; },
          },
           8: { // Foreign
            'Yes' : function (e) { return e === 'Y'; },
            'No'  : function (e) { return e === ''; },
          },
           9: true, // Squad
          10: true, // Division
          11: { // Class
            'G' : function (e) { return e === 'G'; },
            'M' : function (e) { return e === 'M'; },
            'A' : function (e) { return e === 'A'; },
            'B' : function (e) { return e === 'B'; },
            'C' : function (e) { return e === 'C'; },
            'D' : function (e) { return e === 'D'; },
            'U' : function (e) { return e === 'U'; },
            'X' : function (e) { return e === 'X'; },
          },
          12: false, // eMail
          13: false, // Phone
          14: true,  // State
          15: { // Walk-on
            'Yes' : function (e) { return e === 'Y'; },
            'No'  : function (e) { return e === ''; },
          },
          16: { // DQ
            'Yes' : function (e) { return e === 'Y'; },
            'No'  : function (e) { return e === ''; },
          },
          17: { // Deleted
            'Yes' : function (e) { return e === 'Y'; },
            'No'  : function (e) { return e === ''; },
          },
        },
      },
    });

    //
    //  Set up so that click on row pops up the editing dialog
    //
    $('#competitorsTable tbody tr').off ().click (function (e) {
      var shooterNumber = $(this).attr ('shooter');

      if (shooterNumber) {
        shooterNumber = parseInt (shooterNumber);
        App.popupShooterIndex = shooterNumber;

        App.populateForm (App.popupShooterIndex);

        e.preventDefault ();

        popupDialog = $('#popup-dialog').dialog ({
          width: 'auto',
          title: 'Edit Shooter #' + (shooterNumber),
          dialogClass: 'no-close',
          modal: true,
          draggable: true,
          resizable: false,
          buttons: {
            Save: function () {
              if (!App.saveCompetitor (App.popupShooterIndex)) {
                $(this).dialog ('close');
              }
            },
            Cancel: function () {
              $(this).dialog ('close');
            },
            Reset: function () {
              App.populateForm (App.popupShooterIndex);
            }
          },
        });
      }
    });

    //
    //  Allow <return> to act as 'Save' button.
    //
    $('#popup-form').off ().on ('submit', function (e) {
      e.preventDefault ();
      if (!App.saveCompetitor (App.popupShooterIndex))
        popupDialog.dialog ('close');
    });
  };

  //
  //
  //
  App.socketConnect = function () {
    App.socket.emit ('match:request', {options: {match: true}});

    $('#serverDisconnect').hide ();
    $('#content,#menu').show ();
  };

  App.socketDisconnect = function () {
    $('#serverDisconnect').show ();
    $('#content,#menu').hide ();
  };

  App.matchDataReceived = function (param) {
    App.matchData = param.matchData;
    App.fixupShooters ();
    App.createTable ();
  };

  App.matchUpdated = function () {
    App.socket.emit ('match:request', {options: {match: true}});
  };

  //
  //  Change default jQuery uitheme icons - find the full list of icons here:
  //  http://jqueryui.com/themeroller/
  //
  $(document).tooltip ();
  $('input,select').addClass ('ui-corner-all');
  $.extend($.tablesorter.themes.jui, {
    table      : 'ui-widget ui-widget-content ui-corner-all',
    caption    : 'ui-widget-content ui-corner-all',
    header     : 'ui-widget-header ui-corner-all ui-state-default',
    footerRow  : '',
    footerCells: '',
    icons      : 'ui-icon',
    sortNone   : 'ui-icon-carat-2-n-s',
    sortAsc    : 'ui-icon-carat-1-n',
    sortDesc   : 'ui-icon-carat-1-s',
    active     : 'ui-state-active',
    hover      : 'ui-state-hover',
    filterRow  : '',
    even       : 'ui-widget-content',
    odd        : 'ui-state-default'
  });

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_data', App.matchDataReceived);
  App.socket.on ('match_updated', App.matchUpdated);
  App.socket.emit ('log:log', {'msg': 'Edit/View->Competitors (TPP)'});
});
