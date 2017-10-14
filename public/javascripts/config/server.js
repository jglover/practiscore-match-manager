/* global io */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};

  App.setFields = function (config) {
    $('#ex-practiscoreServer').jqxCheckBox (config._server.server ? 'check' : 'uncheck');
    $('#ec-practiscoreName').jqxInput ('val', config._server.name);
    $('#ec-practiscorePort').jqxInput ('val', config._server.port);
    $('#ex-practiscoreAnnounce').jqxCheckBox (config._server.announce ? 'check' : 'uncheck');
    $('#ex-practiscoreIPv6').jqxCheckBox (config._server.ipv6 ? 'check' : 'uncheck');
  };

  App.validateNumeric = function (input) {
    return (input.val ().search (/[^0-9]/) === -1) ? true : false;
  };

  App.validateRange = function (min, max, input) {
    var n = parseInt (input. val ());
    return ((n >= min) && (n <= max)) ? true : false;
  };

  App.validateName = function (input) {
    if (input.val ().length < 10)
      return false;

    return (input.val ().search(/:\d{8}$/) === -1) ? false : true;
  };

  $('#ex-practiscoreServer').jqxCheckBox ();
  $('#ec-practiscoreName').jqxInput ({width: 260, height: 23, maxLength: 34});
  $('#ec-practiscorePort').jqxInput ({width: 50, height: 23, maxLength: 5});
  $('#ex-practiscoreAnnounce').jqxCheckBox ();
  $('#ex-practiscoreIPv6').jqxCheckBox ();
  $('#ec-resetButton').jqxButton ({width: 65});
  $('#ec-saveButton').jqxButton ({width: 65});

  $("[id^='ec-']").on ('focus', function () {
    $(this).addClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $("[id^='ec-']").on ('focusout', function () {
    $(this).removeClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $("[id^='ec-practiscore']").on ('blur', function () {
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
      App.config._server.server = $('#ex-practiscoreServer').jqxCheckBox ('val');
      App.config._server.name = $('#ec-practiscoreName').jqxInput ('val');
      App.config._server.port = parseInt ($('#ec-practiscorePort').jqxInput ('val'));
      App.config._server.announce = $('#ex-practiscoreAnnounce').jqxCheckBox ('val');
      App.config._server.ipv6 = $('#ex-practiscoreIPv6').jqxCheckBox ('val');

      App.socket.emit ('config:validate', {config: App.config}, function (data) {
        if (!data.err) {
          App.socket.emit ('config:save', {config: App.config}, function (data) {
            if (!data.err) {
              $('#msg').html ('Configuration updated').show ();
            } else
              $('#errmsg').html (data.err).show ();
          });
        } else
          $('#errmsg').html (data.err).show ();
      });
    },
    rules: [
      { input: '#ec-practiscorePort', position: 'bottom', message: 'A value is required', action: 'blur', rule: 'required' },
      { input: '#ec-practiscorePort', position: 'bottom', message: 'Field contains non-numeric characters', action: 'blur', rule: function (input) { return App.validateNumeric (input); } },
      { input: '#ec-practiscorePort', position: 'bottom', message: 'Value must be between 1024 and 65535', action: 'blur', rule: function (input) { return App.validateRange (1024, 65535, input); } },

      { input: '#ec-practiscoreName', position: 'bottom', message: 'A value is required', action: 'blur', rule: 'required' },
      { input: '#ec-practiscoreName', position: 'bottom', message: 'Name must end with a \':\' and 8 digits', action: 'blur', rule: function (input) { return App.validateName (input); } },
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

  App.socket.emit ('log:log', {'msg': 'Config->Server'});
});
