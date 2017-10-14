/* global _:false */

var Validator = (function () {
  'use strict';

  Validator = Validator;

  var textRegex       = /[^a-zA-Z0-9 _#:'!\.]/;
  var nameRegex       = /[^a-zA-Z ,\.'-]/;
  var addressRegex    = /[^a-zA-Z0-9 #\.]/;
  var cityRegex       = /[^a-zA-Z \.]/;
  var zipcodeRegex    = /^(\d{5}(-\d{4})?)?$/;
  var phoneRegex      = /^(\d{3}-\d{3}-\d{4})?$/;
  var emailRegex      = /^([a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)?$/;
  var membershipRegex = /[^a-zA-Z0-9 \-]/;

  //
  //  For numeric fields, make sure number, and that the value is between the
  //  lower and upper bounds. Return true if error, false if OK.
  //
  var checkNumberRange = function (e, lower, upper) {
    e = +e;

    if (!_.isNumber (e) || _.isNaN (e))
      return true;
    if ((e < lower) || (e > upper))
      return true;

    return false;
  };

  /*
  //
  //  Expects an IP address with a range, e.g. 172.16.0.1/12. Validate that all
  //  fields are present, and range check each portion.
  //
  var checkIsIPV4WithNetmask = function (ipaddress) {
    var blocks = ipaddress.split (/\.|\//);

    if (blocks.length !== 5)
      return true;

    if (checkNumberRange (blocks.pop (), 0, 32))
      return true;

    return !blocks.every (function (block) {
      return checkNumberRange (block, 0, 255);
    });
  };
  */

  //
  //
  //
  var tests = {
    'integer': function (value, options, callback) {
      options.min = options.min || 0;
      options.max = options.max || Number.MAX_VALUE;

      var err = checkNumberRange (value, options.min, options.max);

      if (callback)
        callback (err, 'Invalid value or illegal character(s) in numeric field (must be ' + options.min + '..' + options.max + ')');

      return err;
    },
    'ipv4': function (ipaddress, options, callback) {
      var blocks = ipaddress.split (/\./);
      var err = true;

      if (blocks.length === 4) {
        err = !blocks.every (function (block) {
          return checkNumberRange (block, 0, 255);
        });
      }

      if (callback)
        callback (err, 'Improperly formatted IPV4 address (must be in aaa.bbb.ccc.ddd format)');

      return err;
    },
    'ipv4/nm': function (ipaddress, options, callback) {
      var blocks = ipaddress.split (/\.|\//);
      var err = true;

      if (blocks.length === 5) {
        if (checkNumberRange (blocks.pop (), 0, 32)) {
          err = !blocks.every (function (block) {
            return checkNumberRange (block, 0, 255);
          });
        }
      }

      if (callback)
        callback (err, 'Improperly formatted IPV4 address (must be in aaa.bbb.ccc.ddd/nn format)');

      return err;
    },
    'portnumber': function (value, options, callback) {
      var err = checkNumberRange (value, 1024, 65535);

      if (callback)
        callback (err, 'Invalid port range or illegal character(s) present (must be 1024..65535)');

      return err;
    },
    'text': function (value, options, callback) {
      var err = textRegex.test (value);

      if (callback)
        callback (err, 'Illegal character(s) in text field');

      return err;
    },
    'fname': function (value, options, callback) {
      var err = nameRegex.test (value);

      if (callback)
        callback (err, 'Illegal character(s) in first name field');

      return err;
    },
    'lname': function (value, options, callback) {
      var err = nameRegex.test (value);

      if (callback)
        callback (err, 'Illegal character(s) in last name field');

      return err;
    },
    'address': function (value, options, callback) {
      var err = addressRegex.test (value);

      if (callback)
        callback (err, 'Illegal character(s) in address field');

      return err;
    },
    'city': function (value, options, callback) {
      var err = cityRegex.test (value);

      if (callback)
        callback (err, 'Illegal character(s) in city name');

      return err;
    },
    'zipcode': function (value, options, callback) {
      var err = !zipcodeRegex.test (value);

      if (callback)
        callback (err, 'Illegal character(s) in zipcode (must be nnnnn or nnnnn-nnnn)');

      return err;
    },
    'phone': function (value, options, callback) {
      var err = !phoneRegex.test (value);

      if (callback)
        callback (err, 'Illegal character(s) in phone number (must be aaa-eee-nnnn)');

      return err;
    },
    'email': function (value, options, callback) {
      var err = !emailRegex.test (value);

      if (callback)
        callback (err, 'Improperly formatted email address or illegal character(s) present');

      return err;
    },
    'membership': function (value, options, callback) {
      var err = membershipRegex.test (value);

      if (callback)
        callback (err, 'Improperly formatted membership number or illegal character(s) present');

      return err;
    },
  };

  return {
    test: function (format, value, options, callback) {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }

      if (!tests [format])
        throw new Error ('Unknown validation field type');

      return tests [format] (value, options, callback);
    },
    jqtest: function (elementName, options, callback) {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }

      var value = $(elementName).val ().trim ();
      var format = $(elementName).attr ('format').trim ();

      if (!tests [format])
        throw new Error ('Unknown validation field type');

      return tests [format] (value, options, function (err, errtext) {
        callback (err, errtext, elementName, value, format);
      });
    },
  };
})();
