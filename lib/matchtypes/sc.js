'use strict';

var _ = require ('lodash');
var assert = require ('assert');
var async = require ('async');
var locks = require ('locks');
var sprintf = require ('sprintf-js').sprintf;
var merge = require ('../merge');
var psutils = require ('../utils');
var shooter = require ('../ps_classes/shooter');
var penalty = require ('../ps_classes/penalty');
var stage = require ('../ps_classes/stage');
var matchdef = require ('../ps_classes/matchdef');
var score = require ('../ps_classes/score');
var stagescores = require ('../ps_classes/stagescores');
var matchscores = require ('../ps_classes/matchscores');
var matchlog = require ('../ps_classes/matchlog');
var pmelog = require ('../pmelog');

var lookups = {
  matchlevels: {
     'T1':   'Tier 1',
     'T2':   'Tier 2',
     'T3':   'Tier 3',
     'T4':   'Tier 4',
  },
  ages: {
    'PRETEEN': 'Preteen',
    'JUNIOR':  'Junior',
    'ADULT':   'Adult',
    'SENIOR':  'Senior',
    'SUPSNR':  'Super Senior',
  },
  genders: {
    'FEMALE' : 'Female',
    'MALE'   : 'Male',
  },
  divisions: {},
  divisions_flipped: {},
  classes: {},
  categories: [],
};

//
//  enabled: true, readonly: true added when default values are loaded
//
var defaultValues = {
  categories: [
    { ps_name: 'Lady',            pmm_name: 'Lady',            },
    { ps_name: 'Preteen',         pmm_name: 'Preteen',         exclude: ['Junior', 'Senior', 'Super Senior'], },
    { ps_name: 'Junior',          pmm_name: 'Junior',          exclude: ['Preteen', 'Senior', 'Super Senior'], },
    { ps_name: 'Senior',          pmm_name: 'Senior',          exclude: ['Preteen', 'Junior', 'Super Senior'], },
    { ps_name: 'Super Senior',    pmm_name: 'Super Senior',    exclude: ['Preteen', 'Junior', 'Senior'],       },
    { ps_name: 'Law Enforcement', pmm_name: 'Law Enforcement', exclude: ['Military'], },
    { ps_name: 'Military',        pmm_name: 'Military',        exclude: ['Law Enforcement'], },
    { ps_name: 'Foreign',         pmm_name: 'Foreign',         },
  ],
  classes: [
    { ps_name: 'A', pmm_name: 'A',  },
    { ps_name: 'B', pmm_name: 'B',  },
    { ps_name: 'C', pmm_name: 'C',  },
    { ps_name: 'D', pmm_name: 'D',  },
    { ps_name: 'G', pmm_name: 'GM', },
    { ps_name: 'M', pmm_name: 'M',  },
    { ps_name: 'U', pmm_name: 'U',  },
    { ps_name: 'X', pmm_name: 'X',  },
  ],
  divisions: [
    { ps_name: 'IRPD', pmm_name: 'IPSC Production',        },
    { ps_name: 'ISP',  pmm_name: 'Iron Sight Pistol',      },
    { ps_name: 'ISR',  pmm_name: 'Iron Sight Revolver',    },
    { ps_name: 'LTD',  pmm_name: 'Limited',                },
    { ps_name: 'OPN',  pmm_name: 'Open',                   },
    { ps_name: 'OSR',  pmm_name: 'Open Revolver',          },
    { ps_name: 'PCC',  pmm_name: 'Pistol Caliber Carbine', },
    { ps_name: 'PROD', pmm_name: 'Production',             },
    { ps_name: 'RFPI', pmm_name: 'Rimfire Pistol Irons',   },
    { ps_name: 'RFPO', pmm_name: 'Rimfire Pistol Open',    },
    { ps_name: 'RFRI', pmm_name: 'Rimfire Rifle Irons',    },
    { ps_name: 'RFRO', pmm_name: 'Rimfire Rifle Open',     },
    { ps_name: 'SGP',  pmm_name: 'Shotgun',                },
    { ps_name: 'SS',   pmm_name: 'Single Stack',           },
  ],
  penalties: [
    { name: 'Procedural',      value: 3.00,  multiple: false, },
    { name: 'Miss',            value: 3.00,  multiple: false, },
    { name: 'Miss Stop Plate', value: 30.00, multiple: true,  },
  ],
};

var classificationsUpdateMutex = locks.createMutex ();

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
  return _.isFunction (callback) ? callback : function (err) { throw err; };
}

