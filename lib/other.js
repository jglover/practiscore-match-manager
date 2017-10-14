'use strict';

var _ = require ('lodash');
var pmelog = require ('./pmelog');
var psutils = require ('./utils');

//
//
//
var isArrayOfNumbers = function (val) {
  return _.every (val, function (e) {return _.isNumber (e) && !_.isNaN (e);});
};

var isArrayOfArrays = function (val) {
  if (!_.isArray (val))
    return false;

  return _.every (val, function (e) {return _.isArray (e);});
};

//
//  Check the JSON for unknown or missing required keywords and types. Start by
//  looking in the stage_targets array of the match_stages array in the match
//  definition, and work up. The check the match_shooters array in the match
//  definition.
//
//  Not having any match_stages or match_shooters is not an error, but if they
//  exist, the contents should be checked.
//
var staticValidJSON = {
  'match_def': {
    'match_approvescores'          : {type: 'boolean', requiredFor: []},
    'match_bonuses'                : {type: 'object',  requiredFor: []},
    'match_cats'                   : {type: 'object',  requiredFor: []},
    'match_cls'                    : {type: 'object',  requiredFor: []},
    'match_clubcode'               : {type: 'string',  requiredFor: []},
    'match_clubname'               : {type: 'string',  requiredFor: []},
    'match_creationdate'           : {type: 'string',  requiredFor: ['all']},
    'match_ctgs'                   : {type: 'object',  requiredFor: []},
    'match_date'                   : {type: 'string',  requiredFor: ['all']},
    'match_id'                     : {type: 'string',  requiredFor: ['all']},
    'match_level'                  : {type: 'string',  requiredFor: []},
    'match_logenabled'             : {type: 'boolean', requiredFor: []},
    'match_logtoken'               : {type: 'string',  requiredFor: []},
    'match_matchpw'                : {type: 'string',  requiredFor: []},
    'match_modifieddate'           : {type: 'string',  requiredFor: ['all']},
    'match_name'                   : {type: 'string',  requiredFor: ['all']},
    'match_owner'                  : {type: 'boolean', requiredFor: []},
    'match_penalties'              : {type: 'object',  requiredFor: []},
    'match_readonly'               : {type: 'boolean', requiredFor: []},
    'match_secure'                 : {type: 'boolean', requiredFor: []},
    'match_shooters'               : {type: 'object',  requiredFor: []},
    'match_stages'                 : {type: 'object',  requiredFor: []},
    'match_type'                   : {type: 'string',  requiredFor: ['all']},
    'match_unsentlogswarningcount' : {type: 'number',  requiredFor: []},
    'match_useOpenSquadding'       : {type: 'boolean', requiredFor: []},
    'app_version'                  : {type: 'string',  requiredFor: []},
    'device_model'                 : {type: 'string',  requiredFor: []},
    'os_version'                   : {type: 'string',  requiredFor: []},
    // iOS specific
    'version'                      : {type: 'string',  requiredFor: []},
    // Android specific
    'device_arch'                  : {type: 'string',  requiredFor: []},
    'match_subtype'                : {type: 'string',  requiredFor: []},
    // PMM
    '_fieldParsed'                 : {type: 'object',  requiredFor: []},
    '_pendingChanges'              : {type: 'boolean', requiredFor: []},
    '_exit'                        : function (hash, object) {hash.match_type = object.match_type;},
  },
  'match_shooters': {
    'mod_dl'                       : {type: 'string',  requiredFor: ['all']},
    'mod_dq'                       : {type: 'string',  requiredFor: ['uspsa']},
    'mod_dv'                       : {type: 'string',  requiredFor: ['uspsa']},
    'mod_pf'                       : {type: 'string',  requiredFor: ['uspsa']},
    'mod_pr'                       : {type: 'string',  requiredFor: ['all']},
    'mod_sq'                       : {type: 'string',  requiredFor: ['all']},
    'sh_age'                       : {type: 'string',  requiredFor: ['uspsa']},
    'sh_cc'                        : {type: 'string',  requiredFor: ['all']},
    'sh_ctgs'                      : {type: 'object',  requiredFor: ['all']},
    'sh_del'                       : {type: 'boolean', requiredFor: ['all']},
    'sh_dq'                        : {type: 'boolean', requiredFor: ['uspsa']},
    'sh_dqrule'                    : {type: 'string',  requiredFor: []},
    'sh_dvp'                       : {type: 'string',  requiredFor: ['uspsa']},
    'sh_eml'                       : {type: 'string',  requiredFor: ['all']},
    'sh_fn'                        : {type: 'string',  requiredFor: ['all']},
    'sh_frn'                       : {type: 'boolean', requiredFor: ['uspsa']},
    'sh_gen'                       : {type: 'string',  requiredFor: ['all']},
    'sh_grd'                       : {type: 'string',  requiredFor: ['uspsa']},
    'sh_here'                      : {type: 'boolean', requiredFor: ['all']},
    'sh_id'                        : {type: 'string',  requiredFor: ['all']},
    'sh_law'                       : {type: 'boolean', requiredFor: ['uspsa']},
    'sh_lge'                       : {type: 'boolean', requiredFor: ['all']},
    'sh_lgp'                       : {type: 'boolean', requiredFor: ['all']},
    'sh_ln'                        : {type: 'string',  requiredFor: ['all']},
    'sh_mil'                       : {type: 'boolean', requiredFor: ['uspsa']},
    'sh_mod'                       : {type: 'string',  requiredFor: ['all']},
    'sh_num'                       : {type: 'number',  requiredFor: ['all']},
    'sh_paid'                      : {type: 'boolean', requiredFor: ['all']},
    'sh_pf'                        : {type: 'string',  requiredFor: ['uspsa']},
    'sh_ph'                        : {type: 'string',  requiredFor: ['all']},
    'sh_seed'                      : {type: 'number',  requiredFor: []},
    'sh_staff'                     : {type: 'boolean', requiredFor: ['all']},
    'sh_sqd'                       : {type: 'number',  requiredFor: ['all']},
    'sh_team'                      : {type: 'string',  requiredFor: []},
    'sh_st'                        : {type: 'string',  requiredFor: ['all']},
    'sh_uid'                       : {type: 'string',  requiredFor: ['all']},
    'sh_uuid'                      : {type: 'string',  requiredFor: ['all']},
    'sh_wlk'                       : {type: 'boolean', requiredFor: ['uspsa']},
    // Android specific
    'sh_random'                    : {type: 'number',  requiredFor: []},
    // PMM
    'sh_addr1'                     : {type: 'string',  requiredFor: ['all']},
    'sh_addr2'                     : {type: 'string',  requiredFor: ['all']},
    'sh_area'                      : {type: 'number',  requiredFor: ['uspsa']},
    'sh_city'                      : {type: 'string',  requiredFor: ['all']},
    'sh_pos'                       : {type: 'number',  requiredFor: []},
    'sh_zipcode'                   : {type: 'string',  requiredFor: ['all']},
    '_fieldParsed'                 : {type: 'object',  requiredFor: []},
    '_pendingChanges'              : {type: 'boolean', requiredFor: []},
  },
  'match_stages': {
    'stage_classictargets'         : {type: 'boolean', requiredFor: ['uspsa']},
    'stage_classifiercode'         : {type: 'string',  requiredFor: ['uspsa']},
    'stage_classifier'             : {type: 'boolean', requiredFor: ['uspsa']},
    'stage_doesntRequireTime'      : {type: 'boolean', requiredFor: ['pr']},
    'stage_maxstringtime'          : {type: 'number',  requiredFor: []},
    'stage_modifieddate'           : {type: 'string',  requiredFor: ['all']},
    'stage_name'                   : {type: 'string',  requiredFor: ['all']},
    'stage_noshoots'               : {type: 'boolean', requiredFor: ['uspsa']},
    'stage_number'                 : {type: 'number',  requiredFor: ['all']},
    'stage_numtargs'               : {type: 'number',  requiredFor: []},
    'stage_poppers'                : {type: 'number',  requiredFor: ['uspsa']},
    'stage_removeworststring'      : {type: 'boolean', requiredFor: ['pr']},
    'stage_scoretype'              : {type: 'string',  requiredFor: ['proam','uspsa']},
    'stage_strings'                : {type: 'number',  requiredFor: ['uspsa']},
    'stage_targets'                : {type: 'object',  requiredFor: []},
    'stage_tppoints'               : {type: 'number',  requiredFor: []},
    'stage_uuid'                   : {type: 'string',  requiredFor: ['all']},
    // PMM
    'stage_points'                 : {type: 'number',  requiredFor: ['uspsa']},
    '_fieldParsed'                 : {type: 'object',  requiredFor: []},
    '_pendingChanges'              : {type: 'boolean', requiredFor: []},
    '_exit'                        : function (hash, object) {hash [object.stage_uuid] = (object.stage_scoretype || '');},
  },
  'stage_targets': {
    'target_deleted'               : {type: 'boolean', requiredFor: ['all']},
    'target_maxnpms'               : {type: 'number',  requiredFor: ['uspsa']},
    'target_number'                : {type: 'number',  requiredFor: ['all']},
    'target_precval'               : {type: 'number',  requiredFor: ['pr']},
    'target_reqshots'              : {type: 'number',  requiredFor: ['all']},
    // PMM
    '_fieldParsed'                 : {type: 'object',  requiredFor: []},
    '_pendingChanges'              : {type: 'boolean', requiredFor: []},
  },
  'match_scores_def': {
    'match_id'                     : {type: 'string',  requiredFor: ['all']},
    'match_scores'                 : {type: 'object',  requiredFor: []},
    'match_scores_history'         : {type: 'object',  requiredFor: []},
    // PMM
    '_fieldParsed'                 : {type: 'object',  requiredFor: []},
    '_pendingChanges'              : {type: 'boolean', requiredFor: []},
  },
  'match_scores': {
    'stage_number'                 : {type: 'number',  requiredFor: ['all']},
    'stage_stagescores'            : {type: 'object',  requiredFor: ['all']},
    'stage_uuid'                   : {type: 'string',  requiredFor: ['all']},
    // PMM
    '_fieldParsed'                 : {type: 'object',  requiredFor: []},
    '_pendingChanges'              : {type: 'boolean', requiredFor: []},
    '_exit'                        : function (hash, object) {hash.thisStageID = object.stage_uuid;},
  },
  'stage_stagescores': {
    'aprv'                         : {type: 'boolean', requiredFor: []},
    'ap'                           : {type: 'number',  requiredFor: []},
    'apen'                         : {type: 'number',  requiredFor: []},
    'bons'                         : {type: 'object',  requiredFor: []},
    'bonss'                        : {type: 'object',  requiredFor: ['proam','tpc']},
    'dname'                        : {type: 'string',  requiredFor: []},
    'dnf'                          : {type: 'boolean', requiredFor: ['uspsa']},
    'dqr'                          : {type: 'string',  requiredFor: []},
    'mod'                          : {type: 'string',  requiredFor: ['all']},
    'ots'                          : {type: 'number',  requiredFor: []},
    'penr'                         : {type: 'string',  requiredFor: []},
    'pens'                         : {type: 'object',  requiredFor: []},
    'penss'                        : {type: 'object',  requiredFor: ['proam','tpc']},
    'poph'                         : {type: 'number',  requiredFor: ['all']},
    'popm'                         : {type: 'number',  requiredFor: ['all']},
    'proc'                         : {type: 'number',  requiredFor: []},
    'shtr'                         : {type: 'string',  requiredFor: ['all']},
    'str'                          : {type: 'object',  requiredFor: ['uspsa'], special: function (val) {return isArrayOfNumbers (val);}},
    'tpts'                         : {type: 'object',  requiredFor: ['idpa'],  special: function (val) {return isArrayOfNumbers (val);}},
    'ts'                           : {type: 'object',  requiredFor: ['uspsa'], special: function (val, sv) {
                                                                                          var validateFunctions = {
                                                                                            ProAm:   isArrayOfArrays,
                                                                                            default: isArrayOfNumbers,
                                                                                          };

                                                                                          var stageType = sv [sv.thisStageID];

                                                                                          if (validateFunctions [stageType])
                                                                                            return validateFunctions [stageType].call (this, val);
                                                                                          else if (validateFunctions.default)
                                                                                            return validateFunctions.default.call (this, val);

                                                                                          pmelog.llog (pmelog.ERROR, "Missing check for stage type '%s' for 'ts', with object type %s", stageType, psutils.toType (val));
                                                                                          return false;
                                                                                        }},
    'udid'                         : {type: 'string',  requiredFor: []},
    // PMM
    '_fieldParsed'                 : {type: 'object',  requiredFor: []},
    '_pendingChanges'              : {type: 'boolean', requiredFor: []},
  },
};

