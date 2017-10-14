'use strict';

var _ = require ('lodash');
var urlNJS = require ('url');

function errorNotImplemented (res, err, app, html) {
  if (err) {
    res.render ('error/notimplemented', app.jadeGetVars ({title: 'PMM - Error!'}));
    console.dir (err);
  } else
    res.end (html);
}

function commonCode (req, res, app, title, extras) {
  var pathname = urlNJS.parse (req.url).pathname.replace (/\/+$/, '');

  res.render (pathname.substr (1), _.merge (app.jadeGetVars ({title: title, pathname: pathname}), extras || {}), function (err, html) {
    errorNotImplemented (res, err, app, html);
  });
}


module.exports = function (app) {
  app.get ('/utils', function (req, res) {
    commonCode (req, res, app, 'PMM - Utilities');
  });

  app.get ('/utils/namesdb', function (req, res) {
    commonCode (req, res, app, 'PMM - Edit Competitor Database');
  });

  app.get ('/utils/jcw', function (req, res) {
    commonCode (req, res, app, 'PMM - JCW Stuff');
  });

  app.get ('/utils/explore', function (req, res) {
    commonCode (req, res, app, 'PMM - JSON Explorer');
  });

  app.get ('/utils/jcheck', function (req, res) {
    commonCode (req, res, app, 'PMM - JSON Checker');
  });

  app.get ('/utils/memory', function (req, res) {
    var usage = process.memoryUsage ();

    commonCode (req, res, app, 'PMM - Memory Usage', {
      'rss': usage.rss,
      'heaptotal': usage.heapTotal,
      'heapused': usage.heapUsed,
    });
  });

  app.get ('/utils/stringify', function (req, res) {
    commonCode (req, res, app, 'PMM - JSON Stringify');
  });

  app.get ('/utils/test', function (req, res) {
    commonCode (req, res, app, 'PMM - Test Functions');
  });
};