//
//
//
if (!Number.isInteger) {
  Number.isInteger = function isInteger (nVal) {
    return _.isNumber (nVal) && _.isFinite (nVal) && (nVal > -9007199254740992) && (nVal < 9007199254740992) && (Math.floor (nVal) === nVal);
  };
}

//
//  From Penalty:
//    pen_bin   <boolean>
//    pen_name  <string>
//    pen_value <float>
//  Adds:
//    (none);
//
var Penalty = function () {
  return penalty.Penalty.apply (this, Array.prototype.slice.call (arguments));
};

Penalty.prototype = Object.create (penalty.Penalty.prototype);

//
//  From Shooter:
//    mod_dl    <string>
//    mod_dq    <string>
//    mod_dv    <string>
//    mod_pf    <string>
//    mod_pr    <string>
//    mod_sq    <string>
//    sh_age    <string>
//    sh_cc     <string>
//    sh_ctgs   <array:JSON (array of strings)>
//    sh_del    <boolean>
//    sh_dq     <boolean>
//    sh_dqrule <string>
//    sh_dvp    <string>
//    sh_eml    <string>
//    sh_fn     <string>
//    sh_frn    <boolean>
//    sh_gen    <string>
//    sh_grd    <string>
//    sh_id     <string>
//    sh_law    <boolean>
//    sh_lge    <boolean>
//    sh_lgp    <boolean>
//    sh_ln     <string>
//    sh_mil    <boolean>
//    sh_mod    <string>
//    sh_num    <integer>
//    sh_pf     <string>
//    sh_ph     <string>
//    sh_sqd    <integer>
//    sh_st     <string>
//    sh_uid    <string>
//    sh_uuid   <string>
//    sh_wlk    <boolean>
//  Adds:
//    (none)
//
var Shooter = function () {
  var self = this;

  shooter.Shooter.apply (self, Array.prototype.slice.call (arguments));

  shooter.Shooter.prototype.setClass.call (self, 'U');
  shooter.Shooter.prototype.setDivision.call (self, 'OPN');

  return self;
};

Shooter.prototype = Object.create (shooter.Shooter.prototype);

//
//  Fixup updates the sh_ctgs field if it's empty (which it can legally be, but
//  if it is, they might have the legacy fields set so we need to check them.
//  If sh_ctgs already set, we know it should be correct.
//
Shooter.prototype.fixup = function (parent, position, options) {
  var self = this;
  var categories = self.getCategories ();

  shooter.Shooter.prototype.fixup.call (self, parent, position, options);

  if (self.sh_id)
    self.sh_id = self.sh_id.replace (/[^A-Za-z0-9]/, '').toUpperCase ();

  //
  //  Because 'RFPO' doesn't make much sense to some people, if the divisions
  //  have been renamed to their long name, if the long name exists, then
  //  convert it to the abbreviation. If we can't find it that way, just
  //  force them to open division for now.
  //
  if (!lookups.divisions [self.sh_dvp])
    self.sh_dvp = lookups.divisions_flipped [self.sh_dvp.toUpperCase ()] || 'OPN';

  if (self.sh_grd === 'GM') // FIXME: Hackish! Should check hash for either
    self.sh_grd = 'G';
  if (!lookups.classes [self.sh_grd])
    self.sh_grd = 'U';

  //
  //  If categories are defined for the shooter (sh_ctgs), assume that they're
  //  correct, and we should update the legacy values.
  //
  if (!_.isEmpty (categories)) {
    _.some (lookups.ages, function (ageValue, ageKey) {
      if (_.includes (categories, ageValue)) {
        self.setAge (ageKey);
        return true;
      }
      return false;
    });

    if (_.includes (categories, 'Lady'))
      self.setGenderFemale ();
    if (_.includes (categories, 'Military'))
      self.setIsMilitary ();
    if (_.includes (categories, 'Law Enforcement'))
      self.setIsLaw ();
    if (_.includes (categories, 'Foreign'))
      self.setIsForeign ();
  }

  //
  //  If categories (sh_ctgs) was defined, the legacy values are now correct.
  //  If they weren't, then the legacy values will be used to update sh_ctgs.
  //
  switch (self.getAge ()) {
    case 'PRETEEN': self.addCategoryFixup ('Preteen'); break;
    case 'JUNIOR':  self.addCategoryFixup ('Junior'); break;
    case 'SENIOR':  self.addCategoryFixup ('Senior'); break;
    case 'SUPSNR':  self.addCategoryFixup ('Super Senior'); break;
  }

  if (self.isFemale ())
    self.addCategoryFixup ('Lady');
  if (self.isLaw ())
    self.addCategoryFixup ('Law Enforcement');
  if (self.isMilitary ())
    self.addCategoryFixup ('Military');
  if (self.isForeign ())
    self.addCategoryFixup ('Foreign');

  return self;
};
Shooter.prototype.stripBadMembershipNumber = function (callback) {
  var scsaRegex = /^(?:A|B|CA|CAL|CL|F|FL|FY|FYF|L|PEN|RD|S|TY|TYF)[0-9]{1,6}$/;

  return shooter.Shooter.prototype.stripBadMembershipNumber.call (this, scsaRegex, callback);
};

