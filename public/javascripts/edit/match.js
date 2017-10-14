/* jshint devel: true */
/* global io, pmelib */
/* global _:false */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};

  $('#input-match-name').jqxInput ({width: 300, height: 25, maxLength: 50, rtl: true});
  $('#datetimeinput-match-date').jqxDateTimeInput ({width: 105, height: 25, formatString: 'yyyy-MM-dd', dropDownHorizontalAlignment: 'right', rtl: true});
  $('#input-club-name').jqxInput ({width: 300, height: 25, maxLength: 50, rtl: true});
  $('#input-club-code').jqxInput ({width: 100, height: 25, maxLength: 10, rtl: true});
  $('#dropdown-match-subtype').jqxDropDownList ({width: 185, height: 25, autoDropDownHeight: true, rtl: true});
  $('#dropdown-match-level').jqxDropDownList ({width: 80, height: 25, autoDropDownHeight: true, rtl: true});
  $('#checkbox-logging-enabled').jqxCheckBox ();
  $('#input-logging-unsentlogswarningcount').jqxNumberInput ({width: 40, height: 25, min: 0, max: 9999, value: 1, rtl: true, inputMode: 'simple', spinMode: 'simple', digits: 4, decimalDigits: 0});
  $('#checkbox-match-readonly').jqxCheckBox ();
  $('#checkbox-match-suppressincompletescorealert').jqxCheckBox ();
  $('#checkbox-squadding-useopensquadding').jqxCheckBox ();
  $('#checkbox-stagetimes-usemaximumstagetime').jqxCheckBox ();
  $('#input-stagetimes-maximumstagetime').jqxInput ({width: 30, height: 25, maxLength: 3, value: 90, rtl: true});
  $('#button-reset').jqxButton ({width: 65});
  $('#button-save').jqxButton ({width: 65});

  $('[controltype]').on ('focus', function () {
    $(this).addClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $('[controltype]').on ('focusout', function () {
    $(this).removeClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $('[controltype]').on ('blur', function () {
    $(this).jqxValidator ('validate');
  });

  $('#button-reset').on ('click', function () {
    $('#inputFields').jqxValidator ('hide');
    $('#msg').hide ();

    App.refreshMatchData ();
  });

  $('#button-save').on ('click', function () {
    $('#inputFields').jqxValidator ('validate');
    $('#msg').hide ();
  });

  //
  //  Calendar is flipped for RTL input, so when it's opened set RTL false, and
  //  when it's closed set RTL true.
  //
  $('#datetimeinput-match-date').on ('open', function () {
    $(this).jqxDateTimeInput ({rtl: false});
  });

  $('#datetimeinput-match-date').on ('close', function () {
    $(this).jqxDateTimeInput ({rtl: true});
  });

  //
  //
  //
  $('#inputFields').jqxValidator ({
    focus: true,
    closeOnClick: false,
    onSuccess: function () {
      var match = _.clone (App.matchData.m);

      match.match_name = $('#input-match-name').jqxInput ('val');
      match.match_date = $('#datetimeinput-match-date').jqxDateTimeInput ('val');
      match.match_clubname = $('#input-club-name').jqxInput ('val');
      match.match_clubcode = $('#input-club-code').jqxInput ('val');
      match.match_subtype = $('#dropdown-match-subtype').jqxDropDownList ('getSelectedItem').value;
      match.match_level = $('#dropdown-match-level').jqxDropDownList ('getSelectedItem').value;
      match.match_logenabled = $('#checkbox-logging-enabled').jqxCheckBox ('val');
      match.match_unsentlogswarningcount = $('#input-logging-unsentlogswarningcount').jqxNumberInput ('val');
      match.match_readonly = $('#checkbox-match-readonly').jqxCheckBox ('val');
      match.match_suppressinCompleteScoreAlert = $('#checkbox-match-suppressincompletescorealert').jqxCheckBox ('val');
      match.match_useOpenSquadding = $('#checkbox-squadding-useopensquadding').jqxCheckBox ('val');
      match.match_usemaxstagetime = $('#checkbox-stagetimes-usemaximumstagetime').jqxCheckBox ('val');
      match.match_maxstagetime = $('#input-stagetimes-maximumstagetime').jqxInput ('val');

      App.socket.emit ('match:update', {match: match}, function (data) {
        $('#msg').text (data.err ? data.err : 'Match successfully updated').show ();
      });
    },
    rules: [
      { input: '#input-match-name', position: 'bottom', message:  'A match name is required', action: '', rule: 'required' },
      { input: '#datetimeinput-match-date', position: 'bottom', message:  'A match date is required', action: '', rule: 'required' },
    ],
  });

  //
  //
  //
  App.refreshMatchData = function () {
    App.socket.emit ('match:get', {options: {match: true}}, function (data) {
      App.matchData = data.matchData;
      $('#matchname').text (data.matchData.m.match_name);
      $('#input-match-name').jqxInput ('val', data.matchData.m.match_name || '');
      $('#datetimeinput-match-date').jqxDateTimeInput ('val', data.matchData.m.match_date || '');
      $('#input-club-name').jqxInput ('val', data.matchData.m.match_clubname || '');
      $('#input-club-code').jqxInput ('val', data.matchData.m.match_clubcode || '');
      $('#checkbox-logging-enabled').jqxCheckBox ({checked: data.matchData.m.match_logenabled || false});
      $('#input-logging-unsentlogswarningcount').jqxNumberInput ('val', data.matchData.m.match_unsentlogswarningcount || 1);
      $('#checkbox-match-readonly').jqxCheckBox ({checked: data.matchData.m.match_readonly || false});
      $('#checkbox-match-suppressincompletescorealert').jqxCheckBox ({checked: data.matchData.m.match_readonly || false});
      $('#checkbox-squadding-useopensquadding').jqxCheckBox ({checked: data.matchData.m.match_useOpenSquadding || false});

      App.socket.emit ('match:setup', function (data) {
        App.matchSetup = data;
        var item;
        var index;
        var widest = 0;

        if (data.levels) {
          _.each (data.levels, function (item) {
            $('#dropdown-match-level').jqxDropDownList ('addItem', item);
          });

          item = $('#dropdown-match-level').jqxDropDownList ('getItemByValue',  App.matchData.m.match_level);
          index = item ? item.index : 0;
          $('#dropdown-match-level').jqxDropDownList ('selectIndex', index);
          $('#match-level').show ();
        } else
          $('#match-level').hide ();

        if (data.maxstagetimes) {
          $('#checkbox-stagetimes-usemaximumstagetime').jqxCheckBox ({checked: App.matchData.m.match_usemaxstagetime || false});
          $('#input-stagetimes-maximumstagetime').jqxInput ('val', App.matchData.m.match_maxstagetiume || 0);
          $('#match-stagetimes').show ();
        } else
          $('#match-stagetimes').hide ();

        if (data.subtypes) {
          _.each (data.subtypes, function (item) {
            $('#dropdown-match-subtype').jqxDropDownList ('addItem', item);
            widest = _.max ([pmelib.getWidthOfText (item.label), widest]);
          });

          item = $('#dropdown-match-subtype').jqxDropDownList ('getItemByValue',  App.matchData.m.match_subtype);
          index = item ? item.index : 0;
          $('#dropdown-match-subtype').jqxDropDownList ('selectIndex', index);
          $('#dropdown-match-subtype').jqxDropDownList ({width: widest + 25});
          $('#match-subtype').show ();
        } else
          $('#match-subtype').hide ();
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
    $('#inputFields').jqxValidator ('hide');
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  };

  App.reload = function () {
    window.location.href = 'http://' + window.location.host + '/edit/match';
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_updated', App.refreshMatchData);
  App.socket.on ('reload', App.reload);

  App.socket.emit ('log:log', {msg: 'Edit/View->Match (USPSA)'});

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
