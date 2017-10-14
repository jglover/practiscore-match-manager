/* global io */
/* global _:false */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};

  var methods = [
    { value: 'bystage', label: 'By Stage Number'        },
    { value: 'byname',  label: 'By Stage Device Number' }
  ];

  var methodsSource = {
    datatype: 'array',
    datafields: [
      { name: 'value',   type: 'string' },
      { name: 'label',   type: 'string' }
    ],
    localdata: methods
  };

  var methodsAdapter = new $.jqx.dataAdapter (methodsSource, {
    autoBind: true
  });

  App.setFields = function (config) {
    $('#ex-practiprintServer').jqxCheckBox (config._print.server ? 'check' : 'uncheck');
    $('#ec-practiprintMethod').jqxDropDownList ('selectIndex', _.findIndex (methods, 'value', config._print.method));
    $('#ec-practiprintPort').jqxInput ('val', config._print.port);
    $('#ex-practiprintAnnounce').jqxCheckBox (config._print.announce ? 'check' : 'uncheck');
  };

  App.validateNumeric = function (input) {
    return (input.val ().search (/[^0-9]/) === -1) ? true : false;
  };

  App.validateRange = function (min, max, input) {
    var n = parseInt (input. val ());
    return ((n >= min) && (n <= max)) ? true : false;
  };

  $('#ex-practiprintServer').jqxCheckBox ();
  $('#ec-practiprintMethod').jqxDropDownList ({width: 190, height: 22, autoDropDownHeight: true, source: methodsAdapter});
  $('#ec-practiprintPort').jqxInput ({width: 50, height: 23, maxLength: 5});
  $('#ex-practiprintAnnounce').jqxCheckBox ();
  $('#ec-resetButton').jqxButton ({width: 65});
  $('#ec-saveButton').jqxButton ({width: 65});

  $("[id^='ec-']").on ('focus', function () {
    $(this).addClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $("[id^='ec-']").on ('focusout', function () {
    $(this).removeClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $("[id^='ec-practiprint']").on ('blur', function () {
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
      App.config._print.server = $('#ex-practiprintServer').jqxCheckBox ('val');
      App.config._print.method = $('#ec-practiprintMethod').jqxDropDownList ('getSelectedItem').value;
      App.config._print.port = parseInt ($('#ec-practiprintPort').jqxInput ('val'));
      App.config._print.announce = $('#ex-practiprintAnnounce').jqxCheckBox ('val');

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
      { input: '#ec-practiprintPort', position: 'bottom', message: 'A value is required', action: 'blur', rule: 'required' },
      { input: '#ec-practiprintPort', position: 'bottom', message: 'Field contains non-numeric characters', action: 'blur', rule: function (input) { return App.validateNumeric (input); } },
      { input: '#ec-practiprintPort', position: 'bottom', message: 'Value must be between 1024 and 65535', action: 'blur', rule: function (input) { return App.validateRange (1024, 65535, input); } },
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

  App.socket.emit ('log:log', {'msg': 'Config->PractiPrint'});
});