//
//  From Stage:
//    stage_classifier        <boolean>
//    stage_classifiercode    <string>
//    stage_maxstringtime     <float>
//    stage_modifieddate      <string>
//    stage_name              <string>
//    stage_noshoots          <boolean> (not used)
//    stage_number            <integer>
//    stage_poppers           <integer> (not used)
//    stage_scoretype         <string ('SteelChallenge')
//    stage_strings           <integer>
//    stage_targets           <array:Target> (not used)
//    stage_uuid              <string>
//  Adds
//    stage_removeworststring <boolean> (true for Steel Challenge)
//    stage_maxstringtime     <integer>
//
var Stage = function () {
  var self = this;

  stage.Stage.apply (self, Array.prototype.slice.call (arguments));

  stage.Stage.prototype.setStrings.call (self, 5);

  self.setMaxStringTime (30);
  self.setRemoveWorstString (true);
  self.setScoringType ('SteelChallenge');

  delete self.stage_noshoots; // FIXME: Remove when stage_noshoots defined in match type
  delete self.stage_poppers;  // FIXME: Remove when stage_poppers defined in match type
  delete self.stage_targets;  // FIXME: Remove when stage_targets defined in match type

  return self;
};

Stage.prototype = Object.create (stage.Stage.prototype);

Stage.prototype.setScoringType = function (newScoringType) {
  if (newScoringType !== 'SteelChallenge')
    throw new ConversionError ('setScoringType parameter must be "SteelChallenge"');

  stage.Stage.prototype.setScoringType.call (this, newScoringType);

  return this;
};
Stage.prototype.setMaxStringTime = function (newMaxStringTime) {
  this.stage_maxstringtime = parseInt (newMaxStringTime || 0);
  this.stage_modifieddate = psutils.timeStampUTC ();
  return this;
};
Stage.prototype.setRemoveWorstString = function (newRemoveWorstString) {
  this.stage_removeworststring = newRemoveWorstString ? true : false;
  this.stage_modifieddate = psutils.timeStampUTC ();
  return this;
};
Stage.prototype.merge = function (newStage, options, callback) {
  var self = this;
  var err;
  var changes = [];

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  assert (_.isObject (options));
  assert (_.isFunction (callback));
  assert (newStage, 'sc.Stage.prototype.merge(): newStage cannot be null or undefined');

  options = _.merge (options, {onChangeStage: function (left, right, changeList) {
    merge.compare (left, right, 'stage_maxstringtime', function (ov, nv) {changeList.push (sprintf ('    Maximum string time changed from %s to %s', ov, nv));});
    merge.compare (left, right, 'stage_removeworststring', function (ov, nv) {changeList.push (sprintf ('    Remove worst string changed from %s to %s', ov, nv));});
  }});

  stage.Stage.prototype.merge.call (self, newStage, options, function (stageErr, stageChanges) {
    err = err || stageErr;
    changes = changes.concat (stageChanges);
  });

  if (callback)
    callback (err, changes);

  return self;
};
Stage.prototype.getAsPlainObject = function (options) {
  var self = this;
  var notcompact = !options || !options.compact;
  var s = stage.Stage.prototype.getAsPlainObject.call (self, options);

  if (notcompact || self.stage_maxstringtime)     s.stage_maxstringtime     = self.stage_maxstringtime;
  if (notcompact || self.stage_removeworststring) s.stage_removeworststring = self.stage_removeworststring;

  delete s.stage_targets; // FIXME: This can go after stage_targets moved to match type

  return s;
};
Stage.prototype.parse = function (jsonStage) {
  var self = this;
  var map = {
    stage_maxstringtime:     self.setMaxStringTime,
    stage_removeworststring: self.setRemoveWorstString,
  };

  if (!jsonStage)
    return self;

  _.each (_.keys (map), function (key) {
    if (key in jsonStage) {
      map [key].call (self, jsonStage [key]);
      self._fieldParsed [key] = true;
    } else
      self._fieldParsed [key] = false;
  });

  //
  //  Usually want to call the super class first, but we need it here so that
  //  stage_modifieddate gets set with the value from the match, not what we've
  //  updated it to when we call functions that modify stage_modifieddate.
  //
  stage.Stage.prototype.parse.call (self, jsonStage);

  return self;
};

