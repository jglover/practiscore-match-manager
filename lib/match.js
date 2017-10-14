'use strict';

var _ = require ('lodash');
var assert = require ('assert');
var async = require ('async');
var pmelog = require ('./pmelog');
var psutils = require ('./utils');
// var m_idpa = require ('./matchtypes/idpa');
// var m_proam = require ('./matchtypes/proam');
var m_steelchallenge = require ('./matchtypes/sc');
var m_timeplus = require ('./matchtypes/tp');
// var m_timeplus_pnts = require ('./matchtypes/tpp');
var m_uspsa = require ('./matchtypes/uspsa');

//
//  Same names that PractiScore uses
//
var matchTypeMap = {
//  'idpa':       m_idpa,
//  'proam':      m_proam,
  'sc':         m_steelchallenge,
  'timeplus':   m_timeplus,
//  'timeplus_p': m_timeplus_pnts,
  'uspsa_p':    m_uspsa,
};

//
//
//
function ConversionError () {
  var tmp = Error.apply (this, arguments);
  tmp.name = this.name = 'ConversionError';

  this.stack = tmp.stack;
  this.message = tmp.message;

  return this;
}

var IntermediateInheritor = function () {};
IntermediateInheritor.prototype = Error.prototype;
ConversionError.prototype = new IntermediateInheritor ();

//
//  http://tonylukasavage.com/blog/2014/09/24/optional-callbacks-for-flexible-apis-in-javascript/
//
function maybeCallback (callback) {
  if (!_.isFunction (callback))
    throw new ConversionError ('WTF?');
  return _.isFunction (callback) ? callback : function (err) { throw err; };
}

//
//
//
var Match = function (accessorFunctions, options, callback) {
  var self = this;

  callback = maybeCallback (arguments [arguments.length - 1]);

  if (!options || _.isFunction (options))
    options = {};

  options.matchType = options.matchType || 'uspsa_p';

  assert.equal (typeof (accessorFunctions), 'object', 'argument \'accessorFunctions\' must be an object');
  assert.equal (typeof (options), 'object', 'argument \'options\' must be an object');
  assert.equal (typeof (callback), 'function', 'argument \'callback\' must be a function');

  if (!matchTypeMap [options.matchType])
    callback (new Error ('Unsupported match type \'' + options.matchType + '\''));
  else {
    self._accessorFunctions = accessorFunctions;

    async.series ([
      function (callback) {
        new matchTypeMap [options.matchType].Matchdef (accessorFunctions, options, function (err, newObject) {
          self._matchdef = newObject;
          callback (err);
        });
      },
      function (callback) {
        new matchTypeMap [options.matchType].MatchScores (options, self._matchdef.getID (), function (err, newObject) {
          self._scores = newObject;
          callback (err);
        });
      },
      function (callback) {
        new matchTypeMap [options.matchType].MatchLog (accessorFunctions, options, function (err, newObject) {
          self._logs = newObject;
          callback (err);
        });
      },
      function (callback) {
        new matchTypeMap [options.matchType].Lookups (accessorFunctions, options, function (err, newObject) {
          self._lookups = newObject;
          callback (err);
        });
      },
    ], function (err) {
        callback (err, self);
    });
  }

  return self;
};

Match.prototype.className = function () {
  return 'Match';
};
Match.prototype.updateConfig = function () {
  return this;
};
Match.prototype.setAccessorFunctions = function (accessorFunctions) {
  this._accessorFunctions = accessorFunctions;
  this._logs.setAccessorFunctions (accessorFunctions);
};
Match.prototype.create = function (options, callback) {
  var self = this;

  callback = maybeCallback (arguments [arguments.length - 1]);

  if (!options || _.isFunction (options))
    options = {};

  assert.equal (typeof (options), 'object', 'argument \'options\' must be an object');
  assert.equal (typeof (callback), 'function', 'argument \'callback\' must be a function');

  new Match (self._accessorFunctions, {matchType: options.matchtype || null}, function (err, newMatch) {
    if (err)
      pmelog.llog (pmelog.ERROR, err);
    else
      self._accessorFunctions.replaceMatch (newMatch);

    callback (err, newMatch);
  });

  return self;
};
Match.prototype.matchdef = function () {
  return this._matchdef;
};
Match.prototype.scores = function () {
  return this._scores;
};
Match.prototype.logs = function () {
  return this._logs;
};
Match.prototype.lookups = function () {
  return this._lookups;
};
Match.prototype.merge = function (segments, options, callback) {
  var self = this;

  callback = maybeCallback (arguments [arguments.length - 1]);

  if (!options || _.isFunction (options))
    options = {};

  assert.equal (typeof (segments), 'object', 'argument \'segments\' must be an object');
  assert.equal (typeof (options), 'object', 'argument \'options\' must be an object');
  assert.equal (typeof (callback), 'function', 'argument \'callback\' must be a function');

  new Match (self._accessorFunctions, {matchType: segments.matchdef.match_type}, function (err, newMatch) {
    var changes = [];

    if (!err) {
      try {
        newMatch.parse (segments);

        options = _.merge (options || {}, {match: self, newMatch: newMatch});

        self.matchdef ().merge (newMatch.matchdef (), options, function (err, matchChanges) {
          changes = changes.concat (matchChanges);

          if (!err) {
            options = _.merge (options, {matchdef: self.matchdef ()});

            self.scores ().merge (newMatch.scores (), options, function (err, scoresChanges) {
              changes = changes.concat (scoresChanges);
              callback (err, changes);
            });
          } else
            callback (err, changes);

          self.logs ().merge (self.matchdef ().getID (), segments.logs);
        });
       } catch (e) {
         pmelog.llog (pmelog.ERROR, 'Parse to newMatch failed');
         pmelog.ldirex (pmelog.ERROR, e);

         callback (e);
       }
    } else
      callback (err);
  });

  return self;
};
Match.prototype.parse = function (jsonMatch) {
  var self = this;

  assert.equal (typeof (jsonMatch), 'object', 'argument \'jsonMatch\' must be an object');
  assert.equal (typeof (jsonMatch.matchdef), 'object', 'argument \'jsonMatch.matchdef\' must be an object');

  jsonMatch.scores = jsonMatch.scores || {};
  jsonMatch.scores.match_id = jsonMatch.scores.match_id || jsonMatch.matchdef.match_id;

  self.matchdef ().parse (jsonMatch.matchdef);
  self.scores ().parse (jsonMatch.scores);
  self.fixup ();

  return self;
};

