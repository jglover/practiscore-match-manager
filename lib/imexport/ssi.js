'use strict';

//
//  Expected files in zip file
//    Competitors.tsv
//    Match.txt
//    Scores_P.txt
//    Stages_P.txt
//    Stages_Extra_P.txt
//

// var debug = false; FIXME: Used in the scores import

var _ = require ('lodash');
var assert = require ('assert');
var async = require ('async');
var fs = require ('fs');
var path = require ('path');
var Zip = require ('adm-zip');
var pmelog = require ('../pmelog');
var psmatch = require ('../match');
var psutils = require ('../utils');

var remapAge = {
  '':             'ADULT',
  'JUNIOR':       'JUNIOR',
  'SENIOR':       'SENIOR',
  'SUPER SENIOR': 'SUPSNR',
};

var remapDivision = {
  'LIM':   'LTD',
  'LIM10': 'LTDTEN',
  'OPEN':  'OPEN',
  'PROD':  'PROD',
  'REV':   'REV',
  'SS':    'SS',
  'CO':    'CO',
};

var remapGender = {
  'NO':  'MALE',
  'YES': 'FEMALE',
};

var remapPowerFactor = {
  'MAJOR': 'MAJOR',
  'MINOR': 'MINOR',
};

var remapYesNo = {
  'NO':  false,
  'YES': true,
};

var remapScoreType = {
  0: 'Comstock',
  1: 'Virginia',
  2: 'Comstock',
  3: 'Fixed',
  4: 'Comstock',
  5: 'Comstock',
  6: 'Virginia',
  7: 'Fixed',
};

//
//
//
function ssiReadFile (zip, filename) {
  return zip.readFile (filename).toString ().split (/[\r\n]/).filter (function (n) { return n.length; });
}

function ssiExtractMatch (zfh) {
  var match = {};

  _.each (ssiReadFile (zfh, 'Match.txt'), function (line) {
    var a = line.split (/\t/);

    match [a [0]] = a [1];
  });

  return match;
}

//
//  0 -- sh_num     -- Number
//  1 -- sh_id      -- USPSA #
//  2 -- sh_fn      -- First name
//  3 -- sh_ln      -- Last name
//  4 -- sh_addr1   -- Address 1
//  5 -- sh_addr2   -- Address 2
//  6 -- sh_city    -- City
//  7 -- sh_st      -- State
//  8 -- sh_zipcode -- ZIP Code
//  9 -- sh_cc      -- Country
// 10 -- sh_ph      -- Phone (not used, has bad data)
// 11 -- sh_frn     -- Foreign (YES/NO)
// 12 -- sh_eml     -- Email
// 13 -- sh_dv      -- Handgun Division (LIM, LIM10, OPEN, PROD, REV, SS, CO)
// 14 -- sh_gen     -- Female (YES/NO)
// 15 -- sh_mil     -- Military (YES/NO)
// 16 -- sh_law     -- Law (YES/NO)
// 17 -- sh_age     -- Age ('', 'Junior, 'Senior', 'Super Senior')
// 18 -- sh_del     -- Deleted (YES/NO)
// 19 -- sh_pf      -- Handgun PF ('Minor', 'Major')
// 20 --            -- Rifle PF
// 21 --            -- Shotgun PF
// 22 --            -- Rifle Entered
// 23 --            -- Shotgun Entered
// 24 --            -- Rifle Division
// 25 --            -- Shotgun Division
// 26 --            -- Aggregated
// 27 --            -- Aggregated Division
// 28 -- sh_sqd     -- Squad
// 29 --            -- Team
//
function ssiExtractCompetitors (newMatch, zfh) {
  _.each (ssiReadFile (zfh, 'Competitors.tsv').slice (1), function (shooter) {
    var s = shooter.split (/\t/);
    var c = newMatch.matchdef ().newShooter ();

    c.setNumber (parseInt (s [0]));
    c.setMembershipNumber (s [1].toUpperCase ());
    c.setFirstName (s [2].trim ().replace (/^[\W+]/, '').toNameCase ());
    c.setLastName (s [3].trim ().replace (/^[\W+]/, '').toNameCase ());
    c.setAddr1 (s [4].trim ());
    c.setAddr2 (s [5].trim ());
    c.setCity (s [6].trim ());
    c.setState (s [7].trim ());
    c.setZipcode (parseInt (s [8]));
    c.setForeign (remapYesNo [s [11].toUpperCase ()]);
    c.setEmail (s [12].toLowerCase ());
    c.setDivision (remapDivision [s [13].toUpperCase ()]);
    c.setGender (remapGender [s [14].toUpperCase ()]);
    c.setMilitary (remapYesNo [s [15].toUpperCase ()]);
    c.setLaw (remapYesNo [s [16].toUpperCase ()]);
    c.setAge (remapAge [s [17].toUpperCase ()]);
    c.setDeleted (remapYesNo [s [18].toUpperCase ()]);
    c.setPowerFactorByName (remapPowerFactor [s [19].toUpperCase ()]);
    c.setSquad (s [28]);

    newMatch.matchdef ().addShooter (c);
  });
}

