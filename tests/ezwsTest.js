'use strict';

var _ = require ('lodash');
var fs = require ('fs');
var nc = require ('namecase');
var practiscore = require ('./practiscore');
var psclasses = require ('./psUSPSA');

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

var IntermediateInheritor = function() {};
IntermediateInheritor.prototype = Error.prototype;
ConversionError.prototype = new IntermediateInheritor ();

//
//
//
if (!Number.isInteger) {
  Number.isInteger = function isInteger (nVal) {
    return (typeof nVal === 'number') && isFinite (nVal) && (nVal > -9007199254740992) && (nVal < 9007199254740992) && (Math.floor (nVal) === nVal);
  };
}

//
//
//
String.prototype.toNameCase = function () {
  var name = this.toString ();

  if (nc.checkName (name))
    return nc (name, {individualFields: true});

  return name;
};

//
//
//
function validateObject (obj, callback) {
  if (typeof obj !== 'object')
    return callback ({
      error: '[ezwsImport] validateObject: variable is not of type object',
      message: 'Parameter passed to validateObject not an object type',
    });
}

function validateArray (arr, callback) {
  if (!Array.isArray (arr))
    return callback ({
      error: '[ezwsImport] validateArray: variable is not of type array',
      message: 'Parameter passed to validateArray not an array',
    });
}

function validateArrayOne (arr, callback) {
  validateArray (arr, function (err) { return callback (err); });

  if (arr.length !== 1)
    return callback ({
      error: '[ezwsImport]  array length is not 1 element',
      message: 'Parameter passed to validateArrayOne has more than 1 row',
    });
}

function validateExists (hash, field, callback) {
  if (!(field in hash))
    return callback ({
      error: '[ezwsImport] validateExists: key ' + field + ' not in hash object',
      message: 'requested field passed to validateExists does not exist in object',
    });
}

function validateString (str, callback) {
  if (typeof str !== 'string')
    return callback ({
      error: '[ezwsImport] validateString: variable is not of type string',
      message: 'Parameter passed to validateString not a string',
    });
}

function validateInteger (integer, callback) {
  if (typeof integer !== 'number')
    return callback ({
      error: '[ezwsImport] validateInteger: variable is not of type integer',
      message: 'Parameter passed to validateInteger not an integer',
    });
}

function extractString (hash, field, callback) {
  validateObject (hash, function (err) { return callback (err); });
  validateExists (hash, field, function (err) { return callback (err); });
  validateString (hash [field], function (err) { return callback (err); });

  callback (null, hash [field].trim ());
}

function extractInteger (hash, field, callback) {
  validateObject (hash, function (err) { return callback (err); });
  validateExists (hash, field, function (err) { return callback (err); });
  validateInteger (hash [field], function (err) { return callback (err); });

  callback (null, parseInt (hash [field]));
}

//
//
//
function validateDbVersion (dbVersionArr, callback) {
  validateArrayOne (dbVersionArr, function (err) { return callback (err); });
  validateExists (dbVersionArr [0], 'db_version', function (err) { return callback (err); });

  if (!dbVersionArr [0].db_version || (dbVersionArr [0].db_version !== '4.0.0.0'))
    return callback ({
      error: '[ezwsImport] dbversion.db_version field is undefined or not "4.0.0.0"',
      message: 'dbversion.db_version field returned from database is not "4.0.0.0"',
    });
}

function validateVersion (versionArr, callback) {
  validateArrayOne (versionArr, function (err) { return callback (err); });

  extractString (versionArr [0], 'program_name', function (err, programName) {
    if (err)
      return callback (err);
    if (programName !== 'EzWinScore')
      return callback ({
        error: '[ezwsImport] version [0].program_name field is not "EzWinScore"',
        message: 'version [0].program_name field returned from database is not "EzWinScore"',
      });
  });

  extractString (versionArr [0], 'region_type', function (err, regionType) {
    if (err)
      return callback (err);
    if (regionType !== 'USPSA')
      return callback ({
        error: '[ezwsImport] version [0].region_type field is not "USPSA"',
        message: 'version [0].region_type field returned from database is not "USPSA"',
      });
  });
}