//
//  From Matchdef:
//    match_approvescores          <boolean>
//    match_cats                   <array:string>
//    match_cls                    <array:string>
//    match_creationdate           <string>
//    match_ctgs                   <string:JSON (array of strings)>
//    match_date                   <string>
//    match_id                     <string>
//    match_logenabled             <boolean>
//    match_logtoken               <string>
//    match_matchpw                <string>
//    match_modifieddate           <string>
//    match_name                   <string>
//    match_owner                  <boolean>
//    match_readonly               <boolean>
//    match_secure                 <boolean>
//    match_shooters               <array:Shooter>
//    match_stages                 <array:Stage>
//    match_type                   <string>
//    match_unsentlogwarningscount <integer>
//    match_useOpenSquadding       <boolean>
//    version                      <string>
//  Adds:
//    match_level                  <string>
//    match_penalties              <array:Penalty>
//    match_subtype                <string>
//
var Matchdef = function (accessorFunctions, options, callback) {
  var self = this;

  callback = maybeCallback (arguments [arguments.length - 1]);

  if (!options || _.isFunction (options))
    options = {};

  matchdef.Matchdef.call (self, accessorFunctions, options, function (err) {
    if (!err) {
      self.match_penalties = [];

      self.setLevel ('T1');
      self.setSubtype ('SCSA');

      matchdef.Matchdef.prototype.setMatchType.call (self, 'sc');

      async.parallel ([
        function (callback) {
          matchdef.Matchdef.prototype.loadCategories.call (self, defaultValues.categories, function (err, categories) {
            if (!err)
              lookups.categories = _.pluck (categories, 'ps_name');
            callback (err);
          });
        },
        function (callback) {
          matchdef.Matchdef.prototype.loadClasses.call (self, defaultValues.classes, function (err, classes) {
            if (!err) {
              lookups.classes = {};
              lookups.classes_flipped = {};
              _.each (classes, function (classs) {
                lookups.classes [classs.ps_name] = classs.pmm_name;
                lookups.classes_flipped [classs.pmm_name] = classs.ps_name;
              });
            }
            callback (err);
          });
        },
        function (callback) {
          matchdef.Matchdef.prototype.loadDivisions.call (self, defaultValues.divisions, function (err, divisions) {
            if (!err) {
              lookups.divisions = {};
              lookups.divisions_flipped = {};
              _.each (divisions, function (division) {
                lookups.divisions [division.ps_name] = division.pmm_name;
                lookups.divisions_flipped [division.pmm_name.toUpperCase ()] = division.ps_name;
              });
            }
            callback (err);
          });
        },
        function (callback) {
          self.loadPenalties (defaultValues.penalties, function (err, penalties) {
            if (!err)
              self._penalties = _.map (penalties, function (penalty) {return new Penalty (penalty);});
            callback (err);
          });
        },
      ], function (err) {
        callback (err, self);
      });
    }
  });

  return self;
};

Matchdef.prototype = Object.create (matchdef.Matchdef.prototype);

