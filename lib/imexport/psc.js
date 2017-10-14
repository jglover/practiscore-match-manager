'use strict';

var _ = require ('lodash');
var fs = require ('fs');
var path = require ('path');
var Zip = require ('adm-zip');
var pmelog = require ('../pmelog');
var psutils = require ('../utils');

//
//
//
var pscImport = function (filename, options, callback) {
  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  var zf = new Zip (filename);
  var matchJSON = zf.readFile ('match_def.json');
  var scoresJSON = zf.readFile ('match_scores.json');

  if (callback)
    callback (null, {matchdef: JSON.parse (matchJSON), scores: JSON.parse (scoresJSON)});
};

var pscExport = function (filename, match, scores, callback) {
  var err;
  var zf = new Zip ();

  if (!filename)
    return;

  zf.addFile ('match_def.json', JSON.stringify (match));
  zf.addFile ('match_scores.json', JSON.stringify (scores));

  try {
    zf.writeZip (filename);
  } catch (e) {
    err = e;
  }

  if (callback)
    callback (err, filename, zf);
};

var pscDelete = function (pscFile, options, callback) {
  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  //
  //  FIXME: This needs to be sanitized to only delete files in the match
  //  directory. Which may present a problem... How do we prevent someone
  //  from changing into a system directory and deleting things?
  //
  fs.unlink (pscFile, function (err) {
    if (err)
      pmelog.llog (pmelog.ERROR, err.toString ());
    if (callback)
      callback (err ? err.toString () : err);
  });
};

var pscList = function (pscDirectory, options, callback) {
  var matchFiles = [];

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  psutils.findFiles (pscDirectory, /\.psc$/g, function (err, fileList) {
    if (err)
      throw (err);
    _.each (fileList, function (fullName) {
      try {
        var m = {};
        var zf = new Zip (fullName);
        var add = true;
        var match = JSON.parse (zf.readFile ('match_def.json'));

        m.match_uuid = match.match_id || '';
        m.match_name = match.match_name || fullName;
        m.match_date = match.match_date || '1970-01-01 00:00:00.000';
        m.match_type = match.match_type;
        m.match_discipline = psutils.matchTypeToName (match.match_type);
        m.match_modified = match.match_modifieddate || '1970-01-01 00:00:00.000';
        m.match_file = fullName;
        m.match_filename = path.basename (fullName);

        if (options.matchUUID && !_.isEqual (options.matchUUID.toUUIDCase (), m.match_uuid.toUUIDCase ()))
          add = false;
        if (options.matchType && !_.isEqual (options.matchType, m.match_type))
          add = false;
        if (add)
          matchFiles.push (m);
      } catch (e) {
        pmelog.llog (pmelog.ERROR, 'pscImport failed for file \'%s\'', fullName);
        pmelog.llog (pmelog.ERROR, e.message);
      }
    });
  });

  if (callback)
    callback (null, matchFiles);

  return matchFiles;
};

//
//
//
exports.pscImport = pscImport;
exports.pscExport = pscExport;
exports.pscDelete = pscDelete;
exports.pscList = pscList;
