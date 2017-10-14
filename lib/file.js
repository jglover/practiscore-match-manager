'use strict';

var _ = require ('lodash');
var assert = require ('assert');
var async = require ('async');
var fs = require ('fs');
var sprintf = require ('sprintf-js').sprintf;
var sqlite3 = require ('sqlite3').verbose ();
var tmp = require ('tmp');
var wait = require ('wait.for');
var pmelog = require ('./pmelog');
var psutils = require ('./utils');
var psc = require ('./imexport/psc');
var ssi = require ('./imexport/ssi');

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
  // if (!_.isFunction (callback))
  //   throw new ConversionError ('WTF?');
  return _.isFunction (callback) ? callback : function (err) { throw err; };
}

//
//
//
var sqlStatements = {
  //
  //  'configuration' is where we store PMM configuration info (Config->*)
  //
  create_configuration:
    'CREATE TABLE IF NOT EXISTS configuration (' +
      'id INTEGER PRIMARY KEY,' +
      'description TEXT,' +
      'config_json BLOB,' +
      'modified DATETIME)',
  save_configuration:
    'INSERT OR REPLACE INTO configuration ' +
      '(id, description, config_json, modified) ' +
      'VALUES ' +
      '(?, ?, ?, DATETIME("now"))',
  load_configuration:
    'SELECT config_json '+
      'FROM configuration ' +
     'WHERE id=?',
  //
  //  'score_logs' needs to be reworked. Currently we're just dropping any
  //  we've saved any time we start PMM.
  //
  drop_score_logs:
    'DROP TABLE IF EXISTS score_logs',
  //
  //  'matches' is where we store actual matches
  //
  create_matches:
    'CREATE TABLE IF NOT EXISTS matches (' +
      'match_uuid TEXT PRIMARY KEY,' +
      'match_name TEXT,' +
      'match_date TEXT,' +
      'match_modified TEXT,' +
      'match_discipline TEXT,' +
      'match_json BLOB,' +
      'scores_json BLOB)',
  insert_into_matches:
    'INSERT OR REPLACE INTO matches ' +
      '(match_uuid, match_name, match_date, match_modified, match_discipline, match_json) ' +
      'VALUES ' +
      '(?, ?, ?, ?, ?, ?)',
  fetch_all_matches:
    'SELECT match_uuid, match_name, match_date, match_modified, match_discipline ' +
      'FROM matches',
  fetch_match_by_uuid:
    'SELECT match_json ' +
      'FROM matches ' +
     'WHERE match_uuid=? ' +
     'LIMIT 1',
  delete_match_by_uuid:
    'DELETE ' +
      'FROM matches ' +
     'WHERE match_uuid=?',
  /* FIXME: Delete
  //
  //  'divisions' is used to store the match type (uspsa_p, sc, etc), the
  //  divisions for that match type, and whether they're enabled or not. The
  //  table is pre-populated with the divisions for each match type, and user
  //  defined divisions are added to it.
  //
  create_divisions: [
    'CREATE TABLE IF NOT EXISTS divisions (' +
      'discipline TEXT,' +
      'ps_name TEXT,' +
      'pmm_name TEXT,' +
      'enabled BOOLEAN NOT NULL DEFAULT 1,' +
      'sortorder INTEGER NOT NULL DEFAULT -1,' +
      'uuid TEXT,' +
      'PRIMARY KEY (discipline, ps_name))',
    'INSERT OR IGNORE INTO divisions (discipline, ps_name, pmm_name, uuid) VALUES ("sc",      "IRPD",   "IPSC Production",        ?)',
    'INSERT OR IGNORE INTO divisions (discipline, ps_name, pmm_name, uuid) VALUES ("sc",      "ISP",    "Iron Sight Pistol",      ?)',
    'INSERT OR IGNORE INTO divisions (discipline, ps_name, pmm_name, uuid) VALUES ("sc",      "ISR",    "Iron Sight Revolver",    ?)',
    'INSERT OR IGNORE INTO divisions (discipline, ps_name, pmm_name, uuid) VALUES ("sc",      "LTD",    "Limited",                ?)',
    'INSERT OR IGNORE INTO divisions (discipline, ps_name, pmm_name, uuid) VALUES ("sc",      "OPN",    "Open",                   ?)',
    'INSERT OR IGNORE INTO divisions (discipline, ps_name, pmm_name, uuid) VALUES ("sc",      "OSR",    "Open Revolver",          ?)',
    'INSERT OR IGNORE INTO divisions (discipline, ps_name, pmm_name, uuid) VALUES ("sc",      "PCC",    "Pistol Caliber Carbine", ?)',
    'INSERT OR IGNORE INTO divisions (discipline, ps_name, pmm_name, uuid) VALUES ("sc",      "PROD",   "Production",             ?)',
    'INSERT OR IGNORE INTO divisions (discipline, ps_name, pmm_name, uuid) VALUES ("sc",      "RFPI",   "Rimfire Pistol Irons",   ?)',
    'INSERT OR IGNORE INTO divisions (discipline, ps_name, pmm_name, uuid) VALUES ("sc",      "RFPO",   "Rimfire Pistol Open",    ?)',
    'INSERT OR IGNORE INTO divisions (discipline, ps_name, pmm_name, uuid) VALUES ("sc",      "RFRI",   "Rimfire Rifle Irons",    ?)',
    'INSERT OR IGNORE INTO divisions (discipline, ps_name, pmm_name, uuid) VALUES ("sc",      "RFRO",   "Rimfire Rifle Open",     ?)',
    'INSERT OR IGNORE INTO divisions (discipline, ps_name, pmm_name, uuid) VALUES ("sc",      "SGP",    "Shotgun",                ?)',
    'INSERT OR IGNORE INTO divisions (discipline, ps_name, pmm_name, uuid) VALUES ("sc",      "SS",     "Single Stack",           ?)',
    'INSERT OR IGNORE INTO divisions (discipline, ps_name, pmm_name, uuid) VALUES ("uspsa_p", "LTD",    "Limited",                ?)',
    'INSERT OR IGNORE INTO divisions (discipline, ps_name, pmm_name, uuid) VALUES ("uspsa_p", "LTDTEN", "Limited 10",             ?)',
    'INSERT OR IGNORE INTO divisions (discipline, ps_name, pmm_name, uuid) VALUES ("uspsa_p", "OPEN",   "Open",                   ?)',
    'INSERT OR IGNORE INTO divisions (discipline, ps_name, pmm_name, uuid) VALUES ("uspsa_p", "PROD",   "Production",             ?)',
    'INSERT OR IGNORE INTO divisions (discipline, ps_name, pmm_name, uuid) VALUES ("uspsa_p", "REV",    "Revolver",               ?)',
    'INSERT OR IGNORE INTO divisions (discipline, ps_name, pmm_name, uuid) VALUES ("uspsa_p", "SS",     "Single Stack",           ?)',
    'INSERT OR IGNORE INTO divisions (discipline, ps_name, pmm_name, uuid) VALUES ("uspsa_p", "CO",     "Carry Optics",           ?)',
  ],
  get_divisions:
      'SELECT discipline, ps_name, pmm_name, enabled, sortorder, uuid ' +
        'FROM divisions ' +
       'WHERE discipline=? ' +
    'ORDER BY sortorder',
  save_divisions:
    'INSERT OR REPLACE INTO divisions ' +
      '(discipline, ps_name, pmm_name, enabled, sortorder, uuid) ' +
      'VALUES ' +
      '(?, ?, ?, ?, ?, ?)',
  delete_divisions:
    'DELETE FROM divisions ' +
          'WHERE discipline=?',
  //
  //  'classes' is used to store the match type (uspsa_p, sc, etc), the
  //  classes for that match type, and whether they're enabled or not. The
  //  table is pre-populated with the classes for each match type, and user
  //  defined classes are added to it.
  //
  create_classes: [
    'CREATE TABLE IF NOT EXISTS classes (' +
      'discipline TEXT,' +
      'pmm_name TEXT,' +
      'enabled BOOLEAN NOT NULL DEFAULT 1,' +
      'sortorder INTEGER NOT NULL DEFAULT -1,' +
      'PRIMARY KEY (discipline, pmm_name))',
    'INSERT OR IGNORE INTO classes (discipline, pmm_name) VALUES ("sc",      "A")',
    'INSERT OR IGNORE INTO classes (discipline, pmm_name) VALUES ("sc",      "B")',
    'INSERT OR IGNORE INTO classes (discipline, pmm_name) VALUES ("sc",      "C")',
    'INSERT OR IGNORE INTO classes (discipline, pmm_name) VALUES ("sc",      "D")',
    'INSERT OR IGNORE INTO classes (discipline, pmm_name) VALUES ("sc",      "M")',
    'INSERT OR IGNORE INTO classes (discipline, pmm_name) VALUES ("sc",      "G")',
    'INSERT OR IGNORE INTO classes (discipline, pmm_name) VALUES ("sc",      "U")',
    'INSERT OR IGNORE INTO classes (discipline, pmm_name) VALUES ("uspsa_p", "A")',
    'INSERT OR IGNORE INTO classes (discipline, pmm_name) VALUES ("uspsa_p", "B")',
    'INSERT OR IGNORE INTO classes (discipline, pmm_name) VALUES ("uspsa_p", "C")',
    'INSERT OR IGNORE INTO classes (discipline, pmm_name) VALUES ("uspsa_p", "D")',
    'INSERT OR IGNORE INTO classes (discipline, pmm_name) VALUES ("uspsa_p", "M")',
    'INSERT OR IGNORE INTO classes (discipline, pmm_name) VALUES ("uspsa_p", "G")',
    'INSERT OR IGNORE INTO classes (discipline, pmm_name) VALUES ("uspsa_p", "U")',
  ],
  //
  //  'categories' is used to store the match type (uspsa_p, sc, etc), the
  //  categories for that match type, and whether they're enabled or not. The
  //  table is pre-populated with the categories for each match type, and user
  //  defined categories are added to it.
  //
  create_categories: [
    'CREATE TABLE IF NOT EXISTS categories (' +
      'discipline TEXT,' +
      'pmm_name TEXT,' +
      'enabled BOOLEAN NOT NULL DEFAULT 1,' +
      'sortorder INTEGER NOT NULL DEFAULT -1,' +
      'PRIMARY KEY (discipline, pmm_name))',
    'INSERT OR IGNORE INTO categories (discipline, pmm_name) VALUES ("sc",      "Lady"           )',
    'INSERT OR IGNORE INTO categories (discipline, pmm_name) VALUES ("sc",      "Preteen"        )',
    'INSERT OR IGNORE INTO categories (discipline, pmm_name) VALUES ("sc",      "Junior"         )',
    'INSERT OR IGNORE INTO categories (discipline, pmm_name) VALUES ("sc",      "Senior"         )',
    'INSERT OR IGNORE INTO categories (discipline, pmm_name) VALUES ("sc",      "Super Senior"   )',
    'INSERT OR IGNORE INTO categories (discipline, pmm_name) VALUES ("sc",      "Law Enforcement")',
    'INSERT OR IGNORE INTO categories (discipline, pmm_name) VALUES ("sc",      "Military"       )',
    'INSERT OR IGNORE INTO categories (discipline, pmm_name) VALUES ("sc",      "Foreign"        )',
    'INSERT OR IGNORE INTO categories (discipline, pmm_name) VALUES ("uspsa_p", "Lady"           )',
    'INSERT OR IGNORE INTO categories (discipline, pmm_name) VALUES ("uspsa_p", "Junior"         )',
    'INSERT OR IGNORE INTO categories (discipline, pmm_name) VALUES ("uspsa_p", "Senior"         )',
    'INSERT OR IGNORE INTO categories (discipline, pmm_name) VALUES ("uspsa_p", "Super Senior"   )',
    'INSERT OR IGNORE INTO categories (discipline, pmm_name) VALUES ("uspsa_p", "Law Enforcement")',
    'INSERT OR IGNORE INTO categories (discipline, pmm_name) VALUES ("uspsa_p", "Military"       )',
    'INSERT OR IGNORE INTO categories (discipline, pmm_name) VALUES ("uspsa_p", "Foreign"        )',
  ],
  */
  //
  //  'penalties' is used to store the match type (uspsa_p, sc, etc), the
  //  penalties for that match type, and whether they're enabled or not. The
  //  table is pre-populated with the penalties for each match type, and user
  //  defined penalties are added to it.
  //
  create_penalties: [
    'CREATE TABLE IF NOT EXISTS penalties (' +
      'discipline TEXT,' +
      'name TEXT,' +
      'value TEXT,' +
      'many BOOLEAN,' +
      'enabled BOOLEAN NOT NULL DEFAULT 1,' +
      'sortorder INTEGER NOT NULL DEFAULT -1,' +
      'PRIMARY KEY (discipline, name))',
    'INSERT OR IGNORE INTO penalties (discipline, name, value, many) VALUES ("sc", "Procedural",      "3.00",  "1")',
    'INSERT OR IGNORE INTO penalties (discipline, name, value, many) VALUES ("sc", "Miss",            "3.00",  "1")',
    'INSERT OR IGNORE INTO penalties (discipline, name, value, many) VALUES ("sc", "Miss Stop Plate", "30.00", "1")',
  ],
  //
  //  'bonuses' is used to store the match type (uspsa_p, sc, etc), the
  //  bonuses for that match type, and whether they're enabled or not. The
  //  table is pre-populated with the bonuses for each match type, and user
  //  defined bonuses are added to it.
  //
  create_bonuses: [
    'CREATE TABLE IF NOT EXISTS bonuses (' +
      'discipline TEXT,' +
      'name TEXT,' +
      'value TEXT,' +
      'many BOOLEAN,' +
      'enabled BOOLEAN NOT NULL DEFAULT 1,' +
      'sortorder INTEGER NOT NULL DEFAULT -1,' +
      'PRIMARY KEY (discipline, name))',
  ],
  //
  //  'competitors' is for storing information about competitors. The original
  //  idea was for the database to be common for all match types, and have
  //  somewhere we kept discipline-specific information. This is likely going
  //  to be changed to be a table per match type.
  //
  create_competitors:
    'CREATE TABLE IF NOT EXISTS competitors (' +
      'id INTEGER PRIMARY KEY,' +
      'sh_fn TEXT,' +
      'sh_ln TEXT,' +
      'sh_addr1 TEXT,' +
      'sh_addr2 TEXT,' +
      'sh_city TEXT,' +
      'sh_st TEXT,' +
      'sh_zipcode TEXT,' +
      'sh_cc TEXT,' +
      'sh_ph TEXT,' +
      'sh_eml TEXT,' +
      'sh_age TEXT,' +
      'sh_gen TEXT,' +
      'sh_law BOOLEAN,' +
      'sh_mil BOOLEAN,' +
      'sh_frn BOOLEAN,' +
      'mod_pr TEXT,' +
      'discipline TEXT,' +
      'sh_id TEXT,' +
      'last_in_match DATETIME,' +
      'usage_count INT,' +
      'notes TEXT)',
  //
  //  'score_logs' are the logs from the scoring devices that reflect any
  //  modifications to scores made on that scoring device.
  //
  create_score_logs:
    'CREATE TABLE IF NOT EXISTS score_logs (' +
      'sl_match_uuid TEXT,' +
      'sl_log_uuid TEXT,' +
      'sl_stage_uuid TEXT,' +
      'sl_shooter_uid TEXT,' +
      'sl_timestamp TEXT,' +
      'sl_timestampsecs REAL,' +
      'sl_timestamp_local TEXT,' +
      'sl_stage_name TEXT,' +
      'sl_shooter_id TEXT,' +
      'sl_shooter_first_name TEXT,' +
      'sl_shooter_last_name TEXT,' +
      'sl_device_name TEXT,' +
      'sl_device_id TEXT,' +
      'sl_operator TEXT,' +
      'sl_penalty_reasons TEXT,' +
      'sl_dq_reasons TEXT,' +
      'sl_score TEXT,' +
      'sl_posted INTEGER,' +
      'PRIMARY KEY (sl_match_uuid, sl_log_uuid))',
  fetch_score_logs:
      'SELECT * ' +
        'FROM score_logs ' +
       'WHERE sl_match_uuid=? ' +
    'ORDER BY sl_timestamp DESC',
  //
  //  'uspsa_classifiers' is intended to contain a list of all the classifiers
  //  that USPSA has, and use it to auto-populate stages.  This table will
  //  likely be populated statically.
  //
  create_uspsa_classifiers: [
    'CREATE TABLE IF NOT EXISTS uspsa_classifiers (' +
      'c_cmnumber TEXT PRIMARY KEY,' +
      'c_name TEXT,' +
      'c_scoring TEXT,' +      // Comstock | Virginia | Fixed
      'c_strings INTEGER,' +
      'c_noshoots BOOLEAN,' +
      'c_poppers INTEGER,' +
      'c_targets INTEGER,' +
      'c_targettype TEXT,' + // Metric (Human) | Classic (Turtle)
      'c_rounds INTEGER,' +
      'c_points INTEGER,' +
      'c_retired BOOLEAN)',
    'INSERT OR REPLACE INTO uspsa_classifiers (c_cmnumber, c_name, c_scoring, c_strings, c_noshoots, c_poppers, c_targets, c_targettype, c_rounds, c_points, c_retired) VALUES ("0302", "Six Chickens",          "Virginia", 1, 1, 0,  6, "Metric", 12,  60, 0)',
    'INSERT OR REPLACE INTO uspsa_classifiers (c_cmnumber, c_name, c_scoring, c_strings, c_noshoots, c_poppers, c_targets, c_targettype, c_rounds, c_points, c_retired) VALUES ("0303", "Take\'em Down",         "Comstock", 1, 1, 3,  4, "Metric", 11,  55, 0)',
    'INSERT OR REPLACE INTO uspsa_classifiers (c_cmnumber, c_name, c_scoring, c_strings, c_noshoots, c_poppers, c_targets, c_targettype, c_rounds, c_points, c_retired) VALUES ("0304", "3-V",                   "Virginia", 1, 1, 0,  7, "Metric", 14,  70, 0)',
    'INSERT OR REPLACE INTO uspsa_classifiers (c_cmnumber, c_name, c_scoring, c_strings, c_noshoots, c_poppers, c_targets, c_targettype, c_rounds, c_points, c_retired) VALUES ("1306", "Too Close For Comfort", "Virginia", 1, 0, 0,  5, "Metric", 10,  50, 0)',
  ],
  //
  //  'awards_settings' is used to save the settings for calculating the
  //  awards, on a per-match basis.
  //
  create_awards_settings:
    'CREATE TABLE IF NOT EXISTS awards_settings (' +
      'uuid TEXT,' +
      'settings_json TEXT,' +
      'modified DATETIME,' +
      'PRIMARY KEY (uuid))',
  load_awards_settings:
    'SELECT * ' +
      'FROM awards_settings ' +
     'WHERE uuid=?',
  save_awards_settings:
    'INSERT OR REPLACE INTO awards_settings (' +
      'uuid, settings_json, modified) ' +
      'VALUES ' +
      '(?, ?, DATETIME("now"))',
  //
  //  'checkin_settings' is used to store the settings selected for the
  //  check-in page, on a per-match basis.
  //
  create_checkin_settings:
    'CREATE TABLE IF NOT EXISTS checkin_settings (' +
      'uuid TEXT,' +
      'settings_json TEXT,' +
      'modified DATETIME,' +
      'PRIMARY KEY (uuid))',
  load_checkin_settings:
    'SELECT * ' +
      'FROM checkin_settings ' +
     'WHERE uuid=?',
  save_checkin_settings:
    'INSERT OR REPLACE INTO checkin_settings (' +
      'uuid, settings_json, modified) ' +
      'VALUES ' +
      '(?, ?, DATETIME("now"))',
  //
  //  'envelopes_settings' is used to store the settings selected for printing
  //  envelopes, on a per-match basis.
  //
  create_envelopes_settings:
    'CREATE TABLE IF NOT EXISTS envelopes_settings (' +
      'uuid TEXT,' +
      'settings_json TEXT,' +
      'modified DATETIME,' +
      'PRIMARY KEY (uuid))',
  load_envelopes_settings:
    'SELECT * ' +
      'FROM envelopes_settings ' +
     'WHERE uuid=?',
  save_envelopes_settings:
    'INSERT OR REPLACE INTO envelopes_settings (' +
      'uuid, settings_json, modified) ' +
      'VALUES ' +
      '(?, ?, DATETIME("now"))',
  //
  //  'labels_settings' is used to store the settings selected for printing
  //  labels, on a per-match basis.
  //
  create_labels_settings:
    'CREATE TABLE IF NOT EXISTS labels_settings (' +
      'uuid TEXT,' +
      'settings_json TEXT,' +
      'modified DATETIME,' +
      'PRIMARY KEY (uuid))',
  load_labels_settings:
    'SELECT * ' +
      'FROM labels_settings ' +
     'WHERE uuid=?',
  save_labels_settings:
    'INSERT OR REPLACE INTO labels_settings (' +
      'uuid, settings_json, modified) ' +
      'VALUES ' +
      '(?, ?, DATETIME("now"))',
  //
  //  'projection_settings' is used to store the settings for calculating
  //  projections, on a per-match basis.
  //
  create_projection_settings:
    'CREATE TABLE IF NOT EXISTS projection_settings (' +
      'uuid TEXT,' +
      'settings_json TEXT,' +
      'modified DATETIME,' +
      'PRIMARY KEY (uuid))',
  load_projection_settings:
    'SELECT * ' +
      'FROM projection_settings ' +
     'WHERE uuid=?',
  save_projection_settings:
    'INSERT OR REPLACE INTO projection_settings (' +
      'uuid, settings_json, modified) ' +
      'VALUES ' +
      '(?, ?, DATETIME("now"))',
  //
  //  'statistics_settings' is used to store the settings for calculating
  //  statistics, on a per-match basis.
  //
  create_statistics_settings:
    'CREATE TABLE IF NOT EXISTS statistics_settings (' +
      'uuid TEXT,' +
      'settings_json TEXT,' +
      'modified DATETIME,' +
      'PRIMARY KEY (uuid))',
  load_statistics_settings:
    'SELECT * ' +
      'FROM statistics_settings ' +
     'WHERE uuid=?',
  save_statistics_settings:
    'INSERT OR REPLACE INTO statistics_settings (' +
      'uuid, settings_json, modified) ' +
      'VALUES ' +
      '(?, ?, DATETIME("now"))',
  //
  //  'match_pins' stores the PINs entered by the user to download matches
  //  from clubs.practiscore.com.
  //
  create_match_pins:
    'CREATE TABLE IF NOT EXISTS match_pins (' +
      'pin TEXT,' +
      'match_type TEXT,' +
      'match_type_name TEXT,' +
      'match_name TEXT,' +
      'PRIMARY KEY (pin))',
  load_match_pins:
      'SELECT * ' +
        'FROM match_pins ' +
    'ORDER BY match_name',
  load_match_pins_only:
      'SELECT * ' +
        'FROM match_pins ' +
       'WHERE match_type=? ' +
    'ORDER BY match_name',
  save_match_pin:
    'INSERT OR REPLACE INTO match_pins (' +
      'pin, match_type, match_type_name, match_name) ' +
      'VALUES ' +
      '(?, ?, ?, ?)',
  //
  //  'classifications_directory' contains the classification type (uspsa_p or
  //  sc, currently), the date the classifications were updated on the web, and
  //  the date classifications were downloaded (last_checked). The 'id' field
  //  is used by the other classification tables to identify the set. This
  //  allows different revisions of classifications to be stored, primarily so
  //  that if a database rolls during a match, the information can be used to
  //  update competitors expiration dates and such, but the pre-match data can
  //  be used to set their class.
  //
  create_classifications_directory:
    'CREATE TABLE IF NOT EXISTS classifications_directory (' +
      'id INTEGER PRIMARY KEY,' +
      'discipline TEXT,' +
      'last_updated TEXT,' +
      'last_checked TEXT)',
  add_classifications_directory:
    'INSERT INTO classifications_directory (' +
      'discipline, last_updated, last_checked) ' +
      'VALUES ' +
      '(?, ?, DATETIME ("NOW"))',
  get_classifications_directory:
       'SELECT id, last_updated, last_checked ' +
         'FROM classifications_directory ' +
        'WHERE discipline=? ' +
     'ORDER BY last_updated',
  get_classifications_most_recent:
       'SELECT id ' +
         'FROM classifications_directory ' +
        'WHERE discipline=? ' +
          'AND last_updated=?',
  create_classifications: [
    'CREATE TABLE IF NOT EXISTS classifications_sc (' +
      'dir_id INTEGER,' +
      'scsa_num TEXT,' +
      'first_name TEXT,' +
      'last_initial TEXT,' +
      'classification TEXT,' +
      'ranking INTEGER,' +
      'PRIMARY KEY (dir_id,scsa_num))',
    'CREATE TABLE IF NOT EXISTS classifications_uspsa (' +
      'dir_id INTEGER,' +
      'uspsa_whole TEXT,' +
      'uspsa_prefix TEXT,' +
      'uspsa_num TEXT,' +
      'uspsa_unique TEXT,' +
      'expiration TEXT,' +
      'division TEXT,' +
      'classification TEXT,' +
      'first_name TEXT,' +
      'last_initial TEXT,' +
      'discipline TEXT,' +
      'PRIMARY KEY (dir_id,uspsa_whole,division))',
  ],
  delete_classifications: {
    sc:    'DELETE FROM classifications_sc ' +
                 'WHERE dir_id=?',
    uspsa: 'DELETE FROM classifications_uspsa ' +
                 'WHERE dir_id=?',
  },
  insert_classifications: {
    sc:    'INSERT OR REPLACE INTO classifications_sc ' +
             '(dir_id, scsa_num, first_name, last_initial, classification, ranking) ' +
             'VALUES ' +
             '($dir_id, $scsa_num, $first_name, $last_initial, $classification, $ranking)',
    uspsa: 'INSERT OR REPLACE INTO classifications_uspsa ' +
             '(dir_id, uspsa_whole, uspsa_prefix, uspsa_num, uspsa_unique, expiration, division, classification, first_name, last_initial, discipline) ' +
             'VALUES ' +
             '($dir_id, $whole, $prefix, $num, $unique, $expiration, $division, $classification, $first_name, $last_initial, $discipline)',
  },
  count_classifications: {
    sc:    'SELECT COUNT(*) AS COUNT ' +
             'FROM classifications_sc ' +
            'WHERE dir_id=?',
    uspsa: 'SELECT COUNT(*) AS COUNT ' +
             'FROM classifications_uspsa ' +
            'WHERE dir_id=?',
  },
  latest_classifications: {
    sc:    'SELECT scsa_num, classification, ranking ' +
             'FROM classifications_sc ' +
            'WHERE dir_id=?',
    uspsa: 'SELECT uspsa_whole, uspsa_unique, classification, division, expiration, first_name, last_initial ' +
             'FROM classifications_uspsa ' +
            'WHERE dir_id=?',
  },
  //
  //  URL for populating this is http://www.uspsa.org/uspsa-lookup-ro.php?ro=t&cro=t&action=lookup
  //
  create_uspsa_ro_list:
    'CREATE TABLE IF NOT EXISTS uspsa_ro_list (' +
      'uspsa_num TEXT PRIMARY KEY ASC,' +
      'name TEXT,' +
      'state TEXT,' +
      'certification TEXT,' +
      'certification_expiration TEXT,' +
      'uspsa_num_expiration TEXT)',
  delete_uspsa_ro_list:
    'DELETE FROM uspsa_ro_list',
  insert_uspsa_ro_list:
    'INSERT OR REPLACE INTO uspsa_ro_list ' +
      '(uspsa_num, name, state, certification, certification_expiration, uspsa_num_expiration) ' +
      'VALUES ' +
      '($uspsa_num, $name, $state, $certification, $certification_expiration, $uspsa_num_expiration)',
  count_uspsa_ro_list:
    'SELECT COUNT(*) AS COUNT ' +
      'FROM uspsa_ro_list',
  get_uspsa_ro_list:
      'SELECT rowid, uspsa_num, name, state, certification, certification_expiration, uspsa_num_expiration ' +
        'FROM uspsa_ro_list ' +
    'ORDER BY name',
  //
  //  Table for storing JSON strings to, typically for temporary data
  //
  create_json:
    'CREATE TABLE IF NOT EXISTS json (' +
      'pkey TEXT PRIMARY KEY,' +
      'json TEXT)',
  save_json:
    'INSERT OR REPLACE INTO json ' +
      '(pkey, json) ' +
      'VALUES ' +
      '(?, ?)',
  get_json:
    'SELECT json ' +
      'FROM json ' +
     'WHERE pkey=?',
  delete_json:
    'DELETE FROM json ' +
          'WHERE pkey=?',
  //
  //  Table for storing JSON strings to, typically for temporary data
  //
  create_debug:
    'CREATE TABLE IF NOT EXISTS debug (' +
      'id INTEGER PRIMARY KEY,' +
      'datetime TEXT,' +
      'data TEXT)',
  save_debug:
    'INSERT INTO debug ' +
      '(datetime, data) ' +
      'VALUES ' +
      '(DATETIME ("NOW"), ?)',
  get_debug:
    'SELECT id, datetime, data ' +
      'FROM debug ' +
     'WHERE id=?',
  delete_debug:
    'DELETE FROM debug ' +
          'WHERE id=?',
  //
  //  Log file table
  //
  create_logfile:
    'CREATE TABLE IF NOT EXISTS logfile (' +
      'id INTEGER PRIMARY KEY,' +
      'datetime TEXT,' +
      'loglevel INTEGER,' +
      'logentry TEXT)',
  save_logfile:
    'INSERT INTO logfile ' +
      '(datetime, loglevel, logentry) ' +
      'VALUES ' +
      '(DATETIME ("NOW"), ?, ?)',
};
var sqlStatementsCreate = [
  'create_configuration',
  'create_matches',
  // 'create_divisions',  // FIXME: Delete
  // 'create_classes',    // FIXME: Delete
  // 'create_categories', // FIXME: Delete
  'create_penalties',
  'create_bonuses',
  'create_competitors',
  'create_score_logs',
  'create_uspsa_classifiers',
  'create_awards_settings',
  'create_checkin_settings',
  'create_envelopes_settings',
  'create_labels_settings',
  'create_projection_settings',
  'create_statistics_settings',
  'create_match_pins',
  'create_classifications_directory',
  'create_classifications',
  'create_uspsa_ro_list',
  'create_json',
  'create_debug',
  'create_logfile',
];

