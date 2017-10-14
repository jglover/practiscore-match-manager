/* global io */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};

  App.setFields = function (config) {
    $('#ec-kioskVendorImageCount').jqxInput ('val', config._kiosk.vendorImageCount);
    $('#ec-kioskVendorDisplayTime').jqxInput ('val', config._kiosk.vendorDisplayTime);
    $('#ec-kioskProgressDisplayTime').jqxInput ('val', config._kiosk.progressDisplayTime);
    $('#ec-kioskStageDisplayTime').jqxInput ('val', config._kiosk.stageDisplayTime);
    $('#ec-kioskIdleTime').jqxInput ('val', config._kiosk.idleTime);
    $('#ex-kioskRightClickOK').jqxCheckBox (config._kiosk.rightClickOK ? 'check' : 'uncheck');
  };

  App.validateNumeric = function (input) {
    return (input.val ().search (/[^0-9]/) === -1) ? true : false;
  };

  App.validateRange = function (min, max, input) {
    var n = parseInt (input. val ());
    return ((n >= min) && (n <= max)) ? true : false;
  };

  $('#ec-kioskVendorImageCount').jqxInput ({width: 30, height: 25, maxLength: 3});
  $('#ec-kioskVendorDisplayTime').jqxInput ({width: 30, height: 25, maxLength: 3});
  $('#ec-kioskProgressDisplayTime').jqxInput ({width: 30, height: 25, maxLength: 3});
  $('#ec-kioskStageDisplayTime').jqxInput ({width: 30, height: 25, maxLength: 3});
  $('#ec-kioskIdleTime').jqxInput ({width: 30, height: 25, maxLength: 3});
  $('#ex-kioskRightClickOK').jqxCheckBox ();
  $('#ec-resetButton').jqxButton ({width: 65});
  $('#ec-saveButton').jqxButton ({width: 65});

  $("[id^='ec-']").on ('focus', function () {
    $(this).addClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $("[id^='ec-']").on ('focusout', function () {
    $(this).removeClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $("[id^='ec-kiosk']").on ('blur', function () {
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
      App.config._kiosk.vendorImageCount = parseInt ($('#ec-kioskVendorImageCount').jqxInput ('val'));
      App.config._kiosk.vendorDisplayTime = parseInt ($('#ec-kioskVendorDisplayTime').jqxInput ('val'));
      App.config._kiosk.progressDisplayTime = parseInt ($('#ec-kioskProgressDisplayTime').jqxInput ('val'));
      App.config._kiosk.stageDisplayTime = parseInt ($('#ec-kioskStageDisplayTime').jqxInput ('val'));
      App.config._kiosk.idleTime = parseInt ($('#ec-kioskIdleTime').jqxInput ('val'));
      App.config._kiosk.rightClickOK = $('#ex-kioskRightClickOK').jqxCheckBox ('val');

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
      { input: '#ec-kioskVendorImageCount',    position: 'bottom', message: 'A value is required', action: 'blur', rule: 'required' },
      { input: '#ec-kioskVendorDisplayTime',   position: 'bottom', message: 'A value is required', action: 'blur', rule: 'required' },
      { input: '#ec-kioskProgressDisplayTime', position: 'bottom', message: 'A value is required', action: 'blur', rule: 'required' },
      { input: '#ec-kioskStageDisplayTime',    position: 'bottom', message: 'A value is required', action: 'blur', rule: 'required' },
      { input: '#ec-kioskIdleTime',            position: 'bottom', message: 'A value is required', action: 'blur', rule: 'required' },

      { input: '#ec-kioskVendorImageCount',    position: 'bottom', message: 'Field contains non-numeric characters', action: 'blur', rule: function (input) { return App.validateNumeric (input); } },
      { input: '#ec-kioskVendorDisplayTime',   position: 'bottom', message: 'Field contains non-numeric characters', action: 'blur', rule: function (input) { return App.validateNumeric (input); } },
      { input: '#ec-kioskProgressDisplayTime', position: 'bottom', message: 'Field contains non-numeric characters', action: 'blur', rule: function (input) { return App.validateNumeric (input); } },
      { input: '#ec-kioskStageDisplayTime',    position: 'bottom', message: 'Field contains non-numeric characters', action: 'blur', rule: function (input) { return App.validateNumeric (input); } },
      { input: '#ec-kioskIdleTime',            position: 'bottom', message: 'Field contains non-numeric characters', action: 'blur', rule: function (input) { return App.validateNumeric (input); } },

      { input: '#ec-kioskVendorImageCount',    position: 'bottom', message: 'Value must be between 1 and 100', action: 'blur', rule: function (input) { return App.validateRange (1, 100, input); } },
      { input: '#ec-kioskVendorDisplayTime',   position: 'bottom', message: 'Value must be between 5 and 120', action: 'blur', rule: function (input) { return App.validateRange (5, 120, input); } },
      { input: '#ec-kioskProgressDisplayTime', position: 'bottom', message: 'Value must be between 5 and 120', action: 'blur', rule: function (input) { return App.validateRange (5, 120, input); } },
      { input: '#ec-kioskStageDisplayTime',    position: 'bottom', message: 'Value must be between 5 and 120', action: 'blur', rule: function (input) { return App.validateRange (5, 120, input); } },
      { input: '#ec-kioskIdleTime',            position: 'bottom', message: 'Value must be between 5 and 120', action: 'blur', rule: function (input) { return App.validateRange (5, 120, input); } },
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

  App.socket.emit ('log:log', {'msg': 'Config->Kiosk'});
});