//
//
//
function convertMatch (matchArr, callback) {
  var m = new psclasses.uspsaMatch ();

  validateArrayOne (matchArr, function (err) { return callback (err); });
  validateString (matchArr [0].match_name, function (err) { return callback (err); });

  extractString (matchArr [0], 'match_name', function (err, matchName) {
    if (err)
      return callback (err);

    m.setName (matchName);
  });

  extractString (matchArr [0], 'match_date', function (err, matchDate) {
    if (err)
      return callback (err);

    m.setDate (matchDate.substr (0, matchDate.indexOf ('T')));
  });

  extractString (matchArr [0], 'match_type', function (err, level) {
    if (err)
      return callback (err);

    m.setLevel (level);
  });

  callback (null, m);
}

//
//
//
function xlatYNtoTF (yn, param) {
  param = param;

  if (yn.toLowerCase () === 'no')
    return false;
  if (yn.toLowerCase () === 'yes')
    return true;

  throw new ConversionError ('Yes/No field has a non-yes/no value (value is "' + yn + '")');
}

function xlatGunType (gunType, param) {
  param = param;

  if (gunType.toLowerCase () !== 'pistol')
    throw new ConversionError ('Gun type field is not "Pistol" (value is "' + gunType + '")');
}

function xlatTargetType (targetType, param) {
  param = param;

  if (targetType.toLowerCase () === 'classic')
    return true;

  return false;
}

function xlatTargets (paperTargets, uspsaStage) {
  if (paperTargets) {
    var paperHits = (uspsaStage.getStagePoints () / 5) - uspsaStage.getPoppers ();
    var targetNo;

    for (targetNo = 0; targetNo < paperTargets; targetNo++)
      uspsaStage.addTarget (new psclasses.uspsaTarget (targetNo + 1));

    for (targetNo = 0; paperHits; paperHits--) {
      var t = uspsaStage.getTarget (targetNo++);

      t.setRequiredHits (t.getRequiredHits () + 1);

      if (targetNo === uspsaStage.getTargetCount ())
        targetNo = 0;
    }
  }
}

function convertStages (stagesArr, callback) {
  var stages = [];
  var stageVars = {
    'gun_type':         { get: extractString,  xlat: xlatGunType,    set: null                },  // Should be checked first
    'stage_no':         { get: extractInteger, xlat: null,           set: 'setNumber'         },
    'stage_name':       { get: extractString,  xlat: null,           set: 'setName'           },
    'scoring_type':     { get: extractString,  xlat: null,           set: 'setScoringType'    },
    'classifier':       { get: extractString,  xlat: xlatYNtoTF,     set: 'setClassifier'     },
    'classifier_no':    { get: extractString,  xlat: null,           set: 'setClassifierCode' },
    'times_run':        { get: extractInteger, xlat: null,           set: 'setStrings'        },
    'no_shoots':        { get: extractString,  xlat: xlatYNtoTF,     set: 'setNoShoots'       },
    'target_type':      { get: extractString,  xlat: xlatTargetType, set: 'setTargetType'     },
    'maximum_points':   { get: extractInteger, xlat: null,           set: 'setStagePoints'    },  // Order is important for these three
    'pepper_poppers_5': { get: extractInteger, xlat: null,           set: 'setPoppers'        },  // Paper target spread function needs
    'paper_targets':    { get: extractInteger, xlat: xlatTargets,    set: null                },  // to know points and poppers values.
  };

  validateArray (stagesArr, function (err) { return callback (err); });

  function setStageVars (ezwsStage, uspsaStage) {
    _.each (stageVars, function (val, key) {
      val.get (ezwsStage, key, function (err, str) {
        if (err)
          return callback (err);

        if (val.xlat)
          str = val.xlat (str, uspsaStage);

        if (val.set)
          uspsaStage [val.set] (str);
      });
    });

    stages.push (uspsaStage);
  }

  for (var i = 0; i < stagesArr.length; i++)
    setStageVars (stagesArr [i], new psclasses.uspsaStage ());

  callback (null, stages);
}