//
//
//
var dbGetHandle = function () {
  var self = this;

  if (self._db)
    return self._db;

  self._dbCreated = fs.existsSync ('pme.sql') ? false : true;

  if (!self._db)
   self._db = new sqlite3.Database ('pme.sql');

  return self._db;
};

var dbCloseHandle = function (callback) {
  var self = this;
  var db = dbGetHandle.call (self);

  db.close (function (err) {
    if (err)
      pmelog.llog (pmelog.WARN, err);

    self._db = null;

    if (callback)
      callback (null);
  });

  return self;
};

var dbInit = function (callback) {
  var self = this;
  var uuidRegex = /^INSERT.*\buuid\b/i;
  var db = dbGetHandle.call (self);

  var initLoopFiber = function () {
    wait.forMethod (db, 'run', 'PRAGMA synchronous=OFF');
    wait.forMethod (db, 'run', 'BEGIN TRANSACTION');

    _.each (sqlStatementsCreate, function (key) {
      var statement;

      try {
        statement = sqlStatements [key];

        if (_.isArray (statement)) {
          _.each (statement, function (subStatement) {
            wait.forMethod (db, 'run', subStatement, uuidRegex.test (subStatement) ? psutils.generateUUID () : undefined);
          });
        } else
          wait.forMethod (db, 'run', statement);
      } catch (e) {
        pmelog.llog (pmelog.WARN, e);
        pmelog.llog (pmelog.WARN, '%s: %s', key, statement);
      }
    });

    wait.forMethod (db, 'run', 'COMMIT TRANSACTION');
    wait.forMethod (db, 'run', 'PRAGMA synchronous=ON');

    if (callback)
      callback (null);
  };

  wait.launchFiber (initLoopFiber);
  return self;
};