//
//  0 --                 -- Stage number
//  1 -- stage_name      -- Stage name
//  2 -- stage_poppers   -- Number of poppers/plates
//  3 --                 -- Number of disappearing targets (not used for hit-factor scored matches)
//  4 -- stage_targets[] -- Number of paper targets
//  5 --                 -- Number of shots per target (not used for hit-factor scored matches)
//  6 --                 -- ID (not used)
//  7 -- stage_scoretype -- Stage type
//  8 --                 -- XStage type (not used)
//  9 --                 -- Stage active (1 = active, 0 = deleted)
// 10 --                 -- Steel type (not used for hit-factor scored matches)
// 11 --                 -- Paper type (not used for hit-factor scored matches)
// 12 --                 -- Time (not used for hit-factor scored matches)
// 13 -- stage_tppoints  -- Total stage points
// 14 -- stage_strings   -- Number of strings
//

function ssiExtractStages (newMatch, zfh) {
  var stagesFile = ssiReadFile (zfh, 'Stages_P.txt');
  var stagesExtraFile = ssiReadFile (zfh, 'Stages_Extra_P.txt');
  var stageNumber = 0;

  _.each (stagesFile, function (stage, stageIndex) {
    var a = stage.split (/\t/);
    var e = stagesExtraFile [stageIndex].split (/\t/);
    var s = newMatch.matchdef ().newStage ();

    if (parseInt (a [9])) {
      var paperTargets = parseInt (a [4]);

      s.setNumber (++stageNumber);
      s.setName (a [1].trim ().replace (/,/g, ''));
      s.setPoppers (parseInt (a [2]));
      s.setScoringType (remapScoreType [parseInt (a [7])]);
      s.setStagePoints (parseInt (a [13]));
      s.setStrings (parseInt (a [14]));
      s.setClassifier (remapYesNo [e [2].toUpperCase ()]);

      if (s.isClassifier ())
        s.setClassifierCode (e [1].substr (3, 5));

      if (paperTargets) {
        var paperHits = (s.getStagePoints () / 5) - s.getPoppers ();
        var targetNo;

        for (targetNo = 0; targetNo < paperTargets; targetNo++)
          s.addTarget (s.newTarget (targetNo + 1));

        for (targetNo = 0; paperHits; paperHits--) {
          var t = s.getTarget (targetNo++);

          t.setRequiredHits (t.getRequiredHits () + 1);

          if (targetNo === s.getTargetCount ())
            targetNo = 0;
        }
      }

      newMatch.matchdef ().addStage (s);
    }
  });
}

