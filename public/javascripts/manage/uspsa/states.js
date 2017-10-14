/* global io */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};

  $('[controltype=checkbox]').jqxCheckBox ({
    disabled: false,
  });

  $('[controltype=button]').each (function () {
    $(this).jqxButton ({
      disabled: false,
      width: $(this).attr ('button-width'),
    });
  });

  $('#button-begin').on ('click', function () {
    App.inputDisable ();
    App.socket.on ('status', function (data) {
      $('#msgStates').text (data.status).show ();
    });
    App.socket.emit ('shooter:states:update', 
      {
        skipstateset: $('#checkbox-skipstateset').jqxCheckBox ('val'),
        skipforeignset: $('#checkbox-skipforeignset').jqxCheckBox ('val'),
      }, function (data) {
      if (data.msg)
        $('#msgStates').text (data.msg).show ();

      App.socket.removeAllListeners ('status');
      App.inputEnable ();
    });
  });

  //
  //
  //
  App.inputDisable = function () {
    $('[controltype=button]').jqxButton ({disabled: true});
    $('[controltype=checkbox]').jqxCheckBox ({disabled: true});
  };

  App.inputEnable = function () {
    $('[controltype=button]').jqxButton ({disabled: false});
    $('[controltype=checkbox]').jqxCheckBox ({disabled: false});
  };

  App.refreshMatchData = function () {
    App.socket.emit ('match:name', function (data) {
      $('#matchname').text (data.matchname);
    });
  };

  App.socketConnect = function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();

    App.refreshMatchData ();
  };

  App.socketDisconnect = function () {
    $('[message]').text ('');
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  };

  App.reload = function () {
    window.location.href = 'http://' + window.location.host + '/manage/uspsa/states';
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_updated', App.refreshMatchData);
  App.socket.on ('reload', App.reload);
  App.socket.emit ('log:log', {msg: 'Manage->USPSA.org->Update States'});
});