Matchdef.prototype.getLevel = function () {
  var self = this;
  var remapLevels = {
    'T1': 'Tier 1',
    'T2': 'Tier 2',
    'T3': 'Tier 3',
    'T4': 'Tier 4',
  };

  if (!self.match_level)
    throw new ConversionError ('Match level in database is null or undefined');
  if (!(self.match_level in remapLevels)) {
    pmelog.llog (pmelog.ERROR, 'Unknown match level "%s" in database', self.match_level);
    throw new ConversionError ('Unknown match level "' + self.match_level + '" in database');
  }

  return remapLevels [self.match_level];
};
Matchdef.prototype.setLevel = function (newLevel) {
  var remapLevels = {
    'Tier 1': 'T1',
    'Tier 2': 'T2',
    'Tier 3': 'T3',
    'Tier 4': 'T4',
    'T1': 'Tier 1',
    'T2': 'Tier 2',
    'T3': 'Tier 3',
    'T4': 'Tier 4',
  };

  if (!(newLevel in remapLevels)) {
    pmelog.llog (pmelog.ERROR, 'Match level "%s" not legal match level value', newLevel);
    throw new ConversionError ('Match level "' + newLevel + '" not legal match level value');
  }

  this.match_level = remapLevels [newLevel];
  return this;
};
Matchdef.prototype.getLevel = function () {
  return this.match_level || 'T1';
};
Matchdef.prototype.setLevel = function (newLevel) {
  this.match_level = newLevel || 'T1';
  this.match_modifieddate = psutils.timeStampUTC ();
  return this;
};
Matchdef.prototype.getSubtype = function () {
  return this.match_subtype;
};
Matchdef.prototype.setSubtype = function (newSubtype) {
  this.match_subtype = newSubtype;
  return this;
};
Matchdef.prototype.loadPenalties = function (defaultPenalties, callback) {
  var self = this;
  var jsonKey = 'penalties_' + self.match_type;
  var modified = false;

  self._accessorFunctions.getFile ().jsonGet (jsonKey, {quiet: true}, function (err, penalties) {
    if (err)
      throw (err);

    if (!penalties) {
      penalties = _.map (defaultPenalties, function (e) {return _.extend ({}, e, {enabled: true, readonly: true});});
      modified = true;
    }

    _.each (penalties, function (penalty) {
      if (_.isUndefined (penalty.uuid)) {
        penalty.uuid = psutils.generateUUID ();
        modified = true;
      }
    });

    if (modified)
      self._accessorFunctions.getFile ().jsonSave (jsonKey, penalties, function (err) {
        if (err)
          throw (err);
      });

    self._penalties = _.map (penalties, function (penalty) {return new Penalty (penalty);});
    // self.match_penalties = _.filter (penalties, 'enabled', true);

    if (callback)
      callback (null, penalties);
  });

  return this;
};
Matchdef.prototype.getPenalties = function () {
  return this.match_penalties || [];
};
Matchdef.prototype.getPenaltiesValueByIndex = function (idx) {
  return (idx >= this.match_penalties.length) ? null : this.match_penalties [idx].getValue ();
};
Matchdef.prototype.setPenalties = function (newPenalties) {
  if (!_.isArray (newPenalties))
    throw new TypeError ('setPenalties() argument must be Array');

  this.match_penalties = newPenalties || [];
  this.match_modifieddate = psutils.timeStampUTC ();

  return this;
};
Matchdef.prototype.addPenalty = function (newPenalty, options) {
  if (newPenalty.className () !== 'Penalty')
    throw new TypeError ('Matchdef.addPenalty parameter must be Penalty object');

  options = options || {};
  this.match_penalties.push (newPenalty);
  this.match_modifieddate = (options.tsKeep ? this.match_modifieddate : null) || psutils.timeStampUTC ();

  return this;
};
Matchdef.prototype.newPenalty = function () {
  return new Penalty (Array.prototype.slice.call (arguments));
};
Matchdef.prototype.newShooter = function () {
  return new Shooter ({sh_pos: this.match_shooters.length + 1});
};
Matchdef.prototype.newStage = function () {
  return new Stage ({stage_number: this.match_stages.length + 1});
};
Matchdef.prototype.setupSubtypes = function () {
  return [
    {label: 'none',                   value: 'none'                  },
    {label: 'NSSF Rimfire Challenge', value: 'NSSF Rimfire Challenge'},
    {label: 'SCSA',                   value: 'SCSA'                  },
  ];
};
Matchdef.prototype.fixup = function (parent, options) {
  var self = this;

  assert (!_.isUndefined (parent));

  //
  //  Because 'RFPO' doesn't make much sense to some people, if the divisions
  //  have been renamed to their long name, if the long name exists, then
  //  convert it to the abbreviation. If we can't find it that way, use the
  //  division name as it stands. We also check the division name for being plural.
  //
  _.each (self.match_cats, function (division, index) {
    if (!lookups.divisions [division]) {
      if (_.isUndefined ((self.match_cats [index] = lookups.divisions_flipped [division.toUpperCase ()])))
        if (_.isUndefined ((self.match_cats [index] = lookups.divisions_flipped [division.toUpperCase () + 'S'])))
          self.match_cats [index] = division;

      pmelog.llog (pmelog.DEBUG, 'Renaming long division name \'%s\' to short name \'%s\'', division, self.match_cats [index]);
    }
  });

  matchdef.Matchdef.prototype.fixup.call (self, parent, options);

  if (_.isEmpty (self.getCategories ()))
    self.setCategories (lookups.categories);

  return self;
};
Matchdef.prototype.merge = function (newMatchdef, options, callback) {
  var self = this;
  var err;
  var changes = [];

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  assert (_.isObject (options));
  assert (_.isFunction (callback));
  assert (newMatchdef, 'sc.Matchdef.prototype.merge(): newMatchdef cannot be null or undefined');

  //
  //  Ick. self and newMatchdef should be left and right.
  //
  options = _.merge (options, {onChangeMatchdef: function (left, right, changeList) {
    merge.compare (left, right, 'match_level',   function (ov, nv) {changeList.push (sprintf ('  Match level changed from %s to %s', ov, nv));});
    merge.compare (left, right, 'match_subtype', function (ov, nv) {changeList.push (sprintf ('  Match subtype changed from %s to %s', ov, nv));});
    merge.compareArrayOfObjects (self, newMatchdef, 'match_penalties', function (objectChanges) {
      _.each (objectChanges, function (t) {
        changeList.push (t);
      });
    });
  }});

  matchdef.Matchdef.prototype.merge.call (self, newMatchdef, options, function (matchdefErr, matchdefChanges) {
    err = matchdefErr;
    changes = changes.concat (matchdefChanges);
  });

  if (callback)
    callback (err, changes);

  return self;
};
Matchdef.prototype.getAsPlainObject = function (options) {
  var self = this;
  var notcompact = !options || !options.compact;
  var m = matchdef.Matchdef.prototype.getAsPlainObject.call (self, options);

  if (notcompact || self.match_level.length)
    m.match_level = self.match_level;
  if (notcompact || self.match_subtype.length)
    m.match_subtype = self.match_subtype;

  if (notcompact || self.match_penalties.length) {
    m.match_penalties = [];

    _.each (self.match_penalties, function (penalty) {
      m.match_penalties.push (penalty.getAsPlainObject (options));
    });
  }

  return m;
};
Matchdef.prototype.parse = function (jsonMatchdef, options) {
  var self = this;
  var map = {
    match_level: self.setLevel,
    match_subtype: self.setSubtype,
    match_penalties: function (penalties) {
      _.each (penalties, function (penalty) {
        self.addPenalty (self.newPenalty ().parse (penalty));
      });
    },
  };

  if (!jsonMatchdef)
    return self;

  options = options || {};

  _.each (jsonMatchdef.match_shooters, function (shooter) {
    self.addShooter (self.newShooter ().parse (shooter, options));
  });

  _.each (jsonMatchdef.match_stages, function (stage) {
    self.addStage (self.newStage ().parse (stage, options));
  });

  _.each (_.keys (map), function (key) {
    if (key in jsonMatchdef) {
      map [key].call (self, jsonMatchdef [key]);
      self._fieldParsed [key] = true;
    } else
      self._fieldParsed [key] = false;
  });

  //
  //  Usually want to call the super class first, but we need it here so that
  //  match_modifieddate gets set with the value from the match, not what we've
  //  updated it to when we call functions that modify match_modifieddate.
  //
  matchdef.Matchdef.prototype.parse.call (self, jsonMatchdef, options);

  return self;
};
Matchdef.prototype.updateClassifications = function (getter, options, callback) {
  var self = this;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  if (!classificationsUpdateMutex.tryLock ())
    callback (null, {modified: false, msg: 'Classification update already in progess'});
  else
    getter.call (this, 'sc', function (err, records) {
      if (err)
        callback (err, {modified: false});
      else if (!records || !records.length)
        callback (null, {modified: false, msg: 'No classification update records available'});
      else {
        var changes = [];
        var updates = {};

        _.each (records, function (record) {
          updates [record.scsa_num] = record.classification;
        });

        _.each (self.getShooters (), function (shooter) {
          var scsaNum = shooter.getMembershipNumber ();
          var classification = shooter.getClass ();
          var division = shooter.getDivision ();
          var newClass = classification;
          var update;
          var classChanged = false;
          var notes;

          if (!scsaNum) {
            if (classification !== 'U') {
              newClass = 'U';
              notes = 'No SCSA#';
            }
          } else if (!division.match (/^(IRPD|ISP|ISR|LTD|OPN|OSR|PCC|PROD|SS)$/)) {
            if (classification !== 'U') {
              newClass = 'U';
              notes = 'Classification not applicable';
            }
          } else {
            if (!(update = updates [scsaNum])) {
              newClass = 'U';
              notes = 'SCSA# not found';
            } else if (classification !== update) {
              newClass = update;
              notes = 'Class changed';
            }
          }

          if (classification !== newClass) {
            shooter.setClass (newClass);
            classChanged = true;
          }

          if (notes)
            changes.push ({
              name: shooter.getFullNameLastFirst (),
              scsa: scsaNum,
              division: lookups.divisions [division],
              oldClass: classification,
              newClass: newClass,
              notes: notes,
              classChanged: classChanged,
              notFound: _.isUndefined (update),
            });
        });


        if (callback)
          callback (null, {modified: changes.length, changes: _.sortBy (_.uniq (changes, 'scsa'))});
      }

      classificationsUpdateMutex.unlock ();
    });

  return self;
};
Matchdef.prototype.resetClassifications = function (callback) {
  _.each (this.getShooters (), function (shooter) {
    shooter.setClass ('U');
  });

  if (callback)
    callback (null);

  return this;
};