/*
//
//  PS/A writes in stage number order (and apparently random shooter number
//  order), while SSI writes in shooter number/stage number order. PS/A does
//  not write a header, while SSI does.
//
//
//  0 --                 -- Shooter number (EZWS #)
//  1 --                 -- RO number (not used by EZWS, not written by PS, always -1 by SSI)
//  2 --                 -- Stage number
//  3 --                 -- Hit factor (to 4 decimal places. Not used by EZWS)
//  4 --                 -- Time (to 2 decimal places, all strings combined)
//  5 --                 -- Score (not used by EZWS, not written by PS, written by SSI))
//  6 --                 -- Flags (not used by EZWS, not written by PS, always 6144 (0x1800) by SSI)
//  7 --                 -- A
//  8 --                 -- B
//  9 --                 -- C
// 10 --                 -- D
// 11 --                 -- M (or overtime shots for Fixed Time stages)
// 12 --                 -- Penalties (NS)
// 13 --                 -- Procedurals
// 14 --                 -- Stage points (not used by EZWS, not written by PS, always 0.0000 by SSI)
//
// This is a little tricky. PractiScore tracks hits on each target, where
// EZWS just lumps all A hits (including steel) into one number, all B hits
// into a number, etc. We have to spread these combined numbers across the
// number of targets defined for the stage.
//
// FIXME: Indicate how we do this
//
function ssiExtractScores (zfh, match, competitors, stages) {
  var scoresFile = ssiReadFile (zfh, 'Scores_P.txt');
  var ms = new uspsa.MatchScores (match.getID ());
  var quickFind = {};

  if (scoresFile.length < 2)
    return ms;

  assert (scoresFile.length >= 2, 'Length of Scores_P.txt < 2');

  quickFind.c = {};
  quickFind.s = {};

  _.each (competitors, function (c) {
    assert (c.sh_num >= 1, 'Shooter number < 1');
    quickFind.c [c.sh_num] = c;
  });

  _.each (stages, function (s) {
    assert (s.stage_number >= 1, 'Stage number < 1');
    quickFind.s [s.stage_number] = s;

    ms.addStage (s.stage_number);
  });

  _.each (scoresFile.slice (1), function (score) {
    var s = new uspsa.Score ();
    var a = score.split (/\t/);

    var shooterNumber = parseInt (a [0] || '-1');
    var stageNumber = parseInt (a [2] || '-1');
    var totalTime = parseFloat (a [4] || '0.00');
    var aHits = parseInt (a [7] || '0');
    var bHits = parseInt (a [8] || '0');
    var cHits = parseInt (a [9] || '0');
    var dHits = parseInt (a [10] || '0');
    var misses = parseInt (a [11] || '0');
    var nsHits = parseInt (a [12] || '0');
    var procs = parseInt (a [13] || '0');

    if (_.isUndefined (quickFind.c [shooterNumber]))
      throw new Error ('Shooter number ' + shooterNumber + ' does not exist');
    if (_.isUndefined (quickFind.s [stageNumber]))
      throw new Error ('Stage number ' + stageNumber + ' does not exist');

    var shooter = quickFind.c [shooterNumber];
    var stage = quickFind.s [stageNumber];

    if (debug) console.log ('Stage #%s, shooter %s %s', stageNumber, shooter.sh_fn, shooter.sh_ln);
    if (debug) console.log ('  Starting hits:');
    if (debug) console.log ('    A=%s', aHits);
    if (debug) console.log ('    B=%s', bHits);
    if (debug) console.log ('    C=%s', cHits);
    if (debug) console.log ('    D=%s', dHits);
    if (debug) console.log ('    M=%s', misses);
    if (debug) console.log ('    NS=%s', nsHits);
    if (debug) console.log ('    procs=%s', nsHits);


    s.setShooterID (shooter.getID ());
    s.setStringTimes ([totalTime]);
    s.setProcedurals (procs);

    //
    //  misses are actually overtime shots for Fixed Time stages
    //
    if (misses && stage.isFixedTime ()) {
      s.setOvertimeShots (misses);
      misses = 0;
      if (debug) console.log ('  Assigning misses to overtime shots');
    }

    //
    //  Assign the no-shoots out. If there are no-shoots, but no paper targets
    //  we've got an error. To make life convient for us, and anyone who has
    //  to correct any scoring mistakes, we'll put all the no-shoots on one
    //  target.
    //
    if (nsHits && stage.hasNoNoShoots ())
      throw new Error ('No-shoots present on stage with no-shoots disabled');
    if (nsHits && !stage.getTargetCount ())
      throw new Error ('No-shoots present on stage with no paper targets defined');

    for (var i = 0; i < stage.getTargetCount (); i++)
      s.set (i, 0);

    s.setNS (0, nsHits);

    //
    //  Spread any misses out. If there are more misses than paper targets, and
    //  steel is present, spread the mikes into the popper misses. If there are
    //  still mikes left over, we've got an error.
    //
    var targetNumber;
    var hitsToTarget;
    var requiredHits;
    var scoredHits;

    for (targetNumber = 0; misses && (targetNumber < stage.getTargetCount ()); targetNumber++) {
      hitsToTarget = _.min ([stage.getTarget (targetNumber).getRequiredHits (), misses]);
      if (debug) console.log ('  Target #%s: Assigning %s misses to misses', targetNumber, hitsToTarget);
      s.setM (targetNumber, hitsToTarget);
      misses -= hitsToTarget;
      assert (misses >= 0, 'Misses < 0');
    }

    if (misses) {
      var popperMisses = _.min ([stage.getPoppers (), misses]);
      if (debug) console.log ('  Steel: Assigning %s misses to steel misses', popperMisses);
      s.setPopperMisses (popperMisses);
      misses -= popperMisses;
    }

    //
    //  Now the hits need to be spread out over the targets.  Before we do
    //  that, assign any A hits to any poppers that haven't been missed.
    //
    if (aHits && (stage.getPoppers () - s.getPopperMisses () > 0)) {
      var aHitsToPoppers = _.min ([aHits, stage.getPoppers () - s.getPopperMisses ()]);
      if (debug) console.log ('  Steel: Assigning %s A hits to steel hits', aHitsToPoppers);
      s.setPopperHits (aHitsToPoppers);
      aHits -= aHitsToPoppers;
      assert (stage.getPoppers () === (s.getPopperHits () + s.getPopperMisses ()), 'Stage math');
      assert (aHits >= 0, 'aHits < 0');
    }

    for (targetNumber = 0; aHits && (targetNumber < stage.getTargetCount ()); targetNumber++) {
      requiredHits = stage.getTarget (targetNumber).getRequiredHits ();
      scoredHits = s.getScoredHits (targetNumber);
      hitsToTarget = _.min ([aHits, requiredHits - scoredHits]);

      if (scoredHits < requiredHits) {
        s.setA (targetNumber, hitsToTarget);
        aHits -= hitsToTarget;
        assert (aHits >= 0, 'aHits < 0');
        if (debug) console.log ('  Target #%s: Assigning %s A hits', targetNumber, hitsToTarget);
      }
    }

    for (targetNumber = 0; bHits && (targetNumber < stage.getTargetCount ()); targetNumber++) {
      requiredHits = stage.getTarget (targetNumber).getRequiredHits ();
      scoredHits = s.getScoredHits (targetNumber);
      hitsToTarget = _.min ([bHits, requiredHits - scoredHits]);

      if (scoredHits < requiredHits) {
        s.setB (targetNumber, hitsToTarget);
        bHits -= hitsToTarget;
        assert (bHits >= 0, 'bHits < 0');
        if (debug) console.log ('  Target #%s: Assigning %s B hits', targetNumber, hitsToTarget);
      }
    }

    for (targetNumber = 0; cHits && (targetNumber < stage.getTargetCount ()); targetNumber++) {
      requiredHits = stage.getTarget (targetNumber).getRequiredHits ();
      scoredHits = s.getScoredHits (targetNumber);
      hitsToTarget = _.min ([cHits, requiredHits - scoredHits]);

      if (scoredHits < requiredHits) {
        s.setC (targetNumber, hitsToTarget);
        cHits -= hitsToTarget;
        assert (cHits >= 0, 'cHits < 0');
        if (debug) console.log ('  Target #%s: Assigning %s C hits', targetNumber, hitsToTarget);
      }
    }

    for (targetNumber = 0; dHits && (targetNumber < stage.getTargetCount ()); targetNumber++) {
      requiredHits = stage.getTarget (targetNumber).getRequiredHits ();
      scoredHits = s.getScoredHits (targetNumber);
      hitsToTarget = _.min ([dHits, requiredHits - scoredHits]);

      if (scoredHits < requiredHits) {
        s.setD (targetNumber, hitsToTarget);
        dHits -= hitsToTarget;
        assert (dHits >= 0, 'dHits < 0');
        if (debug) console.log ('  Target #%s: Assigning %s D hits', targetNumber, hitsToTarget);
      }
    }

    if (debug) console.log ('  Remaining hits:');
    if (debug) console.log ('    A=%s', aHits);
    if (debug) console.log ('    B=%s', bHits);
    if (debug) console.log ('    C=%s', cHits);
    if (debug) console.log ('    D=%s', dHits);
    if (debug) console.log ('    M=%s', misses);

    assert (aHits === 0, 'aHits !== 0');
    assert (bHits === 0, 'bHits !== 0');
    assert (cHits === 0, 'cHits !== 0');
    assert (dHits === 0, 'dHits !== 0');
    assert (misses === 0, 'misses !== 0');

    ms.getStage (stageNumber).addScore (s);
  });

  return ms;
}

//
//
//
var ssiImportOld = function (zipName, callback) {
  var zf = new Zip (zipName);

  function checkFileExists (name) {
    if (!_.find (zf.getEntries (), function (zipEntry) { return zipEntry.entryName === name; }))
      throw new Error ("Can't find '" + name + "' in Shoot'n-Score-It zip file");
  }

  checkFileExists ('Competitors.tsv');
  checkFileExists ('Match.txt');
  checkFileExists ('Scores_P.txt');
  checkFileExists ('Stages_P.txt');
  checkFileExists ('Stages_Extra_P.txt');

  var ssiMatch = ssiExtractMatch (zf);
  var matchdef = new uspsa.Matchdef ();
  var competitors = ssiExtractCompetitors (zf);
  var stages = ssiExtractStages (zf);

  matchdef.setName (ssiMatch.Match);
  matchdef.setShooters (competitors);
  matchdef.setStages (stages);

  var matchData = practiscore.matchBuild (match);

  //
  //  Importing scores requires knowing the shooter and stage information
  //
  var scores = ssiExtractScores (zf, match, competitors, stages);

  practiscore.matchBuildAddScores (matchData, scores);

  if (callback)
    callback (null, matchData);

  return matchData;
};
*/