//
//
//
function xlatAge (age, param) {
  param = param;

  var remapAge = {
    '':             'ADULT',
    'JUNIOR':       'JUNIOR',
    'SENIOR':       'SENIOR',
    'SUPER SENIOR': 'SUPSNR',
  };

  if (!(age.toUpperCase () in remapAge))
    throw new ConversionError ('Age is not blank, "Junior", "Senior", or "Super Senior" (value is "' + age + '")');

  return remapAge [age.toUpperCase ()];
}

function xlatClass (cls, param) {
  param = param;

  var remapClass = {
    A:  'A',
    B:  'B',
    C:  'C',
    D:  'D',
    GM: 'G',
    M:  'M',
    U:  'U',
    X:  'X',
  };

  if (!(cls.toUpperCase () in remapClass))
    throw new ConversionError ('Class is not A, B, C, D, GM, M, U or X (value is "' + cls + '")');

  return remapClass [cls.toUpperCase ()];
}

function xlatDivision (division, param) {
  param = param;

  var remapDivision = {
    'LIMITED':      'LTD',
    'LIMITED 10':   'LTDTEN',
    'OPEN':         'OPEN',
    'PRODUCTION':   'PROD',
    'REVOLVER':     'REV',
    'SINGLE STACK': 'SS',
    'CARRY OPTICS': 'CO',
  };

  if (!(division.toUpperCase () in remapDivision))
    throw new ConversionError ('Division is not Limited, Limited 10, Open, Producton, Revolver or Single Stack (value is "' + division + '")');

  return remapDivision [division.toUpperCase ()];
}

function xlatGender (female, param) {
  param = param;

  if (female.toUpperCase () === 'YES')
    return 'FEMALE';
  if (female.toUpperCase () === 'NO')
    return 'MALE';

  throw new ConversionError ('Yes/No field has a non-yes/no value (value is "' + female + '")');
}

function xlatPowerFactor (pf, param) {
  param = param;

  if (pf.toUpperCase () === 'MINOR')
    return 'MINOR';
  if (pf.toUpperCase () === 'MAJOR')
    return 'MAJOR';

  throw new ConversionError ('Power factor is not Minor or Mahor (value is "' + pf + '")');
}

function xlatName (name, param) {
  param = param;

  return name.trim ().replace (/^[\W+]/, '').toNameCase ();
}