//
//
//
var File = function (accessorFunctions, options, callback) {
  var self = this;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  self._accessorFunctions = accessorFunctions;
  self._db = null;
  self._dbCreated = false;

  async.series (
    [
      function (callback) {
        dbInit.call (self, function (err) {
          callback (err);
        });
      },
      function (callback) {
        dbCloseHandle.call (self, function (err) {
          callback (err);
        });
      },
    ], function (err) {
      if (!err && self._dbCreated)
        pmelog.llog (pmelog.WARN, 'pme.sql database not found, created...');
      if (callback)
        callback (err, self);
    }
  );

  return self;
};

File.prototype.className = function () {
  return 'File';
};
File.prototype.updateConfig = function (newConfig) {
  var self = this;
  _.merge (self, newConfig);
  return self;
};
File.prototype.configurationLoad = function (callback) {
  var self = this;
  var db = dbGetHandle.call (self);

  db.get (sqlStatements.load_configuration,
    1,
    function (err, row) {
      if (err)
        pmelog.llog (pmelog.ERROR, err);
      if (callback)
        callback (err, (row && row.config_json) || null);
    }
  );

  return self;
};
File.prototype.configurationSave = function (configuration, callback) {
  var self = this;
  var db = dbGetHandle.call (self);

  db.run (sqlStatements.save_configuration,
    1,
    'default',
    JSON.stringify (configuration),
    function (err) {
      callback (err);
  });

  return self;
};
File.prototype.pscLoad = function (filename, callback) {
  var self = this;

  psc.pscImport (filename, function (err, pscMatch) {
    if (!err && pscMatch) {
      self._accessorFunctions.getMatch ().parseToNew (pscMatch, {fixNameCase: self._accessorFunctions.getConfig ().get ('match', 'nameCaseFile')}, function (err, newMatch) {
        if (!err)
          self._accessorFunctions.replaceMatch (newMatch);
        if (callback)
          callback (err, newMatch);
      });
    } else {
      pmelog.llog (pmelog.ERROR, err);

      if (callback)
        callback (err, pscMatch);
    }
  });

  return self;
};
File.prototype.pscSave = function (filename, callback) {
  var self = this;

  psc.pscExport (filename, self._accessorFunctions.getMatchdef ().getAsPlainObject ({compact: true}), self._accessorFunctions.getScores ().getAsPlainObject ({compact: true}), function (err, filename, zf) {
    if (callback)
      callback (err, filename, zf);
  });

  return self;
};
File.prototype.pscDelete = function (filename, options, callback) {
  var self = this;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  psc.pscDelete (filename, options, function (err) {
    if (callback)
      callback (err);
  });

  return self;
};
File.prototype.pscList = function (options, callback) {
  var self = this;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  psc.pscList (self._accessorFunctions.getConfig ().get ('file', 'directoryPSC'), options, function (err, matchFiles) {
    if (callback)
      callback (err, matchFiles);
  });

  return self;
};
File.prototype.pscRead = function (filename, callback) {
  var self = this;

  psc.pscImport (filename, function (err, pscMatch) {
    if (callback)
      callback (err, pscMatch);
  });

  return self;
};

