/* global io, pmelib */
/* global _:false */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};

  $('#pinInput').jqxComboBox ({
    placeHolder: 'Enter PIN',
    width: 100,
    height: 25,
  });

  $('#fixNameCase').jqxCheckBox ();
  $('#savePIN').jqxCheckBox ();
  $('#pinInput').jqxComboBox ('focus');

  $('#pinInput').on ('change', function () {
    $('#downloadForm').jqxValidator ('validateInput', '#pinInput');
  });

  $('#downloadButton').jqxButton ({width: 75, disabled: true});

  $('#downloadButton').click (function () {
    $('#downloadForm').jqxValidator ('validate');
  });

  $('#downloadForm').jqxValidator ({
    focus: true,
    closeOnClick: false,
    onSuccess: function () {
      $('#message').text ('Requesting match from clubs.practiscore.com...');
      App.socket.emit ('download:cpc:match', {
          pin: $('#pinInput').val (),
          savePIN: $('#savePIN').jqxCheckBox ('checked'),
          fixNameCase: $('#fixNameCase').jqxCheckBox ('checked'),
        }, function (data) {
          if (data.err)
            $('#message').text ('An error occurred: ' + data.err);
          else {
            $('#message').html ('Done! Match successfully downloaded from clubs.practiscore.com<br>(' + data.shooters + ' competitors in match)');
            App.refreshMatchData ();
          }
      });
    },
    rules: [
      {
        input:   '#pinInput',
        message: 'A PIN is required!',
        action:  'valuechanged, keyup, blur',
        rule:    function (input) {
          var hasLength = input.val ().length ? true : false;
          $('#downloadButton').jqxButton ({disabled: !hasLength});
          return hasLength;
        },
      },
      {
        input:   '#pinInput',
        message: 'PIN name must be between 1 and 10 characters!',
        action:  'keyup, blur',
        rule:    function (input) {
          var goodLength = input.val ().length <= 10;
          $('#downloadButton').jqxButton ({disabled: !goodLength});
          return goodLength;
        },
      },
      {
        input:   '#pinInput',
        message: 'PIN may only contain the characters A-Z and a-z',
        action:  'keyup, blur',
        rule:    function (input) {
          var name = input.val ();
          var legalChars = /[^A-Za-z]/;
          return name.match (legalChars) ? false : true;
        },
      }
    ]
  });

  App.displayStatus = function (param) {
    $('#message').text (param.msg);
  };

  //
  //
  //
  App.refreshMatchData = function () {
    App.socket.emit ('match:name', function (data) {
      $('#matchname').text (data.matchname);
    });
    App.socket.emit ('config:request', function (data) {
      $('#fixNameCase').jqxCheckBox (data.config._download.cpcFixNameCase ? 'check' : 'uncheck');
      $('#savePIN').jqxCheckBox (data.config._download.cpcSavePINs ? 'check' : 'uncheck');
    });
    App.socket.emit ('download:cpc:pins', function (data) {
      var source = [];
      var widest = 0;
      _.each (data.pin_list, function (pin) {
        var html = pin.match_name + ' (' + pin.match_type_name + ')';
        widest = _.max ([pmelib.getWidthOfText (html) + 8, widest]);
        source.push ({
          html: html,
          title: pin.pin,
        });
      });
      $("#pinInput").jqxComboBox ({source: source, dropDownWidth: widest});
    });
  };

  App.socketConnect = function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();

    App.refreshMatchData ();
  };

  App.socketDisconnect = function () {
    $('#message').text ('');
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('status', App.displayStatus);
  App.socket.on ('match_updated', App.refreshMatchData);
  App.socket.on ('reload', App.refreshMatchData);
  App.socket.emit ('log:log', {'msg': 'File->Download->clubs.practiscore.com'});
});
