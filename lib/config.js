'use strict';

var _ = require ('lodash');
var pmelog = require ('./pmelog');

//
//
//
var Config = function (accessorFunctions, options, callback) {
  var self = this;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  self._accessorFunctions = accessorFunctions;
  self._sections = ['_config', '_debug', '_devices', '_download', '_file', '_kiosk', '_match', '_print', '_pmmui', '_server', '_ui'];
  self._defaults = {};

  _.each (self._sections, function (section) {
    self [section] = {};
  });

  self._config.loadLastMatch            = true;                                   // Load last match on PMM startup
  self._config.defaultMatchType         = 'uspsa_p';                              // Default match type when creating new matches

  self._debug.deviceDisplayHeaders      = false;                                  // Display device headers
  self._debug.deviceDisplayState        = false;                                  // Display polling state progress
  self._debug.deviceSaveData            = false;                                  // Save data from each device poll
  self._debug.mergeDetails              = false;                                  // Show extended information when merging
  self._debug.mergeDeepDiff             = false;                                  // Show deep-diff between new and old items

  self._devices.ipblock                 = '127.0.0.1/24';                         // IP block to scan devices for
  self._devices.scanTime                = 10;                                     // Time to wait for device to respond
  self._devices.bonjour                 = false;                                  // Enable listening for devices to announce themselves via Bonjour
  self._devices.autopollSuccess         = 900;                                    // 900 seconds between successful polls
  self._devices.autopollFailed          = 120;                                    // 120 seconds between failed retries
  self._devices.autopollBackToBack      = 5;                                      // 5 seconds between any two successive polls
  self._devices.autopollSave            = true;                                   // Save match to database after each auto-poll

  self._download.cpcSavePINs            = true;                                   // True to save clubs.practiscore.com match PINs to database for easy re-use
  self._download.cpcFixNameCase         = true;                                   // True to fix name case when downloading matches from clubs.practiscore.com
  self._download.ssuSaveClub            = true;                                   // True to save SquadSuignup.com club name
  self._download.ssuSaveCredentials     = true;                                   // True to save SquadSuignup.com credentials for re-use
  self._download.ssuSaveMatchID         = true;                                   // True to save last SquadSuignup.com match ID used
  self._download.ssuFixNameCase         = true;                                   // True to fix name case when downloading matches from SquadSignup.com
  self._download.urlSC                  = 'https://www.steelchallenge.com/steel-challenge-rankings.php';
  self._download.urlUSPSA               = 'http://www.uspsa.org/ezwinscore/ez_class_update.txt';
  self._download.verifyUSPSA            = true;                                   // Verify missing USPSA#'s during classification updates
  self._download.addVerifiedUSPSA       = true;                                   // If USPSA# found during verification, add to classification database

  self._file.directoryPSC               = './matches/';                           // Directory relative to PMM where PractiScore .psc files live
  self._file.directorySSI               = './matches/';                           // Directory relative to PMM where Shoot'n-Score-It .zip files live
  self._file.directoryEZWS              = './matches/';                           // Directory relative to PMM where EzWinScore .db files live

  self._kiosk.vendorImageCount          = 2;                                      // 2 vendor images before system display
  self._kiosk.vendorDisplayTime         = 15;                                     // 15 seconds for each vendor image
  self._kiosk.progressDisplayTime       = 15;                                     // 15 seconds for match progress display
  self._kiosk.stageDisplayTime          = 15;                                     // 15 seconds for stage results
  self._kiosk.idleTime                  = 30;                                     // 30 seconds idle time before resuming kiosk mode
  self._kiosk.rightClickOK              = true;                                   // Allow right-click to interrupt kiosk display

  self._match.updateAutofill            = true;                                   // Update the autofill database with competitors on load/import/download
  self._match.nameCaseDB                = true;                                   // Correct name case when matches loaded from database
  self._match.nameCaseFile              = true;                                   // Correct name case when matches loaded from file (.psc)
  self._match.nameCaseImport            = true;                                   // Correct name case when matches are imported (SSI, etc)
  self._match.nameCaseDownload          = true;                                   // Correct name case when matches loaded from database (clubs.practiscore.com, etc)
  self._match.nameCaseSync              = true;                                   // Correct name case when matches are synced from a device

  self._pmmui.menuautoopen              = true;                                   // Menus open when hovered over
  self._pmmui.inlineediting             = true;                                   // Default editing mode is in-line
  self._pmmui.usecategorylist           = false;                                  // Default category mode is traditional
  self._pmmui.theme                     = 'darkblue';                             // Default theme

  self._print.server                    = false;                                  // PractiPrint server enabled
  self._print.method                    = 'bystage';                              // Stage being scored goes to that stage printer
  self._print.port                      = 49613;                                  // PractiPrint port number
  self._print.announce                  = true;                                   // Announce PractiPrint server over Bonjour

  self._server.server                   = false;                                  // PractiScore server enabled
  self._server.name                     = 'PractiScore Match Manager:12345678';   // This node's name
  self._server.uuid                     = 'be54e064-518b-4100-9fd6-c0ccc5f48b4c'; // This node's UUID
  self._server.port                     = 59613;                                  // PractiScore port number
  self._server.announce                 = true;                                   // Announce PractiScore server over Bonjour
  self._server.ipv6                     = true;                                   // Use IPv6 addresses

  self._ui.progressFlare                = true;                                   // Flare cell when value changes
  self._ui.progressColorEmpty           = '#ffffff';                              // Squad with no scores - 'white'
  self._ui.progressColorProgress        = '#add8e6';                              // Squad with scores, not complete - 'lightblue'
  self._ui.progressColorComplete        = '#00ff00';                              // Squad with scores, complete, no DNFs - 'lime'
  self._ui.progressColorCompleteDNF     = '#41a317';                              // Squad with scores, complete, has DNFs - 'limegreen'
  self._ui.progressColorCompleteMissing = '#ffff00';                              // Squad with missing scores - 'yellow'
  self._ui.progressColorError           = '#ff0000';                              // Squad with missing scores - 'red'

  self._ui.editUSPSAPrefixCommon        = true;                                   // Display USPSA prefixes in most common order instead of alpha

  self._defaults = _.clone (_.pick (self, self._sections));

  if (callback)
    callback (null, self);

  return self;
};