function convertShooters (shootersArr, callback) {
  var uspsaPrefix;

  function xlatUSPSAPrefix (prefix, param) {
    param = param;
    uspsaPrefix = null;

    var validPrefixes = ['A', 'B', 'CA', 'CAL', 'CL', 'F', 'FL', 'FY', 'FYF', 'L', 'PEN', 'RD', 'S', 'TY', 'TYF'];

    if (prefix.length) {
      if (_.indexOf (validPrefixes, prefix.toUpperCase ()) === -1)
        throw new ConversionError ('USPSA prefix not in legal set (value is "' + prefix + '")');

      uspsaPrefix = prefix.toUpperCase ();
    }
  }

  function xlatUSPSASuffix (suffix, param) {
    param = param;

    if (!uspsaPrefix && !suffix.length)
      return '';

    if ((uspsaPrefix && !suffix.length) || (!uspsaPrefix && suffix.length))
      throw new ConversionError ('USPSA number must have both a prefix and suffix to be valid (value is "' + (uspsaPrefix || '') + (suffix || '') + '")');

    if (!(suffix = parseInt (suffix)) || !Number.isInteger (suffix))
      throw new ConversionError ('USPSA suffix must be a non-zero number (value is "' + suffix + '")');

    return uspsaPrefix + suffix.toString ();
  }

  var shooters = [];
  var shooterVars = {
    'age':           { get: extractString,  xlat: xlatAge,         set: 'setAge'              },
    'class':         { get: extractString,  xlat: xlatClass,       set: 'setClass'            },
    'competitor_no': { get: extractInteger, xlat: null,            set: 'setNumber'           },
    'deleted':       { get: extractString,  xlat: xlatYNtoTF,      set: 'setDeleted'          },
    'division':      { get: extractString,  xlat: xlatDivision,    set: 'setDivision'         },
    'dqed_pistol':   { get: extractString,  xlat: xlatYNtoTF,      set: 'setDQ'               },
    'email':         { get: extractString,  xlat: null,            set: 'setEmail'            },
    'female':        { get: extractString,  xlat: xlatGender,      set: 'setGender'           },
    'first_name':    { get: extractString,  xlat: xlatName,        set: 'setFirstName'        },
    'foreign':       { get: extractString,  xlat: xlatYNtoTF,      set: 'setForeign'          },
    'last_name':     { get: extractString,  xlat: xlatName,        set: 'setLastName'         },
    'law':           { get: extractString,  xlat: xlatYNtoTF,      set: 'setLaw'              },
    'military':      { get: extractString,  xlat: xlatYNtoTF,      set: 'setMilitary'         },
    'phone_no':      { get: extractString,  xlat: null,            set: 'setPhone'            },
    'power_factor':  { get: extractString,  xlat: xlatPowerFactor, set: 'setPowerFactor'      },
    'squad_no':      { get: extractInteger, xlat: null,            set: 'setSquad'            },
    'uspsa_prefix':  { get: extractString,  xlat: xlatUSPSAPrefix, set: null                  }, // Prefix must be handled before suffix
    'uspsa_suffix':  { get: extractString,  xlat: xlatUSPSASuffix, set: 'setMembershipNumber' },
  };

  validateArray (shootersArr, function (err) { return callback (err); });

  function setShooterVars (ezwsShooter, uspsaShooter) {
    _.each (shooterVars, function (val, key) {
      val.get (ezwsShooter, key, function (err, str) {
        if (err)
          return callback (err);

        if (val.xlat)
          str = val.xlat (str, uspsaShooter);

        if (val.set)
          uspsaShooter [val.set] (str);
      });
    });

    shooters.push (uspsaShooter);
  }

  for (var i = 0; i < shootersArr.length; i++)
    setShooterVars (shootersArr [i], new psclasses.uspsaShooter ());

  callback (null, shooters);
}

//
//
//
function convertEZWS (dbJSON, callback) {
  var uspsaMatch;

  validateDbVersion (dbJSON.db_version, function (err) {
    return callback (err);
  });

  validateVersion (dbJSON.version, function (err) {
    return callback (err);
  });

  convertMatch (dbJSON.match, function (err, match) {
    if (err)
      return callback (err);

    uspsaMatch = match;
  });

  convertStages (dbJSON.stages, function (err, stages) {
    if (err)
      return callback (err);

    uspsaMatch.setStages (stages);
  });

  convertShooters (dbJSON.competitors, function (err, shooters) {
    if (err)
      return callback (err);

    uspsaMatch.setShooters (shooters);
  });

  callback (null, practiscore.matchBuild (uspsaMatch));
}

function main () {
  fs.readFile ('lib/GA23_2014-06-28.json', function (err, data) {
    if (err)
      throw (err);

    convertEZWS (JSON.parse (data), function (err, matchData) {
      if (err)
        return console.dir (err);

      matchData.m.setName (matchData.m.getName ());

      if (1) {
        practiscore.dbMatchSave (matchData, function (err) {
          if (err)
            console.log ('Error saving match: %s', err);
          else
            console.log ('database_saved');
        });
      }
    });
  });
}

try {
  main ();
} catch (e) {
  console.dir (e);
}
