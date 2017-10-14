/* jshint devel: true */
/* global io */

$(function () {
  'use strict';

  var App = {};

  App.socketConnect = function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();

    // App.socket.emit ('file:ssi:list');
  };

  App.socketDisconnect = function () {
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  };

  //
  //
  //
  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.emit ('log:log', {'msg': 'File->Export Shoot\'n-Score-It'});
});
