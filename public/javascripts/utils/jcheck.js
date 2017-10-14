/* global io */

$(function () {
  'use strict';

  var App = {};

  App.socket = io.connect ();

  App.socket.on ('utils_jcheck_results', function (param) {
    $('#results').text (param.results);
  });

  App.socket.on ('utils_jcheck_status', function (param) {
    $('#status').text (param.status);
  });

  App.socket.emit ('utils:jcheck');
  App.socket.emit ('log:log', {'msg': 'Utilities->JSON Checker'});
});
