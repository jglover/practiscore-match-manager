'use strict';

module.exports = function (app) {
  var _ = require ('lodash');
  var cheerio = require ('cheerio');
  var csvparse = require ('csv-parse');
  var util = require ('util');
  var fs = require ('fs');
  var locks = require ('locks');
  var moment = require ('moment');
  var os = require ('os');
  var pako = require ('pako');
  var request = require ('request');
  var sprintf = require ('sprintf-js').sprintf;
  var validator = require ('validator');
  var psc = require ('../lib/imexport/psc');
  var psutils = require ('../lib/utils');
  var pmelog = app.pmelog;

  //
  //  Routes:
  //    categories
  //      add
  //      delete
  //      get
  //      modify
  //      move
  //    classes
  //      add
  //      delete
  //      get
  //      modify
  //      move
  //    classifications
  //      get:sc
  //      get:uspsa
  //      available:sc
  //      available:uspsa
  //    config
  //      defaults
  //      request
  //      save
  //      validate
  //      validate:url
  //    control
  //      hello
  //      play:fast
  //      play:start
  //      play:stop
  //      reload
  //    device
  //      autopoll
  //      autopoll:none
  //      clear
  //      hide
  //      info
  //      poll
  //      pollall
  //      scan
  //      unhideall
  //    divisions
  //      add
  //      delete
  //      get
  //      modify
  //      move
  //    download
  //      cpc:match
  //      cpc:pins
  //      ssi:club
  //      ssi:credentials
  //      ssi:match
  //      ssi:matchid
  //    errorlog
  //      critical
  //      debug
  //      error
  //      info
  //      normal
  //      warn
  //      verbose
  //    file
  //      db:delete
  //      db:load
  //      db:save
  //      db:savenew
  //      db:list
  //      db:logs
  //      ezws:combined:export
  //      ezws:db:export
  //      ezws:db:import
  //      ezws:db:list
  //      ezws:registration:import
  //      ezws:registration:list
  //      ezws:results:export
  //      ezws:scores:export
  //      ezws:scores:import
  //      ezws:scores:list
  //      ezws:squads:export
  //      ezws:squads:import
  //      ezws:squads:list
  //      ezws:stages:export
  //      ezws:stages:import
  //      ezws:stages:list
  //      psc:combine
  //      psc:delete
  //      psc:list
  //      psc:load
  //      psc:merge
  //      psc:save
  //      ssi:delete
  //      ssi:list
  //      ssi:load
  //    kiosk
  //      activity
  //      idle
  //      image
  //      page
  //      scores
  //      start
  //    log
  //      dir
  //      getlevel
  //      inspect
  //      log
  //      setlevel
  //    match
  //      create
  //      get
  //      name
  //      request
  //      setup
  //      type
  //      update
  //    penalties
  //      add
  //      delete
  //      get
  //      modify
  //      move
  //    practiprint
  //      start
  //      stop
  //    rolist
  //      get:uspsa:count
  //      get:uspsa:records
  //      update:uspsa
  //    scores
  //      present
  //    settings
  //      awards:load
  //      awards:save
  //      checkin:load
  //      checkin:save
  //      envelopes:load
  //      envelopes:save
  //      labels:load
  //      labels:save
  //      projection:load
  //      projection:save
  //      stats:load
  //      stats:save
  //    shooter
  //      add
  //      get
  //      new
  //      save
  //      print:add
  //      print:clear
  //      print:inqueue
  //      print:remove
  //      ezws:resequence
  //      ezws:reset
  //      ezws:set
  //      ezws:status
  //      squad
  //      validate
  //      namecase:all
  //      namecase:single
  //      depersonalize:all
  //      depersonalize:single
  //      stripbadmembershipnumber:single
  //      stripbadmembershipnumber:all
  //      maxnameslength
  //      classifications:update
  //      states:update
  //      verification
  //    stage
  //      add
  //      new
  //      save
  //      validate
  //    sync
  //      logs
  //      match
  //    system
  //      supportedmatchtypes
  //    uspsa
  //      activity:generate
  //      activity:upload
  //      activity:view
  //      scores:generate
  //      scores:upload
  //      scores:view
  //    utils
  //      interfaces
  //      jcheck
  //      jcw:create
  //      jcw:import
  //      jcw:mailing
  //      memory
  //      showapp
  //

  var classificationsGetMutex = locks.createMutex ();
  var uspsaRoListGetMutex = locks.createMutex ();

  //
  //  tellMe() should be used sparingly, with replyToMe() being preferred.
  //  tellMe() is asynchronous, whereas replyToMe() is a response to a
  //  client-side emit() that's waiting for a reply.
  //
  var tellMe = function (req, msg, data, log) {
    if (log)
      pmelog.ldirex (log, data);
    req.io.emit (msg, data);
  };
  var replyToMe = function (req, data, log) {
    if (log)
      pmelog.ldirex (log, data);
    req.io.respond (data);
  };
  var tellEveryoneElse = function (req, msg, data, log) {
    if (log)
      pmelog.ldirex (log, data);
    if (_.isArray (msg)) {
      _.each (msg, function (m, index) {
        req.io.broadcast (m, _.isArray (data) ? (data [index] || null) : data);
      });
    } else
      req.io.broadcast (msg, data);
  };
  var tellEveryone = function (msg, data, log) {
    if (log)
      pmelog.ldirex (log, data);
    if (_.isArray (msg)) {
      _.each (msg, function (m, index) {
        app.io.broadcast (m, _.isArray (data) ? (data [index] || null) : data);
      });
    } else
      app.io.broadcast (msg, data);
  };

  //
  //
  //
  var tellEveryoneStatusMsg = function (logLevel, route, msg, broadcastMsg, broadcastData) {
    tellEveryone ('device_sync_status', {
      err: (logLevel !== pmelog.NORMAL) ? true : false,
      msg: msg,
      match_name: app.pmm.match ().matchdef ().getName (),
      matchchanged: (broadcastMsg === 'match_updated') ? true : false,
    });

    if (broadcastMsg)
      tellEveryone (broadcastMsg, broadcastData);

    pmelog.llog (logLevel, '>%s: %s', route, msg);
  };

  var replyToMeStatusMsg = function (req, logLevel, route, message, options) {
    logLevel = logLevel || pmelog.ERROR;
    route = route || '(no route set)';
    message = message || '(no message set)';
    options = options || {};
    options.extra = options.extra || {};

    replyToMe (req, _.merge (options.extra, {
      err: (logLevel !== pmelog.NORMAL) ? true : false,
      msg: message,
    }));

    if (options.broadcastMsg)
      tellEveryone (options.broadcastMsg, options.broadcastData || {});

    pmelog.llog (logLevel, '>%s: %s', route, message);
  };

  //
  //
  //
  var showChanges = function (leader, changes, startAt) {
    startAt = startAt || 0;
    _.each (changes, function (change) {
      pmelog.llog (pmelog.INFO, '%s: %s', leader, change.substr (startAt));
    });
  };

  //
  //
  //
  app.io.route ('classifications', {
    'get:sc': function (req) {
      pmelog.llog (pmelog.NORMAL, '>sclassifications:get:sc: Received request to download Steel Challenge classifications file');

      if (classificationsGetMutex.tryLock ()) {
        tellMe (req, 'status', {status: 'Requesting web page from SteelChallenge.com...'});
        request (app.pmm.config ().get ('download', 'urlSC'),
          function (error, response, body) {
            if (!error && (response.statusCode === 200)) {
              var records = [];
              var $ = cheerio.load (body);
              var last_update = moment ($('h3:contains("Updated")').text ().match (/Updated (.*)/), 'MM/DD/YY hh:mm A').format ('YYYY-MM-DD HH:mm:ss');
              var table = $('table th:contains("SCSA #")').parent ().parent ();
              tellMe (req, 'status', {status: 'Processing results...'});
              $('tr', table).first ().remove (); // First tr contains a bunch of text
              $('tr', table).first ().remove (); // Second tr is header
              $('tr', table).each (function () {
                var scsa = $('td', $(this)).eq (0).text ();
                var name = $('td', $(this)).eq (1).text ().toUpperCase ();
                var ranking = $('td', $(this)).eq (2).text ();
                var classification = $('td', $(this)).eq (13).text ().substr (6, 1);
                var first_name = name.substr (0, name.length - 2);
                var last_initial = name.substr (-1);

                classification = (classification === 'S' ? 'U' : classification); // FIXME: SteelChallenge.com has 'Steel SU'

                records.push ({
                  $scsa_num: scsa,
                  $first_name: first_name,
                  $last_initial: last_initial,
                  $classification: classification,
                  $ranking: ranking,
                });
              });
              tellMe (req, 'status', {status: 'Updating classification database...'});
              app.pmm.file ().classificationsSaveSC (records, last_update, function (err, inserted) {
                replyToMe (req, {
                  err: err,
                  records: inserted,
                  updated: last_update,
                });
                classificationsGetMutex.unlock ();
              });
              fs.writeFileSync ('debug/sc_class_update.txt', body);
            } else {
              replyToMe (req, {err: true, msg: error || ('HTTP status ' + response.statusCode)});
              classificationsGetMutex.unlock ();
            }
          }
        );
      } else
        replyToMe (req, {err: true, msg: 'Classification update already in progess'});
    },
    'get:uspsa': function (req) {
      pmelog.llog (pmelog.NORMAL, '>classifications:get:uspsa: Received request to download EZWS classifications file');

      if (classificationsGetMutex.tryLock ()) {
        tellMe (req, 'status', {status: 'Requesting classifications update file from USPSA.org...'});
        request (app.pmm.config ().get ('download', 'urlUSPSA'),
          function (error, response, body) {
            if (!error && (response.statusCode === 200)) {
              fs.writeFileSync ('debug/ez_class_update.txt', body);
              var records = [];
              var updates = body.replace (/\s+$/, '').split ('\n');
              var last_update = updates.shift ().split ('\t') [1].replace (/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2 00:00:00');
              _.each (updates, function (update) {
                records.push (app.pmm.match ().matchdef ().parseClassificationUpdate (update));
              });

              tellMe (req, 'status', {status: 'Updating classification database...'});
              app.pmm.file ().classificationsSaveUSPSA (records, last_update, function (err, inserted) {
                replyToMe (req, {
                  err: err,
                  records: inserted,
                  updated: last_update,
                });
                classificationsGetMutex.unlock ();
              });
            } else {
              replyToMe (req, {err: true, msg: error || ('HTTP status ' + response.statusCode)});
              classificationsGetMutex.unlock ();
            }
          }
        );
      } else
        replyToMe (req, {err: true, msg: 'Classification update already in progess'});
    },
    'available:sc': function (req) {
      pmelog.llog (pmelog.NORMAL, '>classifications:available:sc: Received request for available Steel Challenge updates');
      app.pmm.file ().classificationsAvailableSC (function (err, records) {
        replyToMe (req, {
          err: err,
          records: records,
        });
      });
    },
    'available:uspsa': function (req) {
      pmelog.llog (pmelog.NORMAL, '>classifications:available:uspsa: Received request for available USPSA.org updates');
      app.pmm.file ().classificationsAvailableUSPSA (function (err, records) {
        replyToMe (req, {
          err: err,
          records: records,
        });
      });
    },
  });

  app.io.route ('config', {
    'defaults': function (req) {
      pmelog.llog (pmelog.NORMAL, '>config:defaults: Received request for configuration defaults');
      app.pmm.config ().defaults ({section: req.data.section}, function (err, config) {
        replyToMe (req, {
          err: err,
          config: config,
        });
      });
    },
    'request': function (req) {
      pmelog.llog (pmelog.NORMAL, '>config:request: Received request for configuration');
      app.pmm.config ().request (function (err, config) {
        replyToMe (req, {
          err: err,
          config: config,
        });
      });
    },
    'validate': function (req) {
      pmelog.llog (pmelog.NORMAL, '>config:validate: Received request to validate configuration');
      app.pmm.config ().validate (req.data.config, function (err) {
        replyToMe (req, {
          err: err,
        });
      });
    },
    'save': function (req) {
      pmelog.llog (pmelog.NORMAL, '>config:save: Received request to save configuration');
      app.pmm.config ().save (req.data.config, function (err) {
        replyToMe (req, {
          err: err,
        });
      });
    },
    'validate:url': function (req) {
      var isURL = validator.isURL (req.data.url, {
          protocols: ['http', 'https'],
          allow_underscores: true,
        });
      pmelog.llog (pmelog.NORMAL, '>config:save: Received request to validate URL \'%s\' (%s)', req.data.url, isURL ? 'OK' : 'ERR');
      replyToMe (req, {
        err: !isURL,
        isURL: isURL,
        url: req.data.url,
      });
    },
  });

  //
  //
  //
  app.io.route ('control', {
    'hello': function (req) {
      pmelog.llog (pmelog.DEBUG, '>control:hello: Received request to say hello');
      tellMe (req, 'control_hello');
    },
    'reload': function (req) {
      pmelog.llog (pmelog.NORMAL, '>control:reload: Received request to restart');
      tellMe (req, app.reloadMatchFromPSC () ? 'control_reload_busy' : 'control_reload_complete');
    },
    'play:start': function (req) {
      pmelog.llog (pmelog.NORMAL, '>control:play:start: Received request to play match');
      tellMe (req, app.playMatch () ? 'control_play_busy' : 'control_play_started');
    },
    'play:stop': function (req) {
      pmelog.llog (pmelog.NORMAL, '>control:play:stop: Received request to stop playing match');
      tellMe (req, app.playMatchStop () ? 'control_play_notplaying' : 'control_play_stopped');
    },
    'play:fast': function (req) {
      pmelog.llog (pmelog.NORMAL, '>control:play:fast: Received request to stop playing match');
      tellMe (req, app.playMatch (1) ? 'control_play_busy' : 'control_play_complete');
    },
  });

  //
  //
  //
  app.io.route ('device', {
    //
    //  Sends a hash containing the device configurations (IP address,
    //  auto-poll status, last heard, etc) of the devices we currently know
    //  about back to the requestor.
    //
    'info': function (req) {
      pmelog.llog (pmelog.NORMAL, '>device:info: Received request for device information');
      replyToMe (req, {
        deviceinfo: app.pmm.devices ().getInfoHash (),
        matchinfo: app.pmm.match ().getInfo (),
        scaninprogress: app.pmm.devices ().scanInProgress (),
      });
    },
    //
    //  Clears the device list (which clears EVERYTHING!). Returns response to
    //  requestor. Error is either successful or a scan in progress.
    //
    'clear': function (req) {
      pmelog.llog (pmelog.NORMAL, '>device:clear: Received request to clear ALL device information');
      app.pmm.devices ().clear (function (err, msg) {
        replyToMeStatusMsg (req, err ? pmelog.ERROR : pmelog.NORMAL, 'device:clear', msg, {
          broadcastMsg: !err ? 'device_info' : null,
          broadcastData: {
            deviceinfo: [],
            matchinfo: app.pmm.match ().getInfo (),
          },
        });
      });
    },
    //
    //  Scans all addresses in the defined IP block address range, and returns
    //  the configuration and headers info of all the responding devices
    //  (battery, match name, etc). Does not return a response to requestor,
    //  but updates status via device_sync_status broadcasts.
    //
    'scan': function () {
      var timer = null;
      var scanTimeInSeconds = app.pmm.config ().get ('devices', 'scanTime');

      pmelog.llog (pmelog.NORMAL, '>device:scanall: Received request to scan for clients');
      pmelog.llog (pmelog.NORMAL, '>device:scanall: Scanning address range %s', app.pmm.config ().get ('devices','ipblock'));

      if (app.pmm.devices ().scan (function (err, deviceList) {
        if (timer)
          clearTimeout (timer);

        if (err === 1) {
          pmelog.llog (pmelog.NORMAL, '>device:scanall: Can\'t start new scan, scan already in progress');
          tellEveryone ('device_scan_status', {action: 'inprogress', msg: 'Can\'t start new scan, a scan is already in progress'});
        } else if (err) {
          tellEveryone ('device_scan_status', {action: 'other', msg: util.format ('scan() returned error %s', err)});
          pmelog.llog (pmelog.ERROR, '>device:scanall: scan() returned error %s', err);
        } else {
          var n = _.keys (deviceList).length;
          pmelog.llog (pmelog.NORMAL, '>device:scanall: Scan complete, %d clients found', _.keys (deviceList).length);
          tellEveryone ('device_info', {
            deviceinfo: app.pmm.devices ().getInfoHash (),
            matchinfo: app.pmm.match ().getInfo (),
          });
          tellEveryone ('device_scan_status', {
            action: 'complete',
            msg: util.format ('%s device%s found', n ? n : 'No', (n === 1) ? '' : 's'),
            found: n,
          });
        }
      })) {
        var msg = function () {
          tellEveryone ('device_scan_status', {
            action: 'start',
            msg: util.format ('Scanning for clients (%s second%s remaining)', scanTimeInSeconds, (scanTimeInSeconds !== 1) ? 's' : '')
          });
        };

        timer = setInterval (function () {
          if (scanTimeInSeconds-- === 0)
            clearTimeout (timer);
          else
            msg ();
        }, 1000);

        msg ();
      }
    },
    //
    //  'Poll' means get the match from the device and merge the match into the
    //  current match, assuming that the match and scores ID match. Returns response
    //  to requestor, and will broadcast 'match_updated' if any changes occurred.
    //
    //  req.data.ip contains the IP address of the device to request the match
    //  from.
    //
    'poll': function (req) {
      var d = app.pmm.devices ().getDeviceByID (req.data.deviceid);
      var route = 'device:poll';
      var message;
      var options = {};

      if (d) {
        pmelog.llog (pmelog.NORMAL, '>device:poll: Received poll match request for %s @ %s', d.getDeviceNameShort (), d.getClientAddress ());

        d.syncAll (function (err, errDetail) {
          if (!err) {
            app.pmm.match ().merge ({matchdef: d.getMatchdef (), scores: d.getScores (), logs: d.getLogs ()}, {device: d, deviceName: d.getDeviceNameShort ()}, function (err, changes) {
              if (!err) {
                showChanges ('device:poll', _.map (changes, function (c) {return sprintf ('%s: %s', d.getDeviceNameShort (), c);}));
                message = util.format ('Match merged from %s @ %s', d.getDeviceNameShort (), psutils.timeStampLocal ());
                options = {broadcastMsg: changes.length ? 'match_updated' : null};
              } else
                message = util.format ('Error occurred polling %s: %s', d.getDeviceNameShort (), err);

              replyToMeStatusMsg (req, err ? pmelog.ERROR : pmelog.NORMAL, route, message, options);
            });
          } else
            replyToMeStatusMsg (req, pmelog.ERROR, route, util.format ('Error occurred polling %s: %s (%s)', d.getDeviceNameShort (), err, errDetail || 'Unknown'), options);
        });
      } else
        replyToMeStatusMsg (req, pmelog.ERROR, route, util.format ('Device %s doesn\'t exist?', req.data.deviceid), options);
    },
    //
    //  Polls all devices with auto-poll enabled, regardless if listed as
    //  online or not. Does not respond to message, but updates status via
    //  device_sync_status broadcasts.
    //
    'pollall': function (req) {
      var did_autopoll = false;
      var route = 'device:pollall';

      _.each (app.pmm.devices ().devices (), function (d) {
        if (d.getAutoPoll ()) {
          did_autopoll = true;
          d.syncAll (function (err, errDetail) {
            if (!err) {
              app.pmm.match ().merge ({matchdef: d.getMatchdef (), scores: d.getScores (), logs: d.getLogs ()}, {device: d, deviceName: d.getDeviceNameShort ()}, function (err, changes) {
                var message;

                if (!err) {
                  showChanges ('device:pollall', _.map (changes, function (c) {return sprintf ('%s: %s', d.getDeviceNameShort (), c);}));
                  message = util.format ('Match merged from %s @ %s%s', d.getDeviceNameShort (), psutils.timeStampLocal (), changes.length ? '' : ' (no changes)');
                } else
                  message = util.format ('Error occurred polling %s: %s', d.getDeviceNameShort (), err);

                tellEveryoneStatusMsg (err ? pmelog.ERROR : pmelog.NORMAL, route, message, (!err && changes.length) ? 'match_updated' : null);
              });
            } else
              tellEveryoneStatusMsg (pmelog.ERROR, route, util.format ('Error occurred polling %s: %s (%s)', d.getDeviceNameShort (), err, errDetail || 'Unknown'));
          });
        }
      });

      replyToMeStatusMsg (req, pmelog.NORMAL, route, did_autopoll ? util.format ('Poll all started @ %s', psutils.timeStampLocal ()) : 'No devices configured for auto-poll');
    },
    //
    //  Enables or disables auto-polling on the specified device
    //
    'autopoll': function (req) {
      var d = app.pmm.devices ().getDeviceByID (req.data.deviceid);
      var route = 'device:autopoll';

      if (!d) {
        tellEveryone ('device_info');
        replyToMeStatusMsg (req, pmelog.ERROR, route, util.format ('Device %s doesn\'t exist?', req.data.deviceid));
        return;
      }

      pmelog.llog (pmelog.NORMAL, '>device:autopoll: Received auto-poll %s request for %s @ %s', req.data.state ? 'enabled' : 'disabled', d.getDeviceNameShort (), d.getClientAddress ());

      if (!req.data.state) {
        d.setAutoPoll (false);
        tellEveryone ('device_info');
        replyToMeStatusMsg (req, pmelog.NORMAL, route, util.format ('Auto-poll disabled for %s', d.getDeviceNameShort ()));
        return;
      }
      if (d.getMatchID () !== app.pmm.match ().matchdef ().getID ()) {
        d.setAutoPoll (false);
        tellEveryone ('device_info');
        replyToMeStatusMsg (req, pmelog.ERROR, route, util.format ('Device %s has a different match loaded!', d.getDeviceNameShort ()), {extra: {newstate: false}});
        return;
      }

      d.syncAll ({autopollCallback: true}, function (err, errDetail) {
        var message;

        if (!err) {
          if ((d.getMatchID () === app.pmm.match ().matchdef ().getID ())) {
            app.pmm.match ().merge ({matchdef: d.getMatchdef (), scores: d.getScores (), logs: d.getLogs ()}, {device: d, deviceName: d.getDeviceNameShort ()}, function (err, changes) {
              if (!err) {
                showChanges ('device:pollall', _.map (changes, function (c) {return sprintf ('%s: %s', d.getDeviceNameShort (), c);}));
                message = util.format ('Auto-poll\'ed match from %s @ %s', d.getDeviceNameShort (), psutils.timeStampLocal ());
              } else
                message = util.format ('Error occurred auto-polling %s: %s', d.getDeviceNameShort (), err);

              tellEveryoneStatusMsg (err ? pmelog.ERROR : pmelog.NORMAL, route, message, (!err && changes.length) ? 'match_updated' : null);
            });
          } else {
            d.setAutoPoll (false);
            tellEveryoneStatusMsg (pmelog.ERROR, route, util.format ('Match ID\'s for current match and device %s don\'t match, disabling auto-poll', d.getDeviceNameShort ()), 'device_info');
          }
        } else
          tellEveryoneStatusMsg (pmelog.ERROR, route, util.format ('Error occurred auto-polling %s: %s (%s)', d.getDeviceNameShort (), err, errDetail || 'Unknown'));
      });

      d.setAutoPoll (true);
      tellEveryoneElse (req, 'device_info');
      replyToMeStatusMsg (req, pmelog.NORMAL, route, util.format ('Auto-poll enabled for %s', d.getDeviceNameShort ()), {extra: {newstate: true}});
    },
    'autopoll:none': function (req) {
      var route = 'device:autopoll:none';

      _.each (app.pmm.devices ().devices (), function (d) {
        d.setAutoPoll (false);
      });
      tellEveryone ('device_info');
      replyToMeStatusMsg (req, pmelog.NORMAL, route, 'Auto-poll disabled for all devices');
    },
    'hide': function (req) {
      var d = app.pmm.devices ().getDeviceByID (req.data.deviceid);
      var route = 'device:hide';

      if (d) {
        pmelog.llog (pmelog.NORMAL, '>device:hide: Received %shide request for %s @ %s', req.data.state ? '' : 'un', d.getDeviceNameShort (), d.getClientAddress ());
        d.setHidden (req.data.state);
        replyToMeStatusMsg (req, pmelog.NORMAL, route, util.format ('%s is now %shidden', d.getDeviceNameShort (), req.data.state ? '' : 'no longer '));
      } else
        replyToMeStatusMsg (req, pmelog.ERROR, route, util.format ('Device %s doesn\'t exist?', req.data.deviceid));

      tellEveryone ('device_info');
    },
    'unhideall': function (req) {
      var route = 'device:unhideall';

      pmelog.llog (pmelog.NORMAL, '>device:unhideall: Received request to unhide all devices');

      _.each (app.pmm.devices ().devices (), function (d) {
        d.setHidden (false);
      });

      tellEveryone ('device_info');
      replyToMeStatusMsg (req, pmelog.NORMAL, route, 'All devices are now unhidden');
    },
  });

  //
  //
  //
  app.io.route ('categories', {
    'get': function (req) {
      replyToMe (req, {
        err: null,
        categories: app.pmm.match ().matchdef ().getCategoriesEx (),
      });
    },
    'add': function (req) {
      app.pmm.match ().matchdef ().addCategories (req.data.category, function (err, results) {
        if (!err && results.modified)
          tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'categories_updated']);
        replyToMe (req, {
          err: results.duplicate ? {field: 'ps_name', msg: 'Duplicate category'} : null,
          categories: app.pmm.match ().matchdef ().getCategoriesEx (),
          changed: results.modified,
        });
      });
    },
    'delete': function (req) {
      app.pmm.match ().matchdef ().deleteCategories (req.data.category, function (err, results) {
        if (!err && results.modified)
          tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'categories_updated']);
        replyToMe (req, {
          err: err,
          categories: app.pmm.match ().matchdef ().getCategoriesEx (),
          changed: results.modified,
        });
      });
    },
    'modify': function (req) {
      app.pmm.match ().matchdef ().modifyCategories (req.data.category, function (err, results) {
        if (!err && results.modified)
          tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'categories_updated']);
        replyToMe (req, {
          err: err,
          categories: app.pmm.match ().matchdef ().getCategoriesEx (),
          changed: results.modified,
        });
      });
    },
    'move': function (req) {
      app.pmm.match ().matchdef ().moveCategories (req.data.from, req.data.to, function (err, results) {
        if (!err && results.modified)
          tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'categories_updated']);
        replyToMe (req, {
          err: err,
          categories: app.pmm.match ().matchdef ().getCategoriesEx (),
          changed: results.modified,
        });
      });
    },
  });

  app.io.route ('classes', {
    'get': function (req) {
      replyToMe (req, {
        err: null,
        classes: app.pmm.match ().matchdef ().getClassesEx (),
      });
    },
    'add': function (req) {
      app.pmm.match ().matchdef ().addClasses (req.data.classs, function (err, results) {
        if (!err && results.modified)
          tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'classes_updated']);
        replyToMe (req, {
          err: results.duplicate ? {field: 'ps_name', msg: 'Duplicate class'} : null,
          classes: app.pmm.match ().matchdef ().getClassesEx (),
          changed: results.modified,
        });
      });
    },
    'delete': function (req) {
      app.pmm.match ().matchdef ().deleteClasses (req.data.classs, function (err, results) {
        if (!err && results.modified)
          tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'classes_updated']);
        replyToMe (req, {
          err: err,
          classes: app.pmm.match ().matchdef ().getClassesEx (),
          changed: results.modified,
        });
      });
    },
    'modify': function (req) {
      app.pmm.match ().matchdef ().modifyClasses (req.data.classs, function (err, results) {
        if (!err && results.modified)
          tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'classes_updated']);
        replyToMe (req, {
          err: err,
          classes: app.pmm.match ().matchdef ().getClassesEx (),
          changed: results.modified,
        });
      });
    },
    'move': function (req) {
      app.pmm.match ().matchdef ().moveClasses (req.data.from, req.data.to, function (err, results) {
        if (!err && results.modified)
          tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'classes_updated']);
        replyToMe (req, {
          err: err,
          classes: app.pmm.match ().matchdef ().getClassesEx (),
          changed: results.modified,
        });
      });
    },
  });

  app.io.route ('divisions', {
    'get': function (req) {
      replyToMe (req, {
        err: null,
        divisions: app.pmm.match ().matchdef ().getDivisionsEx (),
      });
    },
    'add': function (req) {
      app.pmm.match ().matchdef ().addDivisions (req.data.division, function (err, results) {
        if  (!err && results.modified)
          tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'divisions_updated']);
        replyToMe (req, {
          err: results.duplicate ? {field: 'ps_name', msg: 'Duplicate division'} : null,
          divisions: app.pmm.match ().matchdef ().getDivisionsEx (),
          changed: results.modified,
        });
      });
    },
    'delete': function (req) {
      app.pmm.match ().matchdef ().deleteDivisions (req.data.division, function (err, results) {
        if (!err && results.modified)
          tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'divisions_updated']);
        replyToMe (req, {
          err: err,
          divisions: app.pmm.match ().matchdef ().getDivisionsEx (),
          changed: results.modified,
        });
      });
    },
    'modify': function (req) {
      app.pmm.match ().matchdef ().modifyDivisions (req.data.division, function (err, results) {
        if (!err && results.modified)
          tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'divisions_updated']);
        replyToMe (req, {
          err: err,
          divisions: app.pmm.match ().matchdef ().getDivisionsEx (),
          changed: results.modified,
        });
      });
    },
    'move': function (req) {
      app.pmm.match ().matchdef ().moveDivisions (req.data.from, req.data.to, function (err, results) {
        if (!err && results.modified)
          tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'divisions_updated']);
        replyToMe (req, {
          err: err,
          divisions: app.pmm.match ().matchdef ().getDivisionsEx (),
          changed: results.modified,
        });
      });
    },
  });

  //
  //
  //
  app.io.route ('download', {
    'cpc:match': function (req) {
      pmelog.llog (pmelog.NORMAL, '>download:cpc:match: Received request to download match from CPC');
      if (!req.data.pin)
        replyToMe (req, {err: 'Missing PIN'});
      else {
        pmelog.llog (pmelog.DEBUG, 'Requesting match from clubs.practiscore.com with pin %s', req.data.pin);
        if (_.isUndefined (req.data.savePIN))
          req.data.savePIN = app.pmm.config ().get ('download', 'cpcSavePINs');
        request.post (
          {
            url: 'https://clubs.practiscore.com/export/match',
            form: {
              eggToken: '4MV9r3EggdwqYs',
              matchPin: req.data.pin,
            },
            headers: {
              'User-Agent': 'Practiscore 1.667 (iPad; CPU OS 8_4 like Mac OS X; en-us)',
            },
          },
          function (error, response, body) {
            if (!error && response.statusCode === 200) {
              var json;
              var buffer;
              var matchdef;

              try {
                json = JSON.parse (body);
                buffer = new Buffer (json.matchData, 'base64');
              } catch (e) {
                pmelog.llog (pmelog.ERROR, 'Unable to parse response from clubs.practiscore.com');
                replyToMe (req, {err: 'Unable to parse response from clubs.practiscore.com'});
                return;
              }

              try {
                matchdef = JSON.parse (pako.inflate (buffer, {to: 'string'}));
              } catch (e) {
                pmelog.llog (pmelog.ERROR, 'Error inflating response');
                replyToMe (req, {err: 'Error inflating response'});
                return;
              }

              fs.writeFileSync ('debug/cpc_download_' + req.data.pin + '.json', JSON.stringify (matchdef, null, '  '));

              app.pmm.match ().parseToNew ({matchdef: matchdef}, {fixNameCase: req.data.fixNameCase || false}, function (err, newMatch) {
                if (!err) {
                  if (req.data.savePIN) {
                    app.pmm.file ().matchPINsSave ({
                        pin: req.data.pin,
                        match_type: newMatch.matchdef ().getMatchType (),
                        match_type_name: newMatch.matchdef ().getMatchTypeName (),
                        match_name: newMatch.matchdef ().getName ()
                      }, function (err) {
                        if (err)
                          pmelog.llog (pmelog.ERROR, err);
                    });
                  }

                  app.pmm.accessorFunctions ().replaceMatch (newMatch);
                  tellEveryoneElse (req, 'reload');
                  tellMe (req, 'menurefresh');
                } else
                  pmelog.llog (pmelog.ERROR, err);

                replyToMe (req, {
                  err: err,
                  matchname: !err ? newMatch.matchdef ().getName () : null,
                  shooters: newMatch.matchdef ().getShooters ().length,
                });
              });
            } else if (error)
              replyToMe (req, {err: error});
            else
              replyToMe (req, {err: 'HTTP status ' + response.statusCode});
          }
        );
      }
    },
    'cpc:pins': function (req) {
      pmelog.llog (pmelog.NORMAL, '>download:cpc:pins: Received request for available clubs.practiscore.com match PINs');
      app.pmm.file ().matchPINsLoad (function (err, pin_list) {
        replyToMe (req, {
          err: err,
          pin_list: pin_list,
        });
      });
    },
    'ssu:club': function (req) {
      app.pmm.file ().jsonGet ('ssu_club', function (err, json) {
        json = json || {};
        json.clubname = json.clubname || null;
        replyToMe (req, {
          err: err,
          clubname: json.clubname,
        });
      });
    },
    'ssu:credentials': function (req) {
      app.pmm.file ().jsonGet ('ssu_credentials', function (err, json) {
        json = json || {};
        json.username = json.username || null;
        json.password = json.password || null;
        replyToMe (req, {
          err: err,
          username: json.username,
          password: json.password,
        });
      });
    },
    'ssu:match': function (req) {
      pmelog.llog (pmelog.NORMAL, '>download:ssu:match: Received request to download match from SquadSignup.com');
      if (!req.data.clubname)
        replyToMe (req, {err: 'Missing clubname'});
      else if (!req.data.username)
        replyToMe (req, {err: 'Missing username'});
      else if (!req.data.password)
        replyToMe (req, {err: 'Missing password'});
      else if (!req.data.matchID)
        replyToMe (req, {err: 'Missing match ID'});
      else {
        var pscMatch = new Buffer (0);
        var baseURL = 'https://squadsignup.com/';
        var httpReq = request.defaults ({
          jar: true,
          followAllRedirects: true,
          encoding: null,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36',
          },
          auth: {
            user: req.data.username.trim (),
            pass: req.data.password.trim (),
          },
        });

        var doRequest = function (uri, callback, wantData) {
          httpReq.post (uri, function (error, response, body) {
            if (!error && (response.statusCode === 200)) {
              if (!wantData)
                callback (null, body, response);
            } else {
              var err = response.statusCode;

              pmelog.llog (pmelog.ERROR, 'Request on %s returned %s', uri, err);

              if (err === 401)
                err = 'Invalid username or password (401)';
              else if (err === 404)
                err = 'Invalid club name (404)';
              else if (err === 408)
                err = 'SquadSignup.com server never responded (408)';
              else if (err === 500)
                err = 'SquadSignup.com server is broken, try again later (500)';

              callback (err);
            }
          })
          .on ('response', function (response) {
            response.on ('data', function (data) {
              if (wantData)
                pscMatch = Buffer.concat ([pscMatch, data]);
            });
            response.on ('end', function () {
              if (wantData)
                callback (null, pscMatch);
            });
          });
        };

        req.data.clubname = req.data.clubname.trim ();
        req.data.matchID = req.data.matchID.trim ();

        baseURL += req.data.clubname + '/admin/';

        if (req.data.saveClub)
          app.pmm.file ().jsonSave ('ssu_club', {clubname: req.data.clubname});
        if (req.data.saveCredentials)
          app.pmm.file ().jsonSave ('ssu_credentials', {username: req.data.username, password: req.data.password});
        if (req.data.saveMatchID)
          app.pmm.file ().jsonSave ('ssu_matchid', {matchID: req.data.matchID});

        tellMe (req, 'status', {status: 'Logging into SquadSignup.com...'});

        doRequest (baseURL, function (err) {
          if (!err) {
            tellMe (req, 'status', {status: 'Switching to match ' + req.data.matchID + '...'});
            doRequest (baseURL + 'index.php?MatchId=' + req.data.matchID, function (err, body) {
              if (!err) {
                var $ = cheerio.load (body);
                var selector = '#MatchId option[value="' + req.data.matchID + '"]';

                if ($(selector).length === 1) {
                  $(selector).each (function () {
                    var matchDate = $(this).text ().match (/^\d{4}-\d{2}-\d{2}/);

                    tellMe (req, 'status', {status: 'Telling SquadSignup.com to generate PractiScore file...'});
                    doRequest (baseURL + 'ajax_export.php?mid=' + req.data.matchID, function (err) {
                      if (!err) {
                        tellMe (req, 'status', {status: 'Requesting match in PractiScore format...'});
                        pmelog.llog (pmelog.INFO, 'URL for match is %s', baseURL + 'Match_' + req.data.matchID + '_' + matchDate + '.psc');
                        doRequest (baseURL + 'Match_' + req.data.matchID + '_' + matchDate + '.psc', function (err, matchBuffer) {
                          if (!err) {
                            tellMe (req, 'status', {status: 'Processing downloaded match...'});

                            fs.writeFileSync ('debug/ssu_download_' + req.data.matchID + '_' + matchDate + '.psc', matchBuffer);

                            psc.pscImport (matchBuffer, function (err, match) {
                              if (!err) {
                                app.pmm.match ().parseToNew ({matchdef: match.matchdef}, {fixNameCase: req.data.fixNameCase || false}, function (err, newMatch) {
                                  if (!err) {
                                    app.pmm.accessorFunctions ().replaceMatch (newMatch);
                                    tellEveryoneElse (req, 'reload');
                                    tellMe (req, 'menurefresh');
                                  } else
                                    pmelog.llog (pmelog.ERROR, err);

                                  replyToMe (req, {
                                    err: err,
                                    matchname: !err ? newMatch.matchdef ().getName () : null,
                                    shooters: !err ? newMatch.matchdef ().getShooters ().length : null,
                                  });
                                });
                              } else
                                replyToMe (req, {err: err});
                            });
                          } else
                            replyToMe (req, {err: err});
                        }, true);
                      } else
                        replyToMe (req, {err: 'PractiScore file generation request failed'});
                    });
                  });
                } else if ($(selector).length === 0)
                  replyToMe (req, {err: 'Match number not found'});
                else
                  replyToMe (req, {err: 'Eeek! Multiple matching match numbers found!'});
              } else
                replyToMe (req, {err: err});
            });
          } else
            replyToMe (req, {err: err});
        });
      }
    },
    'ssu:matchid': function (req) {
      app.pmm.file ().jsonGet ('ssu_matchid', function (err, json) {
        json = json || {};
        json.matchID = json.matchID || -1;
        replyToMe (req, {
          err: err,
          matchID: json.matchID,
        });
      });
    },
  });

  //
  //
  //
  var errorlog = function (level, data) {
    if (!data)
      pmelog.llog (level, 'Received errorlog message, but no data!');
    else {
      if (data.url)
        pmelog.llog (level, data.url);
      if (data.msg)
        pmelog.llog (level, data.msg);
      if (data.line)
        pmelog.llog (level, 'Line %s, column %s', data.line, data.col || '?');
      if (data.stack)
        pmelog.llog (level, data.stack);

      if (!data.url && !data.msg && !data.error) {
        pmelog.llog (level, 'Receive errorlog message, but had no url, msg or error data');
        pmelog.ldirex (level, data);
      }
    }
  };

  app.io.route ('errorlog', {
    'critical': function (req) {
      errorlog (pmelog.CRITICAL, req.data);
    },
    'error': function (req) {
      errorlog (pmelog.ERROR, req.data);
    },
    'warn': function (req) {
      errorlog (pmelog.WARN, req.data);
    },
    'normal': function (req) {
      errorlog (pmelog.NORMAL, req.data);
    },
    'info': function (req) {
      errorlog (pmelog.INFO, req.data);
    },
    'verbose': function (req) {
      errorlog (pmelog.VERBOSE, req.data);
    },
    'debug': function (req) {
      errorlog (pmelog.DEBUG, req.data);
    },
  });

  //
  //
  //
  app.io.route ('file', {
    'db:load': function (req) {
      pmelog.llog (pmelog.NORMAL, '>file:db:load: Received request to load match %s', req.data.uuid);
      app.pmm.file ().dbLoad ({uuid: req.data.uuid}, function (err, newMatch) {
        if (!err) {
          tellEveryoneElse (req, 'reload');
          tellMe (req, 'menurefresh');
        }
        replyToMe (req, {
          err: err,
          matchName: !err ? newMatch.matchdef ().getName () : null,
        });
      });
    },
    'db:save': function (req) {
      pmelog.llog (pmelog.NORMAL, '>file:db:save: Received request to save database');
      app.pmm.file ().dbSave (function (err) {
        if (err)
          pmelog.llog (pmelog.ERROR, 'Error saving match to database: %s', err);

        if (!err)
          tellEveryoneElse (req, 'db_directory_changed');

        replyToMe (req, {
          err: err,
        });
      });
    },
    'db:savenew': function (req) {
      pmelog.llog (pmelog.NORMAL, '>file:db:savenew: Received request to save as new match');
      app.pmm.file ().dbSave ({newuuid: true}, function (err) {
        if (err)
          pmelog.llog (pmelog.ERROR, 'Error saving new match: %s', err);

        if (!err)
          tellEveryoneElse (req, 'db_directory_changed');

        replyToMe (req, {
          err: err,
        });
      });
    },
    'db:delete': function (req) {
      pmelog.llog (pmelog.NORMAL, '>file:db:delete: Received request to delete match %s', req.data.uuid);
      app.pmm.file ().dbDelete ({uuid: req.data.uuid}, function (err) {
        if (!err)
          tellEveryoneElse (req, 'db_directory_changed');
        replyToMe (req, {
          err: err,
        });
      });
    },
    'db:list': function (req) {
      pmelog.llog (pmelog.NORMAL, '>file:db:list: Received request for list of matches in database');
      app.pmm.file ().dbList (function (err, matchFiles) {
        replyToMe (req, {
          err: err,
          files: !err ? matchFiles : null,
          saveCurrent: !err ? app.pmm.match ().getPendingChanges () : null,
          matchName: !err ? app.pmm.match ().matchdef ().getName () : null,
        });
        if (err)
          pmelog.llog (pmelog.ERROR, 'Error getting database match list: %s', err);
      });
    },

    'db:logs': function (req) {
      pmelog.llog (pmelog.NORMAL, '>file:db:logs: Received request to load logs for match %s', req.data.uuid);
      app.pmm.file ().dbLogsLoad ({uuid: req.data.uuid}, function (err) {
        tellMe (req, 'logs_loaded', {err: err});
      });
    },

    'ezws:combined:export': function (req) {
      pmelog.llog (pmelog.NORMAL, '>file:ezws:combined:export: Received request to export combined EZWS files');
      app.pmm.match ().matchdef ().exportCombined (function (err) {
        replyToMe (req, {
          err: err,
        });
      });
    },
    'ezws:db:export': function (req) {
      req = req;
    },
    'ezws:db:import': function (req) {
      req = req;
    },
    // FIXME: This needs to be using replyToMe() and tellEveryoneElse()
    'ezws:db:list': function (req) {
      pmelog.llog (pmelog.NORMAL, '>file:ezws:db:list: Received request for list of EZWS database files');
      app.pmm.file ().ezwsList (function (err, matchFiles) {
        if (err)
          pmelog.llog (pmelog.ERROR, 'Error getting EZWS match file list: %s', err);

        tellMe (req, 'database_list_ssi', {err: err, matchFiles: matchFiles, saveCurrent: app.pmm.match ().getPendingChanges ()});
        if (!err)
          tellEveryone ('reload');
      });
    },
    'ezws:registration:import': function (req) {
      req = req;
    },
    'ezws:registration:list': function (req) {
      req = req;
    },
    'ezws:results:export': function (req) {
      req = req;
    },
    'ezws:scores:export': function (req) {
      req = req;
    },
    'ezws:scores:import': function (req) {
      req = req;
    },
    'ezws:scores:list': function (req) {
      req = req;
    },
    'ezws:squads:export': function (req) {
      req = req;
    },
    'ezws:squads:import': function (req) {
      req = req;
    },
    'ezws:squads:list': function (req) {
      req = req;
    },
    'ezws:stages:export': function (req) {
      req = req;
    },
    'ezws:stages:import': function (req) {
      req = req;
    },
    'ezws:stages:list': function (req) {
      req = req;
    },

    'psc:load': function (req) {
      pmelog.llog (pmelog.NORMAL, '>file:psc:load: Received request to load .psc match \'%s\'', req.data.file);
      app.pmm.file ().pscLoad (req.data.file, function (err, newMatch) {
        if (!err) {
          tellEveryoneElse (req, 'reload');
          tellMe (req, 'menurefresh');
        }
        replyToMe (req, {
          err: err,
          matchName: !err ? newMatch.matchdef ().getName () : null,
        });
      });
    },
    'psc:save': function (req) {
      var filename = process.cwd () + '/matches/' + req.data.value;

      pmelog.llog (pmelog.NORMAL, '>file:psc:save: Received request to save database to %s', req.data.value);
      if (!req.data.overwrite && fs.existsSync (filename))
        replyToMe (req, {
          err: null,
          filename: filename,
          fileexists: true,
        });
      else {
        app.pmm.file ().pscSave (filename, function (err) {
          if (err)
            pmelog.llog (pmelog.ERROR, 'Error saving match to file: %s', err);
          if (!err)
            tellEveryoneElse (req, 'psc_files_changed');
          replyToMe (req, {
            err: err,
            filename: filename,
            saved: true,
          });
        });
      }
    },
    'psc:merge': function (req) {
      pmelog.llog (pmelog.NORMAL, '>file:psc:merge: Received request to merge .psc match \'%s\'', req.data.file);
      app.pmm.file ().pscRead (req.data.file, function (err, matchJSON) {
        if (!err) {
          app.pmm.match ().merge ({matchdef: matchJSON.matchdef, scores: matchJSON.scores}, {deviceName: req.data.file}, function (err, changes) {
            if (!err) {
              tellEveryoneElse (req, 'match_updated');
              showChanges ('file:psc:merge', _.map (changes, function (c) {return sprintf ('%s: %s', req.data.file, c);}));
            } else
              pmelog.llog (pmelog.ERROR, 'Error merging fragment: %s', err);
            replyToMe (req, {
              err: err,
            });
          });
        } else {
          pmelog.llog (pmelog.ERROR, 'Error loading fragment file: %s', err);
          replyToMe (req, {
            err: err,
          });
        }
      });
    },
    'psc:combine': function (req) {
      pmelog.llog (pmelog.NORMAL, '>file:psc:combine: Received request to combine .psc match \'%s\'', req.data.file);
      app.pmm.file ().pscRead (req.data.file, function (err, matchJSON) {
        if (!err) {
          app.pmm.match ().merge ({matchdef: matchJSON.matchdef, scores: matchJSON.scores}, {deviceName: req.data.file, ignoreUUID: true}, function (err, changes) {
            if (!err) {
              tellEveryoneElse (req, 'match_updated');
              showChanges ('file:psc:combine', _.map (changes, function (c) {return sprintf ('%s: %s', req.data.file, c);}));
            } else
              pmelog.llog (pmelog.ERROR, 'Error combining match: %s', err);
            replyToMe (req, {
              err: err,
            });
          });
        } else {
          pmelog.llog (pmelog.ERROR, 'Error loading combine file: %s', err);
          replyToMe (req, {
            err: err,
          });
        }
      });
    },
    'psc:delete': function (req) {
      pmelog.llog (pmelog.NORMAL, '>file:psc:delete: Received request to delete file %s', req.data.file);
      app.pmm.file ().pscDelete (req.data.file, function (err) {
        if (!err)
          tellEveryoneElse (req, 'psc_files_changed');
        replyToMe (req, {
          err: err,
        });
      });
    },
    'psc:list': function (req) {
      var matchUUID = (req && req.data && req.data.matchUUID) ? app.pmm.match ().matchdef ().getID () : false;
      var matchType = (req && req.data && req.data.matchType) ? app.pmm.match ().matchdef ().getMatchType () : false;
      pmelog.llog (pmelog.NORMAL, '>file:psc:list: Received request for list of PractiScore match files');
      app.pmm.file ().pscList ({matchUUID: matchUUID, matchType: matchType}, function (err, matchFiles) {
        if (err)
          pmelog.llog (pmelog.ERROR, 'Error getting PractiScore match file list: %s', err);
        replyToMe (req, {
          err: err,
          files: !err ? matchFiles : null,
          saveCurrent: !err ? app.pmm.match ().getPendingChanges () : null,
          matchName: !err ? app.pmm.match ().matchdef ().getName () : null,
        });
      });
    },

    'ssi:load': function (req) {
      pmelog.llog (pmelog.NORMAL, '>file:ssi:load: Received request to load SSI .zip match \'%s\'', req.data.file);
      app.pmm.file ().ssiLoad (req.data.file, function (err, newMatch) {
        if (!err) {
          tellEveryoneElse (req, 'reload');
          tellMe (req, 'menurefresh');
        }
        replyToMe (req, {
          err: err,
          matchName: !err ? newMatch.matchdef ().getName () : null,
        });
      });
    },
    'ssi:delete': function (req) {
      pmelog.llog (pmelog.NORMAL, '>file:ssi:delete: Received request to delete SSI file %s', req.data.file);
      app.pmm.file ().ssiDelete (req.data.file, function (err) {
        if (!err)
          tellEveryoneElse (req, 'ssi_files_changed');
        replyToMe (req, {
          err: err,
        });
      });
    },
    'ssi:list': function (req) {
      pmelog.llog (pmelog.NORMAL, '>file:ssi:list: Received request for list of SSI match files');
      app.pmm.file ().ssiList (function (err, matchFiles) {
        replyToMe (req, {
          err: err,
          files: !err ? matchFiles : null,
          saveCurrent: !err ? app.pmm.match ().getPendingChanges () : null,
          matchName: !err ? app.pmm.match ().matchdef ().getName () : null,
        });
        if (err)
          pmelog.llog (pmelog.ERROR, 'Error getting SSI match file list: %s', err);
      });
    },
  });

  //
  //
  //
  app.io.route ('kiosk', {
    //
    //  Notifications from browser
    //
    'activity': function (req) {
      pmelog.llog (pmelog.DEBUG, '>kiosk:activity: Browser sent activity notification');
      app.pmm.kiosk ().activity (req);
    },
    'idle': function (req) {
      pmelog.llog (pmelog.DEBUG, '>kiosk:idle: Browser notified us it\'s idle');
      var idle = app.pmm.kiosk ().idle (req);
      tellEveryone (idle.dest, idle.param);
    },
    'start': function (req) {
      pmelog.llog (pmelog.DEBUG, '>kiosk:start: Received kiosk start notification');
      app.pmm.kiosk ().start (req);
    },

    //
    //  Messages to send requests to browser
    //
    /*
    'image': function (req) {
      pmelog.llog (pmelog.DEBUG, '>kiosk:image: Received request to display image');
      tellEveryone ('kiosk_image', req.data);
    },
    'page': function (req) {
      pmelog.llog (pmelog.DEBUG, '>kiosk:page: Received request to display page');
      tellEveryone ('kiosk_page', req.data);
    },
    'scores': function (req) {
      pmelog.llog (pmelog.DEBUG, '>kiosk:scores: Received request to display scores');
      tellEveryone ('kiosk_scores', req.data);
    },
    */
  });

  //
  //
  //
  app.io.route ('log', {
    'dir': function (req) {
      pmelog.ldir (pmelog.NORMAL, req.data.obj);
    },
    'inspect': function (req) {
      pmelog.inspect (req.data.obj);
    },
    'log': function (req) {
      pmelog.llog (pmelog.NORMAL, req.data.msg + ' (' + req.handshake.address.address + ':' + req.handshake.address.port + ' - ' + req.handshake.headers.referer + ')');
    },
    'getlevel': function (req) {
      tellMe (req, 'log_getlevel', {loglevel: pmelog.getlevel ()});
    },
    'setlevel': function (req) {
      pmelog.loglevel (req.data.loglevel);
    },
  });

  //
  //
  //
  app.io.route ('match', {
    'request': function (req) {
      var options = req.data.options || {all: true};

      pmelog.llog (pmelog.NORMAL, '>match:request: Received request for match data (%s)', _.keys (options).join (','));
      pmelog.llog (pmelog.ERROR, '>match:request: This is deprecated. Caller needs to be updated to use match:get route');
      tellMe (req, 'match_data', {matchData: app.pmm.getCompleteMatch (options)});
    },
    'get': function (req) {
      var options = req.data.options || {all: true};

      pmelog.llog (pmelog.NORMAL, '>match:get: Received request for match data (%s)', _.keys (options).join (','));
      replyToMe (req, {err: null, matchData: app.pmm.getCompleteMatch (options)});
    },
    'create': function (req) {
      pmelog.llog (pmelog.NORMAL, '>match:create: Received request to create new match');
      app.pmm.match ().create ({matchtype: req.data.matchtype}, function (err, message) {
        if (!err) {
          tellEveryoneElse (req, 'reload');
          tellMe (req, 'menurefresh');
        }
        replyToMe (req, {
          err: err,
          message: message,
        });
      });
    },
    'setup': function (req) {
      replyToMe (req, {
        err: null,
        levels: app.pmm.match ().matchdef ().setupLevels (),                // null || [{label: 'Level I', value: 'L1'}, {label: 'Level II', value: 'L2'}]
        maxstagetimes: app.pmm.match ().matchdef ().setupMaxstagetimes (),  // null || <float>
        subtypes: app.pmm.match ().matchdef ().setupSubtypes (),            // null || [{label: 'none', value: 'none'}, {label: 'NSSF Rimfire Challenge', value: 'NSSF Rimfire Challenge'}, {value: 'SCSA', label: 'SCSA'}]
      });
    },
    'name': function (req) {
      replyToMe (req, {
        err: null,
        matchname: app.pmm.match ().matchdef ().getName (),
        matchname_stripped: app.pmm.match ().matchdef ().getNameStripped (),
      });
    },
    'type': function (req) {
      replyToMe (req, {
        err: null,
        matchtype: app.pmm.match ().matchdef ().getMatchType (),
        matchtype_pmm: app.pmm.match ().matchdef ().getMatchTypePMM (),
        matchtype_name: app.pmm.match ().matchdef ().getMatchTypeName (),
      });
    },
    'update': function (req) {
      var matchdef = req.data.match;

      pmelog.llog (pmelog.NORMAL, '>match:update: Received request to update match info');
      app.pmm.match ().update ({matchdef: matchdef}, {deviceName: 'Edit'}, function (err, changes) {
        if (err)
          pmelog.llog (pmelog.ERROR, 'Error updating match: %s', err);
        if (!err) {
          if (changes && changes.length) {
            tellEveryoneElse (req, ['match_updated', 'matchdef_updated']);
            showChanges ('match:update', changes);
          }
        }
        replyToMe (req, {
          err: err,
        });
      });
    },
  });

  //
  //
  //
  app.io.route ('penalties', {
    'get': function (req) {
      replyToMe (req, {
        err: null,
        penalties: app.pmm.match ().matchdef ().getPenaltiesEx (),
      });
    },
    'add': function (req) {
      app.pmm.match ().matchdef ().addPenalties (req.data.penalties, function (err, results) {
        if (!err && results.modified)
          tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'penalties_updated']);
        replyToMe (req, {
          err: results.duplicate ? {field: 'name', msg: 'Duplicate penalties'} : null,
          penalties: app.pmm.match ().matchdef ().getPenaltiesEx (),
          changed: results.modified,
        });
      });
    },
    'delete': function (req) {
      app.pmm.match ().matchdef ().deletePenalties (req.data.penalties, function (err, results) {
        if (!err && results.modified)
          tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'penalties_updated']);
        replyToMe (req, {
          err: err,
          penalties: app.pmm.match ().matchdef ().getPenaltiesEx (),
          changed: results.modified,
        });
      });
    },
    'modify': function (req) {
      app.pmm.match ().matchdef ().modifyPenalties (req.data.penalties, function (err, results) {
        if (!err && results.modified)
          tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'penalties_updated']);
        replyToMe (req, {
          err: err,
          penalties: app.pmm.match ().matchdef ().getPenaltiesEx (),
          changed: results.modified,
        });
      });
    },
    'move': function (req) {
      app.pmm.match ().matchdef ().movePenalties (req.data.from, req.data.to, function (err, results) {
        if (!err && results.modified)
          tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'penalties_updated']);
        replyToMe (req, {
          err: err,
          penalties: app.pmm.match ().matchdef ().getPenaltiesEx (),
          changed: results.modified,
        });
      });
    },
  });

  //
  //
  //
  app.io.route ('practiprint', {
    'start': function () {
      app.pmm.print ().start ();
    },
    'stop': function () {
      app.pmm.print ().stop ();
    },
  });

  //
  // https://www.uspsa.org/login.php?action=login&uspsa=<uspsa#>&pw=<password>
  //
  app.io.route ('rolist', {
    'get:uspsa:count': function (req) {
      app.pmm.file ().uspsaRoListGetCount (function (err, totalrecords) {
        replyToMe (req, {
          err: err,
          totalrecords: totalrecords,
        });
      });
    },
    'get:uspsa:records': function (req) {
      app.pmm.file ().uspsaRoListGetRecords (function (err, records) {
        replyToMe (req, {
          err: err,
          records: records,
        });
      });
    },
    'update:uspsa': function (req) {
      var jar = request.jar ();
      var headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36',
      };

      // require ('request').debug = true;

      var httpErr = function (error, statusCode) {
        replyToMe (req, {
          err: true,
          msg: error || ('HTTP status ' + statusCode)
        });

        pmelog.llog (pmelog.INFO, 'error=%s, statusCode=%s', error, statusCode);

        uspsaRoListGetMutex.unlock ();
      };

      var login = function (callback) {
        tellMe (req, 'status', {status: 'Logging into USPSA.org...'});

        request.post ({
            followAllRedirects: true,
            url: 'https://www.uspsa.org/login.php',
            headers: headers,
            jar: jar,
            form: {
              action: 'login',
              uspsa: req.data.uspsanum,
              pw: req.data.uspsapw,
              pp: '1',
              dest: '',
              submitx: 'Login',
            },
          }, function (error, response, body) {
            if (!error && (response.statusCode === 200))
              callback (null, body);
            else {
              httpErr (error, response.statusCode);
              callback (true, body);
            }
        });
      };

      var getRoList = function () {
        tellMe (req, 'status', {status: 'Requesting RO/CRO list from USPSA.org...'});

        request.post ({
            url: 'https://www.uspsa.org/uspsa-lookup-ro.php',
            headers: headers,
            jar: jar,
            form: {
              action: 'lookup',
              ro: 't',
              cro: 't',
            },
          }, function (error, response, body) {
            if (!error && (response.statusCode === 200)) {
              var records = [];
              var skipped = 0;
              var $ = cheerio.load (body);
              var table = $('table th:contains("USPSA")').parent ().parent ();

              tellMe (req, 'status', {status: 'Processing results...'});

              $('tr', table).first ().remove ();
              $('tr', table).each (function () {
                var $uspsa_num = $('td', $(this)).eq (0).text ().trim ();
                var $state = $('td', $(this)).eq (2).text ().trim ();

                if (/^(F|FL|FYF|TYF)\d/i.test ($uspsa_num) || !$state.length)
                  skipped++;
                else
                  records.push ({
                    $uspsa_num: $uspsa_num,
                    $name: $('td', $(this)).eq (1).text ().replace (/\.$/, '')
                                                          .replace (/ ii$/i, ' II')
                                                          .replace (/ iii$/i, ' III')
                                                          .replace (/ iv$/i, ' IV')
                                                          .replace (/^([A-Z]) /, '$1. ')
                                                          .replace (/ ([A-Z]) /, ' $1. '),
                    $state: $state,
                    $certification: $('td', $(this)).eq (3).text ().trim (),
                    $certification_expiration: moment ($('td', $(this)).eq (4).text (), 'MM/DD/YY').format ('YYYY-MM-DD'),
                    $uspsa_num_expiration: moment ($('td', $(this)).eq (5).text ().replace (/.*LIFE.*/, '12/31/68'), 'MM/DD/YY').format ('YYYY-MM-DD'),
                  });
              });

              tellMe (req, 'status', {status: 'Updating RO/CRO list database...'});

              app.pmm.file ().uspsaRoListSave (records, function (err, inserted) {
                replyToMe (req, {
                  err: err,
                  records: inserted,
              });

              uspsaRoListGetMutex.unlock ();

              pmelog.llog (pmelog.INFO, '%s ROs and CROs retrieved from USPSA.org', inserted);
              pmelog.llog (pmelog.INFO, '%s discarded because of foreign or no state', skipped);
            });

            fs.writeFileSync ('debug/uspsa_ro_list.txt', body);
          } else
            httpErr (error, response.statusCode);
        });
      };

      var loginAttempt = function (callback) {
        login (function (err, body) {
          if (!err) {
            if (/(does not exist|password is invalid|invalid password)/i.test (body)) {
              replyToMe (req, {
                err: true,
                msg: '<span style="color: red;">Invalid USPSA number and/or password. Try again, please.</span>',
              });
              uspsaRoListGetMutex.unlock ();
              callback ('badlogin');
            } else if (/you must have cookies enabled/i.test (body))
              callback ('cookie');
            else
              callback ('ok');
          } else
            callback (err);
        });
      };

      if (uspsaRoListGetMutex.tryLock ()) {
        pmelog.llog (pmelog.INFO, 'Logging into USPSA.org with USPSA number %s', req.data.uspsanum);
        loginAttempt (function (result) {
          if (result === 'ok')
            getRoList ();
          else if (result === 'badlogin')
            pmelog.llog (pmelog.ERROR, 'USPSA number or password incorrect, can\'t login to uspsa.org');
          else if (result === 'cookie') {
            loginAttempt (function (result) {
              if (result === 'ok')
                getRoList ();
              else if (result === 'badlogin')
                pmelog.llog (pmelog.ERROR, 'USPSA number or password incorrect, can\'t login to uspsa.org');
              else
                pmelog.llog (pmelog.ERROR, 'Getting RO/CRO list returned error \'%s\' (2nd attempt)', result);
            });
          } else
            pmelog.llog (pmelog.ERROR, 'Getting RO/CRO list returned error \'%s\' (1st attempt)', result);
        });
      } else {
        replyToMe (req, {
          err: true,
          msg: 'RO/CRO list update already in progess'
        });
      }
    },
  });

  //
  //
  //
  app.io.route ('scores', {
    'present': function (req) {
      replyToMe (req, {
        err: null,
        scores_present: app.pmm.match ().scores ().hasScores (),
      });
    },
  });

  //
  //
  //
  app.io.route ('settings', {
    'awards:load': function (req) {
      app.pmm.file ().settingsAwardsLoad (req.data.uuid, function (err, settings) {
        replyToMe (req, {
          err: err,
          settings: JSON.parse (settings),
        });
      });
    },
    'awards:save': function (req) {
      app.pmm.file ().settingsAwardsSave (req.data.uuid, JSON.stringify (req.data.settings), function (err) {
        replyToMe (req, {
          err: err,
        });
      });
    },
    'checkin:load': function (req) {
      app.pmm.file ().settingsCheckinLoad (req.data.uuid, function (err, settings) {
        replyToMe (req, {
          err: err,
          settings: JSON.parse (settings),
        });
      });
    },
    'checkin:save': function (req) {
      app.pmm.file ().settingsCheckinSave (req.data.uuid, JSON.stringify (req.data.settings), function (err) {
        replyToMe (req, {
          err: err,
        });
      });
    },
    'envelopes:load': function (req) {
      app.pmm.file ().settingsEnvelopesLoad (req.data.uuid, function (err, settings) {
        replyToMe (req, {
          err: err,
          settings: JSON.parse (settings),
        });
      });
    },
    'envelopes:save': function (req) {
      app.pmm.file ().settingsEnvelopesSave (req.data.uuid, JSON.stringify (req.data.settings), function (err) {
        replyToMe (req, {
          err: err,
        });
      });
    },
    'labels:load': function (req) {
      app.pmm.file ().settingsLabelsLoad (req.data.uuid, function (err, settings) {
        replyToMe (req, {
          err: err,
          settings: JSON.parse (settings),
        });
      });
    },
    'labels:save': function (req) {
      app.pmm.file ().settingsLabelsSave (req.data.uuid, JSON.stringify (req.data.settings), function (err) {
        replyToMe (req, {
          err: err,
        });
      });
    },
    'projection:load': function (req) {
      app.pmm.file ().settingsProjectionLoad (req.data.uuid, function (err, settings) {
        replyToMe (req, {
          err: err,
          settings: JSON.parse (settings),
        });
      });
    },
    'projection:save': function (req) {
      app.pmm.file ().settingsProjectionSave (req.data.uuid, JSON.stringify (req.data.settings), function (err) {
        replyToMe (req, {
          err: err,
        });
      });
    },
    'statistics:load': function (req) {
      app.pmm.file ().settingsStatisticsLoad (req.data.uuid, function (err, settings) {
        replyToMe (req, {
          err: err,
          settings: JSON.parse (settings),
        });
      });
    },
    'statistics:save': function (req) {
      app.pmm.file ().settingsStatisticsSave (req.data.uuid, JSON.stringify (req.data.settings), function (err) {
        replyToMe (req, {
          err: err,
        });
      });
    },
  });

  //
  //
  //
  app.io.route ('shooter', {
    'new': function (req) {
      pmelog.llog (pmelog.NORMAL, '>shooter:new: Received request to create new shooter');
      replyToMe (req, {
        err: null,
        shooter: app.pmm.match ().matchdef ().newShooter ()
      });
    },
    'get': function (req) {
      var uid = req.data.uid;
      pmelog.llog (pmelog.NORMAL, '>shooter:get: Received request to get existing shooter \'%s\'', uid);
      var shooter = uid && app.pmm.match ().matchdef ().getShooterByUID (uid);
      replyToMe (req, {
        err: shooter ? false : true,
        shooter: shooter,
      });
    },
    'add': function (req) {
      var shooter = req.data.shooter;

      pmelog.llog (pmelog.NORMAL, '>shooter:add: Received request to add shooter %s %s', shooter.sh_fn || '(undefined)', shooter.sh_ln || '(undefined)');
      app.pmm.match ().matchdef ().addShooterJSON (req.data.shooter, function (err, addedShooter) {
        if (!err) {
          tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'competitors_updated']);
          tellEveryoneElse (req, 'competitor_added', {shooter: addedShooter});
        } else
          pmelog.llog (pmelog.ERROR, '>shooter:add: addShooterJSON() returned error %s', err);
        replyToMe (req, {
          err: err,
          shooter: !err ? addedShooter : null,
        });
      });
    },
    'save': function (req) {
      var shooter = req.data.shooter;
      var who = app.pmm.match ().matchdef ().getShooterByUID (shooter.sh_uid);

      pmelog.llog (pmelog.NORMAL, '>shooter:save: Received request to update shooter %s %s', who.sh_fn || '(undefined)', who.sh_ln || '(undefined)');
      app.pmm.match ().matchdef ().updateShooterJSON (shooter, {prefer: shooter.prefer}, function (err, changes, savedShooter) {
        if (!err) {
          if (changes.length) {
            tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'competitors_updated']);
            tellEveryoneElse (req, 'competitor_updated', {shooter: savedShooter});
            showChanges ('shooter:save', changes, 2);
          }
        } else
          pmelog.llog (pmelog.ERROR, '>shooter:save: updateShooterJSON() returned error %s', err);
        replyToMe (req, {
          err: err,
          shooter: !err ? savedShooter : null,
          changed: !err ? changes.length ? true : false : false,
        });
      });
    },
    'print:add': function (req) {
      var uid = req.data.uid;
      var shooter = uid && app.pmm.match ().matchdef ().getShooterByUID (uid);

      if (!uid) {
        replyToMe (req, {
          err: 'shooter:print:add is missing UID parameter',
        });
      } else if (!shooter) {
        replyToMe (req, {
          err: 'Can\'t find competitor with UID ' + uid,
        });
      } else {
        shooter.printAdd (function (err) {
          if (!err)
            tellEveryoneElse (req, 'print_queue_changed');
          replyToMe (req, {
            err: err,
            shooter: !err ? shooter : null,
          });
        });
      }
    },
    'print:remove': function (req) {
      var uid = req.data.uid;
      var shooter = uid && app.pmm.match ().matchdef ().getShooterByUID (uid);

      if (!uid) {
        replyToMe (req, {
          err: 'shooter:print:remove is missing UID parameter',
        });
      } else if (!shooter) {
        replyToMe (req, {
          err: 'Can\'t find competitor with UID ' + uid,
        });
      } else {
        shooter.printRemove (function (err, changed) {
          if (!err && changed)
            tellEveryoneElse (req, 'print_queue_changed');
          replyToMe (req, {
            err: err,
            shooter: !err ? shooter : null,
          });
        });
      }
    },
    'print:inqueue': function (req) {
      replyToMe (req, {
        inqueue: app.pmm.match ().matchdef ().printCount (),
      });
    },
    'print:clear': function (req) {
      var err;

      _.each (app.pmm.match ().matchdef ().getShooters (), function (shooter) {
        if (!err)
          shooter.printRemove (function (nc_err) {
            if (!err)
              err = nc_err;
          });
      });
      if (!err)
        tellEveryoneElse (req, 'print_queue_changed');
      replyToMe (req, {
        err: err,
        matchdef: !err ? app.pmm.getCompleteMatch ({match: true}) : null,
      });
    },
    'ezws:set': function (req) {
      var uid = req.data.uid;
      var shooter = uid && app.pmm.match ().matchdef ().getShooterByUID (uid);

      if (!uid) {
        replyToMe (req, {
          err: 'shooter:ezws:set is missing UID parameter',
        });
      } else if (!shooter) {
        replyToMe (req, {
          err: 'Can\'t find competitor with UID ' + uid,
        });
      } else {
        shooter.setNumberToPos (function (err) {
          replyToMe (req, {
            err: err,
            shooter: !err ? shooter : null,
          });
        });
      }
    },
    'ezws:status': function (req) {
      var allNegativeOne = true;
      var alreadyInSequence = true;
      var lastN;

      _.each (app.pmm.match ().matchdef ().getShooters (), function (shooter) {
        var n = shooter.getNumber ();
        if (n !== -1)
          allNegativeOne = false;
        if (!_.isUndefined (lastN) && (n !== -1) && (n !== (lastN + 1)))
          alreadyInSequence = false;
        lastN = n;
      });

      replyToMe (req, {
        err: null,
        allNegativeOne: allNegativeOne,
        alreadyInSequence: alreadyInSequence,
      });
    },
    'ezws:resequence': function (req) {
      var err;
      var changes = [];

      _.each (app.pmm.match ().matchdef ().getShooters (), function (shooter) {
        if (!err)
          shooter.setNumberToPos (function (nc_err, _changes) {
            if (!err) {
              err = nc_err;
              changes = changes.concat (_changes);
            }
          });
      });
      if (!err && changes.length) {
        tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'competitors_updated']);
        showChanges ('shooter:ezws:resequence', changes, 2);
      }
      replyToMe (req, {
        err: err,
        matchdef: !err ? app.pmm.getCompleteMatch ({match: true}) : null,
      });
    },
    'ezws:reset': function (req) {
      var err;
      var changes = [];

      _.each (app.pmm.match ().matchdef ().getShooters (), function (shooter) {
        if (!err)
          shooter.setNumberToPos ({override: -1}, function (nc_err, _changes) {
            if (!err) {
              err = nc_err;
              changes = changes.concat (_changes);
            }
          });
      });
      if (!err && changes.length) {
        tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'competitors_updated']);
        showChanges ('shooter:ezws:reset', changes, 2);
      }
      replyToMe (req, {
        err: err,
        matchdef: !err ? app.pmm.getCompleteMatch ({match: true}) : null,
      });
    },
    // FIXME: This needs to be using replyToMe() and tellEveryoneElse()
    'squad': function (req) {
      var uid = req.data.uid;
      var squad = req.data.squad;
      var shooter = app.pmm.match ().matchdef ().cloneShooterWithUID (uid);

      if (!shooter) {
        pmelog.llog (pmelog.ERROR, '>shooter:squad: Can\'t find shooter with UID %s', uid);
        tellMe (req, 'edit_squad_err', {err: 'Eeek! Competitor being moved not in match!'});
      } else {
        pmelog.llog (pmelog.NORMAL, '>shooter:squad: Received request to move shooter %s %s from squad %s to squad %s', shooter.getFirstName (), shooter.getLastName (), shooter.getSquad (), squad);
        shooter.setSquad (squad);
        app.pmm.match ().matchdef ().updateShooterJSON (shooter, function (err, changes) {
          if (!err) {
            tellMe (req, 'edit_squad_ok');
            if (changes.length) {
              tellEveryone (['match_updated', 'matchdef_updated', 'competitors_updated']);
              tellEveryone ('competitor_updated', {shooter: shooter});
              showChanges ('shooter:squad', changes, 2);
            }
          } else {
            pmelog.llog (pmelog.ERROR, '>shooter:squad: updateShooterJSON() returned error %s', err);
            tellMe (req, 'edit_squad_err', {err: err});
          }
        });
      }
    },
    'validate': function (req) {
      var shooter = req.data.shooter;
      pmelog.llog (pmelog.NORMAL, '>shooter:validate: Received request to validate field(s)');

      app.pmm.match ().matchdef ().validateShooter (shooter, function (err, errorList) {
        replyToMe (req, {
          err: err,
          errorList: errorList,
        });
      });
    },
    'namecase:single': function (req) {
      var uid = req.data.uid;
      var shooter = uid && app.pmm.match ().matchdef ().getShooterByUID (uid);

      if (!uid) {
        replyToMe (req, {
          err: 'shooter:namecase:single is missing UID parameter',
        });
      } else if (!shooter) {
        replyToMe (req, {
          err: 'Can\'t find competitor with UID ' + uid,
        });
      } else {
        shooter.toNameCase (function (err, changes) {
          if (!err && changes.length) {
            tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'competitors_updated']);
            tellEveryoneElse (req, 'competitor_updated', {shooter: shooter});
            showChanges ('shooter:namecase:single', changes, 2);
          }
          replyToMe (req, {
            err: err,
            shooter: !err ? shooter : null,
          });
        });
      }
    },
    'namecase:all': function (req) {
      var err;
      var changes = [];

      _.each (app.pmm.match ().matchdef ().getShooters (), function (shooter) {
        if (!err)
          shooter.toNameCase (function (nc_err, _changes) {
            if (!err) {
              err = nc_err;
              changes = changes.concat (_changes);
            }
          });
      });
      if (!err && changes.length) {
        tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'competitors_updated']);
        showChanges ('shooter:namecase:all', changes, 2);
      }
      replyToMe (req, {
        err: err,
        matchdef: !err ? app.pmm.getCompleteMatch ({match: true}) : null,
      });
    },
    'depersonalize:single': function (req) {
      var uid = req.data.uid;
      var shooter = uid && app.pmm.match ().matchdef ().getShooterByUID (uid);

      if (!uid) {
        replyToMe (req, {
          err: 'shooter:depersonalize:single is missing UID parameter',
        });
      } else if (!shooter) {
        replyToMe (req, {
          err: 'Can\'t find competitor with UID ' + uid,
        });
      } else {
        shooter.depersonalize (function (err, changes) {
          if (!err && changes.length) {
            tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'competitors_updated']);
            tellEveryoneElse (req, 'competitor_updated', {shooter: shooter});
            showChanges ('shooter:depersonalize:single', changes, 2);
          }
          replyToMe (req, {
            err: err,
            shooter: !err ? shooter : null,
          });
        });
      }
    },
    'depersonalize:all': function (req) {
      var err;
      var changes = [];

      _.each (app.pmm.match ().matchdef ().getShooters (), function (shooter) {
        if (!err)
          shooter.depersonalize (function (nc_err, _changes) {
            if (!err) {
              err = nc_err;
              changes = changes.concat (_changes);
            }
          });
      });
      if (!err && changes.length) {
        tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'competitors_updated']);
        showChanges ('shooter:depersonalize:all', changes, 2);
      }
      replyToMe (req, {
        err: err,
        matchdef: !err ? app.pmm.getCompleteMatch ({match: true}) : null,
      });
    },
    'stripbadmembershipnumber:single': function (req) {
      var uid = req.data.uid;
      var shooter = uid && app.pmm.match ().matchdef ().getShooterByUID (uid);

      if (!uid) {
        replyToMe (req, {
          err: 'shooter:stripbadmembershipnumber:single is missing UID parameter',
        });
      } else if (!shooter) {
        replyToMe (req, {
          err: 'Can\'t find competitor with UID ' + uid,
        });
      } else {
        shooter.stripBadMembershipNumber (function (err, changes) {
          if (!err && changes.length) {
            tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'competitors_updated']);
            tellEveryoneElse (req, 'competitor_updated', {shooter: shooter});
            showChanges ('shooter:stripbadmembershipnumber:single', changes, 2);
          }
          replyToMe (req, {
            err: err,
            shooter: !err ? shooter : null,
          });
        });
      }
    },
    'stripbadmembershipnumber:all': function (req) {
      var err;
      var changes = [];

      _.each (app.pmm.match ().matchdef ().getShooters (), function (shooter) {
        if (!err)
          shooter.stripBadMembershipNumber (function (nc_err, _changes) {
            if (!err) {
              err = nc_err;
              changes = changes.concat (_changes);
            }
          });
      });
      if (!err && changes.length) {
        tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'competitors_updated']);
        showChanges ('shooter:stripbadmembershipnumber:all', changes, 2);
      }
      replyToMe (req, {
        err: err,
        matchdef: !err ? app.pmm.getCompleteMatch ({match: true}) : null,
      });
    },
    'maxnameslength': function (req) {
      app.pmm.file ().masterLongestCombination (function (err, maxwidth) {
        replyToMe (req, {
          err: err,
          maxwidth: maxwidth,
        });
      });
    },
    'classifications:update': function (req) {
      pmelog.llog (pmelog.NORMAL, '>shooter:classifications:update Received request to update competitor classifications');
      app.pmm.match ().matchdef ().updateClassifications (app.pmm.file ().classificationsLatest, req.data, function (err, data) {
        if (data && data.status)
          tellMe (req, 'status', {status: data.status});
        else {
          if (req.data && req.data.addVerified && data.syntheticUpdates) {
            var records = [];

            tellMe (req, 'status', {status: 'Adding not-found classifications to database'});

            _.each (data.syntheticUpdates, function (update) {
              records.push (app.pmm.match ().matchdef ().parseClassificationUpdate (update));
            });

            app.pmm.match ().matchdef ().appendClassifications (app.pmm.file ().classificationsAppend, records, function (err) {
              if (err)
                tellMe (req, 'status', {status: err});
            });
          }

          if (data && data.modified)
            tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'competitors_updated']);
          replyToMe (req, _.merge ({err: err}, data));
        }
      });
    },
    'states:update': function (req) {
      pmelog.llog (pmelog.NORMAL, '>shooter:states:update Received request to update competitor states');
      app.pmm.match ().matchdef ().updateStates (req.data, function (err, data) {
        if (data && data.status)
          tellMe (req, 'status', {status: data.status});
        else {
          if (data && data.modified)
            tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'competitors_updated']);
          replyToMe (req, _.merge ({err: err}, data));
        }
      });
    },
    'verification': function (req) {
      pmelog.llog (pmelog.NORMAL, '>shooter:verification Received request to verifiy competitor information');
      app.pmm.match ().matchdef ().verification (req.data, function (err, data) {
        if (data && data.status)
          tellMe (req, 'status', {status: data.status});
        else
          replyToMe (req, _.merge ({err: err}, data));
      });
    },
  });

  //
  //
  //
  app.io.route ('stage', {
    'new': function (req) {
      pmelog.llog (pmelog.NORMAL, '>stage:new: Received request to get new stage');
      replyToMe (req, {
        err: null,
        stage: app.pmm.match ().matchdef ().newStage ()
      });
    },
    'add': function (req) {
      var stage = req.data.stage;

      pmelog.llog (pmelog.NORMAL, '>stage:add: Received request to add stage \'%s\'', stage.stage_name || '(undefined)');
      app.pmm.match ().matchdef ().addStageJSON (req.data.stage, function (err, addedStage) {
        if (!err) {
          tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'stages_updated']);
          tellEveryoneElse (req, 'stage_added', {stage: addedStage});
        } else
          pmelog.llog (pmelog.ERROR, '>stage:add: addStageJSON() returned error %s', err);
        replyToMe (req, {
          err: err,
          stage: !err ? addedStage : null,
        });
      });
    },
    'save': function (req) {
      var stage = req.data.stage;

      pmelog.llog (pmelog.NORMAL, '>stage:save: Received request to update stage \'%s\'', stage.stage_name || '(undefined)');
      app.pmm.match ().matchdef ().updateStageJSON (stage, function (err, changes, savedStage) {
        if (!err) {
          if (changes.length) {
            tellEveryoneElse (req, ['match_updated', 'matchdef_updated', 'stages_updated']);
            tellEveryoneElse (req, 'stage_updated', {stage: savedStage});
            showChanges ('stage:save', changes, 2);
          }
        } else
          pmelog.llog (pmelog.ERROR, '>stage:save: updateStageJSON() returned error %s', err);

        replyToMe (req, {
          err: err,
          stage: !err ? savedStage : null,
          changed: !err ? changes.length ? true : false : false,
        });
      });
    },
    'validate': function (req) {
      // FIXME: Should validate stage record, return pass/fail, maybe reason for failure.
      var stage = req.data.stage;
      pmelog.llog (pmelog.NORMAL, '>stage:validate: Received request to validate stage \'%s\'', stage.stage_name);
    },
  });

  //
  //  'Sync' means get the match from the device and overwrite the current match
  //
  app.io.route ('sync', {
    'match': function (req) {
      var d = app.pmm.devices ().getDeviceByID (req.data.deviceid);
      var route = 'sync:match';
      var message;
      var options = {};

      if (d) {
        pmelog.llog (pmelog.NORMAL, '>sync:match: Received sync match request for %s @ %s', d.getDeviceNameShort (), d.getClientAddress ());

        d.syncAll (function (err, errDetail) {
          if (!err) {
            app.pmm.match ().parseToNew ({matchdef: d.getMatchdef (), scores: d.getScores (), logs: d.getLogs ()}, {fixNameCase: app.pmm.config ().get ('match', 'nameCaseSync')}, function (err, newMatch) {
              if (!err) {
                app.pmm.accessorFunctions ().replaceMatch (newMatch);
                message = util.format ('Match received from %s @ %s', d.getDeviceNameShort (), psutils.timeStampLocal ());
                options = {broadcastMsg: 'reload'};
              } else
                message = util.format ('Error occurred objectifying match from %s: %s', d.getDeviceNameShort (), err);

              replyToMeStatusMsg (req, err ? pmelog.ERROR : pmelog.NORMAL, route, message, options);
              tellMe (req, 'menurefresh');
            });
          } else
            replyToMeStatusMsg (req, pmelog.ERROR, route, util.format ('Error occurred syncing with %s: %s (%s)', d.getDeviceNameShort (), err, errDetail || 'Unknown'), options);
        });
      } else
        replyToMeStatusMsg (req, pmelog.ERROR, route, util.format ('Device %s doesn\'t exist?', req.data.deviceid), options);
    },
    'logs': function (req) {
      var d = app.pmm.devices ().getDeviceByID (req.data.deviceid);
      var route = 'sync:logs';
      var message;
      var options = {};

      if (d) {
        pmelog.llog (pmelog.NORMAL, '>sync:logs: Received sync logs request for %s @ %s', d.getDeviceNameShort (), d.getClientAddress ());

        d.syncLogs (function (err, errDetail) {
          if (!err) {
            app.pmm.match ().logs ().merge (d.getMatchID (), d.getLogs (), function (err) {
              if (!err) {
                message = util.format ('Logs received from %s @ %s', d.getDeviceNameShort (), psutils.timeStampLocal ());
                options = {broadcastMsg: 'logs_updated'};
              } else
                message = util.format ('Error occurred objectifying match from %s: %s', d.getDeviceNameShort (), err);

              replyToMeStatusMsg (req, err ? pmelog.ERROR : pmelog.NORMAL, route, message, options);
            });
          } else
            replyToMeStatusMsg (req, pmelog.ERROR, route, util.format ('Error occurred syncing with %s: %s (%s)', d.getDeviceNameShort (), err, errDetail || 'Unknown'), options);
        });
      } else
        replyToMeStatusMsg (req, pmelog.ERROR, route, util.format ('Device %s doesn\'t exist?', req.data.deviceid), options);
    },
  });

  //
  //
  //
  app.io.route ('system', {
    'supportedmatchtypes': function (req) {
      app.pmm.system ().supportedMatchTypes (function (err, supportedmatchtypes) {
        replyToMe (req, {
          err: err,
          supportedmatchtypes: supportedmatchtypes
        });
      });
    },
  });

  //
  //
  //
  app.io.route ('uspsa', {
    'activity:generate': function (req) {
      pmelog.llog (pmelog.NORMAL, '>uspsa:activity:generate: Received request to generate activity report');
      var matchdef = app.pmm.match ().matchdef ();
      var shooters = app.pmm.match ().matchdef ().getShooters ();
      var divisions = app.pmm.match ().lookups ().divisions;
      var numberOfClassifiers;
      var activity = {};
      var fees = {};
      var feeList;

      //
      // File format for activity report
      //
      //   $EZWINSCORE 4.15 CLASSIFIER
      //   $INFO EZWINSCORE_VERSION 4.15
      //   $INFO EZWINSCORE_PRODUCT USPSA EzWinScore
      //   $INFO REGION USPSA
      //   $INFO INFOFILE 4.06
      //   $INFO MATCHNAME Ultimate Shooter Showdown
      //   $INFO CLUBCODE GA99
      //   $INFO CLUBNAME Best Georgia Club Ever
      //   $INFO MATCHDATE 04/25/2016
      //   $INFO MATCHTYPE Level I
      //   $DIVISION Carry Optics|0|.00|0|.00
      //   $DIVISION Limited|0|.00|0|.00
      //   $DIVISION Limited 10|0|.00|0|.00
      //   $DIVISION Open|0|.00|1|4.00
      //   $DIVISION Production|1|4.00|0|.00
      //   $DIVISION Revolver|0|.00|0|.00
      //   $DIVISION Single Stack|1|4.00|0|.00
      //   $INFO TOTALFEE 12.00
      //   $STARTCLASSIFIER CM03-02  Six Chickens
      //   L|9999|Neuman|Alfred E.|CM03-02|Single Stack|5
      //   TY|99999|Kirk|James T.|CM03-02|Production|5
      //   $ENDCLASSIFIER  CM03-02
      //   $STARTCLASSIFIER CM03-03  Take 'em Down
      //   L|9999|Neuman|Alfred E.|CM03-03|Single Stack|4
      //   TY|99999|Kirk|James T.|CM03-03|Production|5
      //   $ENDCLASSIFIER  CM03-03
      //   $STARTOVERALLMATCH
      //   TY|99999|Kirk|James T.|Production|100.00
      //   L|3889|Neuman|Alfred E.|Single Stack|100.00
      //   $ENDOVERALLMATCH
      //   $END
      //

      activity.header  = '$EZWINSCORE 4.15 CLASSIFIER\n';
      activity.header += '$INFO EZWINSCORE_VERSION 4.15\n';
      activity.header += '$INFO EZWINSCORE_PRODUCT USPSA EzWinScore\n';
      activity.header += '$INFO REGION USPSA\n';
      activity.header += '$INFO INFOFILE 4.06\n';
      activity.header += sprintf ('$INFO MATCHNAME %s\n', matchdef.getName ());
      activity.header += sprintf ('$INFO CLUBCODE %s\n', matchdef.getClubCode ());
      activity.header += sprintf ('$INFO CLUBNAME %s\n', matchdef.getClubName ());
      activity.header += sprintf ('$INFO MATCHDATE %s\n', matchdef.getDate ().replace (/(\d{4})-(\d{2})-(\d{2})/, '$2/$3/$1'));
      activity.header += sprintf ('$INFO MATCHTYPE %s\n', matchdef.getLevel ());

      _.each (divisions, function (division) {
        fees [division.replace (/-/, ' ')] = {
          activity: {
            uspsa: 0,
            uspsaFee: 0.00,
            nonuspsa: 0,
            nonuspsaFee: 0.00,
          },
          classifier: {
            uspsa: 0,
            uspsaFee: 0.00,
            nonuspsa: 0,
            nonuspsaFee: 0.00,
          },
        };
      });

      //
      //  Any shooter who isn't deleted and has at least one non-DNF'ed stage
      //  gets charged.
      //
      //  Fee schedule (from www.uspsa.org/classifiers/Intro.pdf) is:
      //    Level 1 match
      //      Without classifier
      //        $1.50 per registered competitor per division
      //      With 1 classifier
      //        $3.00 per registered competitor per division
      //      With 2 classifiers
      //        $4.00 per registered competitor per division
      //      With 3 classifiers
      //        $5.00 per registered competitor per division
      //      With 4 classifiers
      //        $6.00 per registered competitor per division
      //      With 5 or 6 classifiers
      //        $6.50 per registered competitor per division
      //    Level 2 match
      //      Without classifier
      //        $2.50 per registered competitor per division
      //      With classifier (with up to 1 classifier)
      //        $4.00 per registered competitor per division
      //    Level 3 match (with up to 2 classifiers)
      //        $5.00 per registered competitor per division
      //
      //  A competitor re-entry is not charged an activity fee.
      //
      var feeSchedule = {
        'Level I'        : {activity: 1.50, classifier: [0.00, 1.50, 2.50, 3.50, 4.50, 5.00, 5.00]},
        'Level I Special': {activity: 1.50, classifier: [0.00, 1.50, 2.50, 3.50, 4.50, 5.00, 5.00]},
        'Level II'       : {activity: 2.50, classifier: [0.00, 1.50]},
        'Level III'      : {activity: 5.00, classifier: [0.00, 0.00, 0.00]},
        'Nationals'      : {activity: 5.00, classifier: [0.00, 0.00, 0.00]},
      };
      var scores = matchdef.calculateScores ();
      var reentryTracking = {};

      if (!(feeList = feeSchedule [matchdef.getLevel ()])) {
        replyToMe (req, {activity: sprintf ('Error! Unknown match level \'%s\'', matchdef.getLevel ())});
        return;
      }

      numberOfClassifiers = _.filter (app.pmm.match ().matchdef ().getStages (), function (stage) {
        return !stage.isDeleted () && stage.isClassifier ();
      }).length;

      if (numberOfClassifiers >= feeList.classifier.length) {
        replyToMe (req, {activity: sprintf ('Error! Too many classifiers for match level (%s has a maximum of %s classifier(s))', matchdef.getLevel (), feeList.classifier.length)});
        return;
      }

      //
      //  Shooters that are re-entries in the same division are not charged
      //  after the first entry. However, the same shooter entered in another
      //  division will be charged. For fees, whether a shooter has a USPSA
      //  number or not does not matter.
      //
      _.each (shooters, function (shooter) {
        if (!shooter.isDeleted ()) {
          var uspsaNum = shooter.getMembershipNumberParsed ();
          var division = shooter.getDivisionLong ().replace (/-/, ' ');
          var unique   = uspsaNum ?
                         sprintf ("%s (%s)", shooter.getMembershipNumber (), division) :
                         sprintf ("%s, %s (%s)", shooter.getLastName (), shooter.getFirstName (), division);

          if (!reentryTracking [unique]) {
            fees [division].activity   [uspsaNum ? 'uspsa'    : 'nonuspsa']    += 1;
            fees [division].activity   [uspsaNum ? 'uspsaFee' : 'nonuspsaFee'] += feeList.activity;
            fees [division].classifier [uspsaNum ? 'uspsa'    : 'nonuspsa']    += numberOfClassifiers;
            fees [division].classifier [uspsaNum ? 'uspsaFee' : 'nonuspsaFee'] += feeList.classifier [numberOfClassifiers];
          } else
            pmelog.llog (pmelog.INFO, "Skipping duplicate shooter %s", unique);

          reentryTracking [unique] = true;
        }
      });

      //
      //  The $DIVISION line is 6 fields:
      //    1: $DIVISION
      //    2: Division name (Carry Optics, Limited, Limited 10, Open, Production, Revolver, Single Stack)
      //    3: Number of USPSA members
      //    4: Dollar amount for USPSA members
      //    5: Number of non-USPSA members
      //    6: Dollar amount for non-USPSA members
      //
      _.each (divisions, function (division) {
        division = division.replace (/-/, ' ');

        fees [division].uspsaTotalFee    = fees [division].activity.uspsaFee    + fees [division].classifier.uspsaFee;
        fees [division].nonuspsaTotalFee = fees [division].activity.nonuspsaFee + fees [division].classifier.nonuspsaFee;

        fees.uspsaTotalFee    = (fees.uspsaTotalFee || 0) + fees [division].uspsaTotalFee;
        fees.nonuspsaTotalFee = (fees.nonuspsaTotalFee || 0) + fees [division].nonuspsaTotalFee;

        activity.divisions  = activity.divisions || '';
        activity.divisions += sprintf ('$DIVISION %s|%s|%s|%s|%s\n',
          division,
          fees [division].activity.uspsa,    fees [division].uspsaTotalFee.toFixed (2),
          fees [division].activity.nonuspsa, fees [division].nonuspsaTotalFee.toFixed (2));
      });

      fees.totalFee = fees.uspsaTotalFee + fees.nonuspsaTotalFee;

      activity.totals = sprintf ('$INFO TOTALFEE %s\n', fees.totalFee.toFixed (2));
      activity.classifiers = '';

      //
      //  Only USPSA members are permitted classifier entries, and only the
      //  highest HF per shooter per division is used.
      //
      _.each (scores.bystage, function (stage) {
        if (!stage.isDeleted && stage.isClassifier) {
          var classifications = [];

          _.each (stage.scores, function (score) {
            var uspsaNum = score.shooter.getMembershipNumberParsed ();

            if (uspsaNum && !score.del && !score.dnf) {
              // FIXME: When we eliminate division name matching, score.div will contain the full name.
              var division = score.shooter.getDivisionLong ().replace (/-/, ' ');
              var existingEntry = _.findIndex (classifications, function (cls) {
                return ((cls.prefix === uspsaNum.prefix) && (cls.number === uspsaNum.number));
              });

              if (existingEntry >= 0) {
                var p = classifications [existingEntry];

                if (p.hf < score.hf) {
                  pmelog.llog (pmelog.INFO, "Removing lower HF duplicate entry for %s %s (%s < %s, %s)", p.fname, p.lname, p.hf4, score.hf4, division);
                  classifications.splice (existingEntry, 1);
                  existingEntry = -1;
                } else
                  pmelog.llog (pmelog.INFO, "Keeping higher HF duplicate entry for %s %s (%s > %s, %s)", p.fname, p.lname, p.hf4, score.hf4, division);
              }

              if (existingEntry === -1)
                classifications.push ({
                  prefix: uspsaNum.prefix,
                  number: uspsaNum.number,
                  hf: score.hf,
                  hf4: score.hf4,
                  lname: score.shooter.getLastName (),
                  fname: score.shooter.getFirstName (),
                  div: division,
                  // FIXME: When we eliminate division name matching, score.div will contain the full name.
                  // div: score.div,
                });
            }
          });

          _.each (classifications, function (cls) {
            cls.record = sprintf ('%s|%s|%s|%s|CM%s|%s|%s', cls.prefix, cls.number, cls.lname, cls.fname, stage.classifierCode, cls.div, cls.hf4);
          });

          activity.classifiers += sprintf ('$STARTCLASSIFIER CM%s  %s\n', stage.classifierCode, stage.name);
          activity.classifiers += (_.pluck (_.sortByOrder (classifications, ['div', 'hf'], ['asc', 'desc']), 'record').join ('\n') + '\n');
          activity.classifiers += sprintf ('$ENDCLASSIFIER  CM%s\n', stage.classifierCode);
        }
      });

      //
      //  Emit the division percentage for each shooter who has a USPSA member.
      //  Re-entries (in any division) are ignored. We have a problem here,
      //  because we don't really support the re-entry concept. FIXME: For now,
      //  we'll be like PractiScore, and emit the duplicates.
      //
      var overall = [];

      _.each (scores.overall.combined, function (score) {
        var uspsaNum = score.shooter.getMembershipNumberParsed ();

        if (uspsaNum) {
          overall.push ({
            prefix: uspsaNum.prefix,
            number: uspsaNum.number,
            pct: score.mpct_d * 100,
            lname: score.shooter.getLastName (),
            fname: score.shooter.getFirstName (),
            // FIXME: When we eliminate division name matching, score.div will contain the full name.
            div: score.shooter.getDivisionLong ().replace (/-/, ' '),
          });
        }
      });

      _.each (overall, function (cls) {
        cls.record = sprintf ('%s|%s|%s|%s|%s|%s', cls.prefix, cls.number, cls.lname, cls.fname, cls.div, cls.pct.toFixed (2));
      });

      activity.match  = '$STARTOVERALLMATCH\n';
      activity.match += (_.pluck (_.sortByOrder (overall, ['div', 'pct'], ['asc', 'desc']), 'record').join ('\n') + '\n');
      activity.match += '$ENDOVERALLMATCH\n';

      replyToMe (req, {
        activity: activity.header +
                  activity.totals +
                  activity.divisions +
                  activity.classifiers +
                  activity.match +
                  '$END\n',
      });
/*
      app.pmm.file ().logfileGet ({loglevel: [1, 2, 3, 4], range: {from: '2016-04-26 16:18:00'}}, function (err, records) {
        pmelog.ldirex (records);
        replyToMe (req, {
          activity: records
        });
      });

      app.pmm.file ().jsonSave ('xyz', match, function (err) {
        if (err)
          pmelog.llog (pmelog.DEBUG, 'jsonSave err=%s', err);
        else
          app.pmm.file ().jsonGet ('xyz', function (err, json) {
            if (err)
              pmelog.llog (pmelog.DEBUG, 'jsonGet err=%s', err);
            else {
            }
          });
      });
*/
    },
    'activity:upload': function (req) {
      req = req;
    },
    'activity:view': function (req) {
      req = req;
    },
    'scores:generate': function (req) {
      pmelog.llog (pmelog.NORMAL, '>uspsa:scores:generate: Received request to generate match scores');

      //
      // File format for activity report
      //
      //  $EZWINSCORE 4.16 RESULTS
      //  $COMMENT This file is used by the USPSAOn-Line score
      //  $COMMENT posting system.
      //  $INFO Region:USPSA
      //  $INFO EzWinScore_Product: USPSA EzWinScore
      //  $INFO EzWinScore_Version: 4.16
      //  $INFO Match name: CGC 2015-11-14
      //  $INFO Match date: 11/14/2015
      //  $INFO Club Name: Cherokee Gun Club
      //  $INFO Club Code: GA03
      //  $INFO Multigun: 0
      //  $INFO Scoring: 0
      //  <-- Division Finals Record --> (one for each division)
      //    <-- Division Stage Record --> (one for each stage)
      // $END

      //
      //  Division finals record:
      //    $FILE Carry_Optics Pistol_Finals.dat
      //    Final results for Carry_Optics
      //    Place,Last Name,First Name,No.,USPSA,Class,Division,PF,Lady,Mil,Law,For,Age,Match Pts,Match %
      //    1,Camel,Joe,1,TY99999,U,Carry Optics,Minor,No,No,No,No,,635.000,100.00%

      //
      //  Division stage record:
      //    $FILE Carry_Optics Pistol_Stage_1.dat
      //    Stage 1 Thrice Way
      //    Place,Last Name,First Name,No.,Class,Division,Points,Penalties,Time,Hit Factor,Stage Pts,Stage %
      //    1,Camel,Joe,1,U,Carry Optics,130,0,30.31,4.289,130,100.00%
      //

      //
      //  In both the finals record, the place number is replaced with 'DQed'
      //  if the competitor DQed. They may also have 'DQed' in the stage
      //  record, or be omitted completely. If a shooter DNF'ed a stage, then
      //  the place number in the stage record is replaced with 'DNF'.  The
      //  'No.' field is the EZWS shooter number.
      //
      replyToMe (req, {
        scores: 'Nothing to see, move along',
      });
    },
    'scores:upload': function (req) {
      req = req;
    },
    'scores:view': function (req) {
      req = req;
    },
  });

  //
  //
  //
  app.io.route ('utils', {
    'jcw:import': function (req) {
      var filename = 'matches/cpc_exportall.csv';
      var statesLongToShort = {
        'ALASKA':         'AK',
        'ALABAMA':        'AL',
        'ARKANSAS':       'AR',
        'ARIZONA':        'AZ',
        'CALIFORNIA':     'CA',
        'COLORADO':       'CO',
        'CONNECTICUT':    'CT',
        'DELAWARE':       'DE',
        'FLORIDA':        'FL',
        'GEORGIA':        'GA',
        'HAWAII':         'HI',
        'IOWA':           'IA',
        'IDAHO':          'ID',
        'ILLINOIS':       'IL',
        'INDIANA':        'IN',
        'KANSAS':         'KS',
        'KENTUCKY':       'KY',
        'LOUISIANA':      'LA',
        'MASSACHUSETTS':  'MA',
        'MARYLAND':       'MD',
        'MAINE':          'ME',
        'MICHIGAN':       'MI',
        'MINNESOTA':      'MN',
        'MISSOURI':       'MO',
        'MISSISSIPPI':    'MS',
        'MONTANA':        'MT',
        'NORTH CAROLINA': 'NC',
        'NORTH DAKOTA':   'ND',
        'NEBRASKA':       'NE',
        'NEW HAMPSHIRE':  'NH',
        'NEW JERSEY':     'NJ',
        'NEW MEXICO':     'NM',
        'NEVADA':         'NV',
        'NEW YORK':       'NY',
        'OHIO':           'OH',
        'OKLAHOMA':       'OK',
        'OREGON':         'OR',
        'PENNSYLVANIA':   'PA',
        'RHODE ISLAND':   'RI',
        'SOUTH CAROLINA': 'SC',
        'SOUTH DAKOTA':   'SD',
        'TENNESSEE':      'TN',
        'TEXAS':          'TX',
        'UTAH':           'UT',
        'VIRGINIA':       'VA',
        'VERMONT':        'VT',
        'WASHINGTON':     'WA',
        'WISCONSIN':      'WI',
        'WEST VIRGINIA':  'WV',
        'WYOMING':        'WY',
        'GUAM':           'GU',
        'PUERTO RICO':    'PR',
        'VIRGIN ISLANDS': 'VI',
      };
      var statesShortToLong = {};

      _.each (statesLongToShort, function (v, k) {
        statesShortToLong [v.toUpperCase ()] = k;
      });

      if (!fs.existsSync (filename))
        replyToMe (req, {msg: filename + ' does not exist!'});
      else {
        fs.readFile (filename, function (err, data) {
          if (err)
            replyToMe (req, {msg: err});
          else {
            csvparse (data, function (err, output) {
              if (err)
                replyToMe (req, {msg: err});
              else {
                var error = false;
                var shooters = [];
                var header = output.shift ();
                var fields = {
                  'sh_fn':       {index: -1, name: 'First Name'},
                  'sh_ln':       {index: -1, name: 'Last Name'},
                  'sh_eml':      {index: -1, name: 'Email'},
                  'sh_ph':       {index: -1, name: 'Phone'},
                  'sh_addr1':    {index: -1, name: 'Street Address'},
                  'sh_city':     {index: -1, name: 'City'},
                  'sh_st':       {index: -1, name: 'State'},
                  'sh_zipcode':  {index: -1, name: 'Zip Code'},
                  'sh_id':       {index: -1, name: 'Number'},
                  'sh_approval': {index: -1, name: 'Approval Status'},
                };

                _.each (fields, function (field) {
                  if ((field.index = _.indexOf (header, field.name)) === -1) {
                    pmelog.llog (pmelog.ERROR, 'Can\'t find field \'%s\' in .csv header record', field.name);
                    error = true;
                  }
                });

                if (error) {
                  replyToMe (req, {msg: 'Error in .csv file, see console output'});
                  return;
                }

                _.each (output, function (line) {
                  var shooter = {};
                  _.each (fields, function (field, k) {
                      shooter [k] = line [field.index] || '';
                  });

                  _.each (['sh_id'], function (k) {
                    shooter [k] = shooter [k].replace (/[^A-Za-z0-9]/, '').toUpperCase ();
                  });

                  _.each (['sh_ph', 'sh_zipcode'], function (k) {
                    shooter [k] = shooter [k].replace (/[^0-9]/g, '');
                  });

                  _.each (['sh_eml'], function (k) {
                    shooter [k] = shooter [k].toLowerCase ();
                  });

                  _.each (['sh_st'], function (k) {
                    shooter [k] = shooter [k].toUpperCase ().replace (/[^A-Z ]/g, '');

                    if (statesLongToShort [shooter [k]])
                      shooter [k] = statesLongToShort [shooter [k]];
                    if (!statesShortToLong [shooter [k]])
                      pmelog.llog (pmelog.ERROR, 'Competitor %s %s has invalid state %s', shooter.sh_fn, shooter.sh_ln, shooter.sh_st);
                  });

                  _.each (['sh_fn', 'sh_ln', 'sh_addr1', 'sh_city'], function (k) {
                    shooter [k] = shooter [k].trim ().replace (/^[\W+]/, '').toNameCase ();
                  });

                  _.each (['sh_approval'], function (k) {
                    shooter [k] = shooter [k].toLowerCase ().replace (/[^a-z-]/g, '');
                  });

                  shooters.push (shooter);
                });

                fs.writeFileSync ('debug/csvimport.txt', util.inspect (shooters, {depth: null, customInspect: false}));

                _.each (shooters, function (shooter) {
                  var competitor;

                  if (!(competitor = app.pmm.match ().matchdef ().getShooterByID (shooter.sh_id)))
                    pmelog.llog (pmelog.INFO, 'Competitor %s %s not in match', shooter.sh_fn, shooter.sh_ln);
                  else if (competitor.getState () !== shooter.sh_st)
                    pmelog.llog (pmelog.ERROR, 'Competitor %s %s has state mis-match (%s, %s)', shooter.sh_fn, shooter.sh_ln, competitor.getState (), shooter.sh_st);
                  else if (competitor.getPhone () !== shooter.sh_ph)
                    pmelog.llog (pmelog.ERROR, 'Competitor %s %s has phone mis-match (%s, %s)', shooter.sh_fn, shooter.sh_ln, competitor.getPhone (), shooter.sh_ph);
                  else if (competitor.getEmail () !== shooter.sh_eml)
                    pmelog.llog (pmelog.ERROR, 'Competitor %s %s has email mis-match (%s, %s)', shooter.sh_fn, shooter.sh_ln, competitor.getEmail (), shooter.sh_eml);
                  else {
                    competitor.setAddr1 (shooter.sh_addr1);
                    competitor.setCity (shooter.sh_city);
                    competitor.setZipcode (shooter.sh_zipcode);

                    if (competitor.getAge () === 'JUNIOR')
                      competitor.setType ('Junior');
                    else if (/staff/.test (shooter.sh_approval))
                      competitor.setType ('Staff');
                    else if (/comped/.test (shooter.sh_approval))
                      competitor.setType ('Sponsor');
                    else
                      competitor.setType ('Competitor');
                  }
                });

                replyToMe (req, {
                  msg: 'File successfully imported',
                });
              }
            });
          }
        });
      }
    },
    'jcw:create': function (req) {
      var filename = 'matches/range_report.csv';
      var shooters = [];
      _.each (_.filter (_.sortByOrder (app.pmm.match ().matchdef ().getShooters (), ['sh_ln', 'sh_fn'], ['asc', 'asc']), 'sh_del', false), function (shooter) {
        shooters.push ([shooter.getLastName (), shooter.getFirstName (), shooter.getType ()].join (','));
      });
      fs.writeFile (filename, shooters.join ('\n') + '\n', function (err) {
        replyToMe (req, {
          msg: err ? err : 'matches/range_report.csv created successfully',
        });
      });
    },
    'jcw:delete': function (req) {
      app.pmm.match ().matchdef ().hardDeleteShooters (function (err, deletedShooters) {
        if (deletedShooters) {
          showChanges ('Deleted shooter', deletedShooters);
          tellEveryoneElse (req, 'match_updated');
        }
        replyToMe (req, {
          msg: sprintf ("%d competitors deleted", deletedShooters.length),
        });
      });
    },
    'jcw:export': function (req) {
      app.pmm.match ().matchdef ().exportShooters (function (err, exportedShooters) {
        replyToMe (req, {
          msg: sprintf ("%d competitors exported", exportedShooters.length),
        });
      });
    },
    'jcw:mailing': function (req) {
      //
      //  Remove all empty divisions, classes, etc, and shooters that didn't place.
      //
      var pruneEmpty = function (obj) {
        return (function prune (current) {
          _.forOwn (current, function (value, key) {
            if ( _.isUndefined (value) || _.isNull (value) || _.isNaN (value) ||
               (_.isString (value) && _.isEmpty (value)) ||
               (_.isObject (value) && _.isEmpty (prune (value))) ||
               (key.substr (0, 1) === '_') ||
               (value.sh_dq)
             ) {

              delete current [key];
            }
          });

          if (_.isArray (current)) {
            _.pull (current, undefined);
          }

          return current;

        } (_.cloneDeep (obj)));
      };
      var filename = 'matches/winners.tsv';
      var suffixMap = ['th', 'st', 'nd', 'rd'];
      var itemMap = {area: 'Area', state: 'State', hoa: 'HOA', classes: 'Class', categories: 'Category'};
      var competitorSeen = {};
      var awards = pruneEmpty (req.data.awards);
      var lines = [['Division','Division/Class','Place','Last Name','First Name','USPSA #','Address','City','State','Zip Code','Phone','Email'].join ('\t')];

      _.each (awards, function (division, divisionName) {
        var niceDivisionName = app.pmm.match ().lookups ().divisions [divisionName] || divisionName;

        _.each (['hoa','area','state','classes','categories'], function (itemName) {
          var item = division [itemName];

          if (item) {
            switch (itemName) {
              case 'hoa' :
              case 'area' :
              case 'state' :
                if (!competitorSeen [item.sh_id]) {
                  lines.push ([niceDivisionName, 'Division', itemMap [itemName], item.sh_ln, item.sh_fn, item.sh_id, item.sh_addr1, item.sh_city, item.sh_st, item.sh_zipcode, item.sh_ph, item.sh_eml].join ('\t'));
                  competitorSeen [item.sh_id] = (competitorSeen [item.sh_id] || 0) + 1;
                }
                break;

              case 'classes' :
                _.each (item, function (classs, className) {
                  var place = 0;
                  _.each (_.reject (classs, 'css_class', 'strike-no-win'), function (classItem) {
                    if (!competitorSeen [classItem.sh_id]) {
                      lines.push ([niceDivisionName, className, ++place + suffixMap [(place > 3) ? 0 : (place % 10)], classItem.sh_ln, classItem.sh_fn, classItem.sh_id, classItem.sh_addr1, classItem.sh_city, classItem.sh_st, classItem.sh_zipcode, classItem.sh_ph, classItem.sh_eml].join ('\t'));
                      competitorSeen [classItem.sh_id] = (competitorSeen [classItem.sh_id] || 0) + 1;
                    }
                  });
                });
                break;

              case 'categories' :
                _.each (item, function (category, categoryName) {
                  var place = 0;
                  var cssTag = 'css_category_' + categoryName.toLowerCase ();
                  _.each (_.reject (category, cssTag, 'strike-no-win'), function (categoryItem) {
                    lines.push ([niceDivisionName, categoryName, ++place + suffixMap [(place > 3) ? 0 : (place % 10)], categoryItem.sh_ln, categoryItem.sh_fn, categoryItem.sh_id, categoryItem.sh_addr1, categoryItem.sh_city, categoryItem.sh_st, categoryItem.sh_zipcode, categoryItem.sh_ph, categoryItem.sh_eml].join ('\t'));
                  });
                });
                break;
            }
          }
        });
      });

      fs.writeFileSync ('debug/winners_pre.txt', util.inspect (req.data.awards, {depth: null, customInspect: false}));
      fs.writeFileSync ('debug/winners.txt', util.inspect (awards, {depth: null, customInspect: false}));
      fs.writeFileSync (filename, lines.join ('\n') + '\n');
    },
    'jcheck': function (req) {
      tellMe (req, 'utils_jcheck_status', {status: 'Checking JSON...'});

      app.pmm.other ().jsonCheck (function (err, results) {
        if (err) {
          tellMe (req, 'utils_jcheck_status', {status: 'JSON check complete, discrepancies found!'});
          tellMe (req, 'utils_jcheck_results', {results: results});
        } else
          tellMe (req, 'utils_jcheck_status', {status: 'JSON check complete, no discrepancies found.'});
      });
    },
    'showapp': function () {
      pmelog.ldirex (pmelog.DEBUG, app);
    },
    'memory': function (req) {
      replyToMe (req, {
        err: null,
        memory: process.memoryUsage (),
      });
    },
    'interfaces': function (req) {
      var ifaceList = [];
      var ifaces = os.networkInterfaces ();
      var parse = function (dev) {
        var alias = 0;

        ifaces [dev].forEach (function (details) {
          if (/*(details.family === 'IPv4') &&*/ (details.internal === false)) {
            ifaceList.push ({
              name: dev + (alias ? ':' + alias : ''),
              address: details.address,
            });
            ++alias;
          }
        });
      };

      for (var dev in ifaces)
        parse (dev);

      replyToMe (req, {
        err: null,
        interfaces: ifaceList,
      });
    },
  });
};
