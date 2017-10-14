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

  app.get ('/edit', function (req, res) {
    commonCode (req, res, app, 'PMM - Match Functions');
  });

  app.get ('/edit/bonuses', function (req, res) {
    commonCode (req, res, app, 'PMM - View/Edit Bonuses');
  });

  app.get ('/edit/categories', function (req, res) {
    commonCode (req, res, app, 'PMM - View/Edit Categories');
  });

  app.get ('/edit/classes', function (req, res) {
    commonCode (req, res, app, 'PMM - View/Edit Classes');
  });

  app.get ('/edit/competitors', function (req, res) {
    res.redirect (normalizeURL (req.url, app.pmm.match ().matchdef ().getMatchTypePMM ()));
  });

  app.get ('/edit/competitors/:matchtype', function (req, res) {
    commonCode (req, res, app, 'PMM - View/Edit Competitors');
  });

  app.get ('/edit/divisions', function (req, res) {
    commonCode (req, res, app, 'PMM - View/Edit Divisions');
  });

  app.get ('/edit/history', function (req, res) {
    res.redirect (normalizeURL (req.url, app.pmm.match ().matchdef ().getMatchTypePMM ()));
  });

  app.get ('/edit/history/:matchtype', function (req, res) {
    commonCode (req, res, app, 'PMM - View History');
  });

  app.get ('/edit/logs', function (req, res) {
    res.redirect (normalizeURL (req.url, app.pmm.match ().matchdef ().getMatchTypePMM ()));
  });

  app.get ('/edit/logs/:matchtype', function (req, res) {
    commonCode (req, res, app, 'PMM - View Logs');
  });

  app.get ('/edit/match', function (req, res) {
    commonCode (req, res, app, 'PMM - View/Edit Match');
  });

  app.get ('/edit/penalties', function (req, res) {
    commonCode (req, res, app, 'PMM - View/Edit Penalties');
  });

  app.get ('/edit/scores', function (req, res) {
    res.redirect (normalizeURL (req.url, app.pmm.match ().matchdef ().getMatchTypePMM ()));
  });

  app.get ('/edit/scores/:matchtype', function (req, res) {
    commonCode (req, res, app, 'PMM - View/Edit Scores');
  });

  app.get ('/edit/scores2', function (req, res) {
    res.redirect (normalizeURL (req.url, app.pmm.match ().matchdef ().getMatchTypePMM ()));
  });

  app.get ('/edit/scores2/:matchtype', function (req, res) {
    commonCode (req, res, app, 'PMM - View/Edit Scores (Test)');
  });

  app.get ('/edit/squads', function (req, res) {
    res.redirect (normalizeURL (req.url, app.pmm.match ().matchdef ().getMatchTypePMM ()));
  });

  app.get ('/edit/squads/:matchtype', function (req, res) {
    commonCode (req, res, app, 'PMM - Manage Squads');
  });

  app.get ('/edit/stages', function (req, res) {
    res.redirect (normalizeURL (req.url, app.pmm.match ().matchdef ().getMatchTypePMM ()));
  });

  app.get ('/edit/stages/:matchtype', function (req, res) {
    commonCode (req, res, app, 'PMM - View/Edit Stages');
  });
};
