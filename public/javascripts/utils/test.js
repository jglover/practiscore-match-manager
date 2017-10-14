/* global io */

$(function () {
  'use strict';

  var App = {};

  $('input[type=button]').prop ('disabled', true);
  $('button').button ();

  App.socket = io.connect ();

  App.enablePlayButtons = function () {
    $('#buttonReload').prop ('disabled', false);
    $('#buttonPlay').prop ('disabled', false);
    $('#buttonStop').prop ('disabled', true);
    $('#buttonFast').prop ('disabled', false);
  };

  App.enableStopButtons = function () {
    $('#buttonReload').prop ('disabled', true);
    $('#buttonPlay').prop ('disabled', true);
    $('#buttonStop').prop ('disabled', false);
    $('#buttonFast').prop ('disabled', true);
  };

  App.socket.on ('control_hello', function () {
    $('#buttonReload').click (function () {
      App.socket.emit ('control:reload');
    });
    $('#buttonPlay').click (function () {
      App.socket.emit ('control:play:start');
    });
    $('#buttonStop').click (function () {
      App.socket.emit ('control:play:stop');
    });
    $('#buttonFast').click (function () {
      App.socket.emit ('control:play:fast');
    });

    $('#buttonShowApp').click (function () {
      App.socket.emit ('utils:showapp');
    });

    $('#buttonPractiprintStart').click (function () {
      App.socket.emit ('practiprint:start');
    });
    $('#buttonPractiprintStop').click (function () {
      App.socket.emit ('practiprint:stop');
    });

    App.enablePlayButtons ();
    $('#status').html ('Select option');
  });

  //
  //  Playback messages
  //
  App.socket.on ('control_reload_complete', function () {
    $('#status').html ('Match reloaded');
  });
  App.socket.on ('control_reload_busy', function () {
    $('#status').html ('Cannot reload match, playback in progress');
  });
  App.socket.on ('control_play_started', function () {
    App.enableStopButtons ();
    $('#status').html ('Playback started');
  });
  App.socket.on ('control_play_busy', function () {
    $('#status').html ('Cannot start a new playback until current playback completes');
  });
  App.socket.on ('control_play_stopped', function () {
    App.enablePlayButtons ();
    $('#status').html ('Playback stopped');
  });
  App.socket.on ('control_play_notplaying', function () {
    $('#status').html ('Playback not playing, nothing to stop!');
  });
  App.socket.on ('control_play_record', function (data) {
    $('#status').text ('Playing back record #' + data.record + ' from ' + data.device);
  });
  App.socket.on ('control_play_complete', function () {
    App.enablePlayButtons ();
    $('#status').html ('Playback complete');
  });

  //
  //
  //
  App.socket.emit ('control:hello');
  App.socket.emit ('log:log', {'msg': 'Utilities->Test'});

  App.socket.on ('connect', function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();
  });
  App.socket.on ('disconnect', function () {
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  });
});
