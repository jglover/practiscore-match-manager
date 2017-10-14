'use strict';

var pscDirectory = './matches';

var _ = require ('lodash');
var pmelog = require ('../lib/pmelog');
var practiscore = require ('../lib/practiscore');
var psutils = require ('../lib/psUtils');

//
//  Create the sqlite3 database by reading all the .psc files in the
//  match directory and writing them into the database.
//
var createSQLiteDatabase = function () {
  var psVars = {};
  var matchIDs = {};

  pmelog.llog (pmelog.NORMAL, 'Initializing database');
  practiscore.dbInit (psVars);

  psutils.findFiles (pscDirectory, /\.psc$/g, function (matchFiles) {
    _.each (matchFiles, function (mf) {
      practiscore.loadMatchFromPSC (mf, {noWarnFPI: true}, function (err, match) {
        if (typeof matchIDs [match.m.match_id] === 'undefined') {
          pmelog.llog (pmelog.NORMAL, 'Converting %s (%s)', mf, match.m.match_id);
          practiscore.dbMatchSave (match, function (err) {
            if (err)
              pmelog.llog (pmelog.ERROR, 'Error saving match: %s', err);
          });

          matchIDs [match.m.match_id] = mf;
        } else
          pmelog.llog (pmelog.ERROR, 'Match %s has the UUID as %s (%s). Not adding to database!', mf, matchIDs [match.m.match_id], match.m.match_id);
      });
    });

    pmelog.llog (pmelog.NORMAL, '%s matches converted', _.keys (matchIDs).length);
  });

  practiscore.dbClose ();
};

createSQLiteDatabase ();
