/* global io */
/* global pmelib */

$(function () {
  'use strict';

  var timerIdle = null;
  var timerMovement = null;
  var mouseIsMoving = false;
  var socket = io.connect ();

  function setIdleTimer (timeout) {
    if (timerIdle !== null)
      clearTimeout (timerIdle);

    timerIdle = setTimeout (function () {
      socket.emit ('kiosk:idle', {name: window.pmeModule.name});
      timerIdle = null;
    }, (timeout || 10) * 1000);
  }

  function setMovementTimer (timeout) {
    if (timerMovement !== null)
      clearTimeout (timerMovement);

    timerMovement = setTimeout (function () {
      timerMovement = null;
      mouseIsMoving = false;
    }, (timeout || 10) * 1000);

    mouseIsMoving = true;
  }

  //
  //
  //
  socket.emit ('log:log', {'msg': 'Kiosk'});

  $('#jqxMenu').hide ();
  $('#copyright').hide ();

  if (window.pmeModule) {
    window.pmeModule.enableKiosk ();

    if (pmelib && pmelib.kioskKeys)
      pmelib.kioskKeys ();

    $(document).keydown (function (e) {
      switch (String.fromCharCode (e.keyCode)) {
        case 'P' : window.location.href = '/kiosk/progress?kiosk=1'; e.preventDefault (); break;
        default  : break;
      }
    });

    $(document).bind ('contextmenu', function (e) {
      e.preventDefault ();
      window.location.href = "/kiosk";
    });

    $(document).mousedown (function () {
      socket.emit ('kiosk:activity', {name: window.pmeModule.name});
      setIdleTimer (30); // FIXME: this should come from configuration
    });

    $(document).mousemove (function () {
      if (mouseIsMoving === false) {
        socket.emit ('kiosk:activity', {name: window.pmeModule.name});
        setMovementTimer (5);
      }

      setIdleTimer (30); // FIXME: this should come from configuration
    });

    setIdleTimer (10);
    socket.emit ('kiosk:start', {name: window.pmeModule.name});
  }
});