Config.prototype.className = function () {
  return 'Config';
};
Config.prototype.updateConfig = function () {
  return this;
};
Config.prototype.updateConfigEx = function (newConfig) {
  var self = this;
  _.merge (self, newConfig);
  return self;
};
Config.prototype.defaults = function (options) {
  options = options || {};
};
Config.prototype.get = function (group, parameter, callback) {
  group = '_' + group;
  if (_.isUndefined (this [group]))
    throw new Error ('unknown configuration group');
  if (_.isUndefined (this [group][parameter]))
    throw new Error ('unknown configuration parameter');
  if (callback)
    callback (null, this [group][parameter]);
  return this [group][parameter];
};
Config.prototype.request = function (options, callback) {
  var self = this;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  if (callback)
    callback (null, _.pick (self, self._sections));

  return self;
};
Config.prototype.defaults = function (options, callback) {
  var self = this;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  if (callback) {
    if (options.section && self._defaults [options.section])
      callback (null, self._defaults [options.section]);
    else
      callback ('Non-existent section \'' + options.section + '\' requested', null);
  }

  return self;
};
Config.prototype.load = function (options, callback) {
  var self = this;
  var savedConfig;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  self._accessorFunctions.getFile ().configurationLoad (function (err, savedConfigJSON) {
    if (!err) {
      try {
        savedConfig = JSON.parse (savedConfigJSON);
      } catch (e) {
        err = e;
        pmelog.llog (pmelog.ERROR, err);
      }
    } else
      pmelog.llog (pmelog.ERROR, err);

    if (callback)
      callback (err, savedConfig);
  });

  return self;
};
Config.prototype.save = function (newConfig, options, callback) {
  var self = this;
  var currentConfig;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  //
  //  Make a deep copy of the current configuration, keeping only the sections
  //  for configuration. Merge the new configuration info that, again keeping
  //  only the sections for configuration (in case someone passed in unknown
  //  sections).
  //
  //  After we update the configuration of the various objects, update our
  //  copy. We don't do this before hand so that the object's updateConfig()
  //  function can use the current system copy, if necessary (some objects
  //  have local variables, others refer directly to the config variables)
  //
  //  Hmmm. This creates a problem for services that stop and restart, and
  //  make a request for the new value. It hasn't been updated yet, so it's
  //  picking up the wrong one...
  //
  currentConfig = _.pick (_.cloneDeep (self), self._sections);
  newConfig = _.pick (_.merge (currentConfig, newConfig), self._sections);

  self._accessorFunctions.getFile ().configurationSave (newConfig, function (err) {
    if (!err) {
      self._accessorFunctions.updateConfig (newConfig);
      _.merge (self, newConfig);
    }
    if (callback)
      callback (err);
  });

  return self;
};
Config.prototype.validate = function (options, callback) {
  var self = this;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  if (callback)
    callback (null);

  return self;
};
Config.prototype.getAsPlainObject = function () {
  return _.pick (this, this._sections);
};

//
//
//
exports.Config = Config;