File.prototype.dbLoad = function (options, callback) {
  var self = this;
  var db = dbGetHandle.call (self);

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  if (!_.isString (options.uuid) || !options.uuid.length) {
    if (callback)
      callback ('dbLoad(): options.uuid must be non-zero length string!');
  } else {
    db.get (sqlStatements.fetch_match_by_uuid, options.uuid, function (err, row) {
      if (!err && row) {
        self._accessorFunctions.getMatch ().parseToNew (JSON.parse (row.match_json), {fixNameCase: self._accessorFunctions.getConfig ().get ('match', 'nameCaseDB')}, function (pscErr, newMatch) {
          if (!pscErr)
            self._accessorFunctions.replaceMatch (newMatch);
          if (callback)
            callback (pscErr, newMatch);
        });
      } else {
        pmelog.llog (pmelog.ERROR, err);

        if (callback)
          callback (err, row);
      }
    });
  }

  return self;
};
File.prototype.dbSave = function (options, callback) {
  var self = this;
  var matchdef = self._accessorFunctions.getMatchdef ();
  var scores = self._accessorFunctions.getScores ();
  var db = dbGetHandle.call (self);
  var thisUUID = matchdef.getID ();
  var matchJSON = JSON.stringify ({
    matchdef: matchdef.getAsPlainObject ({compact: true}),
    scores: scores.getAsPlainObject ({compact: true}),
  });

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  if (options.newuuid)
    matchdef.newID ();

  db.run (sqlStatements.insert_into_matches,
    matchdef.getID (),
    matchdef.getName (),
    matchdef.getDate (),
    matchdef.getModifiedDate (), // FIXME Should be internal TS of last modification
    matchdef.getMatchType (),
    matchJSON,
    function (err) {
      self._accessorFunctions.setPendingChanges (false);
      callback (err);
  });

  matchdef.setID (thisUUID);

  return self;
};
File.prototype.dbList = function (callback) {
  var self = this;
  var db = dbGetHandle.call (self);

  db.all (sqlStatements.fetch_all_matches,
    function (err, rows) {
      if (!err) {
        _.each (rows, function (r) {
          r.match_discipline = psutils.matchTypeToName (r.match_discipline);
        });
      }

      callback (err, rows);
    }
  );

  return self;
};
File.prototype.dbDelete = function (options, callback) {
  var self = this;
  var db = dbGetHandle.call (self);

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  if (!_.isString (options.uuid) || !options.uuid.length) {
    if (callback)
      callback ('dbDelete(): options.uuid must be non-zero length string!');
  } else {
    db.run (sqlStatements.delete_match_by_uuid,
      options.uuid,
      function (err) {
        if (callback)
          callback (err);
      }
    );
  }

  return self;
};

