/* jshint devel: true */
/* global io */
/* global _:false */

$(function () {
  'use strict';

  var App = {};

  //
  //  This fixes checkboxes to be displayed in the jQueryUI theme.  Lifted from
  //  http://jsfiddle.net/adamboduch/b2GPv/
  //
  $.widget ("app.checkbox", {
    _create: function () {
      this._super ();

      //
      //  Hide the HTML checkbox, then insert our button.
      //
      this.element.addClass ("ui-helper-hidden-accessible");
      this.element.attr ('tabindex', -1);
      this.button = $("<button/>").insertAfter (this.element);

      //
      //  Configure the button by adding our widget class, setting some default
      //  text, default icons, and such.
      //
      this.button.addClass ("small-checkbox")
                 .text (this.element.attr ('title') || 'checkbox')
                 .button ({
                   text: false,
                   icons: {
                     primary: "ui-icon-blank"
                   },
                   create: function (e, ui) {
                     e = e;
                     ui = ui;
                     $(this).removeAttr ("title");
                   }
      });

      //
      //  Listen for click events on the button we just inserted and toggle the
      //  checked state of our hidden checkbox.
      //
      this._on (this.button, {
        click: function (e) {
          e = e;
          this.element.prop ("checked", !this.element.is (":checked"));
          this.refresh ();
        }
      });

      //
      //  Update the checked state of the button, depending on the initial
      //  checked state of the checkbox.
      //
      this.refresh ();
    },

    destroy: function () {
      this._super ();

      //
      //  Display the HTML checkbox and remove the button.
      //
      this.element.removeClass ("ui-helper-hidden-accessible");
      this.button.button ("destroy").remove ();
    },

    refresh: function () {
      this.button.button ("option", "icons", {
        primary: this.element.is (":checked") ? "ui-icon-check" : "ui-icon-blank"
      });
    }
  });

  //
  //  For numeric fields, make sure number, and that the value is between the
  //  lower and upper bounds.
  //
  App.checkNumberRange = function (e, lower, upper) {
    e = +e;

    if (!_.isNumber (e) || _.isNaN (e))
      return false;
    if ((e < lower) || (e > upper))
      return false;

    return true;
  };

  //
  //  Expects an IP address with a range, e.g. 172.16.0.1/12. Validate that all
  //  fields are present, and range check each portion.
  //
  App.checkIsIPV4 = function (ipaddress) {
    var blocks = ipaddress.split (/\.|\//);

    if (blocks.length === 5) {
      if (!App.checkNumberRange (blocks.pop (), 0, 32))
        return false;

      return blocks.every (function (block) {
        return App.checkNumberRange (block, 0, 255);
      });
    }

    return false;
  };

  //
  //  Validate single field, returning true if good, false if bad.
  //
  App.validateField = function (field) {
    var value = $(field).val ();
    var format = $(field).attr ('format');

    if (format === 'iprange') {
      return App.checkIsIPV4 (value);
    } else if (format === 'portnumber') {
      return App.checkNumberRange (value, 1024, 65535);
    } else if (format === 'integer') {
      return App.checkNumberRange (value, $(field).attr ('min'), $(field).attr ('max'));
    } else if (format === 'text') {
      var legalChars = /[^a-zA-Z0-9 _#:'!\.]/;

      return !legalChars.test (value);
    } else
      alert ('Unknown field type for field: ' + format);

    return false;
  };

  //
  //  For numeric fields, make sure number, and that the value is between the
  //  lower and upper bounds.
  //
  App.checkNumberRange = function (e, lower, upper) {
    e = +e;

    if (!_.isNumber (e) || _.isNaN (e))
      return false;
    if ((e < lower) || (e > upper))
      return false;

    return true;
  };

  //
  //  Validate entire form, setting red boxes and disabling save button for any
  //  bad fields. If we're in a field that's valid and has focus, draw a green
  //  box if we have focus, otherwise remove all red or green boxes.
  //
  App.validateForm = function () {
    var hasError = false;

    _.each ($('form [format]'), function (field) {
      $(field).removeClass ('inputInvalid').removeClass ('inputValid');

      if (App.validateField (field)) {
        if ($(field).is (':focus'))
          $(field).addClass ('inputValid');
      } else {
        console.log ('Field %s has value \'%s\'', $(field).attr ('id'), $(field).val ());
        $(field).addClass ('inputInvalid');
        hasError = true;
      }
    });

    $('.edit_config_save').button (hasError ? 'disable' : 'enable');
  };

  //
  //  When server sends us the config data, populate the fields on the page.
  //
  App.updateForm = function (config) {
    _.each ($('form'), function (form) {
      _.map (form, function (field) {
        var group;

        if (!field.id || (field.type === 'submit'))
          return;
        if (!(group = $(field).attr ('group')))
          console.log ('No group for config variable %s (%s)', field.id, field.type);
        else if (!config [group][field.id])
          console.log ('No config variable %s (%s) in group %s', field.id, field.type, group);
        else if (field.type === 'text')
          $(field).val (config [group][field.id]);
        else if (field.type === 'checkbox')
          $(field).prop ('checked', config [group][field.id]);
        else if (field.type === 'select-one') {
          $(field).find ('option')
              .removeAttr ('selected')
              .filter ('[value=' + config [group][field.id] + ']')
              .prop ('selected', true);
        } else
          console.log ('Type not handled -- %s %s', field.id, field.type);
      });
    });
  };

  //
  //
  //
  App.socketConnect = function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();

    App.socket.emit ('config:request');
  };

  App.socketDisconnect = function () {
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  };

  App.configConfigReceived = function (param) {
    App.updateForm (param.config);
  };

  App.configConfigSaved = function () {
    $('.configSaved').show ();
    $('.configError').hide ();
  };

  App.configConfigError = function () {
    $('.configSaved').hide ();
    $('.configError').show ();
  };

  //
  //  Ye olde main...
  //
  $(document).tooltip ();
  $('input').addClass ('ui-corner-all');
  $("input[type='checkbox']").checkbox ();
  $('button').button ();
  $('#tabs').tabs ({
  /*
    activate: function (event, ui) {
      $('.configSaved,.configError').hide ();
    }
      */
  });

  //
  //  When entering or exiting field, force validation
  //
  $('form [format]').focusin (function () {
    App.validateForm ();
  });

  $('form [format]').focusout (function () {
    App.validateForm ();
  });

  //
  //  Validate field as each character typed. If the field is errored, put red
  //  box around it and disable save button. If the field is valid, then also
  //  validate all other fields, and if they're all good, enable the save
  //  button. This is inefficient, but how could we handle a field in another tab
  //  being errored, and make sure the save button remains disabled?
  //
  $('form [format]').on ('input', function () {
    var field = $(this) [0];

    if (App.validateField (field)) {
      App.validateForm ();
    } else {
      $(field).removeClass ('inputValid').addClass ('inputInvalid');
      $('.edit_config_save').button ('disable');
    }

    $('.configSaved,.configError').hide ();
  });

  //
  //  On reset, reset the form on this tab only, and validate all fields.
  //
  $('.edit_config_reset').click (function (e) {
    this.blur ();
    e.preventDefault ();
    $(e.target).closest ('form').trigger ('reset');
    App.validateForm ();
  });

  //
  //  On save, create a hash and send it to the server.
  //
  $('.edit_config_save').click (function (e) {
    var config = {};

    this.blur ();
    e.preventDefault ();

    _.each ($('form'), function (form) {
      _.map (form, function (field) {
        if (field.id) {
          if (field.type === 'text')
            config [field.id] = $(field).val ();
          else if (field.type === 'checkbox')
            config [field.id] = $(field).prop ('checked');
          else if (field.type === 'select-one')
            config [field.id] = $(field).find (':selected').val ();
        }
      });
    });

    App.socket.emit ('config:save', {config: config});
  });

  //
  //  Magic for color selection boxes.
  //
  var cpText = {
    progressColorEmpty:           'Select color for cells in match progress table with no scores',
    progressColorProgress:        'Select color for cells in match progress table that have one or more scores, but are not complete',
    progressColorComplete:        'Select color for cells in match progress table that are completed, with no DNFs or missing scores',
    progressColorCompleteDNF:     'Select color for cells in match progress table that are completed (no missing scores), but have one or more DNFs',
    progressColorCompleteMissing: 'Select color for cells in match progress table that have one or more missing scores',
  };

  _.forOwn (cpText, function (text, id) {
    $('#' + id).colorpicker ({
      parts:           'full',
      showOn:          'both',
      limit:           'websafe',
      buttonColorize:  true,
      buttonText:      text,
    });
  });

  $('.cpbutton').hide ();
  $('.cpbutton + button').addClass ('small-cpbutton');

  //
  //  Establish socket, set up our handlers
  //
  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('config_data', App.configConfigReceived);
  App.socket.on ('config_saved', App.configConfigSaved);
  App.socket.on ('config_error', App.configConfigError);
  App.socket.emit ('log:log', {'msg': 'Config'});
});
