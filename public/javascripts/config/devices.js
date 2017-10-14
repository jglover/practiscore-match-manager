/* global io */
/* global _:false */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};

  App.setFields = function (config) {
    $('#ec-devicesIpBlock').jqxInput ('val', config._devices.ipblock);
    $('#ec-devicesScanTime').jqxInput ('val', config._devices.scanTime);
    $('#ex-devicesBonjour').jqxCheckBox (config._devices.bonjour ? 'check' : 'uncheck');
    $('#ec-devicesAutopollSuccess').jqxInput ('val', config._devices.autopollSuccess);
    $('#ec-devicesAutopollFailed').jqxInput ('val', config._devices.autopollFailed);
    $('#ec-devicesAutopollBackToBack').jqxInput ('val', config._devices.autopollBackToBack);
    $('#ex-devicesAutopollSave').jqxCheckBox (config._devices.autopollSave ? 'check' : 'uncheck');
  };

  //
  //  For numeric fields, make sure number, and that the value is between the
  //  lower and upper bounds.
  //
  App.checkNumberRange = function (e, lower, upper) {
    if (!e.length)
      return false;

    e = +e;

    if (!_.isNumber (e) || _.isNaN (e))
      return false;
    if ((e < lower) || (e > upper))
      return false;

    return true;
  };

  //
  //  Expects an IP address with a range, e.g. 172.16.0.1/12. Validate that all
  //  fields are present, and range check each portion. -1 == not 5 blocks,
  //  -2 == bad netmask value, -3 == bad ip segment value, 0 == OK.
  //
  App.checkIsIPv4 = function (ipaddress) {
    var blocks = ipaddress.split (/\.|\//);

    if (blocks.length === 5) {
      if (!blocks [4].length)
        return -2;
      if (!App.checkNumberRange (blocks.pop (), 0, 32))
        return -3;

      return blocks.every (function (block) {
        return App.checkNumberRange (block, 0, 255);
      }) ? 0 : -4;
    }

    return -1;
  };

  App.validateNumeric = function (input) {
    return (input.val ().search (/[^0-9]/) === -1) ? true : false;
  };

  App.validateRange = function (min, max, input) {
    var n = parseInt (input. val ());
    return ((n >= min) && (n <= max)) ? true : false;
  };

  $('#ec-devicesIpBlock').jqxInput ({width: 140, height: 25, maxLength: 18});
  $('#ec-devicesScanTime').jqxInput ({width: 40, height: 25, maxLength: 4});
  $('#ex-devicesBonjour').jqxCheckBox ();
  $('#ec-devicesAutopollSuccess').jqxInput ({width: 40, height: 25, maxLength: 4});
  $('#ec-devicesAutopollFailed').jqxInput ({width: 40, height: 25, maxLength: 4});
  $('#ec-devicesAutopollBackToBack').jqxInput ({width: 40, height: 25, maxLength: 4});
  $('#ex-devicesAutopollSave').jqxCheckBox ();
  $('#ec-resetButton').jqxButton ({width: 65});
  $('#ec-saveButton').jqxButton ({width: 65});

  $("[id^='ec-']").on ('focus', function () {
    $(this).addClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $("[id^='ec-']").on ('focusout', function () {
    $(this).removeClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $("[id^='ec-devices']").on ('blur', function () {
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
      App.config._devices.ipblock = $('#ec-devicesIpBlock').jqxInput ('val');
      App.config._devices.scanTime = parseInt ($('#ec-devicesScanTime').jqxInput ('val'));
      App.config._devices.bonjour = $('#ex-devicesBonjour').jqxCheckBox ('val');
      App.config._devices.autopollSuccess = parseInt ($('#ec-devicesAutopollSuccess').jqxInput ('val'));
      App.config._devices.autopollFailed = parseInt ($('#ec-devicesAutopollFailed').jqxInput ('val'));
      App.config._devices.autopollBackToBack = parseInt ($('#ec-devicesAutopollBackToBack').jqxInput ('val'));
      App.config._devices.autopollSave = $('#ex-devicesAutopollSave').jqxCheckBox ('val');

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
      { input: '#ec-devicesIpBlock',            action: 'blur', position: 'bottom', message:  'An IP address is required',                                       rule: 'required' },
      { input: '#ec-devicesIpBlock',            action: 'blur', position: 'bottom', message:  'IP address contains characters other than 0..9, \'.\', or \'/\'', rule: function (input) { return (input.val ().search (/[^0-9\.\/]/) === -1) ? true : false; } },
      { input: '#ec-devicesIpBlock',            action: 'blur', position: 'bottom', message:  'Netmask portion of IP address missing',                           rule: function (input) { return (App.checkIsIPv4 (input.val ()) !== -2) ? true : false; } },
      { input: '#ec-devicesIpBlock',            action: 'blur', position: 'bottom', message:  'Netmask portion contains illegal value (must be 0..32)',          rule: function (input) { return (App.checkIsIPv4 (input.val ()) !== -3) ? true : false; } },
      { input: '#ec-devicesIpBlock',            action: 'blur', position: 'bottom', message:  'Address octet contains illegal value (must be 0..255)',           rule: function (input) { return (App.checkIsIPv4 (input.val ()) !== -4) ? true : false; } },
      { input: '#ec-devicesIpBlock',            action: 'blur', position: 'bottom', message:  'IP address improperly formatted',                                 rule: function (input) { return (App.checkIsIPv4 (input.val ()) === 0) ? true : false; } },

      { input: '#ec-devicesAutopollSuccess',    action: 'blur', position: 'bottom', message: 'A value is required',                   rule: 'required' },
      { input: '#ec-devicesAutopollSuccess',    action: 'blur', position: 'bottom', message: 'Field contains non-numeric characters', rule: function (input) { return App.validateNumeric (input); } },
      { input: '#ec-devicesAutopollSuccess',    action: 'blur', position: 'bottom', message: 'Value must be between 30 and 3600',     rule: function (input) { return App.validateRange (30, 3600, input); } },

      { input: '#ec-devicesAutopollFailed',     action: 'blur', position: 'bottom', message: 'A value is required',                   rule: 'required' },
      { input: '#ec-devicesAutopollFailed',     action: 'blur', position: 'bottom', message: 'Field contains non-numeric characters', rule: function (input) { return App.validateNumeric (input); } },
      { input: '#ec-devicesAutopollFailed',     action: 'blur', position: 'bottom', message: 'Value must be between 30 and 3600',     rule: function (input) { return App.validateRange (30, 3600, input); } },

      { input: '#ec-devicesAutopollBackToBack', action: 'blur', position: 'bottom', message: 'A value is required',                   rule: 'required' },
      { input: '#ec-devicesAutopollBackToBack', action: 'blur', position: 'bottom', message: 'Field contains non-numeric characters', rule: function (input) { return App.validateNumeric (input); } },
      { input: '#ec-devicesAutopollBackToBack', action: 'blur', position: 'bottom', message: 'Value must be between 0 and 60',        rule: function (input) { return App.validateRange (0, 60, input); } },

      { input: '#ec-devicesScanTime',           action: 'blur', position: 'bottom', message: 'A value is required',                   rule: 'required' },
      { input: '#ec-devicesScanTime',           action: 'blur', position: 'bottom', message: 'Field contains non-numeric characters', rule: function (input) { return App.validateNumeric (input); } },
      { input: '#ec-devicesScanTime',           action: 'blur', position: 'bottom', message: 'Value must be between 3 and 60',        rule: function (input) { return App.validateRange (3, 60, input); } },
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

  App.socket.emit ('log:log', {'msg': 'Config->Devices'});
});
