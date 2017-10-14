'use strict';

var fs = require ('fs');
var pmelog = require ('../lib/pmelog');

module.exports = function (app) {
  app.get ('/ajax', function (req, res) {
    res.json (null);
  });

  /*
  app.get ('/ajax/shooter/uid/:uid', function (req, res, next) {
    var uid = req.params.uid;
    var shooter = app.pmm.match ().matchdef ().getShooterByUID (uid);
    if (!shooter)
      return next (new Error ('Invalid shooter UID ' + uid));
    res.json (shooter.exports ());
  });

  app.get ('/ajax/shooter/index/:index', function (req, res, next) {
    var index = req.params.index;
    var shooter = app.pmm.match ().matchdef ().getShooterByIndex (index);
    if (!shooter)
      return next (new Error ('Invalid shooter number ' + index));
    res.json (shooter.exports ());
  });
  */

  app.get ('/ajax/help', function (req, res) {
    var helpfile = 'help/' + req.query.helpid.trim () + '.html';
    fs.exists (helpfile, function (exists) {
      if (exists)
        res.sendfile (helpfile);
      else {
        pmelog.llog (pmelog.ERROR, 'Missing help file \'%s\'', helpfile);
        res.send ('<p>Sorry, can\'t locate the help file for this page.</p>');
      }
    });
  });

  app.get ('/ajax/namesearch', function (req, res) {
    app.pmm.file ().masterSearch ({
      type: req.query.type,
      match: req.query.match,
      field: req.query.field,
      limit: req.query.maxrows
    }, function (err, matches) {
      res.json ({
        err: err,
        matches: matches
      });
    });
  });

  /*
  //
  //  Deprecated in favor of the function in routes/io.js
  //
  app.get ('/ajax/maxnameslength', function (req, res) {
    app.pmm.file ().masterLongestCombination (function (err, maxwidth) {
      res.json ({err: err, maxwidth: maxwidth});
    });
  });

  app.get ('/ajax/shooters', function (req, res) {
    res.json (app.pmm.match ().matchdef ().getShooters ());
  });

  app.get ('/ajax/match', function (req, res) {
    res.json (app.pmm.match ().matchdef ().exports ());
  });

  app.get ('/ajax/scores', function (req, res) {
    res.json (app.pmm.match ().scores ().exports ());
  });

  app.get ('/ajax/devices', function (req, res) {
    res.json (app.pmm.devices ().devices ());
  });
  */
};
