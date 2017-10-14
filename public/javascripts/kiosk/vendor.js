/* global io */
/* global console: false */

$(function () {
  'use strict';

  var App = {};

  //
  //  Parse any parameters on the URL string. We're only interested if
  //  'display' is present, so that we go immediately to the desired page.
  //
  var queryString = function () {
    var query_string = {};
    var query = window.location.search.substring (1);
    var vars = query.split ('&');

    for (var i = 0; i < vars.length; i++) {
      var pair = vars [i].split ('=');

      if (typeof query_string [pair [0]] === 'undefined')
        query_string [pair [0]] = pair [1];
      else if (typeof query_string [pair [0]] === 'string') {
        var arr = [ query_string [pair [0]], pair [1] ];
        query_string [pair [0]] = arr;
      } else
        query_string [pair [0]].push (pair [1]);
    }

    return query_string;
  };

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

  App.kioskImage = function (param) {
    if (param.image)
      $('#image').attr ('src', param.image).show ();
  };

  App.kioskPage = function (param) {
    if (param.url)
      window.location.href = param.url;
  };

  window.pmeModule = window.pmeModule || {name: 'vendor'};
  window.pmeModule.enableKiosk = function () {
    App.socket.on ('kiosk_image', function (param) {
      console.log ('Got kiosk_image message');
      App.kioskImage (param);
    });
    App.socket.on ('kiosk_page', App.kioskPage);
  };

  //
  //  Ye olde main...
  //
  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.emit ('log:log', {'msg': 'Kiosk->Vendors'});

  $('img').error (function () {
    $(this).attr ('src', '/vendor/practiscore.png').show ();
  });

  App.kioskImage (queryString ());
});
