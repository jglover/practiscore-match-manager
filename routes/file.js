'use strict';

var urlNJS = require ('url');

function errorNotImplemented (res, err, app, html) {
  if (err) {
    res.render ('error/notimplemented', app.jadeGetVars ({title: 'PMM - Error!'}));
    console.dir (err);
  } else
    res.end (html);
}

function commonCode (req, res, app, title) {
  var pathname = urlNJS.parse (req.url).pathname.replace (/\/+$/, '');

  res.render (pathname.substr (1), app.jadeGetVars ({title: title, pathname: pathname}), function (err, html) {
    errorNotImplemented (res, err, app, html);
  });
}

module.exports = function (app) {
  app.get ('/file', function (req, res) {
    commonCode (req, res, app, 'PMM - Load/Create/Save Match');
  });

  app.get ('/file/create', function (req, res) {
    commonCode (req, res, app, 'PMM - Create New Match');
  });

  //
  //
  //
  app.get ('/file/db', function (req, res) {
    commonCode (req, res, app, 'PMM - Database Operations');
  });

  app.get ('/file/db/load', function (req, res) {
    commonCode (req, res, app, 'PMM - Load Match (DB)');
  });

  app.get ('/file/db/save', function (req, res) {
    commonCode (req, res, app, 'PMM - Save Match (DB)');
  });

  //
  //
  //
  app.get ('/file/file', function (req, res) {
    commonCode (req, res, app, 'PMM - File Operations');
  });

  app.get ('/file/file/load', function (req, res) {
    commonCode (req, res, app, 'PMM - Load Match (File)');
  });

  app.get ('/file/file/merge', function (req, res) {
    commonCode (req, res, app, 'PMM - Merge Fragment (File)');
  });

  app.get ('/file/file/combine', function (req, res) {
    commonCode (req, res, app, 'PMM - Combine Match (File)');
  });

  app.get ('/file/file/save', function (req, res) {
    commonCode (req, res, app, 'PMM - Save Match (File)');
  });

  //
  //
  //
  app.get ('/file/download', function (req, res) {
    commonCode (req, res, app, 'PMM - Download Matches');
  });

  app.get ('/file/download/cpc', function (req, res) {
    commonCode (req, res, app, 'PMM - Download From Clubs.PractiScore.Com');
  });

  app.get ('/file/download/ssu', function (req, res) {
    commonCode (req, res, app, 'PMM - Download From SquadSignup.com');
  });

  //
  //
  //
  app.get ('/file/imexport', function (req, res) {
    commonCode (req, res, app, 'PMM - Import/Export Files');
  });

  app.get ('/file/imexport/ezws', function (req, res) {
    commonCode (req, res, app, 'PMM - Import/Export EZWS');
  });

  app.get ('/file/imexport/ezws/export_combined', function (req, res) {
    commonCode (req, res, app, 'PMM - Export Combined EzWinScore');
  });

  app.get ('/file/imexport/ezws/import_db', function (req, res) {
    commonCode (req, res, app, 'PMM - Import EzWinScore Database');
  });

  app.get ('/file/imexport/ezws/export_db', function (req, res) {
    commonCode (req, res, app, 'PMM - Export EzWinScore Database');
  });

  app.get ('/file/imexport/ezws', function (req, res) {
    commonCode (req, res, app, 'PMM - Import/Export SSI');
  });

  app.get ('/file/imexport/ssi/import', function (req, res) {
    commonCode (req, res, app, 'PMM - Import SSI Match');
  });

  app.get ('/file/imexport/ssi/export', function (req, res) {
    commonCode (req, res, app, 'PMM - Export SSI Match');
  });
};
