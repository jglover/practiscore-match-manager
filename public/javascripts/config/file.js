/* global io */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};

  App.setFields = function (config) {
    $('#ec-fileDirectoryPSC').jqxInput ('val', config._file.directoryPSC);
    $('#ec-fileDirectorySSI').jqxInput ('val', config._file.directorySSI);
    $('#ec-fileDirectoryEZWS').jqxInput ('val', config._file.directoryEZWS);
  };

  App.validateNumeric = function (input) {
    return (input.val ().search (/[^0-9]/) === -1) ? true : false;
  };

  App.validateRange = function (min, max, input) {
    var n = parseInt (input. val ());
    return ((n >= min) && (n <= max)) ? true : false;
  };

  $('#ec-fileDirectoryPSC').jqxInput ({width: 250, height: 25, maxLength: 20});
  $('#ec-fileDirectorySSI').jqxInput ({width: 250, height: 25, maxLength: 20});
  $('#ec-fileDirectoryEZWS').jqxInput ({width: 250, height: 25, maxLength: 20});
  $('#ec-resetButton').jqxButton ({width: 65});
  $('#ec-saveButton').jqxButton ({width: 65});

  $("[id^='ec-']").on ('focus', function () {
    $(this).addClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $("[id^='ec-']").on ('focusout', function () {
    $(this).removeClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $("[id^='ec-file']").on ('blur', function () {
    $(this).jqxValidator ('validate');
  });

  $('#ec-resetButton').on ('click', function () {
    App.setFields (App.config);
    $('#inputFields').jqxValidator ('hide');
    $('#msg, #errmsg').hide ();
  });

  $('#ec-saveButton').on ('click', function () {
    $('#inputFields').jqxValidator ('validate');
    $('#msg, #errmsg').hide ();
  });

  $('#inputFields').jqxValidator ({
    focus: true,
    closeOnClick: false,
    onSuccess: function () {
      App.config._file.directoryPSC = $('#ec-fileDirectoryPSC').jqxInput ('val');
      App.config._file.directorySSI = $('#ec-fileDirectorySSI').jqxInput ('val');
      App.config._file.directoryEZWS = $('#ec-fileDirectoryEZWS').jqxInput ('val');

      App.socket.emit ('config:validate', {config: App.config}, function (data) {
        if (!data.err) {
          App.socket.emit ('config:save', {config: App.config}, function (data) {
            if (!data.err)
              $('#msg').html ('Configuration updated').show ();
            else
              $('#errmsg').html (data.err).show ();
          });
        } else
          $('#errmsg').html (data.err).show ();
      });
    },
    rules: [
      { input: '#ec-fileDirectoryPSC', position: 'bottom', message: 'A value is required', action: 'blur', rule: 'required' },
      { input: '#ec-fileDirectorySSI', position: 'bottom', message: 'A value is required', action: 'blur', rule: 'required' },
      { input: '#ec-fileDirectoryEZWS', position: 'bottom', message: 'A value is required', action: 'blur', rule: 'required' },
    ]
  });

  App.socket = io.connect ();

  App.socket.on ('connect', function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();

    App.socket.emit ('config:request', function (data) {
      if (!data.err) {
        App.config = data.config;
        App.setFields (App.config);
      }
    });
  });

  App.socket.on ('disconnect', function () {
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
    $('#inputFields').jqxValidator ('hide');
  });

  App.socket.emit ('log:log', {'msg': 'Config->Files'});
});