//
//  From Score:
//    aprv  <boolean>
//    dname <string>
//    dnf   <boolean>
//    mod   <string>
//    poph  <integer> (not used)
//    popm  <integer> (not used)
//    shtr  <string>
//    str   <array:float> (raw time, before penalties applied)
//    ts    <array:integer> (not used)
//    udid  <string>
//  Adds:
//    penss <array:integer>
//
var Score = function () {
  score.Score.apply (this, Array.prototype.slice.call (arguments));

  this.penss = [];

  return this;
};

Score.prototype = Object.create (score.Score.prototype);

Score.prototype.getPenalties = function () {
  return this.penss;
};
Score.prototype.setPenalties = function (penalties) {
  assert (_.isArray (penalties), "sc.Score.setPenalties parameter must be array");
  this.penss = penalties || [];
  this.mod   = psutils.timeStampUTC ();
  return this;
};
Score.prototype.fixup = function (parent, options) {
  var self = this;
  var shooter = parent.matchdef ().getShooterByUID (self.shtr);

  self._total = 0;
  self._sort = -1;
  self._pensst = [];                              // Penalty time for each string (worst is not dropped, syncs with 'str')
  self._scores = {};
  self._scores.penss_copy = _.clone (this.penss); // Copy of penss with worst string dropped
  self._scores.str_copy  = _.clone (this.str);    // Copy of str with worst string dropped
  self._scores.str_total = [];                    // Total string time (including penalties), worst string dropped
  self._scores.pen_total = 0;                     // Total penalty time, without worst string
  self._scores.raw_total = 0;                     // Raw time total, without worst string
  self._scores.worst = 0;                         // Index of worst time

  score.Score.prototype.fixup.call (self, parent, options);

  _.times (self.str.length, function (n) {self._pensst [n] = 0.0;});

  if (!shooter)
    self._sort = 900000;
  else if (shooter.sh_del)
    self._sort = 800000;
  else if (shooter.sh_dq)
    self._sort = 700000;
  else if (self.dnf)
    self._sort = 600000;
  else {
    //
    //  Create stime with the raw time + penalty times for each string. Do this
    //  first because PractiScore will not flag a missing raw time if the total
    //  penalties >= 30 seconds. We need to calculate the penalties first, then
    //  check for missing times.
    //
    _.each (self.str, function (rawtime, sindex) {
      self._pensst [sindex] = 0;
      self._scores.str_total [sindex] = rawtime;
      _.each (self.penss [sindex], function (penalty, pindex) {
        var pen = penalty * parent.matchdef ().getPenaltiesValueByIndex (pindex);
        self._pensst [sindex] += pen;
        self._scores.str_total [sindex] += pen;
      });
    });

    //
    //  A string time of 0 and a penalty time < 30 seconds is an error.  A
    //  string time of 0 and a penalty time of 0 is an incomplete string. The
    //  first error takes precedence, so if we set 500000, then don't set it to
    //  400000.
    //
    _.each (self.str, function (rawtime, sindex) {
      if (rawtime === 0.0) {
        if (self._pensst [sindex] === 0.0)
          self._sort = _.max ([self._sort, 400000]);
        else if (self._pensst [sindex] < 30)
          self._sort = 500000;
      }
    });
  }

  if (self._sort !== -1)
    return self;

  //
  //  Find the index of the worst time. If two are the same, make the worst
  //  the later one.
  //
  _.each (self._scores.str_total, function (time, index) {
    if (time >= self._scores.str_total [self._scores.worst])
      self._scores.worst = index;
  });

  //
  //  Drop the worst string
  //
  self._scores.str_total.splice (self._scores.worst, 1);
  self._scores.penss_copy.splice (self._scores.worst, 1);
  self._scores.str_copy.splice (self._scores.worst, 1);

  //
  //  Get the total raw time, penalty time, and combined raw + penalty time.
  //  Max string time is 30 seconds, so we cap it at that. We keep the raw
  //  time and penalties, etc so we can display it.
  //
  self._scores.raw_total = _.sum (self._scores.str_copy);
  self._scores.pen_total = _.sum (self._scores.penss_copy);
  self._total = _.sum (self._scores.str_total, function (n) {
    return _.min ([n, 30]);
  });
  self._sort = self._total;

  return self;
};
Score.prototype.merge = function (newScore, options, callback) {
  var self = this;
  var err;
  var changes = [];

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  //
  //  penss is an array of integers, not a Penalty objects. Each value is the
  //  *number* of penalties, with the position in the array corresponding to
  //  the position in the matchdef.match_penalties array (this is the Penalty
  //  object).
  //
  options = _.merge (options, {onChangeScore: function (left, right, changeList) {
    merge.compareArray (left, right, 'penss', function (ov, nv, index) {changeList.push (sprintf ('    Penalty #%d changed from %s to %s', index, ov.penss [index], nv.penss [index]));});
  }});

  score.Score.prototype.merge.call (self, newScore, options, function (scoreErr, scoreChanges) {
    err = scoreErr;
    changes = changes.concat (scoreChanges);
  });

  if (callback)
    callback (err, changes);

  return self;
};
Score.prototype.getAsPlainObject = function (options) {
  var self = this;
  var notcompact = !options || !options.compact;
  var s = score.Score.prototype.getAsPlainObject.call (self, options);

  if (notcompact || self.penss)
    s.penss = self.penss;

  delete s.poph; // FIXME: Remove when poph defined in match type
  delete s.popm; // FIXME: Remove when popm defined in match type
  delete s.ts;   // FIXME: Remove when ts defined in match type

  return s;
};
Score.prototype.parse = function (jsonScore) {
  var self = this;
  var map = {
    penss: self.setPenalties,
  };

  if (!jsonScore)
    return self;

  _.each (_.keys (map), function (key) {
    if (key in jsonScore) {
      map [key].call (self, jsonScore [key]);
      self._fieldParsed [key] = true;
    } else
      self._fieldParsed [key] = false;
  });

  //
  //  Usually want to call the super class first, but we need it here so that
  //  mod gets set with the value from the match, not what we've updated it to
  //  when we call functions that modify mod.
  //
  score.Score.prototype.parse.call (self, jsonScore);

  return self;
};