var ssiImport = function (zipName, callback) {
  var self = this;
  var zf = new Zip (zipName);
  var ssiMatch;
  var err;

  assert.equal (typeof (zipName), 'string', 'argument \'zipName\' must be a string');
  assert.equal (typeof (callback), 'function', 'argument \'callback\' must be a function');

  function checkFileExists (name) {
    if (!_.find (zf.getEntries (), function (zipEntry) { return zipEntry.entryName === name; }))
      throw new Error ("Can't find '" + name + "' in Shoot'n-Score-It zip file");
  }

  try {
    checkFileExists ('Competitors.tsv');
    checkFileExists ('Match.txt');
    checkFileExists ('Scores_P.txt');
    checkFileExists ('Stages_P.txt');
    checkFileExists ('Stages_Extra_P.txt');
  } catch (e) {
    callback (e);
    err = e;
  }

  if (!err) {
    ssiMatch = ssiExtractMatch (zf);

    if (ssiMatch.Firearms && (ssiMatch.Firearms === 'Handgun')) {
      new psmatch.Match (self._accessorFunctions, {matchType: 'uspsa_p'}, function (err, newMatch) {
        if (!err) {
          ssiExtractCompetitors (newMatch, zf);
          ssiExtractStages (newMatch, zf);

          newMatch.matchdef ().setDate (ssiMatch.Match_start_date || '');
          newMatch.matchdef ().setName (ssiMatch.Match || 'Shoot\'n-Score-It');
        }

        callback (err, newMatch);
      });
    }
  }

  return self;
};