File.prototype.ezwsLoad = function () {
  return this;
};
File.prototype.ezwsSave = function () {
  return this;
};
File.prototype.ezwsList = function () {
  return this;
};

File.prototype.ssiLoad = function (filename, callback) {
  var self = this;

  ssi.ssiImport.call (self, filename, function (err, newMatch) {
    if (!err)
      self._accessorFunctions.replaceMatch (newMatch);
    else
      pmelog.llog (pmelog.ERROR, err);
    if (callback)
      callback (err, newMatch);
  });

  return self;
};
File.prototype.ssiSave = function () {
  return this;
};
File.prototype.ssiDelete = function (filename, options, callback) {
  var self = this;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  ssi.ssiDelete (filename, options, function (err) {
    if (callback)
      callback (err);
  });

  return self;
};
File.prototype.ssiList = function (options, callback) {
  var self = this;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  ssi.ssiList.call (self, self._accessorFunctions.getConfig ().get ('file', 'directorySSI'), options, function (err, matchFiles) {
    if (callback)
      callback (err, matchFiles);
  });

  return self;
};

//
//
//
File.prototype.matchlogFetch = function (options, callback) {
  var self = this;
  var db = dbGetHandle.call (self);

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  assert (options.matchID);

  db.all (sqlStatements.fetch_score_logs,
    options.matchID,
    function (err, rows) {
      if (err)
        pmelog.llog (pmelog.ERROR, 'sqlite3 error: ' + err);
      else {
        pmelog.llog (pmelog.DEBUG, 'Fetched %s rows from score_logs', rows.length);

        _.each (rows, function (r) {
          r.sl_match_uuid  = r.sl_match_uuid.toUUIDCase ();
          r.sl_log_uuid    = r.sl_log_uuid.toUUIDCase ();
          r.sl_stage_uuid  = r.sl_stage_uuid.toUUIDCase ();
          r.sl_shooter_uid = r.sl_shooter_uid.toUIDCase ();
          r.sl_device_id   = r.sl_device_id.toUUIDCase ();
        });
      }

      callback (err, rows);
    }
  );

  return self;
};
File.prototype.matchlogMerge = function (options, callback) {
  var self = this;
  var db = dbGetHandle.call (self);
  var err = null;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  assert (options.matchID);

  db.serialize (function () {
    if (options.clear) {
      try {
        db.run (sqlStatements.drop_score_logs);
        db.run (sqlStatements.create_score_logs);
      } catch (e) {
        pmelog.llog (pmelog.ERROR, 'File.prototype.matchlogMerge(): Initializing logs failed');
        pmelog.ldirex (pmelog.ERROR, e);
        err = e;
      }
    }

    if (!err && options.sqlFile) {
      try {
        var tmpFile = tmp.fileSync ();

        fs.writeFileSync (tmpFile.name, options.sqlFile);

        db.run ('ATTACH ? AS toMerge', tmpFile.name);
        db.run ('BEGIN');
        db.run ('INSERT OR REPLACE INTO score_logs SELECT ?,* FROM toMerge.score_logs', options.matchID);
        db.run ('COMMIT');
        db.run ('DETACH toMerge');
      } catch (e) {
        pmelog.llog (pmelog.ERROR, 'File.prototype.matchlogMerge(): Merging logs failed');
        pmelog.ldirex (pmelog.ERROR, e);
        err = e;
      }
    }

    if (callback)
      callback (err);
  });

  return self;
};

