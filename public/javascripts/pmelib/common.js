/* global _:false */

//
//  Common linrary for browser-side JavaScript
//
var pmelib = (function (my) {
  'use strict';

  //
  //  Parse any parameters on the URL string.
  //
  my.queryString = function () {
    var query_string = {};
    var query = window.location.search.substring (1);
    var vars = query.split ('&');

    for (var i = 0; i < vars.length; i++) {
      var pair = vars [i].split ('=');

      if (typeof query_string [pair [0]] === 'undefined')
        query_string [pair [0]] = pair [1];
      else if (typeof query_string [pair [0]] === 'string') {
        var arr = [ query_string [pair [0]], pair [1] ];
        query_string [pair [0]] = arr;
      } else
        query_string [pair [0]].push (pair [1]);
    }

    return query_string;
  };

  //
  //
  //
  my.removeDeletedShooters = function (matchData, options) {
    var deletedUIDs = {};
    var removeList = {sh_del: true};

    if (_.isObject (options))
      removeList = _.merge (removeList, options);

    _.each (removeList, function (removeValue, removeField) {
      _.each (_.filter (matchData.m.match_shooters, removeField, removeValue), function (shooter) {
        deletedUIDs [shooter.sh_uid] = 1;
      });
    });

    if (matchData.s && matchData.s.match_scores)
      _.eachRight (matchData.s.match_scores, function (stage) {
        _.remove (stage.stage_stagescores, function (score) {
          return deletedUIDs [score.shtr];
        });
      });

    _.remove (matchData.m.match_shooters, function (shooter) {
      return deletedUIDs [shooter.sh_uid];
    });
  };

  //
  //
  //
  my.removeDeletedStages = function (matchData) {
    _.each (_.pluck (_.filter (matchData.m.match_stages, 'stage_deleted', true), 'stage_uuid'), function (uuid) {
      _.remove (matchData.m.match_stages, 'stage_uuid', uuid);
      _.remove (matchData.s.match_scores, 'stage_uuid', uuid);
    });
  };

  //
  //  Create a sorted array of divisions that are active in this match.
  //
  my.getMatchDivisions = function (matchData) {
    return _.sortBy (_.uniq (_.map (matchData.m.match_shooters, function (s) {
      return s.sh_dvp;
    })));
  };

  my.getMatchDivisionsLong = function (matchData) {
    var divisionsList = {};

    _.each (_.uniq (_.map (matchData.m.match_shooters, function (s) {
      return s.sh_dvp;
    })), function (d) {
      divisionsList [d] = matchData.l.divisions [d] || d;
    });

    return divisionsList;
  };

  //
  //
  //
  my.createQuickFindList = function (matchData, callback) {
    var quickFind = {c: {}, shooters: {}, s: {}, stages: {}, S: {}, scores: {}};
    var match = matchData.m || {};
    var scores = matchData.s || {};

    _.each (match.match_shooters, function (c) {
      quickFind.c [c.sh_uid] = c;
      quickFind.shooters [c.sh_uid] = c;
    });

    _.each (match.match_stages, function (s) {
      quickFind.s [s.stage_uuid] = s;
      quickFind.stages [s.stage_uuid] = s;
    });

    //
    //  The match scores might be empty, or some of the stages may not have
    //  scores, so populate any missing entries with an empty array so they
    //  exist.
    //
    scores = scores || {};
    scores.match_id = scores.match_id || match.match_id;
    scores.match_scores = scores.match_scores || [];

    _.each (match.match_stages, function (s, stageIndex) {
      if (!scores.match_scores [stageIndex]) {
        scores.match_scores [stageIndex] = {};
        scores.match_scores [stageIndex].stage_number = stageIndex + 1;
        scores.match_scores [stageIndex].stage_uuid = match.match_stages [stageIndex].stage_uuid;
        scores.match_scores [stageIndex].stage_stagescores = [];
      }
    });

    //
    //  The S hash contains the shooters UID for each stage, which contains a
    //  hash that has an index of the stage, and an index of the score. With a
    //  shooter UID, we can quickly find the score for that shooter, and the
    //  stage index.
    //
    _.each (scores.match_scores, function (s, stageIndex) {
      quickFind.S [s.stage_uuid] = {};
      quickFind.scores [s.stage_uuid] = {};

      _.each (s.stage_stagescores, function (stageScore, stageScoreIndex) {
        quickFind.S [s.stage_uuid][stageScore.shtr] = {
          'stage': stageIndex,
          'score': stageScoreIndex
        };
        quickFind.scores [s.stage_uuid][stageScore.shtr] = {
          'stage': stageIndex,
          'score': stageScoreIndex
        };
      });
    });

    //
    //  Because each stage might not contain complete data (mid-match results,
    //  for example), we need to add any missing shooters, and set their time,
    //  hits, etc to 0. This will make sure that all shooters are shown in the
    //  stage results.
    //
    _.each (scores.match_scores, function (stage, stageIndex) {
      _.each (match.match_shooters, function (shooter) {
        if (!quickFind.scores [stage.stage_uuid][shooter.sh_uid]) {
          var empty = {
            'shtr': shooter.sh_uid,
            'div':  shooter.sh_dvp,
            'del':  shooter.sh_del,
            'dq':   shooter.sh_dq,
            'dnf':  false,
          };
          if (callback)
            callback (empty);
          scores.match_scores [stageIndex].stage_stagescores.push (empty);
          quickFind.scores [stage.stage_uuid][shooter.sh_uid] = {
            'stage': stageIndex,
            'score': scores.match_scores [stageIndex].stage_stagescores.length - 1,
          };
        }
      });
    });

    return quickFind;
  };

  //
  //
  //
  my.createGotoMap = function (matchData, matchDivisions) {
    var gotoMap = {};
    var stages = matchData.m.match_stages;

    gotoMap = {byStage: {}, byDivision: {}, review: {}};
    gotoMap.byDivision.combined = {overall: 's_s0_c0'};
    gotoMap.byStage.overall = {combined: 's_s0_c0'};

    _.each (stages, function (s, stageIndex) {
      gotoMap.review [stageIndex + 1] = 's_s' + (stageIndex + 1) + '_r0';
      gotoMap.byDivision.combined [stageIndex + 1] = 's_s' + (stageIndex + 1) + '_c0';
      gotoMap.byStage [stageIndex + 1] = gotoMap.byStage [stageIndex + 1] || {};
      gotoMap.byStage [stageIndex + 1].combined = 's_s' + (stageIndex + 1) + '_c0';
    });

    _.each (matchDivisions, function (d, divisionIndex) {
      gotoMap.byDivision [d] = gotoMap.byDivision [d] || {};
      gotoMap.byDivision [d].overall = 's_s0_d' + divisionIndex;

      _.each (stages, function (s, stageIndex) {
        gotoMap.byDivision [d][stageIndex + 1] = 's_s' + (stageIndex + 1) + '_d' + divisionIndex;
      });
    });

    _.each (stages, function (s, stageIndex) {
      gotoMap.byStage [stageIndex + 1].overall = 's_s' + (stageIndex + 1) + '_d0';

      _.each (matchDivisions, function (d, divisionIndex) {
        gotoMap.byStage [stageIndex + 1][d] = 's_s' + (stageIndex + 1) + '_d' + divisionIndex;
      });
    });

    return gotoMap;
  };

  return my;
}(pmelib || {}));
