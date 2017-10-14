/* global io */

$(function () {
  'use strict';

  var App = {};

  //
  //
  //
  App.socketConnect = function () {
    $('#serverDisconnect').hide ();
    $('#images,#content,#menu').show ();
  };

  App.socketDisconnect = function () {
    $('#serverDisconnect').show ();
    $('#images,#content,#menu').hide ();
  };

  App.kioskPage = function (param) {
    if (param.url)
      window.location.href = param.url;
  };

  window.pmeModule = window.pmeModule || {name: 'vendor'};
  window.pmeModule.enableKiosk = function () {
    App.socket.on ('kiosk_page', App.kioskPage);
  };

  //
  //  Ye olde main...
  //
  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.emit ('log:log', {'msg': 'Kiosk->Menu'});
});

