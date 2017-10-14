/* global io */

$(function () {
  'use strict';

  var App = {};

  //
  //  We're received match data, so let's figure it out
  //
  App.socketConnect = function () {
    App.socket.emit ('match:get', {options: {all: true}}, function (data) {
      var replacer = function (key, value) {
        return (key.substr (0, 1) === '_') ? undefined : value;
      };

      $('#json').text (JSON.stringify (data.matchData, replacer, '  '));
    });
  };

  //
  //  Ye olde main...
  //
  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.emit ('log:log', {'msg': 'Utilities->JSON Stringify'});
});