//
//
//
var settingsLoad = function (sql, uuid, callback) {
  var self = this;
  var db = dbGetHandle.call (self);

  db.get (sql,
    uuid,
    function (err, row) {
      if (err)
        pmelog.llog (pmelog.ERROR, err);
      if (callback)
        callback (err, (row && row.settings_json) || null);
    }
  );

  return self;
};

var settingsSave = function (sql, uuid, settings, callback) {
  var self = this;
  var db = dbGetHandle.call (self);

  db.run (sql,
    uuid,
    settings,
    function (err) {
      callback (err);
  });

  return self;
};

File.prototype.settingsAwardsLoad = function (uuid, callback) {
  return settingsLoad.call (this, sqlStatements.load_awards_settings, uuid, callback);
};
File.prototype.settingsAwardsSave = function (uuid, settings, callback) {
  return settingsSave.call (this, sqlStatements.save_awards_settings, uuid, settings, callback);
};
File.prototype.settingsCheckinLoad = function (uuid, callback) {
  return settingsLoad.call (this, sqlStatements.load_checkin_settings, uuid, callback);
};
File.prototype.settingsCheckinSave = function (uuid, settings, callback) {
  return settingsSave.call (this, sqlStatements.save_checkin_settings, uuid, settings, callback);
};
File.prototype.settingsEnvelopesLoad = function (uuid, callback) {
  return settingsLoad.call (this, sqlStatements.load_envelopes_settings, uuid, callback);
};
File.prototype.settingsEnvelopesSave = function (uuid, settings, callback) {
  return settingsSave.call (this, sqlStatements.save_envelopes_settings, uuid, settings, callback);
};
File.prototype.settingsLabelsLoad = function (uuid, callback) {
  return settingsLoad.call (this, sqlStatements.load_labels_settings, uuid, callback);
};
File.prototype.settingsLabelsSave = function (uuid, settings, callback) {
  return settingsSave.call (this, sqlStatements.save_labels_settings, uuid, settings, callback);
};
File.prototype.settingsProjectionLoad = function (uuid, callback) {
  return settingsLoad.call (this, sqlStatements.load_projection_settings, uuid, callback);
};
File.prototype.settingsProjectionSave = function (uuid, settings, callback) {
  return settingsSave.call (this, sqlStatements.save_projection_settings, uuid, settings, callback);
};
File.prototype.settingsStatisticsLoad = function (uuid, callback) {
  return settingsLoad.call (this, sqlStatements.load_statistics_settings, uuid, callback);
};
File.prototype.settingsStatisticsSave = function (uuid, settings, callback) {
  return settingsSave.call (this, sqlStatements.save_statistics_settings, uuid, settings, callback);
};

/*  FIXME: Delete
//
//
//
File.prototype.divisionsGet = function (discipline, options, callback) {
  var self = this;
  var db = dbGetHandle.call (self);

  assert (_.isString (discipline) && discipline.length);

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  db.all (sqlStatements.get_divisions, discipline,
    function (err, rows) {
      if (err)
        pmelog.llog (pmelog.ERROR, 'sqlite3 error: ' + err);
      else

      if (callback) {
        _.each (rows, function (row) {
          row.enabled = row.enabled ? true : false;
        });
        callback (err, rows);
      }
    }
  );

  return self;
};

var divisionsSaveFiber = function (db, discipline, divisions, options, callback) {
  var insertStmt;
  var err;

  assert (_.isString (discipline) && discipline.length);
  assert (_.isArray (divisions));

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  try {
    insertStmt = db.prepare (sqlStatements.save_divisions);

    wait.forMethod (db, 'run', 'BEGIN TRANSACTION');
    wait.forMethod (db, 'run', sqlStatements.delete_divisions, discipline);

    _.each (divisions, function (d) {
      wait.forMethod (insertStmt, 'run', discipline, d.ps_name, d.pmm_name, d.enabled, d.sortorder, d.uuid);
    });

    wait.forMethod (db, 'run', 'COMMIT TRANSACTION');
  } catch (e) {
    pmelog.llog (pmelog.ERROR, e.stack);
    wait.forMethod (db, 'run', 'ROLLBACK TRANSACTION');
    err = e.message;
  }

  wait.forMethod (insertStmt, 'finalize');

  callback (err);
};

File.prototype.divisionsSave = function (discipline, divisions, options, callback) {
  wait.launchFiber (divisionsSaveFiber, dbGetHandle.call (this), discipline, divisions, options, callback);
  return this;
};
*/

//
//
//
File.prototype.matchPINsLoad = function (options, callback) {
  var self = this;
  var db = dbGetHandle.call (self);

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  db.all (sqlStatements.load_match_pins,
    function (err, rows) {
      if (err)
        pmelog.llog (pmelog.ERROR, 'sqlite3 error: ' + err);
      else

      if (callback)
        callback (err, rows);
    }
  );

  return self;
};

File.prototype.matchPINsSave = function (options, callback) {
  var self = this;
  var db = dbGetHandle.call (self);

  assert (options);
  assert (options.pin);
  assert (options.match_type);
  assert (options.match_type_name);
  assert (options.match_name);

  db.run (sqlStatements.save_match_pin,
    options.pin,
    options.match_type,
    options.match_type_name,
    options.match_name,
    function (err) {
      if (callback)
        callback (err);
  });

  return self;
};

var classificationsSaveFiber = function (db, discipline, records, last_update, deleteExisting, callback) {
  var err;
  var dirId;
  var total = 0;
  var insertStmt;

  try {
    insertStmt = db.prepare (sqlStatements.insert_classifications [discipline]);

    wait.forMethod (db, 'run', 'PRAGMA synchronous=OFF');
    wait.forMethod (db, 'run', 'BEGIN TRANSACTION');

    if ((dirId = wait.forMethod (db, 'get', sqlStatements.get_classifications_most_recent, discipline, last_update)))
      dirId = dirId.id;
    else {
      wait.forMethod (db, 'run', sqlStatements.add_classifications_directory, discipline, last_update);
      dirId = wait.forMethod (db, 'get', 'SELECT LAST_INSERT_ROWID() AS LIRI');
      dirId = dirId.LIRI;
    }

    if (deleteExisting)
      wait.forMethod (db, 'run', sqlStatements.delete_classifications [discipline], dirId);

    _.each (records, function (record) {
      record.$dir_id = dirId;
      wait.forMethod (insertStmt, 'run', record);
    });

    wait.forMethod (db, 'run', 'COMMIT TRANSACTION');

    total = wait.forMethod (db, 'get', sqlStatements.count_classifications [discipline], dirId);
    total = total.COUNT;
  } catch (e) {
    pmelog.llog (pmelog.ERROR, e.stack);
    wait.forMethod (db, 'run', 'ROLLBACK TRANSACTION');
    err = e.message;
  }

  wait.forMethod (db, 'run', 'PRAGMA synchronous=ON');
  wait.forMethod (insertStmt, 'finalize');

  callback (err, total);
};

File.prototype.classificationsSaveSC = function (records, last_update, callback) {
  wait.launchFiber (classificationsSaveFiber, dbGetHandle.call (this), 'sc', records, last_update, true, callback);
  return this;
};

File.prototype.classificationsSaveUSPSA = function (records, last_update, callback) {
  wait.launchFiber (classificationsSaveFiber, dbGetHandle.call (this), 'uspsa', records, last_update, true, callback);
  return this;
};

