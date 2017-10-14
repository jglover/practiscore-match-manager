/* global io */
/* global _:false, console:false */

$(function () {
  'use strict';

  var App = {};

  App.createSquadList = function (shooters) {
    var squads = {};

    for (var i = 0; i < shooters.length; i++)
      if (!squads [shooters [i].sh_sqd])
        squads [shooters [i].sh_sqd] = [i];
      else
        squads [shooters [i].sh_sqd].push (i);

    return squads;
  };

  App.addMember = function (shooterIndex, shooter) {
    var li = document.createElement ('li');

    li.innerHTML = shooter.sh_ln + ', ' + shooter.sh_fn + (shooter.sh_id ? (' (' + shooter.sh_id + ')') : '');
    li.id = shooterIndex;
    li.setAttribute ('uid', shooter.sh_uid);
    li.setAttribute ('rel', ( shooter.sh_del && !shooter.sh_dq) ? 'deleted'   :
                            (!shooter.sh_del &&  shooter.sh_dq) ? 'dq'        :
                            ( shooter.sh_del &&  shooter.sh_dq) ? 'deleteddq' :
                            'normal');

    return li;
  };

  App.addSquadMembers = function (side, squadNumber) {
    var shooters = App.shooters;
    var squadMembers = App.squadList [squadNumber];
    var ol = document.createElement ('ol');

    _.each (_.sortBy (squadMembers, function (sm) {
      var shooter = shooters [sm];
      return shooter.sh_ln + ', ' + shooter.sh_fn + (shooter.sh_id ? (' (' + shooter.sh_id + ')') : '');
    }), function (s) {
      ol.appendChild (App.addMember (s, shooters [s]));
    });

    if (!squadMembers.length)
      ol.setAttribute ('style', 'height: 23px');

    ol.setAttribute ('squadnumber', squadNumber);
    ol.className = 'ol' + side + ' ol' + side + '_' + squadNumber;

    return ol;
  };

  App.createSquadListItem = function (side, squadNumber) {
    var h4 = document.createElement ('h4');
    var div = document.createElement ('div');
    var li = document.createElement ('li');

    h4.innerHTML = 'Squad ' + squadNumber + ' (' + App.squadList [squadNumber].length + ')';
    h4.id = 'h4_ul' + side + '_squad_' + squadNumber;
    h4.className = 'squadLabel';

    div.appendChild (App.addSquadMembers (side, squadNumber));

    li.className = 'accordion';
    li.setAttribute ('squadnumber', squadNumber);
    li.appendChild (h4);
    li.appendChild (div);

    return li;
  };

  App.createSquad = function (side) {
    var ul = document.createElement ('ul');

    for (var squadNumber in App.squadList) {
      ul.appendChild (App.createSquadListItem (side, squadNumber));
    }

    ul.className = 'ul' + side;

    return ul;
  };

  App.createList = function () {
    $('#squads')
      .hide ()
      .empty ()
      .append (App.createSquad ('Left'))
      .append (App.createSquad ('Right'))
      .show ();

    function checkLength (ul) {
      if (!ul.children ().length)
        ul.height (23);
      else
        ul.removeAttr ('style');
    }

    $('.ulLeft').accordion ({
      collapsible: true,
      heightStyle: 'content',
      active: false,
      activate: function () {
        $('.olLeft, .olRight').sortable ('option', 'disabled', $(this).accordion ('option', 'active') === $('.ulRight').accordion ('option', 'active'));
      },
    });

    $('.ulRight').accordion ({
      collapsible: true,
      heightStyle: 'content',
      active: false,
      activate: function () {
        $('.olLeft, .olRight').sortable ('option', 'disabled', $(this).accordion ('option', 'active') === $('.ulLeft').accordion ('option', 'active'));
      },
    });

    //
    //  Gets called once by the destination side ('receive'), which updates
    //  the destination squad header on both sides, and once by the source
    //  ('remove') side, which updates the source squad number on both sides.
    //
    function updateList (thisOL, oppositeOLName) {
      var squadNumber = thisOL.attr ('squadnumber');
      var oppositeOL = $('.' + oppositeOLName + '_' + squadNumber);
      var olNew = _.sortBy (thisOL.find ('li'), function (li) {
        return $(li).text ();
      });

      //
      //  The issue is that when we're called on the 'remove' event and the
      //  same squad is open on both sides, we're overwriting the destination
      //  squad with the source squad, but with the competitor removed. But
      //  there doesn't seem to be a way for the 'remove' event to determine
      //  what the target squad is.
      //
      //  'Solved' by disabling sortable when the same accordion panel indexes
      //  are open on both sides. The issue will still remain when (if) we
      //  allow dropping the competitor onto the header instead of the into
      //  the open panel.
      //
      thisOL.html (olNew);
      oppositeOL.html ($(olNew).clone());

      checkLength (thisOL);
      checkLength (oppositeOL);

      _.each (['ulLeft', 'ulRight'], function (side) {
        var ht = $('#h4_' + side + '_squad_' + squadNumber);
        var sn = ht.html ().replace (/\(\d+\)/, '(' + olNew.length + ')');
        ht.html (sn);
      });
    }

    var sortableOptions = {
      Left: {
        connectWith: '.olRight',
        cursor: 'move',
        cursorAt: {left: 5},
        opacity: 0.5,
        receive: function (event, ui) {
          console.log ('Move right to left');
          console.log ('  Shooter index %s', ui.item.attr ('id'));
          console.log ('  Source squad number %s', ui.sender.attr ('squadnumber'));
          console.log ('  Destination squad number %s', $(this).attr ('squadnumber'));

          App.socket.emit ('shooter:squad', {'uid': ui.item.attr ('uid'), 'squad': $(this).attr ('squadnumber')});
          updateList ($(this), 'olRight');
        },
        remove: function () {
          updateList ($(this), 'olRight');
        },
      },
      Right: {
        connectWith: '.olLeft',
        cursor: 'move',
        cursorAt: {left: 5},
        opacity: 0.5,
        receive: function (event, ui) {
          console.log ('Move left to right');
          console.log ('  Shooter index %s', ui.item.attr ('id'));
          console.log ('  Source squad number %s', ui.sender.attr ('squadnumber'));
          console.log ('  Destination squad number %s', $(this).attr ('squadnumber'));

          App.socket.emit ('shooter:squad', {'uid': ui.item.attr ('uid'), 'squad': $(this).attr ('squadnumber')});
          updateList ($(this), 'olLeft');
        },
        remove: function () {
          updateList ($(this), 'olLeft');
        },
      },
    };

    $('.olLeft').sortable (sortableOptions.Left);
    $('.olRight').sortable (sortableOptions.Right);

    $('.ulLeft, .ulRight, .olLeft, .olRight').disableSelection ();

    $('#add-button')
      .button ()
      .off ()
      .click (function (e) {
        this.blur ();
        e.preventDefault ();
        $('#popup').dialog ('open');
      })
      .show ();

    $('#popup').dialog ({
      autoOpen: false,
      dialogClass: "no-close",
      width: 'auto',
      modal: true,
      draggable: true,
      resizable: false,
      buttons: {
        'Cancel': function () {
          $(this).dialog ('close');
        },
        'Create': function () {
          var sn = $('#squadNumber');
          var squadNumber = sn.val ();

          sn.removeClass ('ui-state-error');

          if (/[^0-9]/.test (squadNumber) || App.squadList [squadNumber]) {
            sn.addClass ('ui-state-error');
          } else {
            App.squadList [squadNumber] = [];

            _.each (['Left', 'Right'], function (side) {
              $('.ul' + side).append (App.createSquadListItem (side, squadNumber));

              function sortUL (selector) {
                $(selector).children ('li').sort (function (a, b) {
                  var upA = parseInt ($(a).attr ('squadnumber'));
                  var upB = parseInt ($(b).attr ('squadnumber'));
                  return (upA < upB) ? -1 : (upA > upB) ? 1 : 0;
                }).appendTo (selector);
              }

              sortUL ($('.ul' + side));

              $('.ul' + side).accordion ('refresh');
              $('.ol' + side).sortable (sortableOptions [side]);
            });

            $(this).dialog ('close');
          }
        },
      },
      close: function () {
        $('#squadNumber').val ('').removeClass ('ui-state-error');
      },
    });

  };

  //
  //  We're received match data, so let's figure it out
  //
  App.socketConnect = function () {
    App.socket.emit ('match:request', {options: {match: true}});

    $('#serverDisconnect').hide ();
    $('#content,#menu').show ();
  };

  App.socketDisconnect = function () {
    $('#serverDisconnect').show ();
    $('#content,#menu').hide ();
  };

  App.matchDataReceived = function (param) {
    App.shooters = param.matchData.m.match_shooters || {};
    App.squadList = App.createSquadList (App.shooters);
    App.createList ();
  };

  App.editSquadOK = function () {
    $('#msgDiv').hide ();
  };

  App.editSquadMsg = function (param) {
    $('#msg').html (param.err).css ('color', 'black');
    $('#msgDiv').show ();
  };

  App.editSquadErr = function (param) {
    $('#msg').html (param.err).css ('color', 'red');
    $('#msgDiv').show ();
  };

  //
  //  Ye olde main...
  //
  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_data', App.matchDataReceived);
  App.socket.on ('edit_squad_ok', App.editSquadOK);
  App.socket.on ('edit_squad_msg', App.editSquadMsg);
  App.socket.on ('edit_squad_err', App.editSquadErr);
  App.socket.emit ('log:log', {'msg': 'View/Edit->Squads (TPP)'});
});
