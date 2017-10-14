/* global io */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};

  App.getTextElementByColor = function (color) {
    if (color === 'transparent' || color.hex === '')
      return $("<div style='text-shadow: none; position: relative; padding-bottom: 2px; margin-top: 2px;'>transparent</div>");

    var element = $("<div style='text-shadow: none; position: relative; padding-bottom: 2px; margin-top: 2px;'>#" + color.hex + '</div>');
    var nThreshold = 105;
    var bgDelta = (color.r * 0.299) + (color.g * 0.587) + (color.b * 0.114);
    var foreColor = (255 - bgDelta < nThreshold) ? 'Black' : 'White';
    element.css ('color', foreColor);
    element.css ('background', '#' + color.hex);
    element.addClass ('jqx-rc-all');
    return element;
  };

  App.setFields = function (config) {
    $('#ex-progressFlare').jqxCheckBox (config._ui.progressFlare ? 'check' : 'uncheck');
    $("#cp-progressColorEmpty").jqxColorPicker ('setColor', config._ui.progressColorEmpty);
    $("#cp-progressColorProgress").jqxColorPicker ('setColor', config._ui.progressColorProgress);
    $("#cp-progressColorComplete").jqxColorPicker ('setColor', config._ui.progressColorComplete);
    $("#cp-progressColorCompleteDNF").jqxColorPicker ('setColor', config._ui.progressColorCompleteDNF);
    $("#cp-progressColorCompleteMissing").jqxColorPicker ('setColor', config._ui.progressColorCompleteMissing);
    $("#cp-progressColorError").jqxColorPicker ('setColor', config._ui.progressColorError);
  };

  $('#ex-progressFlare').jqxCheckBox ();
  $("#ec-progressColorEmpty").jqxDropDownButton ({width: 100, height: 22});
  $("#ec-progressColorProgress").jqxDropDownButton ({width: 100, height: 22});
  $("#ec-progressColorComplete").jqxDropDownButton ({width: 100, height: 22});
  $("#ec-progressColorCompleteDNF").jqxDropDownButton ({width: 100, height: 22});
  $("#ec-progressColorCompleteMissing").jqxDropDownButton ({width: 100, height: 22});
  $("#ec-progressColorError").jqxDropDownButton ({width: 100, height: 22});
  $('#ec-resetButton').jqxButton ({width: 65});
  $('#ec-saveButton').jqxButton ({width: 65});

  $("[id^='ec-']").on ('focus', function () {
    $(this).addClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $("[id^='ec-']").on ('focusout', function () {
    $(this).removeClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $('#ec-resetButton').on ('click', function () {
    App.setFields (App.config);
    $('#msg, #errmsg').hide ();
  });

  $('#ec-saveButton').on ('click', function () {
    App.config._ui.progressFlare = $('#ex-progressFlare').jqxCheckBox ('val');
    App.config._ui.progressColorEmpty = $('#ec-progressColorEmpty').jqxDropDownButton ('getContent') [0].innerText.toLowerCase ();
    App.config._ui.progressColorProgress = $('#ec-progressColorProgress').jqxDropDownButton ('getContent') [0].innerText.toLowerCase ();
    App.config._ui.progressColorComplete = $('#ec-progressColorComplete').jqxDropDownButton ('getContent') [0].innerText.toLowerCase ();
    App.config._ui.progressColorCompleteDNF = $('#ec-progressColorCompleteDNF').jqxDropDownButton ('getContent') [0].innerText.toLowerCase ();
    App.config._ui.progressColorCompleteMissing = $('#ec-progressColorCompleteMissing').jqxDropDownButton ('getContent') [0].innerText.toLowerCase ();
    App.config._ui.progressColorError = $('#ec-progressColorError').jqxDropDownButton ('getContent') [0].innerText.toLowerCase ();

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

    $('#msg, #errmsg').hide ();
  });

  $("#cp-progressColorEmpty").jqxColorPicker ({colorMode: 'saturation', width: 220, height: 220});
  $("#cp-progressColorProgress").jqxColorPicker ({colorMode: 'saturation', width: 220, height: 220});
  $("#cp-progressColorComplete").jqxColorPicker ({colorMode: 'saturation', width: 220, height: 220});
  $("#cp-progressColorCompleteDNF").jqxColorPicker ({colorMode: 'saturation', width: 220, height: 220});
  $("#cp-progressColorCompleteMissing").jqxColorPicker ({colorMode: 'saturation', width: 220, height: 220});
  $("#cp-progressColorError").jqxColorPicker ({colorMode: 'saturation', width: 220, height: 220});

  $("#cp-progressColorEmpty").on ('colorchange', function (event) {
    $("#ec-progressColorEmpty").jqxDropDownButton ('setContent', App.getTextElementByColor (event.args.color));
  });
  $("#cp-progressColorProgress").on ('colorchange', function (event) {
    $("#ec-progressColorProgress").jqxDropDownButton ('setContent', App.getTextElementByColor (event.args.color));
  });
  $("#cp-progressColorComplete").on ('colorchange', function (event) {
    $("#ec-progressColorComplete").jqxDropDownButton ('setContent', App.getTextElementByColor (event.args.color));
  });
  $("#cp-progressColorCompleteDNF").on ('colorchange', function (event) {
    $("#ec-progressColorCompleteDNF").jqxDropDownButton ('setContent', App.getTextElementByColor (event.args.color));
  });
  $("#cp-progressColorCompleteMissing").on ('colorchange', function (event) {
    $("#ec-progressColorCompleteMissing").jqxDropDownButton ('setContent', App.getTextElementByColor (event.args.color));
  });
  $("#cp-progressColorError").on ('colorchange', function (event) {
    $("#ec-progressColorError").jqxDropDownButton ('setContent', App.getTextElementByColor (event.args.color));
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

  App.socket.emit ('log:log', {'msg': 'Config->Progress'});
});
