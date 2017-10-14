'use strict';

var _ = require ('lodash');
var assert = require ('assert');
var fs = require ('fs');
var sprintf = require ('sprintf-js').sprintf;
var merge = require ('../merge');
var pmelog = require ('../pmelog');
var psutils = require ('../utils');

//
//  match_modifieddate does not cover match_shooters or match_stages.
//
var mergeMatchdef = function (newMatchdef, options, callback) {
  var self = this;
  var err = null;
  var changes = [];

  assert (_.isObject (options), 'mergeMatchdef: options is not Object');
  assert (_.isFunction (callback), 'mergeMatchdef: callback is not function');
  assert (newMatchdef, 'mergeMatchdef: newMatchdef cannot be null or undefined');

  //
  //  If we're ignoring the UUID, we don't want the match we're merging to
  //  change any of our parameters. We're the base match, so our parameters
  //  are definitive.
  //
  if (!options.ignoreUUID) {
    if (self.getID () !== newMatchdef.getID ()) {
      err = sprintf ('%s: Match UUIDs don\'t match! (mine=%s, new=%s)', options.deviceName, self.getID (), newMatchdef.getID ());
      pmelog.llog (pmelog.ERROR, err);
    }

    if (!err && merge.rightTimestampIsNewer (self, newMatchdef, 'match_modifieddate')) {
      merge.compare (self, newMatchdef, 'match_approvescores',          options, function (ov, nv) {changes.push (sprintf ('  Approve scores changed from %s to %s', ov, nv));});
      merge.compare (self, newMatchdef, 'match_clubcode',               options, function (ov, nv) {changes.push (sprintf ('  Club code changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newMatchdef, 'match_clubname',               options, function (ov, nv) {changes.push (sprintf ('  Club name changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newMatchdef, 'match_creationdate',           options, function (ov, nv) {changes.push (sprintf ('  Creation date changed from %s to %s', ov, nv));});
      merge.compare (self, newMatchdef, 'match_date',                   options, function (ov, nv) {changes.push (sprintf ('  Date changed from %s to %s', ov, nv));});
      merge.compare (self, newMatchdef, 'match_logenabled',             options, function (ov, nv) {changes.push (sprintf ('  Log enabled changed from %s to %s', ov, nv));});
      merge.compare (self, newMatchdef, 'match_logtoken',               options, function (ov, nv) {changes.push (sprintf ('  Log token changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newMatchdef, 'match_matchpw',                options, function (ov, nv) {changes.push (sprintf ('  Match password changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newMatchdef, 'match_maxteamresults',         options, function (ov, nv) {changes.push (sprintf ('  Max team results changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newMatchdef, 'match_name',                   options, function (ov, nv) {changes.push (sprintf ('  Match name changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newMatchdef, 'match_owner',                  options, function (ov, nv) {changes.push (sprintf ('  Owner changed from %s to %s', ov, nv));});
      merge.compare (self, newMatchdef, 'match_readonly',               options, function (ov, nv) {changes.push (sprintf ('  Read-only changed from %s to %s', ov, nv));});
      merge.compare (self, newMatchdef, 'match_secure',                 options, function (ov, nv) {changes.push (sprintf ('  Match secured changed from %s to %s', ov, nv));});
      merge.compare (self, newMatchdef, 'match_stagedqvalue',           options, function (ov, nv) {changes.push (sprintf ('  Stage DQ value changed from %s to %s', ov, nv));});
      merge.compare (self, newMatchdef, 'match_type',                   options, function (ov, nv) {changes.push (sprintf ('  Match type changed from %s to %s', ov, nv));});
      merge.compare (self, newMatchdef, 'match_unsentlogswarningcount', options, function (ov, nv) {changes.push (sprintf ('  Unsent logs warning count changed from %s to %s', ov, nv));});
      merge.compare (self, newMatchdef, 'match_useOpenSquadding',       options, function (ov, nv) {changes.push (sprintf ('  Use open squadding changed from %s to %s', ov, nv));});

      merge.compare (self, newMatchdef, 'match_cats',                   _.merge ({}, options, {addNew: true}), function (ov, nv) {changes.push (sprintf ('  Divisions changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newMatchdef, 'match_cls',                    _.merge ({}, options, {addNew: true}), function (ov, nv) {changes.push (sprintf ('  Classes changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newMatchdef, 'match_ctgs',                   _.merge ({}, options, {addNew: true}), function (ov, nv) {changes.push (sprintf ('  Categories changed from \'%s\' to \'%s\'', ov, nv));});

      self.match_dqs = newMatchdef.match_dqs;
      self.match_nots = newMatchdef.match_nots;
      self.match_procs = newMatchdef.match_procs;
// FIXME:      merge.compare (self, newMatchdef, 'match_dqs',                    _.merge ({}, options, {addNew: true}), function (ov, nv) {changes.push (sprintf ('  DQs changed from \'%s\' to \'%s\'', ov, nv));});
// FIXME:      merge.compare (self, newMatchdef, 'match_nots',                   _.merge ({}, options, {addNew: true}), function (ov, nv) {changes.push (sprintf ('  Notifications changed from \'%s\' to \'%s\'', ov, nv));});
// FIXME:      merge.compare (self, newMatchdef, 'match_procs',                  _.merge ({}, options, {addNew: true}), function (ov, nv) {changes.push (sprintf ('  Procedurals changed from \'%s\' to \'%s\'', ov, nv));});

      if (_.isFunction (options.onChangeMatchdef))
        options.onChangeMatchdef (self, newMatchdef, changes);

      merge.compare (self, newMatchdef, 'match_modifieddate');
    }
  }

  if (changes.length)
    changes.unshift ("Match information changed:");

  if (err)
    pmelog.llog (pmelog.WARN, err);

  if (callback)
    callback (err, changes);

  return self;
};

var mergeMatchdefShooters = function (newMatchdef, options, callback) {
  var self = this;
  var changes = [];
  var uidList = {};

  assert (_.isObject (options), 'mergeMatchdefShooters: options is not Object');
  assert (_.isFunction (callback), 'mergeMatchdefShooters: callback is not function');
  assert (newMatchdef, 'mergeMatchdefShooters: newMatchdef cannot be null or undefined');

  if (!newMatchdef.getShooters ().length) {
    pmelog.llog (pmelog.INFO, '%s: No shooters defined in match to be merged, returning early', options.deviceName);
    if (callback)
      callback (null, changes);
    return self;
  }

  //
  //  uidList is a hash with the sh_uid as the key. First the hash is populated
  //  with the shooters we already have, with the value as false.  Then as we
  //  process each shooter in newMatchdef, if their UID exists, we delete it.
  //  If the newMatchdef shooter doesn't exist, we add them to the hash, but
  //  with the value set to true.  This leaves us with a list of differences
  //  between the two matches, where entries with false values exist in self
  //  but not newMatchdef, and entries with true values exist in newMatchdef
  //  but not self.
  //
  _.each (self.getShooters (), function (shooter) {
    uidList [shooter.getID ()] = false;
  });

  //
  //  For the competitors present in both, merge any differences.
  //
  _.each (newMatchdef.getShooters (), function (rightShooter) {
    var rightShooterID = rightShooter.getID ();
    var leftShooter = self.getShooterByUID (rightShooterID);

    if (!_.isUndefined (uidList [rightShooterID]))
      delete uidList [rightShooterID];
    else
      uidList [rightShooterID] = true;

    if (!_.isUndefined (leftShooter))
      leftShooter.merge (rightShooter, options, function (err, shooterChanges) {
        changes = changes.concat (shooterChanges);
      });
  });

  //
  //  Add any competitors that that exist only in newMatchdef, ignore any
  //  competitors that are only in self.
  //
  _.each (uidList, function (uidValue, uidKey) {
    if (uidValue) {
      var newShooter = newMatchdef.getShooterByUID (uidKey);

      if (!_.isUndefined (newShooter)) {
        self.addShooter (newShooter);
        changes.push (sprintf ('  Adding new competitor \'%s %s\'', newShooter.getFirstName (), newShooter.getLastName ()));
      } else
        pmelog.llog (pmelog.ERROR, '%s: Asking for ID %s in newMatchdef.match_shooters returned undefined!', options.deviceName, uidKey);
    } else {
      var existingShooter = self.getShooterByUID (uidKey);
      assert (existingShooter, 'mergeMatchdefShooters: existingShooter is null or undefined');
      pmelog.llog (pmelog.DEBUG, '%s: Skipping shooter \'%s %s\' that only we have', options.deviceName, existingShooter.getFirstName (), existingShooter.getLastName ());
    }
  });

  if (changes.length)
    changes.unshift ("Shooter information changed:");

  if (callback)
    callback (null, changes);
};

var mergeMatchdefStages = function (newMatchdef, options, callback) {
  var self = this;
  var err;
  var changes = [];
  var uuidList = {};

  assert (_.isObject (options), 'mergeMatchdefStages: options is not Object');
  assert (_.isFunction (callback), 'mergeMatchdefStages: callback is not function');
  assert (newMatchdef, 'mergeMatchdefStages: newMatchdef cannot be null or undefined');

  if (!newMatchdef.numberOfStages ()) {
    pmelog.llog (pmelog.INFO, '%s: No stages defined in match to be merged, returning early', options.deviceName);
    if (callback)
      callback (null, changes);
    return self;
  }

  if (!self.numberOfStages ())
    pmelog.llog (pmelog.INFO, '%s: I have no stages defined, will merge all client stages', options.deviceName);

  //
  //  uuidList is a hash with the stage_uuid as the key. First the hash is
  //  populated with the stages we already have, with the value as false.  Then
  //  as we process each stage in newMatchdef, if the UUID exists, we delete
  //  it.  If the newMatchdef stage doesn't exist, we add it to the hash, but
  //  with the value set to true.  This leaves us with a list of differences
  //  between the two matches, where entries with false values exist in self
  //  but not newMatchdef, and entries with true values exist in newMatchdef
  //  but not self.
  //
  _.each (self.getStages (), function (stage) {
    uuidList [stage.getID ()] = false;
  });

  //
  //  For the stages present in both, merge any differences.
  //
  _.each (newMatchdef.getStages (), function (rightStage) {
    var rightStageID = rightStage.getID ();
    var leftStage = self.getStageByUUID (rightStageID);

    if (!_.isUndefined (uuidList [rightStageID]))
      delete uuidList [rightStageID];
    else
      uuidList [rightStageID] = true;

    if (!_.isUndefined (leftStage)) {
      leftStage.merge (rightStage, options, function (stageErr, stageChanges) {
        err = stageErr;
        changes = changes.concat (stageChanges);
      });
    }
  });

  //
  //  Add any stages that that exist only in newMatchdef, ignore any stages
  //  that are only in self.
  //
  _.each (uuidList, function (uidValue, uidKey) {
    if (uidValue) {
      var newStage = newMatchdef.getStageByUUID (uidKey);

      if (!_.isUndefined (newStage)) {
        self.addStage (newStage);
        changes.push (sprintf ('  Adding new stage \'%s\'', newStage.getName ()));
      } else
        pmelog.llog (pmelog.ERROR, '%s: Asking for stage ID %s in newMatchdef.match_stages returned undefined!', options.deviceName, uidKey);
    } else {
      var existingStage = self.getStageByUUID (uidKey);
      assert (existingStage, 'mergeMatchdefStages: existingStage is null or undefined');
      pmelog.llog (pmelog.DEBUG, '%s: Skipping stage \'%s\' that only we have', options.deviceName, existingStage.getName ());
    }
  });

  if (changes.length)
    changes.unshift ("Stage information changed:");

  if (callback)
    callback (err, changes);
};

//
//
//
var Matchdef = function (accessorFunctions, options, callback) {
  var self = this;

  var tsUTC = psutils.timeStampUTC ();
  var tsLocal = psutils.timeStampLocal ();

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  self._accessorFunctions   = accessorFunctions;
  self._pendingChanges      = false;
  self._fieldParsed         = {};
  self._categories          = {};  // sh_ctgs:Hash
  self._classes             = {};  // sh_cls:Hash
  self._divisions           = {};  // sh_cats:Hash

  self.match_approvescores  = false;
  self.match_cats           = [];
  self.match_cls            = [];
  self.match_clubcode       = '';
  self.match_clubname       = '';
  self.match_creationdate   = tsUTC;
  self.match_ctgs           = [];
  self.match_date           = tsLocal.substr (0, tsLocal.indexOf (' '));
  self.match_dqs            = [];
  self.match_id             = psutils.generateUUID ();
  self.match_logenabled     = false;
  self.match_logtoken       = '';
  self.match_matchpw        = '';
  self.match_maxteamresults = 4;
  self.match_modifieddate   = tsUTC;
  self.match_name           = 'New Match';
  self.match_nots           = [];
  self.match_owner          = true;
  self.match_procs          = [];
  self.match_readonly       = false;
  self.match_secure         = false;
  self.match_shooters       = [];
  self.match_stages         = [];
  self.match_stagedqvalues  = 999;
  self.match_type           = '';
  self.match_unsentlogswarningcount = 1;
  self.match_useOpenSquadding       = false;
  self.version              = '1.64';

  if (callback)
    callback (null, self);

  return self;
};

Matchdef.prototype.className = function () {
  return 'Matchdef';
};
Matchdef.prototype.getApproveScores = function () {
  return this.match_approvescores;
};
Matchdef.prototype.setApproveScores = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setApproveScores() argument must be boolean');
  this.match_approvescores = state;
  this.match_modifieddate = psutils.timeStampUTC ();
  return this;
};
Matchdef.prototype.loadCategories = function (defaultCategories, callback) {
  var self = this;
  var modified = false;
  var jsonKey = 'categories_' + self.match_type;

  self._accessorFunctions.getFile ().jsonGet (jsonKey, {quiet: true}, function (err, categories) {
    if (err)
      throw (err);

    if (!categories) {
      categories = _.map (defaultCategories, function (e) {return _.extend ({}, e, {enabled: true, readonly: true});});
      modified = true;
    }

    _.each (categories, function (category) {
      if (_.isUndefined (category.uuid)) {
        category.uuid = psutils.generateUUID ();
        modified = true;
      }
    });

    if (modified)
      self._accessorFunctions.getFile ().jsonSave (jsonKey, categories, function (err) {
        if (err)
          throw (err);
      });

    self._categories = categories;
    self.match_ctgs = _.pluck (_.filter (categories, 'enabled', true), 'ps_name');

    if (callback)
      callback (null, categories);
  });

  return this;
};
Matchdef.prototype.getCategories = function () {
  return this.match_ctgs;
};
Matchdef.prototype.getCategoriesEx = function () {
  return this._categories;
};
Matchdef.prototype.updateCategories = function (categories, options, callback) {
  var self = this;
  var modified = false;
  var duplicate = false;
  var notfound = false;
  var readonly = false;
  var index;
  var pmm;
  var changes = [];

  if (categories)
    assert (_.isArray (categories));
  else
    categories = [];

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  _.each (categories, function (category) {
    if (category.remove) {
      if ((index = _.findIndex (self._categories, 'uuid', category.uuid)) > -1) {
        pmm = self._categories [index];
        if (!pmm.readonly) {
          self._categories.splice (index, 1);
          changes.push (sprintf ('Category \'%s\'/\'%s\' deleted', pmm.pmm_name, pmm.ps_name));
          modified = true;
        } else {
          readonly = true;
          pmelog.llog (pmelog.INFO, 'Warning: attempting to delete read-only category \'%s/%s\'', pmm.ps_name, pmm.pmm_name);
        }
      } else {
        notfound = true;
        pmelog.llog (pmelog.INFO, 'Warning: attempting to delete non-existent category \'%s\'', category.ps_name);
      }
    }

    if (category.add) {
      if (!(pmm = _.find (self._categories, 'ps_name', category.ps_name)) && !(pmm = _.find (self._categories, 'pmm_name', category.pmm_name))) {
        self._categories.push ({
          ps_name:  category.ps_name,
          pmm_name: category.pmm_name || category.ps_name,
          enabled:  _.isBoolean (category.enabled) ? category.enabled : true,
          readonly: _.isBoolean (category.readonly) ? category.readonly : false,
          uuid:     category.uuid || psutils.generateUUID (),
        });
        changes.push (sprintf ('Category \'%s\'/\'%s\' added', category.pmm_name, category.ps_name));
        modified = true;
      } else if (!options.nodupwarn) {
        duplicate = true;
        pmelog.llog (pmelog.INFO, 'Warning: attempting to add duplicate category \'%s/%s\'', category.ps_name, category.pmm_name);
      }
    }

    if (category.modify) {
      if ((pmm = _.find (self._categories, 'uuid', category.uuid))) {
        _.each (['ps_name', 'pmm_name'], function (field) {
          if (_.isString (category [field]) && (pmm [field] !== category [field])) {
            if (pmm.readonly)
              readonly = true;
            else {
              changes.push (sprintf ('  %s changed from \'%s\' to \'%s\'', field, pmm [field], category [field]));
              pmm [field] = category [field];
              modified = true;
            }
          }
        });
        _.each (['enabled', 'readonly'], function (field) {
          if (_.isBoolean (category [field]) && (pmm [field] !== category [field])) {
            if ((field !== 'enabled') && pmm.readonly)
              readonly = true;
            else {
              changes.push (sprintf ('  %s changed from \'%s\' to \'%s\'', field, pmm [field], category [field]));
              pmm [field] = category [field];
              modified = true;
            }
          }
        });

        if (readonly)
          pmelog.llog (pmelog.INFO, 'Warning: attempting to modify read-only category \'%s/%s\'', pmm.ps_name, pmm.pmm_name);
      } else {
        notfound = true;
        pmelog.llog (pmelog.INFO, 'Warning: attempting to modify non-existent category \'%s\'', category.ps_name);
      }

      if (modified)
        changes.unshift (sprintf ('Category \'%s\'/\'%s\' modified:', pmm.pmm_name, pmm.ps_name));
    }
  });

  if (options.force)
    modified = true;

  if (modified) {
    self.match_ctgs = _.pluck (_.filter (self._categories, 'enabled', true), 'ps_name');
    self.match_modifieddate = psutils.timeStampUTC ();

    self._accessorFunctions.getFile ().jsonSave ('categories_' + self.match_type, self._categories);
  }

  if (!options.quiet)
    _.each (changes, function (msg) {
      pmelog.llog (pmelog.INFO, 'categories:update: %s', msg);
    });

  if (callback)
    callback (duplicate || notfound || readonly, {
      changes: changes,
      modified: modified,
      duplicate: duplicate,
      notfound: notfound,
      readonly: readonly,
    });

  return self;
};
Matchdef.prototype.addCategories = function (categories, options, callback) {
  var self = this;
  var newCategories = [];

  if (_.isString (categories))
    categories = new Array (categories);

  if (!_.isArray (categories))
    throw new TypeError ('addCategories() argument must be Array');

  if (_.isString (categories [0])) {
    _.each (categories, function (category) {
      newCategories.push ({
        add:      true,
        ps_name:  category,
        pmm_name: category,
        enabled:  true,
        readonly: false,
        uuid:     psutils.generateUUID (),
      });
    });
  } else {
    _.each (categories, function (category) {
      newCategories.push ({
        add:      true,
        ps_name:  category.ps_name || category,
        pmm_name: category.pmm_name || category,
        enabled:  _.isBoolean (category.enabled) ? category.enabled : true,
        readonly: _.isBoolean (category.readonly) ? category.readonly : false,
        uuid:     category.uuid || psutils.generateUUID (),
      });
    });
  }

  self.updateCategories (newCategories, options, callback);

  return self;
};
Matchdef.prototype.setCategories = function (newCategories) {
  if (_.isString (newCategories)) {
    try {
      newCategories = JSON.parse (newCategories);
    } catch (e) {
      newCategories = [];
    }
  } else if (!_.isArray (newCategories))
    throw new TypeError ('setCategories() argument must be string or array');

  return this.addCategories (newCategories, {nodupwarn: true});
};
Matchdef.prototype.modifyCategories = function (categories, options, callback) {
  var self = this;
  var newCategories = _.clone (categories);

  if (!_.isArray (categories))
    throw new TypeError ('deleteCategories() argument must be a Array');

  _.each (newCategories, function (category) {
    category.modify = true;
  });

  self.updateCategories (newCategories, options, callback);

  return self;
};
Matchdef.prototype.deleteCategories = function (categories, options, callback) {
  var self = this;
  var newCategories = _.clone (categories);

  if (!_.isArray (categories))
    throw new TypeError ('deleteCategories() argument must be a Array');

  _.each (newCategories, function (category) {
    category.remove = true;
  });

  self.updateCategories (newCategories, options, callback);

  return self;
};
Matchdef.prototype.moveCategories = function (from, to, options, callback) {
  var self = this;
  var fromIndex = _.findIndex (self._categories, {uuid: from.uuid});
  var toIndex = _.findIndex (self._categories, {uuid: to.uuid});
  var changed = (fromIndex !== toIndex);

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  if (changed) {
    if (fromIndex < toIndex)
      toIndex--;

    self._categories.splice (toIndex, 0, (self._categories.splice (fromIndex, 1) [0]));
  } else {
    pmelog.llog (pmelog.WARN, 'That\s weird... fromIndex and toIndex are the same');
    pmelog.llog (pmelog.DEBUG, 'self._categories -->');
    pmelog.ldirex (pmelog.DEBUG, self._categories);
    pmelog.llog (pmelog.DEBUG, 'from -->');
    pmelog.ldirex (pmelog.DEBUG, from);
    pmelog.llog (pmelog.DEBUG, 'to -->');
    pmelog.ldirex (pmelog.DEBUG, to);
  }

  self.updateCategories (null, _.merge ({}, options, {force: changed}), callback);

  return self;
};
//
//-----------------------------------------------------------------------------
//
Matchdef.prototype.loadClasses = function (defaultClasses, callback) {
  var self = this;
  var modified = false;
  var jsonKey = 'classes_' + self.match_type;

  self._accessorFunctions.getFile ().jsonGet (jsonKey, {quiet: true}, function (err, classes) {
    if (err)
      throw (err);

    if (!classes) {
      classes = _.map (defaultClasses, function (e) {return _.extend ({}, e, {enabled: true, readonly: true});});
      modified = true;
    }

    _.each (classes, function (classs) {
      if (_.isUndefined (classs.uuid)) {
        classs.uuid = psutils.generateUUID ();
        modified = true;
      }
    });

    if (modified)
      self._accessorFunctions.getFile ().jsonSave (jsonKey, classes, function (err) {
        if (err)
          throw (err);
      });

    self._classes = classes;
    self.match_cls = _.pluck (_.filter (classes, 'enabled', true), 'ps_name');

    if (callback)
      callback (null, classes);
  });

  return this;
};
Matchdef.prototype.getClasses = function () {
  return this.match_cls;
};
Matchdef.prototype.getClassesEx = function () {
  return this._classes;
};
Matchdef.prototype.updateClasses = function (classes, options, callback) {
  var self = this;
  var modified = false;
  var duplicate = false;
  var notfound = false;
  var readonly = false;
  var index;
  var pmm;
  var changes = [];

  if (classes)
    assert (_.isArray (classes));
  else
    classes = [];

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  _.eachRight (classes, function (classs) {
    if (classs.remove) {
      if ((index = _.findIndex (self._classes, 'uuid', classs.uuid)) > -1) {
        pmm = self._classes [index];
        if (!pmm.readonly) {
          self._classes.splice (index, 1);
          changes.push (sprintf ('Class \'%s\'/\'%s\' deleted', pmm.pmm_name, pmm.ps_name));
          modified = true;
        } else {
          readonly = true;
          pmelog.llog (pmelog.INFO, 'Warning: attempting to delete read-only class \'%s/%s\'', pmm.ps_name, pmm.pmm_name);
        }
      } else {
        notfound = true;
        pmelog.llog (pmelog.INFO, 'Warning: attempting to delete non-existent class \'%s\'', classs.ps_name);
      }
    }

    if (classs.add) {
      if (!(pmm = _.find (self._classes, 'ps_name', classs.ps_name)) && !(pmm = _.find (self._classes, 'pmm_name', classs.pmm_name))) {
        self._classes.push ({
          ps_name:  classs.ps_name,
          pmm_name: classs.pmm_name || classs.ps_name,
          enabled:  _.isBoolean (classs.enabled) ? classs.enabled : true,
          readonly: _.isBoolean (classs.readonly) ? classs.readonly : false,
          uuid:     classs.uuid || psutils.generateUUID (),
        });
        changes.push (sprintf ('Class \'%s\'/\'%s\' added', classs.pmm_name, classs.ps_name));
        modified = true;
      } else if (!options.nodupwarn) {
        duplicate = true;
        pmelog.llog (pmelog.INFO, 'Warning: attempting to add duplicate class \'%s/%s\'', pmm.ps_name, pmm.pmm_name);
      }
    }

    if (classs.modify) {
      if ((pmm = _.find (self._classes, 'uuid', classs.uuid))) {
        _.each (['ps_name', 'pmm_name'], function (field) {
          if (_.isString (classs [field]) && (pmm [field] !== classs [field])) {
            if (pmm.readonly)
              readonly = true;
            else {
              changes.push (sprintf ('  %s changed from \'%s\' to \'%s\'', field, pmm [field], classs [field]));
              pmm [field] = classs [field];
              modified = true;
            }
          }
        });
        _.each (['enabled', 'readonly'], function (field) {
          if (_.isBoolean (classs [field]) && (pmm [field] !== classs [field])) {
            if ((field !== 'enabled') && pmm.readonly)
              readonly = true;
            else {
              changes.push (sprintf ('  %s changed from \'%s\' to \'%s\'', field, pmm [field], classs [field]));
              pmm [field] = classs [field];
              modified = true;
            }
          }
        });

        if (readonly)
          pmelog.llog (pmelog.INFO, 'Warning: attempting to modify read-only class \'%s/%s\'', pmm.ps_name, pmm.pmm_name);
      } else {
        notfound = true;
        pmelog.llog (pmelog.INFO, 'Warning: attempting to modify non-existent class \'%s\'', classs.ps_name);
      }

      if (modified)
        changes.unshift (sprintf ('Class \'%s\'/\'%s\' modified:', pmm.pmm_name, pmm.ps_name));
    }
  });

  if (options.force)
    modified = true;

  if (modified && !duplicate && !notfound && !readonly) {
    self.match_cls = _.pluck (_.filter (self._classes, 'enabled', true), 'ps_name');
    self.match_modifieddate = psutils.timeStampUTC ();

    self._accessorFunctions.getFile ().jsonSave ('classes_' + self.match_type, self._classes);
  }

  if (!options.quiet)
    _.each (changes, function (msg) {
      pmelog.llog (pmelog.INFO, 'classes:update: %s', msg);
    });

  if (callback)
    callback (duplicate || notfound || readonly, {
      changes: changes,
      modified: modified,
      duplicate: duplicate,
      notfound: notfound,
      readonly: readonly,
    });

  return self;
};
Matchdef.prototype.addClasses = function (classes, options, callback) {
  var self = this;
  var newClasses = [];

  if (_.isString (classes))
    classes = new Array (classes);

  if (!_.isArray (classes))
    throw new TypeError ('addClasses() argument must be Array');

  if (_.isString (classes [0])) {
    _.each (classes, function (classs) {
      newClasses.push ({
        add:      true,
        ps_name:  classs,
        pmm_name: classs,
        enabled:  true,
        readonly: false,
        uuid:     psutils.generateUUID (),
      });
    });
  } else {
    _.each (classes, function (classs) {
      newClasses.push ({
        add:      true,
        ps_name:  classs.ps_name || classs,
        pmm_name: classs.pmm_name || classs,
        enabled:  _.isBoolean (classs.enabled) ? classs.enabled : true,
        readonly: _.isBoolean (classs.readonly) ? classs.readonly : false,
        uuid:     classs.uuid || psutils.generateUUID (),
      });
    });
  }

  self.updateClasses (newClasses, options, callback);

  return self;
};
Matchdef.prototype.setClasses = function (newClasses) {
  return this.addClasses (newClasses, {nodupwarn: true});
};
Matchdef.prototype.modifyClasses = function (classes, options, callback) {
  var self = this;
  var newClasses = _.clone (classes);

  if (!_.isArray (classes))
    throw new TypeError ('deleteClasses() argument must be a Array');

  _.each (newClasses, function (classs) {
    classs.modify = true;
  });

  self.updateClasses (newClasses, options, callback);

  return self;
};
Matchdef.prototype.deleteClasses = function (classes, options, callback) {
  var self = this;
  var newClasses = _.clone (classes);

  if (!_.isArray (classes))
    throw new TypeError ('deleteClasses() argument must be a Array');

  _.each (newClasses, function (classs) {
    classs.remove = true;
  });

  self.updateClasses (newClasses, options, callback);

  return self;
};
Matchdef.prototype.moveClasses = function (from, to, options, callback) {
  var self = this;
  var fromIndex = _.findIndex (self._classes, {uuid: from.uuid});
  var toIndex = _.findIndex (self._classes, {uuid: to.uuid});
  var changed = (fromIndex !== toIndex);

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  if (changed) {
    if (fromIndex < toIndex)
      toIndex--;

    self._classes.splice (toIndex, 0, (self._classes.splice (fromIndex, 1) [0]));
  } else {
    pmelog.llog (pmelog.WARN, 'That\s weird... fromIndex and toIndex are the same');
    pmelog.llog (pmelog.DEBUG, 'self._classes -->');
    pmelog.ldirex (pmelog.DEBUG, self._classes);
    pmelog.llog (pmelog.DEBUG, 'from -->');
    pmelog.ldirex (pmelog.DEBUG, from);
    pmelog.llog (pmelog.DEBUG, 'to -->');
    pmelog.ldirex (pmelog.DEBUG, to);
  }

  self.updateClasses (null, _.merge ({}, options, {force: changed}), callback);

  return self;
};
//
//-----------------------------------------------------------------------------
//
Matchdef.prototype.loadDivisions = function (defaultDivisions, callback) {
  var self = this;
  var modified = false;
  var jsonKey = 'divisions_' + self.match_type;

  self._accessorFunctions.getFile ().jsonGet (jsonKey, {quiet: true}, function (err, divisions) {
    if (err)
      throw (err);

    if (!divisions) {
      divisions = _.map (defaultDivisions, function (e) {return _.extend ({}, e, {enabled: true, readonly: true});});
      modified = true;
    }

    _.each (divisions, function (division) {
      if (_.isUndefined (division.uuid)) {
        division.uuid = psutils.generateUUID ();
        modified = true;
      }
    });

    if (modified)
      self._accessorFunctions.getFile ().jsonSave (jsonKey, divisions, function (err) {
        if (err)
          throw (err);
      });

    self._divisions = divisions;
    self.match_cats = _.pluck (_.filter (divisions, 'enabled', true), 'ps_name');

    if (callback)
      callback (null, divisions);
  });

  return this;
};
Matchdef.prototype.getDivisions = function () {
  return this.match_cats;
};
Matchdef.prototype.getDivisionsEx = function () {
  return this._divisions;
};
Matchdef.prototype.updateDivisions = function (divisions, options, callback) {
  var self = this;
  var modified = false;
  var duplicate = false;
  var notfound = false;
  var readonly = false;
  var index;
  var pmm;
  var changes = [];

  if (divisions)
    assert (_.isArray (divisions));
  else
    divisions = [];

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  _.eachRight (divisions, function (division) {
    if (division.remove) {
      if ((index = _.findIndex (self._divisions, 'uuid', division.uuid)) > -1) {
        pmm = self._divisions [index];
        if (!pmm.readonly) {
          self._divisions.splice (index, 1);
          changes.push (sprintf ('Division \'%s\'/\'%s\' deleted', pmm.pmm_name, pmm.ps_name));
          modified = true;
        } else {
          readonly = true;
          pmelog.llog (pmelog.INFO, 'Warning: attempting to delete read-only division \'%s/%s\'', pmm.ps_name, pmm.pmm_name);
        }
      } else {
        notfound = true;
        pmelog.llog (pmelog.INFO, 'Warning: attempting to delete non-existent division \'%s\'', division.ps_name);
      }
    }

    if (division.add) {
      if (!(pmm = _.find (self._divisions, 'ps_name', division.ps_name)) && !(pmm = _.find (self._divisions, 'pmm_name', division.pmm_name))) {
        self._divisions.push ({
          ps_name:  division.ps_name,
          pmm_name: division.pmm_name || division.ps_name,
          enabled:  _.isBoolean (division.enabled) ? division.enabled : true,
          readonly: _.isBoolean (division.readonly) ? division.readonly : false,
          uuid:     division.uuid || psutils.generateUUID (),
        });
        changes.push (sprintf ('Division \'%s\'/\'%s\' added', division.pmm_name, division.ps_name));
        modified = true;
      } else if (!options.nodupwarn) {
        duplicate = true;
        pmelog.llog (pmelog.INFO, 'Warning: attempting to add duplicate division \'%s/%s\'', pmm.ps_name, pmm.pmm_name);
      }
    }

    if (division.modify) {
      if ((pmm = _.find (self._divisions, 'uuid', division.uuid))) {
        _.each (['ps_name', 'pmm_name'], function (field) {
          if (_.isString (division [field]) && (pmm [field] !== division [field])) {
            if (pmm.readonly)
              readonly = true;
            else {
              changes.push (sprintf ('  %s changed from \'%s\' to \'%s\'', field, pmm [field], division [field]));
              pmm [field] = division [field];
              modified = true;
            }
          }
        });
        _.each (['enabled', 'readonly'], function (field) {
          if (_.isBoolean (division [field]) && (pmm [field] !== division [field])) {
            if ((field !== 'enabled') && pmm.readonly)
              readonly = true;
            else {
              changes.push (sprintf ('  %s changed from \'%s\' to \'%s\'', field, pmm [field], division [field]));
              pmm [field] = division [field];
              modified = true;
            }
          }
        });

        if (readonly)
          pmelog.llog (pmelog.INFO, 'Warning: attempting to modify read-only division \'%s/%s\'', pmm.ps_name, pmm.pmm_name);
      } else {
        notfound = true;
        pmelog.llog (pmelog.INFO, 'Warning: attempting to modify non-existent division \'%s\'', division.ps_name);
      }

      if (modified)
        changes.unshift (sprintf ('Division \'%s\'/\'%s\' modified:', pmm.pmm_name, pmm.ps_name));
    }
  });

  if (options.force)
    modified = true;

  if (modified && !duplicate && !notfound && !readonly) {
    self.match_cats = _.pluck (_.filter (self._divisions, 'enabled', true), 'ps_name');
    self.match_modifieddate = psutils.timeStampUTC ();

    self._accessorFunctions.getFile ().jsonSave ('divisions_' + self.match_type, self._divisions);
  }

  if (!options.quiet)
    _.each (changes, function (msg) {
      pmelog.llog (pmelog.INFO, 'classes:update: %s', msg);
    });

  if (callback)
    callback (duplicate || notfound || readonly, {
      changes: changes,
      modified: modified,
      duplicate: duplicate,
      notfound: notfound,
      readonly: readonly,
    });

  return self;
};
//
//  May be a single string ('CO'), an array of strings (['CO', 'LTD',
//  'LTDTEN']) or array of objects [{ps_name: 'CO', pmm_name: 'Carry Optics',
//  enabled: true, readonly: false},{...}]
//
Matchdef.prototype.addDivisions = function (divisions, options, callback) {
  var self = this;
  var newDivisions = [];

  if (_.isString (divisions))
    divisions = new Array (divisions);

  if (!_.isArray (divisions))
    throw new TypeError ('addDivisions() argument must be Array');

  if (_.isString (divisions [0])) {
    _.each (divisions, function (division) {
      newDivisions.push ({
        add:      true,
        ps_name:  division,
        pmm_name: division,
        enabled:  true,
        readonly: false,
        uuid:     psutils.generateUUID (),
      });
    });
  } else {
    _.each (divisions, function (division) {
      newDivisions.push ({
        add:      true,
        ps_name:  division.ps_name || division,
        pmm_name: division.pmm_name || division,
        enabled:  _.isBoolean (division.enabled) ? division.enabled : true,
        readonly: _.isBoolean (division.readonly) ? division.readonly : false,
        uuid:     division.uuid || psutils.generateUUID (),
      });
    });
  }

  self.updateDivisions (newDivisions, options, callback);

  return self;
};
Matchdef.prototype.setDivisions = function (newDivisions) {
  return this.addDivisions (newDivisions, {nodupwarn: true});
};
Matchdef.prototype.modifyDivisions = function (divisions, options, callback) {
  var self = this;
  var newDivisions = _.clone (divisions);

  if (!_.isArray (divisions))
    throw new TypeError ('deleteDivisions() argument must be a Array');

  _.each (newDivisions, function (division) {
    division.modify = true;
  });

  self.updateDivisions (newDivisions, options, callback);

  return self;
};
Matchdef.prototype.deleteDivisions = function (divisions, options, callback) {
  var self = this;
  var newDivisions = _.clone (divisions);

  if (!_.isArray (divisions))
    throw new TypeError ('deleteDivisions() argument must be a Array');

  _.each (newDivisions, function (division) {
    division.remove = true;
  });

  self.updateDivisions (newDivisions, options, callback);

  return self;
};
Matchdef.prototype.moveDivisions = function (from, to, options, callback) {
  var self = this;
  var fromIndex = _.findIndex (self._divisions, {uuid: from.uuid});
  var toIndex = _.findIndex (self._divisions, {uuid: to.uuid});
  var changed = (fromIndex !== toIndex);

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  if (changed) {
    if (fromIndex < toIndex)
      toIndex--;

    self._divisions.splice (toIndex, 0, (self._divisions.splice (fromIndex, 1) [0]));
  } else {
    pmelog.llog (pmelog.WARN, 'That\s weird... fromIndex and toIndex are the same');
    pmelog.llog (pmelog.DEBUG, 'self._divisions -->');
    pmelog.ldirex (pmelog.DEBUG, self._divisions);
    pmelog.llog (pmelog.DEBUG, 'from -->');
    pmelog.ldirex (pmelog.DEBUG, from);
    pmelog.llog (pmelog.DEBUG, 'to -->');
    pmelog.ldirex (pmelog.DEBUG, to);
  }

  self.updateDivisions (null, _.merge ({}, options, {force: changed}), callback);

  return self;
};
Matchdef.prototype.getClubCode = function () {
  return this.match_clubcode;
};
Matchdef.prototype.setClubCode = function (newClubCode) {
  this.match_clubcode = newClubCode || '';
  this.match_modifieddate = psutils.timeStampUTC ();
  return this;
};
Matchdef.prototype.getClubName = function () {
  return this.match_clubname;
};
Matchdef.prototype.setClubName = function (newClubName) {
  this.match_clubname = newClubName || '';
  this.match_modifieddate = psutils.timeStampUTC ();
  return this;
};
Matchdef.prototype.getCreationDate = function () {
  return this.match_creationdate;
};
Matchdef.prototype.setCreationDate = function (newDate) {
  this.match_creationdate = newDate; // FIXME: check this value
  this.match_modifieddate = psutils.timeStampUTC ();
  return this;
};
Matchdef.prototype.getDate = function () {
  return this.match_date;
};
Matchdef.prototype.setDate = function (newDate) {
  if (!_.isUndefined (newDate))
    if (newDate.match (/\d{4}-\d{2}\-\d{2}/)) {
      this.match_date = newDate;
      this.match_modifieddate = psutils.timeStampUTC ();
    }
  return this;
};
Matchdef.prototype.getActiveDivisions = function () {
  return _.sortBy (_.uniq (_.map (this.match_shooters, function (s) { return s.sh_dvp; })));
};
Matchdef.prototype.getID = function () {
  return this.match_id;
};
Matchdef.prototype.setID = function (matchUUID) {
  this.match_id = matchUUID.toUUIDCase ();
  return this;
};
Matchdef.prototype.newID = function () {
  this.match_id = psutils.generateUUID ();
  return this;
};
Matchdef.prototype.getLogEnabled = function () {
  return this.match_logenabled;
};
Matchdef.prototype.isLogEnabled = function () {
  return this.match_logenabled;
};
Matchdef.prototype.setLogEnabled = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setLogEnabled() argument must be boolean');
  this.match_logenabled = state;
  this.match_modifieddate = psutils.timeStampUTC ();
  return this;
};
Matchdef.prototype.getLogToken = function () {
  return this.match_logtoken;
};
Matchdef.prototype.setLogToken = function (token) {
  this.match_logtoken = token || undefined;
  this.match_modifieddate = psutils.timeStampUTC ();
  return this;
};
Matchdef.prototype.getModifiedDate = function () {
  return this.match_modifieddate;
};
Matchdef.prototype.setModifiedDate = function (newTS) {
  this.match_modifieddate = newTS || psutils.timeStampUTC ();
  return this;
};
Matchdef.prototype.getName = function () {
  return this.match_name;
};
Matchdef.prototype.getNameStripped = function () {
  return this.match_name.replace (new RegExp (/[^\w\.\-]/gi), '');
};
Matchdef.prototype.setName = function (newName) {
  this.match_name = newName || undefined;
  this.match_modifieddate = psutils.timeStampUTC ();
  return this;
};
Matchdef.prototype.getOwner = function () {
  return this.match_owner;
};
Matchdef.prototype.isOwner = function () {
  return this.match_owner;
};
Matchdef.prototype.setOwner = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setOwner() argument must be boolean');
  this.match_owner = state;
  this.match_modifieddate = psutils.timeStampUTC ();
  return this;
};
Matchdef.prototype.setSecure = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setSecure() argument must be boolean');
  this.match_secure = state;
  this.match_modifieddate = psutils.timeStampUTC ();
  return this;
};
Matchdef.prototype.setMatchPassword = function (password) {
  this.match_matchpw = password;
  this.match_modifieddate = psutils.timeStampUTC ();
  return this;
};
Matchdef.prototype.setMaxTeamResults = function (teamResults) {
  this.match_maxteamresults = +teamResults;
  this.match_modifieddate = psutils.timeStampUTC ();
  return this;
};
Matchdef.prototype.setStageDQValue = function (stageDQValue) {
  this.match_stagedqvalue = +stageDQValue;
  this.match_modifieddate = psutils.timeStampUTC ();
  return this;
};
Matchdef.prototype.setDQs = function (newDQs) {
  if (!_.isArray (newDQs))
    throw new TypeError ('setDQs() argument must be Array');

  this.match_dqs = newDQs || [];
  this.match_modifieddate = psutils.timeStampUTC ();
};
Matchdef.prototype.setNotifications = function (newNotifications) {
  if (!_.isArray (newNotifications))
    throw new TypeError ('setNotifications() argument must be Array');

  this.match_nots = newNotifications || [];
  this.match_modifieddate = psutils.timeStampUTC ();
};
Matchdef.prototype.setProcedurals = function (newProcedurals) {
  if (!_.isArray (newProcedurals))
    throw new TypeError ('setProcedurals() argument must be Array');

  this.match_procs = newProcedurals || [];
  this.match_modifieddate = psutils.timeStampUTC ();
};
/*
//
//-----------------------------------------------------------------------------
//
//  match_penalties is an array of Penalty objects.
//  _penalties is an array of JSON
//
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
  return this.match_penalties;
};
Matchdef.prototype.getPenaltiesEx = function () {
  return this._penalties;
};
Matchdef.prototype.updatePenalties = function (penalties, options, callback) {
  var self = this;
  var modified = false;
  var duplicate = false;
  var notfound = false;
  var readonly = false;
  var index;
  var pmm;

  if (penalties)
    assert (_.isArray (penalties));
  else
    penalties = [];

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  _.eachRight (penalties, function (penalty) {
    if (penalty.remove) {
      if ((index = _.findIndex (self._penalties, 'uuid', penalty.uuid)) > -1) {
        if (!self._penalties [index].readonly) {
          self._penalties.splice (index, 1);
          modified = true;
        } else {
          readonly = true;
          pmelog.llog (pmelog.INFO, 'Warning: attempting to delete read-only penalty \'%s\'', self._penalties [index].name);
        }
      } else {
        notfound = true;
        pmelog.llog (pmelog.INFO, 'Warning: attempting to delete non-existent penalty \'%s\'', penalty.name);
      }
    }

    if (penalty.add) {
      if (!(pmm = _.find (self._penalties, 'name', penalty.name))) {
        self._penalties.push ({
          name:  penalty.name,
          value: penalty.value,
          enabled:  _.isBoolean (penalty.enabled) ? penalty.enabled : true,
          readonly: _.isBoolean (penalty.readonly) ? penalty.readonly : false,
          uuid:     penalty.uuid || psutils.generateUUID (),
        });
        modified = true;
      } else if (!options.nodupwarn) {
        duplicate = true;
        pmelog.llog (pmelog.INFO, 'Warning: attempting to add duplicate penalty \'%s\'', pmm.name);
      }
    }

    if (penalty.modify) {
      if ((pmm = _.find (self._penalties, 'uuid', penalty.uuid))) {
        _.each (['name'], function (field) {
          if (_.isString (penalty [field]) && (pmm [field] !== penalty [field])) {
            if (pmm.readonly)
              readonly = true;
            else {
              pmm [field] = penalty [field];
              modified = true;
            }
          }
        });
        _.each (['value', 'enabled', 'readonly'], function (field) {
          if (_.isBoolean (penalty [field]) && (pmm [field] !== penalty [field])) {
            if ((field !== 'enabled') && pmm.readonly)
              readonly = true;
            else {
              pmm [field] = penalty [field];
              modified = true;
            }
          }
        });

        if (readonly)
          pmelog.llog (pmelog.INFO, 'Warning: attempting to modify read-only penalty \'%s\'', pmm.name);
      } else {
        notfound = true;
        pmelog.llog (pmelog.INFO, 'Warning: attempting to modify non-existent penalty \'%s\'', penalty.name);
      }
    }
  });

  if (options.force)
    modified = true;

  if (modified && !duplicate && !notfound && !readonly) {
    self.match_penalties = _.filter (self._penalties, 'enabled', true);
    self.match_modifieddate = psutils.timeStampUTC ();

    self._accessorFunctions.getFile ().jsonSave ('penalties_' + self.match_type, self._penalties);
  }

  if (callback)
    callback (duplicate || notfound || readonly, {
      modified: modified,
      duplicate: duplicate,
      notfound: notfound,
      readonly: readonly,
    });

  return self;
};
//
//  May be a single string ('MOT'), an array of strings (['MOT', 'FTE',
//  'Procedural']) or array of objects [{name: 'MOT', value: 5, enabled: true,
//  readonly: false},{...}]
//
Matchdef.prototype.addPenalties = function (penalties, options, callback) {
  var self = this;
  var newPenalties = [];

  if (_.isString (penalties))
    penalties = new Array (penalties);

  if (!_.isArray (penalties))
    throw new TypeError ('addPenalties() argument must be Array');

  if (_.isString (penalties [0])) {
    _.each (penalties, function (penalty) {
      newPenalties.push ({
        add:      true,
        name:     penalty,
        value:    0,
        enabled:  true,
        readonly: false,
        uuid:     psutils.generateUUID (),
      });
    });
  } else {
    _.each (penalties, function (penalty) {
      newPenalties.push ({
        add:      true,
        name:     penalty.name || penalty,
        value:    penalty.value || 0,
        enabled:  _.isBoolean (penalty.enabled) ? penalty.enabled : true,
        readonly: _.isBoolean (penalty.readonly) ? penalty.readonly : false,
        uuid:     penalty.uuid || psutils.generateUUID (),
      });
    });
  }

  self.updatePenalties (newPenalties, options, callback);

  return self;
};
Matchdef.prototype.setPenalties = function (newPenalties) {
  return this.addPenalties (newPenalties, {nodupwarn: true});
};
Matchdef.prototype.modifyPenalties = function (penalties, options, callback) {
  var self = this;
  var newPenalties = _.clone (penalties);

  if (!_.isArray (penalties))
    throw new TypeError ('deletePenalties() argument must be a Array');

  _.each (newPenalties, function (penalty) {
    penalty.modify = true;
  });

  self.updatePenalties (newPenalties, options, callback);

  return self;
};
Matchdef.prototype.deletePenalties = function (penalties, options, callback) {
  var self = this;
  var newPenalties = _.clone (penalties);

  if (!_.isArray (penalties))
    throw new TypeError ('deletePenalties() argument must be a Array');

  _.each (newPenalties, function (penalty) {
    penalty.remove = true;
  });

  self.updatePenalties (newPenalties, options, callback);

  return self;
};
Matchdef.prototype.movePenalties = function (from, to, options, callback) {
  var self = this;
  var fromIndex = _.findIndex (self._penalties, {uuid: from.uuid});
  var toIndex = _.findIndex (self._penalties, {uuid: to.uuid});
  var changed = (fromIndex !== toIndex);

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  if (changed) {
    if (fromIndex < toIndex)
      toIndex--;

    self._penalties.splice (toIndex, 0, (self._penalties.splice (fromIndex, 1) [0]));
  } else {
    pmelog.llog (pmelog.WARN, 'That\s weird... fromIndex and toIndex are the same');
    pmelog.llog (pmelog.DEBUG, 'self._penalties -->');
    pmelog.ldirex (pmelog.DEBUG, self._penalties);
    pmelog.llog (pmelog.DEBUG, 'from -->');
    pmelog.ldirex (pmelog.DEBUG, from);
    pmelog.llog (pmelog.DEBUG, 'to -->');
    pmelog.ldirex (pmelog.DEBUG, to);
  }

  self.updatePenalties (null, _.merge ({}, options, {force: changed}), callback);

  return self;
};
//
//-----------------------------------------------------------------------------
//
*/
Matchdef.prototype.getReadOnly = function () {
  return this.match_readonly;
};
Matchdef.prototype.isReadOnly = function () {
  return this.match_readonly;
};
Matchdef.prototype.setReadOnly = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setReadOnly() argument must be boolean');
  this.match_readonly = state;
  this.match_modifieddate = psutils.timeStampUTC ();
  return this;
};
Matchdef.prototype.hardDeleteShooters = function (callback) {
  var self = this;
  var deletedShooters = [];

  _.eachRight (self.match_shooters, function (shooter, index) {
    if (shooter.isDeleted ()) {
      deletedShooters.push (sprintf ("%s%s", shooter.getFullName (), shooter.getMembershipNumber ().length ? ' (' + shooter.getMembershipNumber () + ')' : ''));
      self.match_shooters.splice (index, 1);
    }
  });

  if (callback)
    callback (null, deletedShooters);
};
Matchdef.prototype.exportShooters = function (callback) {
  var self = this;
  var exportedShooters = [];

  _.each (self.match_shooters, function (shooter) {
    if (!shooter.isDeleted ()) {
      var line = [];

      line.push (shooter.getLastName ());
      line.push (shooter.getFirstName ());
      // line.push (shooter.getMembershipNumber ());
      // line.push (shooter.getSquad ());

      exportedShooters.push (line.join ('\t'));
    }
  });

  exportedShooters = _.shuffle (exportedShooters);

  fs.writeFileSync ('./matches/squadlist.txt', exportedShooters.join ('\n') + '\n');

  if (callback)
    callback (null, exportedShooters);
};
Matchdef.prototype.getShooters = function () {
  return this.match_shooters;
};
Matchdef.prototype.getShootersSortedByName = function () {
  return _.sortByAll (this.match_shooters, ['sh_ln', 'sh_fn']);
};
Matchdef.prototype.getShootersNotDeleted = function () {
  return _.filter (this.getShooters (), 'sh_del', false);
};
Matchdef.prototype.getShootersByDivision = function (division) {
  return _.filter (this.getShooters (), 'sh_dvp', division);
};
Matchdef.prototype.setShooters = function (newShooters) {
  this.match_shooters = newShooters || [];
  return this;
};
Matchdef.prototype.getShooterByIndex = function (index) {
  return (index < this.match_shooters.length) ? this.match_shooters [index] : undefined;
};
Matchdef.prototype.getShooterByID = function (id) {
  if (!id)
    return null;
  return _.find (this.match_shooters, {'sh_id': id});
};
Matchdef.prototype.getShooterByUID = function (uid) {
  if (!uid)
    return null;
  return _.find (this.match_shooters, {'sh_uid': uid});
};
Matchdef.prototype.cloneShooterWithUID = function (uid) {
  var self = this;
  var shooter = _.find (self.match_shooters, {'sh_uid': uid});

  if (!shooter)
   return null;

 return _.merge (self.newShooter (), shooter);
};
Matchdef.prototype.newShooter = function () {
  throw new TypeError ('Matchdef.prototype.newShooter() has been called (matchtype class should implement this)');
};
Matchdef.prototype.addShooter = function (newShooter, options, callback) {
  var self = this;
  var parent = null;

  if (newShooter.className () !== 'Shooter')
    throw new TypeError ('Matchdef.addShooter parameter must be Shooter object');

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  newShooter.fixup (parent, self.match_shooters.length + 1, options);

  self.match_shooters.push (newShooter);
  self.match_modifieddate = (options.tsKeep ? self.match_modifieddate : null) || psutils.timeStampUTC ();

  if (callback)
    callback (null, newShooter);

  return self;
};
Matchdef.prototype.addShooterJSON = function (shooterInfo, options, callback) {
  var self = this;

  if (_.isUndefined (shooterInfo))
    throw new TypeError ('Matchdef.addShooterJSON parameter cannot be null');

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  self.addShooter (self.newShooter ().parse (shooterInfo), options, callback);

  return self;
};
Matchdef.prototype.updateShooterJSON = function (shooterInfo, options, callback) {
  var self = this;
  var shooter;

  if (_.isUndefined (shooterInfo))
    throw new TypeError ('Matchdef.updateShooterJSON parameter cannot be null');

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};
  options.nostringify = true;

  if ((shooter = self.getShooterByUID (shooterInfo.sh_uid))) {
    shooter.update (shooterInfo, options, function (err, changes) {
      if (callback)
        callback (err, changes, shooter.getAsPlainObject (options));
    });
  } else if (callback)
    callback ('Can\'t locate shooter UID ' + shooterInfo.sh_uid);

  return self;
};
Matchdef.prototype.printCount = function () {
  return _.filter (this.getShooters (), 'sh_print', true).length;
};
Matchdef.prototype.getStages = function () {
  return this.match_stages;
};
Matchdef.prototype.setStages = function (newStages) {
  this.match_stages = newStages || [];
  return this;
};
Matchdef.prototype.getStageByIndex = function (index) {
  return (index < this.match_stages.length) ? this.match_stages [index] : undefined;
};
Matchdef.prototype.getStageByUUID = function (uuid) {
  var self = this;
  return _.find (self.match_stages, {'stage_uuid': uuid});
};
Matchdef.prototype.newStage = function () {
  throw new TypeError ('Matchdef.prototype.newStage() has been called (matchtype class should implement this)');
};
Matchdef.prototype.addStage = function (newStage, options, callback) {
  var self = this;
  var parent = null;

  if (newStage.className () !== 'Stage')
    throw new TypeError ('Matchdef.addStage parameter must be Stage object');

  options = options || {};

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  newStage.fixup (parent, self.match_stages.length + 1, options);

  self.match_stages.push (newStage);
  self.match_modifieddate = (options.tsKeep ? self.match_modifieddate : null) || psutils.timeStampUTC ();

  if (callback)
    callback (null, newStage);

  return self;
};
Matchdef.prototype.addStageJSON = function (stageInfo, options, callback) {
  var self = this;

  if (_.isUndefined (stageInfo))
    throw new TypeError ('Matchdef.addStageJSON parameter cannot be null');

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  self.addStage (self.newStage ().parse (stageInfo), options, callback);

  return self;
};
Matchdef.prototype.updateStageJSON = function (stageInfo, options, callback) {
  var self = this;
  var stage;

  if (_.isUndefined (stageInfo))
    throw new TypeError ('Matchdef.updateStageJSON parameter cannot be null');

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  if ((stage = self.getStageByUUID (stageInfo.stage_uuid))) {
    stage.update (stageInfo, options, function (err, changes) {
      if (callback)
        callback (err, changes, stage);
    });
  } else if (callback)
    callback ('Can\'t locate stage UUID ' + stageInfo.stage_uuid);

  return self;
};
Matchdef.prototype.getMatchType = function () {
  return this.match_type;
};
Matchdef.prototype.getMatchTypeName = function () {
  return psutils.matchTypeToName (this.match_type);
};
Matchdef.prototype.getMatchTypePMM = function () {
  return psutils.matchTypeToPMM (this.match_type);
};
Matchdef.prototype.setMatchType = function (newType) {
  this.match_type = newType || undefined;
  this.match_modifieddate = psutils.timeStampUTC ();
  return this;
};
Matchdef.prototype.getUnsentLogsWarningCount = function () {
  return this.match_unsentlogswarningcount;
};
Matchdef.prototype.setUnsentLogsWarningCount = function (count) {
  this.match_unsentlogswarningcount = count || 1;
  this.match_modifieddate = psutils.timeStampUTC ();
  return this;
};
Matchdef.prototype.getOpenSquadding = function () {
  return this.match_useOpenSquadding;
};
Matchdef.prototype.isOpenSquadding = function () {
  return this.match_useOpenSquadding;
};
Matchdef.prototype.setOpenSquadding = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setOpenSquadding() argument must be boolean');
  this.match_useOpenSquadding = state;
  this.match_modifieddate = psutils.timeStampUTC ();
  return this;
};
Matchdef.prototype.getVersion = function () {
  return this.version;
};
Matchdef.prototype.setVersion = function (newVersion) {
  this.version = newVersion || '1.0.0';
  this.match_modifieddate = psutils.timeStampUTC ();
  return this;
};
Matchdef.prototype.numberOfShooters = function () {
  return this.match_shooters.length;
};
Matchdef.prototype.numberOfStages = function () {
  return this.match_stages.length;
};
Matchdef.prototype.getPendingChanges = function () {
  return this._pendingChanges;
};
Matchdef.prototype.setPendingChanges = function (state) {
  this._pendingChanges = state ? true : false;
  return this;
};
Matchdef.prototype.getNewestTimestamp = function () {
  var self = this;
  var ts = self.match_modifieddate;
  var t;

  _.each (self.match_shooters, function (shooter) {
    if ((t = shooter.getNewestTimestamp ()) > ts)
      ts = t;
  });

  _.each (self.match_stages, function (stage) {
    if ((t = stage.getNewestTimestamp ()) > ts)
      ts = t;
  });

  return ts;
};
Matchdef.prototype.setupLevels = function () {
  return null;
};
Matchdef.prototype.setupMaxstagetimes = function () {
  return null;
};
Matchdef.prototype.setupSubtypes = function () {
  return null;
};
Matchdef.prototype.fixup = function (parent, options) {
  var self = this;
  var modifieddate = self.getModifiedDate ();

  options = options || {};

  self.match_id = self.match_id.toUUIDCase ();

  _.each (self.getShooters (), function (shooter, index) {
    shooter.fixup (parent, index + 1, options);
  });

  _.each (self.getStages (), function (stage, index) {
    stage.fixup (parent, index + 1, options);
  });

  self.setModifiedDate (modifieddate);

  return self;
};
Matchdef.prototype.merge = function (newMatchdef, options, callback) {
  var self = this;
  var changes = [];

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = _.merge (options || {}, {matchdef: self});

  callback = callback || function (err) {
    pmelog.llog (pmelog.ERROR, 'Null callback invoked with err=\'%s\'', err);
  };

  mergeMatchdef.call (self, newMatchdef, options, function (err, matchChanges) {
    changes = changes.concat (matchChanges);
    if (err) {
      callback (err, changes);
    } else {
      mergeMatchdefShooters.call (self, newMatchdef, options, function (err, shooterChanges) {
        changes = changes.concat (shooterChanges);
        if (err) {
          callback (err, changes);
        } else {
          mergeMatchdefStages.call (self, newMatchdef, options, function (err, stageChanges) {
            changes = changes.concat (stageChanges);
            if (err)
              callback (err, changes);
            else {
              var parent = null;
              self.fixup (parent, options);
              callback (err, changes);
            }
          });
        }
      });
    }
  });

  return self;
};
Matchdef.prototype.getAsPlainObject = function (options) {
  var self = this;
  var m = {};

  options = options || {};

  m.match_approvescores          = self.match_approvescores;
  m.match_creationdate           = self.match_creationdate;
  m.match_date                   = self.match_date;
  m.match_id                     = self.match_id;
  m.match_logenabled             = self.match_logenabled;
  m.match_matchpw                = self.match_matchpw;
  m.match_maxteamresults         = self.match_maxteamresults;
  m.match_modifieddate           = self.match_modifieddate;
  m.match_name                   = self.match_name;
  m.match_owner                  = self.match_owner;
  m.match_readonly               = self.match_readonly;
  m.match_secure                 = self.match_secure;
  m.match_shooters               = [];
  m.match_stages                 = [];
  m.match_stagedqvalue           = self.match_stagedqvalue;
  m.match_type                   = self.match_type;
  m.match_unsentlogswarningcount = self.match_unsentlogswarningcount;
  m.match_useOpenSquadding       = self.match_useOpenSquadding;
  m.version                      = self.version;

  //
  //  Only set if not null and length is non-zero
  //
  if (self._divisions.length)
    m.match_cats = _.pluck (_.filter (self._divisions, 'enabled', true), 'ps_name');

  // if (self.match_cats.length)     m.match_cats     = self.match_cats;

  if (self.match_cls.length)      m.match_cls      = self.match_cls;
  if (self.match_clubcode.length) m.match_clubcode = self.match_clubcode;
  if (self.match_clubname.length) m.match_clubname = self.match_clubname;

  //
  //  Only export the categories that are used
  //
  m.match_ctgs = _.chain (self.match_shooters).pluck ('sh_ctgs').flatten ().uniq ().sortBy ().value ();

  if (!options.nostringify)
    m.match_ctgs = JSON.stringify (m.match_ctgs);

  if (self.match_dqs.length)
    m.match_dqs = self.match_dqs;

  if (self.match_nots.length)
    m.match_nots = self.match_nots;

  if (self.match_procs.length)
    m.match_procs = self.match_procs;

  if (self.match_logtoken && self.match_logtoken.length)
    m.match_logtoken = self.match_logtoken;

  _.each (self.match_shooters, function (shooter) {
    m.match_shooters.push (shooter.getAsPlainObject (options));
  });

  _.each (self.match_stages, function (stage) {
    m.match_stages.push (stage.getAsPlainObject (options));
  });

  if (!options.compact) {
    m._categories = self._categories;
    m._classes    = self._classes;
    m._divisions  = self._divisions;
  }

  return m;
};
Matchdef.prototype.parse = function (jsonMatchdef) {
  var self = this;
  var map = {
    match_approvescores:          self.setApproveScores,
    match_cats:                   self.setDivisions,
    match_cls:                    self.setClasses,
    match_clubcode:               self.setClubCode,
    match_clubname:               self.setClubName,
    match_creationdate:           self.setCreationDate,
    match_ctgs:                   self.setCategories,
    match_date:                   self.setDate,
    match_dqs:                    self.setDQs,
    match_id:                     self.setID,
    match_logenabled:             self.setLogEnabled,
    match_logtoken:               self.setLogToken,
    match_matchpw:                self.setMatchPassword,
    match_maxteamresults:         self.setMaxTeamResults,
    match_name:                   self.setName,
    match_nots:                   self.setNotifications,
    match_owner:                  self.setOwner,
    match_procs:                  self.setProcedurals,
    match_readonly:               self.setReadOnly,
    match_secure:                 self.setSecure,
    match_stagedqvalue:           self.setStageDQValue,
    match_unsentlogswarningcount: self.setUnsentLogsWarningCount,
    match_useOpenSquadding:       self.setOpenSquadding,
    match_modifieddate:           self.setModifiedDate,
  };

  if (!jsonMatchdef)
    return self;

  _.each (_.keys (map), function (key) {
    if (key in jsonMatchdef) {
      map [key].call (self, jsonMatchdef [key]);
      self._fieldParsed [key] = true;
    } else
      self._fieldParsed [key] = false;
  });

  return self;
};
Matchdef.prototype.compare = function (jsonMatchdef, options, callback) {
  var self = this;
  var modified = false;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  _.each (jsonMatchdef, function (v, k) {
    if (!_.isUndefined (self [k]) && !_.isEqual (self [k], v))
      modified = true;
  });

  if (callback)
    callback (modified);

  return self;
};
Matchdef.prototype.updateClassifications = function () {
  throw new TypeError ('Matchdef.prototype.updateClassifications() has been called (matchtype class should implement this)');
};
Matchdef.prototype.resetClassifications = function () {
  throw new TypeError ('Matchdef.prototype.resetClassifications() has been called (matchtype class should implement this)');
};
Matchdef.prototype.appendClassifications = function () {
  throw new TypeError ('Matchdef.prototype.appendClassifications() has been called (matchtype class should implement this)');
};
Matchdef.prototype.updateStates = function () {
  throw new TypeError ('Matchdef.prototype.updateStates() has been called (matchtype class should implement this)');
};
Matchdef.prototype.verification = function () {
  throw new TypeError ('Matchdef.prototype.verification() has been called (matchtype class should implement this)');
};
Matchdef.prototype.validateShooter = function (/*shooter, callback*/) { // FIXME: Implement shooter field validation
  return this;
};

exports.Matchdef = Matchdef;
