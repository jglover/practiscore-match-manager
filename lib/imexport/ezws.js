'use strict';

var _ = require ('lodash');
var async = require ('async');
var Database = require ('odbc').Database;
var Winreg = require ('winreg');

//
//
//
function dbCommonQuery (db, tag, query, callback) {
  db.query (query, function (err, data) {
    if (err) {
      if (err.message === '[Sybase][ODBC Driver][Adaptive Server Anywhere]Triggers and procedures not supported in runtime server')
        return;
      return callback (new Error (err), tag);
    }

    return callback (null, data);
  });
}

function dbGetDbVersion (db, callback) {
  dbCommonQuery (db, 'db_version', 'SELECT * FROM db_version', callback);
}

function dbGetProgramVersion (db, callback) {
  dbCommonQuery (db, 'version', 'SELECT * FROM version', callback);
}

function dbGetMatch (db, callback) {
  dbCommonQuery (db, 'match', 'SELECT * FROM match_profile', callback);
}

function dbGetStages (db, callback) {
  dbCommonQuery (db, 'stages', 'SELECT * FROM "stage profiles" ORDER BY stage_no', callback);
}

function dbGetCompetitors (db, callback) {
  dbCommonQuery (db, 'competitors', 'SELECT * FROM competitors ORDER BY competitor_no', callback);
}

function readEZWS (matchCn, myCallback) {
  var db = new Database ();

  db.open (matchCn, function (err) {
    if (err)
      throw new Error (err);

    async.series (
      {
        db_version:  function (callback) { dbGetDbVersion (db, callback); },
        version:     function (callback) { dbGetProgramVersion (db, callback); },
        match:       function (callback) { dbGetMatch (db, callback); },
        stages:      function (callback) { dbGetStages (db, callback); },
        competitors: function (callback) { dbGetCompetitors (db, callback); },
      },
      function (err, psMatchData) {
        db.close ();
        myCallback (err, psMatchData);
    });
  });
}

//
//
//
function registryKeyTry (keyName, callback) {
  var regKey = new Winreg ({
        hive: Winreg.HKLM,
        key:  keyName,
      });

  regKey.values (function (err, items) {
    var registry = {};

    if (err)
      return callback (err);

    for (var i in items)
      registry [items [i].name] = items [i].value;

    callback (null, registry);
  });
}

function registryGetEzwsValues (myCallback) {
  async.waterfall ([
    function (callback) {
      registryKeyTry ('\\SOFTWARE\\ODBC\\ODBC.INI\\masternames', function (err, theKeys) {
        if (err && (err.toString () === 'Error: process exited with code 1'))
          err = null;
        callback (err, theKeys);
      });
    },
    function (firstKeys, callback) {
      if (_.isUndefined (firstKeys)) {
        registryKeyTry ('\\SOFTWARE\\WOW6432NODE\\ODBC\\ODBC.INI\\masternames', function (err, theKeys) {
          callback (err, theKeys);
        });
      } else
        callback (null, firstKeys);
    }
  ], function (err, result) {
    if (err && (err.toString () !== 'Error: process exited with code 1'))
      return myCallback (err);

    if (_.isUndefined (result)) {
      return myCallback ({
        error: '[ezwsImport] EzWinScore registry keys not found',
        message: 'Cannot locate the EzWinScore registry keys. Is EzWinScore installed?'
      });
    }

    var noerror = true;

    _.every (['Start', 'UID', 'PWD'], function (k) {
      if (!result [k]) {
        myCallback ({
          error: '[ezwsImport] EzWinScore registry keys ' + k + ' missing',
          message: 'Cannot locate the EzWinScore registry key \'' + k + '\'. Is EzWinScore installed?'
        });
        noerror = false;
      }
      return result [k];
    });

    if (noerror)
      myCallback (null, result);
  });
}

//
//
//
function convertEzwsToPS (ezwsMatchData, callback) {
  callback (null, ezwsMatchData);
}

//
//  Callback (err, psMatchData)
//
var ezwsImport = function (ezwsDatabaseName, myCallback) {
  if (_.isFunction (myCallback)) {
    throw ({
      error: '[ezwsImport] Invalid argument',
      message: 'If a myCallback is provided, it must be a function'
    });
  }

  if (process.platform !== 'win32') {
    return myCallback ({
      error: '[ezwsImport] Unsupported platform',
      message: 'ezwsImport is only supported on Win32 platforms.'
    });
  }

  //
  //
  //
  async.waterfall ([
    function (callback) {
      registryGetEzwsValues (function (err, ezwsKeys) {
        callback (err, ezwsKeys);
      });
    },
    function (ezwsKeys, callback) {
      var matchCn = '';

      matchCn += 'DRIVER={Adaptive Server Anywhere 9.0};';
      matchCn += 'START=' + ezwsKeys.Start + ';';
      matchCn += 'AutoStop=YES;';
      matchCn += 'UID=' + ezwsKeys.UID + ';';
      matchCn += 'PWD=' + ezwsKeys.PWD + ';';
      matchCn += 'DatabaseName=DBA;';
      matchCn += 'DatabaseFile=' + ezwsDatabaseName + ';';

      readEZWS (matchCn, function (err, ezwsMatchData) {
        callback (err, ezwsMatchData);
      });
    },
    function (ezwsMatchData, callback) {
      convertEzwsToPS (ezwsMatchData, function (err, psMatchData) {
        callback (err, psMatchData);
      });
    },
  ], function (err, psMatchData) {
     myCallback (err, psMatchData);
  });
};

//
//
//
exports.ezwsImport = ezwsImport;