var Other = function (accessorFunctions, options, callback) {
  var self = this;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  self._accessorFunctions = accessorFunctions;

  if (callback)
    callback (null, self);

  return self;
};

Other.prototype.className = function () {
  return 'Other';
};
Other.prototype.updateConfig = function () {
  return this;
};
Other.prototype.jsonCheck = function (callback) {
  var self = this;
  var results = [];
  var matchdef = self._accessorFunctions.getMatchdef ();
  var scores = self._accessorFunctions.getScores ();
  var hash = {};

  var testSection = function (description, validJSON, testJSON) {
    var err = false;

    _.each (validJSON, function (v) {
      v.found = false;
    });

    _.each (_.keys (testJSON), function (k) {
      if (!validJSON [k])
        results.push (description + k + ' is an unrecognized element');
      else {
        validJSON [k].found = true;

        if (typeof testJSON [k] !== validJSON [k].type)
          results.push (description + k + ' has incorrect type (' + typeof testJSON [k] + ')');
        else if (validJSON [k].special) {
          if (!validJSON [k].special.call (self, testJSON [k], hash, testJSON)) {
            results.push (description + k + ' has incorrect type (' + typeof testJSON [k] + ')');
          }
        }
      }
    });

    if (validJSON._exit)
      validJSON._exit (hash, testJSON);

    _.each (validJSON, function (v, k) {
      if ((k !== '_exit') && !v.found && v.requiredFor.length && _.intersection (v.requiredFor, [hash.match_type || 'all']).length) {
        results.push (description + ' is missing required ' + v.type + ' element \'' + k + '\'');
        err = true;
      }
    });

    return err;
  };

  if (!_.keys (matchdef).length)
    results.push ('No match definition present');
  else {
    testSection ('match_def.', staticValidJSON.match_def, matchdef);

    if (!matchdef.match_shooters || !matchdef.match_shooters.length)
      results.push ('No shooters defined');
    else {
      _.each (matchdef.match_shooters, function (s, k) {
        testSection ('match_def.match_shooters [' + k + '].', staticValidJSON.match_shooters, s);
      });
    }

    if (!matchdef.match_stages || !matchdef.match_stages.length)
      results.push ('No stages defined');
    else {
      _.each (matchdef.match_stages, function (s, sk) {
        testSection ('match_def.match_stages [' + sk + '].', staticValidJSON.match_stages, s);

        _.each (s.stage_targets, function (t, tk) {
          testSection ('match_def.match_stages.stage_targets [' + tk + '].', staticValidJSON.stage_targets, t);
        });
      });
    }
  }

  if (!_.keys (scores).length)
    results.push ('No scores present');
  else {
    testSection ('match_scores.', staticValidJSON.match_scores_def, scores);

    _.each (scores.match_scores, function (ms, mk) {
      testSection ('match_scores.match_scores [' + mk + '].', staticValidJSON.match_scores, ms);

      _.each (ms.stage_stagescores, function (ss, sk) {
        testSection ('match_scores.match_scores [' + mk + '].stage_stagescores [' + sk + '].', staticValidJSON.stage_stagescores, ss);
      });
    });
  }

  if (!_.isEmpty (results))
    results = _.uniq (results).join ("\n");

  if (callback)
    callback (_.isEmpty (results) ? false : true, results);

  return results;
};

//
//
//
exports.Other = Other;
