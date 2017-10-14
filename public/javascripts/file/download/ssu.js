/* global io */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};

  $("[id^='ec-']").each (function () {
    $(this).jqxInput ({width: 100, height: 25});
  });
  $("[id^='ex-']").each (function () {
    $(this).jqxCheckBox ();
  });

  $("[id^='ec-']").on ('focus', function () {
    $(this).addClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $("[id^='ec-']").on ('focusout', function () {
    $(this).removeClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $('#ec-clubname').jqxComboBox ('focus');

  $('#ec-clubname').on ('change', function () {
    $('#downloadForm').jqxValidator ('validateInput', '#ec-clubname');
  });
  $('#ec-username').on ('change', function () {
    $('#downloadForm').jqxValidator ('validateInput', '#ec-username');
  });
  $('#ec-password').on ('change', function () {
    $('#downloadForm').jqxValidator ('validateInput', '#ec-password');
  });
  $('#ec-matchid').on ('change', function () {
    $('#downloadForm').jqxValidator ('validateInput', '#ec-matchid');
  });

  $('#downloadButton').jqxButton ({width: 75, disabled: true});

  $('#downloadButton').click (function () {
    $('#downloadForm').jqxValidator ('validate');
  });

  $('#downloadForm').jqxValidator ({
    focus: true,
    closeOnClick: false,
    onSuccess: function () {
      $('#message').text ('Requesting match from SquadSignup.com...');
      App.socket.emit ('download:ssu:match', {
          clubname: $('#ec-clubname').val (),
          username: $('#ec-username').val (),
          password: $('#ec-password').val (),
          matchID: $('#ec-matchid').val (),
          saveClub: $('#ex-saveClub').jqxCheckBox ('checked'),
          saveCredentials: $('#ex-saveCredentials').jqxCheckBox ('checked'),
          saveMatchID: $('#ex-saveMatchID').jqxCheckBox ('checked'),
          fixNameCase: $('#ex-fixNameCase').jqxCheckBox ('checked'),
        }, function (data) {
          if (data.err)
            $('#message').text ('An error occurred: ' + data.err);
          else {
            $('#message').html ('Done! Match successfully downloaded from SquadSignup.com<br>(' + data.shooters + ' competitors in match)');
            App.refreshMatchData ();
          }
      });
    },
    rules: [
      {
        input:   '#ec-clubname',
        message: 'A club name is required!',
        action:  'valuechanged, keyup, blur',
        rule:    function (input) {
          var hasLength = input.val ().length ? true : false;
          $('#downloadButton').jqxButton ({disabled: !hasLength});
          return hasLength;
        },
      },
      {
        input:   '#ec-clubname',
        message: 'Club name must be between 1 and 20 characters!',
        action:  'keyup, blur',
        rule:    function (input) {
          var goodLength = input.val ().length <= 20;
          $('#downloadButton').jqxButton ({disabled: !goodLength});
          return goodLength;
        },
      },
      {
        input:   '#ec-username',
        message: 'A user name is required!',
        action:  'valuechanged, keyup, blur',
        rule:    function (input) {
          var hasLength = input.val ().length ? true : false;
          $('#downloadButton').jqxButton ({disabled: !hasLength});
          return hasLength;
        },
      },
      {
        input:   '#ec-username',
        message: 'User name must be between 1 and 20 characters!',
        action:  'keyup, blur',
        rule:    function (input) {
          var goodLength = input.val ().length <= 20;
          $('#downloadButton').jqxButton ({disabled: !goodLength});
          return goodLength;
        },
      },
      {
        input:   '#ec-password',
        message: 'A password is required!',
        action:  'valuechanged, keyup, blur',
        rule:    function (input) {
          var hasLength = input.val ().length ? true : false;
          $('#downloadButton').jqxButton ({disabled: !hasLength});
          return hasLength;
        },
      },
      {
        input:   '#ec-password',
        message: 'Password name must be between 1 and 20 characters!',
        action:  'keyup, blur',
        rule:    function (input) {
          var goodLength = input.val ().length <= 20;
          $('#downloadButton').jqxButton ({disabled: !goodLength});
          return goodLength;
        },
      },
      {
        input:   '#ec-matchid',
        message: 'A match ID is required!',
        action:  'valuechanged, keyup, blur',
        rule:    function (input) {
          var hasLength = input.val ().length ? true : false;
          $('#downloadButton').jqxButton ({disabled: !hasLength});
          return hasLength;
        },
      },
      {
        input:   '#ec-matchid',
        message: 'Match ID name must be at least 3 characters!',
        action:  'keyup, blur',
        rule:    function (input) {
          var goodLength = input.val ().length >= 3;
          $('#downloadButton').jqxButton ({disabled: !goodLength});
          return goodLength;
        },
      },
      {
        input:   '#ec-matchid',
        message: 'Match ID may only contain numbers',
        action:  'keyup, blur',
        rule:    function (input) {
          var name = input.val ();
          var legalChars = /[^0-9]/;
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
      $('#ex-saveClub').jqxCheckBox (data.config._download.ssuSaveClub ? 'check' : 'uncheck');
      $('#ex-saveCredentials').jqxCheckBox (data.config._download.ssuSaveCredentials ? 'check' : 'uncheck');
      $('#ex-saveMatchID').jqxCheckBox (data.config._download.ssuSaveMatchID ? 'check' : 'uncheck');
      $('#ex-fixNameCase').jqxCheckBox (data.config._download.ssuFixNameCase ? 'check' : 'uncheck');
    });
    App.socket.emit ('download:ssu:club', function (data) {
      $('#ec-clubname').val (data.clubname);
    });
    App.socket.emit ('download:ssu:credentials', function (data) {
      $('#ec-username').val (data.username);
      $('#ec-password').val (data.password);
    });
    App.socket.emit ('download:ssu:matchid', function (data) {
      $('#ec-matchid').val (data.matchID);
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
  App.socket.emit ('log:log', {'msg': 'File->Download->squadsignup.com'});
});