var ssiDelete = function (zipFile, options, callback) {
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
  fs.unlink (zipFile, function (err) {
    if (err)
      pmelog.llog (pmelog.ERROR, err.toString ());
    if (callback)
      callback (err ? err.toString () : err);
  });
};

var ssiList = function (ssiDirectory, options, callback) {
  var self = this;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  assert.equal (typeof (ssiDirectory), 'string', 'argument \'ssiDirectory\' must be a string');
  assert.equal (typeof (options), 'object', 'argument \'options\' must be an object');
  assert.equal (typeof (callback), 'function', 'argument \'callback\' must be a function');

  psutils.findFiles (ssiDirectory, /\.zip$/g, function (err, fileList) {
    var matchFiles = [];

    if (!err) {
      async.each (fileList, function (fullName, callback) {
        var m = {};

        ssiImport.call (self, fullName, function (err2, ssiMatch) {
          if (!err2) {
            m.match_uuid = ssiMatch.matchdef ().getID ();
            m.match_name = ssiMatch.matchdef ().getName ();
            m.match_date = ssiMatch.matchdef ().getDate ();
            m.match_discipline = 'USPSA';
            m.match_modified = ssiMatch.matchdef ().getModifiedDate ();
            m.match_file = fullName;
            m.match_filename = path.basename (fullName);

            if (!options.matchUUID || _.isEqual (options.matchUUID.toLowerCase (), m.match_uuid.toLowerCase ()))
              matchFiles.push (m);
          } else {
            pmelog.llog (pmelog.ERROR, 'ssiImport failed for file \'%s\'', fullName);
            pmelog.llog (pmelog.ERROR, err2);
          }

          callback ();
        });
      }, function () {
        callback (null, matchFiles);
      });
    } else
      callback (err);
  });

  return self;
};

//
//  And here's what we export
//
exports.ssiImport = ssiImport;
exports.ssiList = ssiList;
exports.ssiDelete = ssiDelete;