//
//  From StageScores:
//    stage_number      <integer>
//    stage_stagescores <array:Scores>
//    stage_uuid        <string>
//  Adds:
//    (none)
//
var StageScores = function () {
  return stagescores.StageScores.apply (this, Array.prototype.slice.call (arguments));
};

StageScores.prototype = Object.create (stagescores.StageScores.prototype);

StageScores.prototype.newScore = function () {
  return new Score (Array.prototype.slice.call (arguments));
};

//
//  From MatchScores:
//    match_id             <string>
//    match_scores         <array:StageScores>
//    match_scores_history <hash:hash:array>
//  Adds:
//    (none)
//
var MatchScores = function () {
  return matchscores.MatchScores.apply (this, Array.prototype.slice.call (arguments));
};

MatchScores.prototype = Object.create (matchscores.MatchScores.prototype);

MatchScores.prototype.addStage = function (stageScores) {
  matchscores.MatchScores.prototype.addStage.call (this, stageScores || new StageScores (matchscores.MatchScores.prototype.nextStageNumber.call (this)));
  return this;
};
MatchScores.prototype.newStageScores = function () {
  return new StageScores (Array.prototype.slice.call (arguments));
};
MatchScores.prototype.newHistoryScore = function () {
  return new Score (Array.prototype.slice.call (arguments));
};

//
//  From MatchLog:
//    ?
//  Adds:
//    (none)
//
var MatchLog = function () {
  return matchlog.MatchLog.apply (this, Array.prototype.slice.call (arguments));
};

MatchLog.prototype = Object.create (matchlog.MatchLog.prototype);

//
//
//
var Lookups = function (accessorFunctions, options, callback) {
  callback = maybeCallback (arguments [arguments.length - 1]);
  callback (null, lookups);

  return this;
};

//
//
//
exports.Shooter = Shooter;
exports.Penalty = Penalty;
exports.Stage = Stage;
exports.Matchdef = Matchdef;
exports.Score = Score;
exports.StageScores = StageScores;
exports.MatchScores = MatchScores;
exports.MatchLog = MatchLog;
exports.Lookups = Lookups;