File.prototype.classificationsAppend = function (discipline, records, callback) {
  var row;
  var db = dbGetHandle.call (this);

  try {
    if ((row = wait.forMethod (db, 'get', 'SELECT last_updated from classifications_directory WHERE discipline=? ORDER BY id DESC LIMIT 1', discipline))) {
      wait.launchFiber (classificationsSaveFiber, db, discipline, records, row.last_updated, false, callback);
    } else
      callback ('Can\'t find last_update for uspsa');
  } catch (e) {
    pmelog.llog (pmelog.ERROR, e.stack);
    callback (e.message);
  }

  return this;
};

var classificationsAvailableFiber = function (db, discipline, callback) {
  var err;
  var records;

  try {
    records = wait.forMethod (db, 'all', 'SELECT last_updated from classifications_directory WHERE discipline=? ORDER BY last_updated DESC', discipline);
  } catch (e) {
    pmelog.llog (pmelog.ERROR, e.stack);
    err = e.message;
  }

  callback (err, records);
};

File.prototype.classificationsAvailableSC = function (callback) {
  wait.launchFiber (classificationsAvailableFiber, dbGetHandle.call (this), 'sc', callback);
  return this;
};

File.prototype.classificationsAvailableUSPSA = function (callback) {
  wait.launchFiber (classificationsAvailableFiber, dbGetHandle.call (this), 'uspsa', callback);
  return this;
};

var classificationsLatestFiber = function (db, discipline, callback) {
  var err;
  var dirId;
  var records;

  try {
    if ((dirId = wait.forMethod (db, 'get', 'SELECT id from classifications_directory WHERE discipline=? ORDER BY id DESC LIMIT 1', discipline)))
      records = wait.forMethod (db, 'all', sqlStatements.latest_classifications [discipline], dirId.id);
  } catch (e) {
    pmelog.llog (pmelog.ERROR, e.stack);
    err = e.message;
  }

  callback (err, records);
};

File.prototype.classificationsLatest = function (discipline, callback) {
  wait.launchFiber (classificationsLatestFiber, dbGetHandle.call (this), discipline, callback);
  return this;
};

File.prototype.classificationsDirectory = function (options, callback) {
  var self = this;
  var db = dbGetHandle.call (self);

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  db.all (sqlStatements.get_classifications_directory,
    function (err, rows) {
      if (err)
        pmelog.llog (pmelog.ERROR, 'sqlite3 error: ' + err);
      else

      if (callback)
        callback (err, rows);
    }
  );

  return self;
};

//
//
//
var uspsaRoListSaveFiber = function (db, records, callback) {
  var err;
  var total = 0;
  var insertStmt;

  try {
    insertStmt = db.prepare (sqlStatements.insert_uspsa_ro_list);

    wait.forMethod (db, 'run', 'PRAGMA synchronous=OFF');
    wait.forMethod (db, 'run', 'BEGIN TRANSACTION');
    wait.forMethod (db, 'run', sqlStatements.delete_uspsa_ro_list);

    _.each (records, function (record) {
      wait.forMethod (insertStmt, 'run', record);
    });

    wait.forMethod (db, 'run', 'COMMIT TRANSACTION');

    total = wait.forMethod (db, 'get', sqlStatements.count_uspsa_ro_list);
    total = total.COUNT;
  } catch (e) {
    pmelog.llog (pmelog.ERROR, e.stack);
    wait.forMethod (db, 'run', 'ROLLBACK TRANSACTION');
    err = e.message;
  }

  wait.forMethod (db, 'run', 'PRAGMA synchronous=ON');
  wait.forMethod (insertStmt, 'finalize');

  callback (err, total);
};

File.prototype.uspsaRoListSave = function (records, callback) {
  wait.launchFiber (uspsaRoListSaveFiber, dbGetHandle.call (this), records, callback);
  return this;
};

var uspsaRoListGetCountFiber = function (db, callback) {
  var err;
  var total;

  try {
    total = wait.forMethod (db, 'get', sqlStatements.count_uspsa_ro_list);
    total = total.COUNT;
  } catch (e) {
    pmelog.llog (pmelog.ERROR, e.stack);
    err = e.message;
  }

  callback (err, total);
};

File.prototype.uspsaRoListGetCount = function (callback) {
  wait.launchFiber (uspsaRoListGetCountFiber, dbGetHandle.call (this), callback);
  return this;
};

var uspsaRoListGetRecordsFiber = function (db, callback) {
  var err;
  var records;

  try {
    records = wait.forMethod (db, 'all', sqlStatements.get_uspsa_ro_list);
  } catch (e) {
    pmelog.llog (pmelog.ERROR, e.stack);
    err = e.message;
  }

  callback (err, records);
};

File.prototype.uspsaRoListGetRecords = function (callback) {
  wait.launchFiber (uspsaRoListGetRecordsFiber, dbGetHandle.call (this), callback);
  return this;
};

//
//
//
var jsonSaveFiber = function (db, key, json, callback) {
  wait.forMethod (db, 'run', sqlStatements.save_json,
    key,
    json,
    function (err) {
      if (err)
        pmelog.llog (pmelog.DEBUG, 'jsonSave err=%s', err);
      if (callback)
        callback (err);
  });
};

File.prototype.jsonSave = function (key, json, callback) {
  callback = maybeCallback (arguments [arguments.length - 1]);
  wait.launchFiber (jsonSaveFiber, dbGetHandle.call (this), key, JSON.stringify (json), callback);
  return this;
};

var jsonGetFiber = function (db, key, options, callback) {
  var err;
  var json;

  try {
    if ((json = wait.forMethod (db, 'get', sqlStatements.get_json, key)))
      json = JSON.parse (json.json);
  } catch (e) {
    if (!options.quiet)
      pmelog.llog (pmelog.ERROR, e.stack);
    err = e.message;
  }

  if (callback)
    callback (err, json);
};

File.prototype.jsonGet = function (key, options, callback) {
  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  wait.launchFiber (jsonGetFiber, dbGetHandle.call (this), key, options, callback);
  return this;
};

var jsonDeleteFiber = function (db, key, callback) {
  var err;

  try {
    wait.forMethod (db, 'run', sqlStatements.delete_json, key);
  } catch (e) {
    pmelog.llog (pmelog.ERROR, e.stack);
    err = e.message;
  }

  if (callback)
    callback (err);
};

File.prototype.jsonDelete = function (key, callback) {
  wait.launchFiber (jsonDeleteFiber, dbGetHandle.call (this), key, callback);
  return this;
};

//
//
//
var debugSaveFiber = function (db, data, callback) {
  wait.forMethod (db, 'run', sqlStatements.save_debug,
    data,
    function (err) {
      if (err)
        pmelog.llog (pmelog.DEBUG, 'debugSave err=%s', err);
      if (callback)
        callback (err);
  });
};

File.prototype.debugSave = function (data, callback) {
  callback = maybeCallback (arguments [arguments.length - 1]);
  wait.launchFiber (debugSaveFiber, dbGetHandle.call (this), JSON.stringify (data), callback);
  return this;
};

var debugGetFiber = function (db, id, options, callback) {
  var err;
  var record;

  try {
    record = wait.forMethod (db, 'get', sqlStatements.get_debug, id);
  } catch (e) {
    if (!options.quiet)
      pmelog.llog (pmelog.ERROR, e.stack);
    err = e.message;
  }

  if (callback)
    callback (err, record);
};

File.prototype.debugGet = function (key, options, callback) {
  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  wait.launchFiber (debugGetFiber, dbGetHandle.call (this), key, options, callback);
  return this;
};

var debugDeleteFiber = function (db, key, callback) {
  var err;

  try {
    wait.forMethod (db, 'run', sqlStatements.delete_debug, key);
  } catch (e) {
    pmelog.llog (pmelog.ERROR, e.stack);
    err = e.message;
  }

  if (callback)
    callback (err);
};

File.prototype.debugDelete = function (key, callback) {
  wait.launchFiber (debugDeleteFiber, dbGetHandle.call (this), key, callback);
  return this;
};