//
//  update does a merge, only first we need to first check if any fields have
//  changed, and update the match_modified timestamp. FIXME: Does not currently
//  handle anything except matchdef items
//
Match.prototype.update = function (jsonMatch, options, callback) {
  var self = this;

  callback = maybeCallback (arguments [arguments.length - 1]);

  if (!options || _.isFunction (options))
    options = {};

  assert.equal (typeof (jsonMatch), 'object', 'argument \'jsonMatch\' must be an object');
  assert.equal (typeof (jsonMatch.matchdef), 'object', 'argument \'jsonMatch.matchdef\' must be an object');
  assert.equal (typeof (options), 'object', 'argument \'options\' must be an object');
  assert.equal (typeof (callback), 'function', 'argument \'callback\' must be a function');

  self.matchdef ().compare (jsonMatch.matchdef, options, function (modified) {
    if (modified) {
      jsonMatch.matchdef.match_modifieddate = psutils.timeStampUTC ();
      self.merge (jsonMatch, _.merge (options, {onlyIfRightParsed: true}), function (err, changes) {
        if (!err)
          self.fixup ();
        callback (err, changes);
      });
    } else
      callback (null);
  });

  return self;
};
Match.prototype.parseToNew = function (segments, options, callback) {
  var self = this;

  callback = maybeCallback (arguments [arguments.length - 1]);

  if (!options || _.isFunction (options))
    options = {};

  assert.equal (typeof (segments), 'object', 'argument \'segments\' must be an object');
  assert.equal (typeof (segments.matchdef), 'object', 'argument \'segments.matchdef\' must be an object');
  assert.equal (typeof (options), 'object', 'argument \'options\' must be an object');
  assert.equal (typeof (callback), 'function', 'argument \'callback\' must be a function');

  if (_.isEmpty (segments.scores))
    segments.scores = segments.scores || {};
  if (_.isUndefined (segments.scores.match_id))
    segments.scores.match_id = segments.matchdef.match_id;

  new Match (self._accessorFunctions, {matchType: segments.matchdef.match_type || null}, function (err, newMatch) {
    if (!err) {
      newMatch.matchdef ().parse (segments.matchdef, options);
      newMatch.scores ().parse (segments.scores || {}, options);
      newMatch.fixup (options);

      //
      //  If this is different from the match in memory, any logs will be written
      //  with the UUID of the new match. If it's the UUID of an existing match
      //  (such as when we load from a file or database), any existing logs will be
      //  replaced. Basically, logs are never lost unless the pme.sql file is
      //  deleted.
      //
      if (segments.logs && Buffer.isBuffer (segments.logs))
        newMatch.logs ().merge (newMatch.matchdef ().getID (), segments.logs);
    }

    callback (err, newMatch);
  });

  return self;
};
Match.prototype.vars = function () {
  return {};
};
Match.prototype.getInfo = function () {
  return {
    id:         this.matchdef ().getID (),
    name:       this.matchdef ().getName (),
    modified:   this.matchdef ().getModifiedDate (),
    created:    this.matchdef ().getCreationDate (),
  };
};
Match.prototype.getPendingChanges = function () {
  return this.matchdef ().getPendingChanges () || this.scores ().getPendingChanges ();
};
Match.prototype.setPendingChanges = function (state) {
  this.matchdef ().setPendingChanges (state);
  this.scores ().setPendingChanges (state);
};
Match.prototype.getNewestTimestamp = function () {
  var tsMatch = this.matchdef ().getNewestTimestamp ();
  var tsScores = this.scores ().getNewestTimestamp ();

  pmelog.llog (pmelog.DEBUG, 'Newest matchdef timestamp is %s', tsMatch);

  if (!_.isNull (tsScores))
    pmelog.llog (pmelog.DEBUG, 'Newest scores timestamp is %s', tsScores);

  return (_.isNull (tsScores) || (tsMatch > tsScores)) ? tsMatch : tsScores;
};
Match.prototype.fixup = function (options) {
  var self = this;

  self.matchdef ().fixup (this, options);
  self.scores ().fixup (this, options);
  self.getNewestTimestamp ();

  return self;
};

//
//
//
exports.Match = Match;
