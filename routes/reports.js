'use strict';

var urlNJS = require ('url');

function errorNotImplemented (res, err, app, html) {
  if (err) {
    res.render ('error/notimplemented', app.jadeGetVars ({title: 'PMM - Error!'}));
    console.dir (err);
  } else
    res.end (html);
}

function normalizeURL (url, matchType) {
  url = urlNJS.parse (url);
  url.pathname = url.pathname.replace (/\/+$/, '') + '/' + matchType;
  return urlNJS.format (url);
}

function commonCode (req, res, app, title) {
  var pathname = urlNJS.parse (req.url).pathname.replace (/\/+$/, '');

  res.render (pathname.substr (1), app.jadeGetVars ({title: title, pathname: pathname}), function (err, html) {
    errorNotImplemented (res, err, app, html);
  });
}

module.exports = function (app) {
  app.param ('matchtype', function (req, res, next) {
    req.params.matchtype = app.pmm.match ().matchdef ().getMatchTypePMM ();
    next ();
  });

  app.get ('/reports', function (req, res) {
    commonCode (req, res, app, 'PMM - Reports');
  });

  app.get ('/reports/awards', function (req, res) {
    res.redirect (normalizeURL (req.url, app.pmm.match ().matchdef ().getMatchTypePMM ()));
  });

  app.get ('/reports/awards/:matchtype', function (req, res) {
    commonCode (req, res, app, 'PMM - Awards Report');
  });

  app.get ('/reports/ccr', function (req, res) {
    res.redirect (normalizeURL (req.url, app.pmm.match ().matchdef ().getMatchTypePMM ()));
  });

  app.get ('/reports/ccr/:matchtype', function (req, res) {
    commonCode (req, res, app, 'PMM - Competitor Change Request');
  });

  app.get ('/reports/labels', function (req, res) {
    res.redirect (normalizeURL (req.url, app.pmm.match ().matchdef ().getMatchTypePMM ()));
  });

  app.get ('/reports/labels/:matchtype', function (req, res) {
    commonCode (req, res, app, 'PMM - Labels');
  });

  app.get ('/reports/projection', function (req, res) {
    res.redirect (normalizeURL (req.url, app.pmm.match ().matchdef ().getMatchTypePMM ()));
  });

  app.get ('/reports/projection/:matchtype', function (req, res) {
    commonCode (req, res, app, 'PMM - Projection');
  });

  app.get ('/reports/squad', function (req, res) {
    res.redirect (normalizeURL (req.url, app.pmm.match ().matchdef ().getMatchTypePMM ()));
  });

  app.get ('/reports/squad/:matchtype', function (req, res) {
    commonCode (req, res, app, 'PMM - Squad Report');
  });

  app.get ('/reports/squadros', function (req, res) {
    res.redirect (normalizeURL (req.url, app.pmm.match ().matchdef ().getMatchTypePMM ()));
  });

  app.get ('/reports/squadros/:matchtype', function (req, res) {
    commonCode (req, res, app, 'PMM - Squad RO/CRO Report');
  });

  app.get ('/reports/stats', function (req, res) {
    res.redirect (normalizeURL (req.url, app.pmm.match ().matchdef ().getMatchTypePMM ()));
  });

  app.get ('/reports/stats/:matchtype', function (req, res) {
    commonCode (req, res, app, 'PMM - Statistics Report');
  });

  app.get ('/reports/waiver', function (req, res) {
    commonCode (req, res, app, 'PMM - Waiver');
  });
};