//
//
//
File.prototype.logfileSave = function (loglevel, logentry, callback) {
  var db = dbGetHandle.call (this);

  db.run (sqlStatements.save_logfile,
    loglevel,
    logentry,
    function (err) {
      if (callback)
        callback (err);
  });

  return this;
};

var logfileGetFiber = function (db, options, callback) {
  try {
    db.all (options.sql,
      function (err, rows) {
        if (err)
          pmelog.llog (pmelog.ERROR, 'sqlite3 error: ' + err);
        else
          pmelog.llog (pmelog.DEBUG, 'Fetched %s rows from logfile', rows.length);

        callback (err, rows);
      }
    );
  } catch (e) {
    if (!options.quiet)
      pmelog.llog (pmelog.ERROR, e.stack);
    if (callback)
      callback (e.message);
  }
};

File.prototype.logfileGet = function (options, callback) {
  var sql = [];

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  sql.push ('SELECT id, datetime, loglevel, logentry');
  sql.push ('FROM logfile');

  if (options.loglevel || options.range)
    sql.push ('WHERE');

  if (options.loglevel)
  {
    sql.push ('(');

    if (_.isArray (options.loglevel)) {
      _.each (options.loglevel, function (level) {
        sql.push (sprintf ('loglevel=%s', level));
        sql.push ('OR');
      });

      sql.pop ();
    } else
      sql.push (sprintf ('loglevel=%s'+ options.loglevel));

    sql.push (')');
  }

  if (options.range) {
    if (options.loglevel)
      sql.push ('AND');

    sql.push ('(');

    if (options.range.from)
      sql.push (sprintf ('datetime >= "%s"', options.range.from));
    if (options.range.to) {
      if (options.range.from)
        sql.push ('AND');

      sql.push (sprintf ('datetime <= "%s"', options.range.to));
    }

    sql.push (')');
  }

  if (options.order)
    sql.push (sprintf ('ORDER BY id %s', options.order));

  if (options.limit)
    sql.push (sprintf ('LIMIT %s', options.last));

  options.sql = sql.join (' ');

  wait.launchFiber (logfileGetFiber, dbGetHandle.call (this), options, callback);
  return this;
};

//
//
//
File.prototype.masterUpdate = function (options, callback) {
  var self = this;
  var db;
  var withEmail = [];
  var withPhone = [];
  var losers = [];

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  if (!self._accessorFunctions.getConfig ().get ('match', 'updateAutofill')) {
    if (callback)
      callback (null);
    return self;
  }

  _.each (self._accessorFunctions.getMatchdef ().getShooters (), function (s) {
    if (s.sh_eml.length)
      withEmail.push (s);
    else if (s.sh_ph.length)
      withPhone.push (s);
    else
      losers.push (s);
  });

  db = dbGetHandle.call (self);

  pmelog.llog (pmelog.DEBUG, '%s competitors with email addresses', withEmail.length);
  pmelog.llog (pmelog.DEBUG, '%s competitors with no email address, but with phone number', withPhone.length);
  pmelog.llog (pmelog.DEBUG, '%s competitors with no email address or phone number%s', losers.length, losers.length ? ' (losers!)' : '');

  //
  //  If the email doesn't exist, then INSERT
  //  If the email exists, and they have one record, and the first and last name match, UPDATE
  //  If the email matches, and they have multiple records, see if a first and last name match, if so, UPDATE, otherwise ignore (sponsored competitors using sponsor email)
  //
  // db.on ('trace', function (s) {
  //   console.log (s);
  // });

  var selectStmt = db.prepare (
    'SELECT * ' +
      'FROM competitors ' +
     'WHERE sh_eml=?'
  );
  var insertStmt = db.prepare (
    'INSERT INTO competitors ' +
    '(sh_fn, sh_ln, sh_addr1, sh_addr2, sh_city, sh_st, sh_zipcode, sh_eml, sh_ph, sh_age, sh_gen, sh_mil, sh_law, sh_frn, mod_pr, sh_id) ' +
    'VALUES ' +
    '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
  );
  var updateStmt = db.prepare (
    'UPDATE competitors ' +
    'SET ' +
    'sh_fn=?,sh_ln=?,sh_addr1=?,sh_addr2=?,sh_city=?,sh_st=?,sh_zipcode=?,sh_ph=?,sh_age=?,sh_gen=?,sh_mil=?,sh_law=?,sh_frn=?,mod_pr=?,sh_id=? ' +
    'WHERE sh_eml=?'
  );

  async.each (withEmail, function (s, asyncCallback) {
    selectStmt.all (s.sh_eml,
      function (err, rows) {
        if (err)
          pmelog.llog (pmelog.ERROR, err);
        else if (rows.length === 0) {
          pmelog.llog (pmelog.DEBUG, '\'%s %s\' not in the database, adding... (%s)',s.sh_fn, s.sh_ln, s.sh_eml);
          insertStmt.run (s.sh_fn, s.sh_ln, s.sh_addr1, s.sh_addr2, s.sh_city, s.sh_st, s.sh_zipcode, s.sh_eml, s.sh_ph, s.sh_age, s.sh_gen, s.sh_mil, s.sh_law, s.sh_frn, s.mod_pr, s.sh_id, function (err) {
            if (err) {
              pmelog.llog (pmelog.ERROR, err);
              asyncCallback (err);
            }
          });
        } else if (rows.length !== 1) {
          pmelog.llog (pmelog.WARN, 'Eeek! Email address \'%s\' has multiple hits', s.sh_eml);
          _.each (rows, function (r) {
            pmelog.llog (pmelog.WARN, '  \'%s %s\'', r.sh_fn, r.sh_ln);
          });
        } else if ((s.sh_fn === rows [0].sh_fn) && (s.sh_ln === rows [0].sh_ln)) {
          if (s.mod_pr > rows [0].mod_pr) {
            pmelog.llog (pmelog.INFO, '\'%s %s\' in match is more current, updating database... (%s)', s.sh_fn, s.sh_ln, s.sh_eml);
            updateStmt.run (s.sh_fn, s.sh_ln, s.sh_addr1, s.sh_addr2, s.sh_city, s.sh_st, s.sh_zipcode, s.sh_ph, s.sh_age, s.sh_gen, s.sh_mil, s.sh_law, s.sh_frn, s.mod_pr, s.sh_id,
              s.sh_eml,
              function (err) {
                if (err) {
                  pmelog.llog (pmelog.ERROR, err);
                  asyncCallback (err);
                }
              });
          } else
            pmelog.llog (pmelog.INFO, '\'%s %s\' entry in database is most recent... (%s)', s.sh_fn, s.sh_ln, s.sh_eml);
        } else
          pmelog.llog (pmelog.WARN, 'Eeek! Names aren\'t the same. Match=\'%s %s\', database=\'%s %s\'', s.sh_fn, s.sh_ln, rows [0].sh_fn, rows [0].sh_ln);
        asyncCallback ();
      });
  }, function (err) {
    if (err)
      pmelog.llog (pmelog.ERROR, err);
    else {
      selectStmt.finalize ();
      insertStmt.finalize ();
      updateStmt.finalize ();

      if (callback)
        callback (null);
    }
  });

  return self;
};
File.prototype.masterSearch = function (options, callback) {
  var self = this;
  var db = dbGetHandle.call (self);

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  if (options.type !== 'startswith')
    options.match = '%' + options.match;

  db.all ('SELECT id,sh_fn,sh_ln,sh_id ' +
            'FROM competitors ' +
           'WHERE ' + (options.field || 'sh_fn') + ' ' +
            'LIKE ? ' +
           'LIMIT ' + (options.limit || 10),
          options.match + '%',
          function (err, rows) {
            if (err)
              pmelog.llog (pmelog.ERROR, err);
            callback (err, rows);
          }
  );

  return self;
};
File.prototype.masterLongestCombination = function (options, callback) {
  var self = this;
  var db = dbGetHandle.call (self);

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  db.get ('SELECT MAX(LENGTH(sh_fn)) + MAX(LENGTH(sh_ln)) + MAX(LENGTH(sh_id)) ' +
              'AS maxwidth ' +
            'FROM competitors',
          function (err, row) {
            if (err)
              pmelog.llog (pmelog.ERROR, err);
            callback (err, row.maxwidth);
          }
  );

  return self;
};

//
//
//
exports.File = File;
