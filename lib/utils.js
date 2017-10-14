'use strict';

var _ = require ('lodash');
var moment = require ('moment');
var uuid = require ('node-uuid');
var fs = require ('fs');
var path = require ('path');

//
//
//
String.prototype.toUUIDCase = function () {
  return this; // .toString (); // .toLowerCase ();
};
String.prototype.toUIDCase = function () {
  return this; // .toString (); // .toLowerCase ();
};
String.prototype.toUDIDCase = function () {
  return this; // .toString ().toUpperCase ();
};

//
//  The key is the PractiScore match name in match.match_type. We map it to a
//  long name for display, and a short name for URLs
//
var matchTypeNamesHash = [
  { ps: '3gnpro',         pmm: '3gp',   name: '3-Gun Pro Series',    },
  { ps: 'idpa',           pmm: 'idpa',  name: 'IDPA',                },
  { ps: 'gadpa',          pmm: 'gadpa', name: 'GADPA',               },
  { ps: 'precisionrifle', pmm: 'pr',    name: 'Precision Rifle',     },
  { ps: 'proam',          pmm: 'proam', name: 'ProAm',               },
  { ps: 'sc',             pmm: 'sc',    name: 'Steel Challenge',     },
  { ps: 'timeplus',       pmm: 'tp',    name: 'Time Plus',           },
  { ps: 'timeplus_c',     pmm: 'tpc',   name: 'Time Plus Custom',    },
  { ps: 'timeplus_p',     pmm: 'tpp',   name: 'Time Plus w/ Points', },
  { ps: 'uspsa_p',        pmm: 'uspsa', name: 'USPSA Pistol',        },
];

var matchTypeNames = function () {
  return matchTypeNamesHash;
};

var matchTypeToName = function (matchType) {
  return _.result (_.find (matchTypeNamesHash, {'ps': matchType}), 'name') || '(Unknown)';
};
var matchTypeToPMM = function (matchType) {
  return _.result (_.find (matchTypeNamesHash, {'ps': matchType}), 'pmm') || '(Unknown)';
};

//
//
//
var timeStampUTC = function (ms) {
  return ms ? moment.utc (ms).format ('YYYY-MM-DD HH:mm:ss.SSS') : moment.utc ().format ('YYYY-MM-DD HH:mm:ss.SSS');
};
var timeStampLocal = function (ms) {
  return ms ? moment (ms).format ('YYYY-MM-DD HH:mm:ss.SSS') : moment ().format ('YYYY-MM-DD HH:mm:ss.SSS');
};
var timeStampFutureLocal = function (ms) {
  return moment ().add ((ms || 0), 'ms').format ('YYYY-MM-DD HH:mm:ss.SSS');
};
//var timeStampFutureUTC = function (ms) {
//  return moment.utc ().add ((ms || 0), 'ms').format ('YYYY-MM-DD HH:mm:ss.SSS');
//};
//var mdateLocal = function (ms) {
//  return ms ? moment (ms).format ('YYYY-MM-DD') : moment ().format ('YYYY-MM-DD');
//};
//var mtimeLocal = function (ms) {
//  return ms ? moment (ms).format ('HH:mm:ss') : moment ().format ('HH:mm:ss');
//};

//
//  Old Tempus versions
//
//var timeStampUTC = function (ms) {
//  return new Tempus (ms || Tempus.now ()).toggleUTC (true).toString ('%Y-%m-%d %H:%M:%S.%L');
//};
//var timeStampLocal = function (ms) {
//  return new Tempus (ms || Tempus.now ()).toggleUTC (false).toString ('%Y-%m-%d %H:%M:%S.%L');
//};
//var timeStampFutureLocal = function (ms) {
//  return new Tempus ((ms || 0) + Tempus.now ()).toggleUTC (false).toString ('%Y-%m-%d %H:%M:%S.%L');
//};
//var timeStampFutureUTC = function (ms) {
//  return new Tempus ((ms || 0) + Tempus.now ()).toggleUTC (true).toString ('%Y-%m-%d %H:%M:%S.%L');
//};
// var dateLocal = function (ms) {
//   return new Tempus (ms || Tempus.now ()).toggleUTC (false).toString ('%Y-%m-%d');
// };
// var timeLocal = function (ms) {
//   return new Tempus (ms || Tempus.now ()).toggleUTC (false).toString ('%H:%M:%D');
// };

var generateUUID = function () {
  return uuid.v4 ().toLowerCase ();
};

//
//
//
var findFiles = function (directoryName, pattern, callback) {
  var fileList = [];

  directoryName = directoryName || './';
  pattern = pattern || /./;

  function recurseDirectories (dirName) {
    fs.readdirSync (dirName).forEach (function (file) {
      var fullName = path.join (dirName, file);
      var stat = fs.lstatSync (fullName);

      if (stat.isDirectory ())
        recurseDirectories (fullName);
      else if (file.match (pattern))
        fileList.push (fullName);
    });
  }

  recurseDirectories (directoryName);

  if (callback)
    callback (null, fileList);

  return fileList;
};

//
//  Removes all trailing /'s from a path (no 'http://foo.com//')
//
var pathStrip = function (path) {
  return path.replace (/\/+$/, '');
};

//
//
//
var toType = function (obj) {
  return ({}).toString.call (obj).match (/\s([a-zA-Z]+)/)[1].toLowerCase ();
};

//
//
//
exports.matchTypeNames = matchTypeNames;
exports.matchTypeToName = matchTypeToName;
exports.matchTypeToPMM = matchTypeToPMM;
exports.timeStampUTC = timeStampUTC;
exports.timeStampLocal = timeStampLocal;
exports.timeStampFutureLocal = timeStampFutureLocal;
// exports.timeStampFutureUTC = timeStampFutureUTC;
// exports.dateLocal = dateLocal;
// exports.timeLocal = timeLocal;
exports.generateUUID = generateUUID;
exports.findFiles = findFiles;
exports.pathStrip = pathStrip;
exports.toType = toType;
