Thinking...

  Should the base classes (stages, etc) provide all the methods for items like no-shoots,
  targets, etc and the match types themselves define the variables. That way, we don''t 
  need to duplicate code everywhere for noshoots, but the variables won''t be present in
  the JSON. This is better than deleting the unused variables, because if we add a new
  one to the base class, we''d have to be sure to delete in the existing match types.

Todo:
  Flag IP address changes between polls (how do we handle moving devices?)
  Add stats information for detecting score changes
  NodeJS not responding to device scan? (OK with Bonjour)
  Need a method to display scores for deleted/DQed shooters
  Need a report to show all missing scores, DNF''ed shooters, DQ''ed shooters, all shooters with penalties
  All match data should automatically be stored in a SQL database names by the UUID of the match (complete match in a single file)
  History for USPSA needs to handle multiple strings (only handles single string currently)
  Add ability to generate QR codes and email certificates?
  Export registration, stages and scores to EZWS
  Import EZWS registration, stages and scores
  Can we allow/disallow certain devices from syncing with us (like those not in a known list)
  Apply print formatting for printing scores (or separate verification report, perhaps)
  mDNS broken under Linux (avahi or NodeJS module?)
  Time fields in history need to show all string times
  Time fields in history need to be formatted to x.yy
  Current pop-up of complete/missing competitors (manage progress screen?)
  Time on/time off/total time on stage per squad
  Shortest/longest/average time on stage by squad
  Detailed competitor info by clicking name on pop-up (useful?)
  Scores for competitor by clicking name on pop-up (useful?)
  Match notes (''scratchpad'') facility
  Edit/view should either be broken up, or a write-protect feature
  Kiosk mode should never show menu (don''t let kiosk users out of kiosk)
  Save/reset competitor editing screen state
  Add user login facility to PMM, perhaps with access control to various pages or functions
  Create a session database where all match/shooter/stage/score/etc changes are logged
  Document routes and broadcasts
  Match progress needs some way to mark missing shooters as ignorable
  Scanning PMM with Practiscore Match Exporter crashes PMM (verify still a problem)
  Clicking zero-time competitors on match progress brings up both windows (verify still a problem)
  Switch to server-side validation (need way to display tooltip errors in pop-up editor)
  Add report that looks for duplicate times and/or hits between competitors
  Convert squad number in grid editor to a drop-down/text box control? Or double-click for window?
  Add ''Obliterate this competitor'' to editor context menu (active only if there are no scores)
  Fix context menu to close when cursor is moved off currently selected cell (may not be possible)
  Configuration option pages need ''Defaults'' button
  Fix disabling Bonjour options if Bonjour not installed
  Provide log pop-up on devices window to show polling history
  Add display of time since last auto-poll, time until next auto-poll (popup? tooltip?)
  Add notification somewhere when new shooters are added when polling
  Add pop-up warning to labels, awards if match_updated message received
  Add option to awards report for current format, and a compressed format
  Need an awards label format, for sticking on awards envelopes
  Ability to queue award winners to print list, for mailing awards?
  Add MCCR report generation
  Steel Challenge needs to flag DNF shooters (what''s this mean?)
  Produce competitor report that ssi2ezws creates
  Monitor ./matches directory for changes (https://github.com/paulmillr/chokidar)
  Make filter, sort, hide DQ, and hide deleted persistent settings
  Bulk operations (global search/replace)
  Once SCSA numbers are fully converted to USPSA numbers, handle them like USPSA numbers in lib/file.js, routes/io.js
  When updating classifications, throw a warning if classifications might be out of date
  Need method to find shooters with no scores, quickly mark as deleted
  When updating USPSA classifications, need to update master names database
  Fix tooltips for sync codes on devices page
  Suppress warning about state from Android devices (ignore if changing from set to blank)
  USPSA awards report needs option to suppress unclassified shooters
  Need awards report like projection, but with actual payout amounts
  Lookups variable in lib/matchtypes should be loaded from database
  Check why match progress doesn''t work on iPad
  Add checkbox to Reports->Squad RO to allow CRO/RO differentiation
  Add Jim McBurnette''s status screen idea as splash or status page (see ./ideas directory)
  Fix SC classification updates to work like USPSA
  When editing competitors, disabling filters should clear any filters
  Either when editing competitors, or in check-in page, sh_sqd is getting set to null
  Is there an issue with check-in where it''s forgetting about sh_here at times?
  Check-in page needs options tab for show all/hide deleted/hide already checked-in
  Shooter and stage fixups are called twice, once when adding the shooter or stage, then a final match fixup
  Clearing print queue after printing doesn''t update competitor editor
  Why does SC editor have line 1376 commented out?
  Need to handle USPSA number changing from renewable to life membership
  Add competitor''s state & area to classifications_uspsa table, update on state update
  Need to add saving Edit/View->Competitors settings to settings file (per match or global?)
  File->Export->EzWinScore->Combined should warn about non-sequential and -1 shooter numbers
  Should File->Export->EzWinScore->Combined offer options for .zip and CSV/TSV?
  Need method to detect duplicate entries (same name, same USPSA #?)
  Match progress should flag DNF w/ scores
  Create a screen that reports all exceptions (DNF w/ scores, DQs, etc?)
  Add support for printing envelops for staff/winners
  Clicking on competitor in stage review should show all competitor stage details
  Add ability to hide selected squads in match completion matrix
  Don''t throw error if IP address is missing in device list (ignore?)
  Need method to suspend and resume auto-polling
  Can edit competitors and other screens be fixed not to repaint when new data comes in?
  Add high-level network timeout to configuration options
  Need option in awards report to go past division/class/category cutoff
  Awards report needs option to suppress title page, configuration setting
  Awards report needs option to export as Excel file
  Figure out why hideondisconnect not working on summary box, dropdowns in Manage->Checkin
  Update classifications should display date of file after ''Get''
  Update classifications should warn if match date later than classifications date + 30 days

Done:
  Push log into SQLite database (no menu option to display it yet)
  Steel Challenge needs to handle deleted stages
  Add option to clear print queue after printing labels
  Need squad report for stage ROs (like EZWS''s)
  Fix match progress page not throw error on incomplete score (display as warning?)
  Add ability to scrape SCSA classifications?
  Add grabbing RO/CRO list from uspsa.org to highlight RO/CRO''s in squad list
  Fix device sort so that sort is preserved when grid is refreshed
  Add checks for unclassified in division, USPSA/SCSA numbers not in classification update, expired memberships
  Make sure that PEN classification requests don''t generate a request to the web site
  Classification check needs to handle bad USPSA numbers, like B74786
  Add context menu print option to classifications view window (added print button, instead)
  Add interlock so a classification update can''t be started if one is already running
  Add ability to hide deleted and DQ''ed shooters in competitor editing grid
  A device that polls the server should automatically be entered into the device list
  Sync should clear all autopoll enabled devices (may not be same match)
  Loading message while loading database
  Confirmation Popup when deleting database
  Fix File->File->Save to disable save button when bad characters in name field
  Configuration option to enable/disable auto-opening of menus
  Add field validation when using inline editing for competitors
  File menu needs to be updated
  Dynamically size rows on screen, add 25 & 50 rows
  See if mouse scrolls can reset match progress time-out timer
  Show device sync code on sync screen (as tooltip when hovering over IP address)
  Add squad display pop-up window to competitor editing pop-up window (double-click in squad number field)
  Fix auto-fill to not use localhost:3000, but address of server
  Fix networking and other configuration options to go into effect without restarting PMM

Todo''s, with priority (LOWER number more important (for sorting))
  [ ] 2 - Make sure times, hits and penalities kept when merging scores and DNF is set
  [ ] 3 - Command line option to convert all matches in ./matches to database
  [x] 3 - Edit competitor info
  [ ] 3 - Edit stages
  [ ] 3 - Enter/edit scores
  [ ] 3 - Implement shooter database
  [ ] 4 - Import from EZWS database (Windows only, works, needs UI)
  [ ] 4 - Import from Shoot''n-Score-It (works, needs UI)
  [ ] 4 - Log to browser visible log / database
  [ ] 4 - Printable reports in various formats
  [ ] 5 - Automatically log changes in psClasses.js (?)
  [ ] 5 - Communicate client errors back to server for logging
  [ ] 5 - Stage/squad time statistics
  [ ] 5 - Update modification times in psClasses.js
  [ ] 6 - Add parameter checking to lib/psClasses.js
  [ ] 6 - Add USPSA classification updates
  [ ] 6 - Click on stage or squad number to hide in progress report (how to unhide? Click ''Squad'' or ''Stage'' text?)
  [ ] 6 - EzWinScore exports
  [ ] 6 - Highlight match progress cell with most current score in light blue?
  [ ] 6 - Last modified in database or file load should check for score changes
  [ ] 6 - Package public/javascripts/libs into package.js
  [ ] 6 - Switchable table axis on match progress report
  [ ] 7 - Find stage competitor should be on
  [ ] 8 - Add HF/percent checking EZWS vs real math
  [ ] 8 - Move scoring device lists to database, allow groups of devices
  [ ] 9 - Logging of changes for squad change, user editing, etc
  [ ] 9 - See what happens when bons[], pens[], and any empty entities are missing from match data
  [ ] 9 - Support for static and dynamic device addresses
  [x] 0 - History needs ability to display changes at the target level
  [x] 0 - Add easing (?) or flare to show update stage or squad
  [x] 0 - Auto-save match after each sync option
  [x] 0 - Error handling for unsupported match types
  [x] 0 - Finish match_type pathing
  [x] 0 - Fix request:match to have options specifying what data (registration, scores, etc) is needed
  [x] 0 - Support different log levels (err, info, debug, warn, normal)
  [x] 0 - Verify sh_num isn''t used as an actual index where it shouldn''t be.
  [x] 0 - Right-click context menu when editing competitors for assigning EZWS number, name case fixing, etc
  [x] 0 - Add support for addr1, addr2, city, zip

Config options:
  Set logging level
  Enable/disable flare
  Path to export directory
  Path to import directory
  Add setting to indicate if device follows stage or squad

Possible ideas:
  Add DHCP support (can we detect other DHCP servers?)
  Add NTP support (PME offers time setting, pretend we''re if no internet?)
  Add DNS support (Could we fake offering mDNS for NOOKs?)
  Allow PME to be email/SMS gateway for PractiScore

Notes:
  A match created with PS has the sh_num set to -1. This is set when the match
  is exported to EZWS (Sync->Export Match Registration). Once sh_num is set to
  a value other than -1, it will not change. Basically, sh_num should not be
  used internally. When EZWS registration export is added to PME, it will
  re-order sh_num if set to -1, and otherwise leave it alone.

  The Android version of PS will rearrange the internal array of shooters into
  the display order if a change is made to a competitor.

  Under iOS and Android, stages are physically deleted, always (very
  dangerous). Under Android, targets are physically deleted if there are no
  scores associated with the stage. Under iOS, targets are physically deleted
  while in match creation mode, and switch to flagging once in scoring mode
  (caused by adding a score or a sync).

Printing
  Print server listens on port 49613. Options should include routing print jobs
  based on source IP (device staying on stage), or based on the stage
  name/number (device follows squad). Since the Android version includes the
  stage number in front of the stage name, that can be parsed out to avoid
  mapping based on stage name.

  Stage printers (BeagleBone Blacks with practiprint_cgi running under apache)
  advertise themselves with mDNS (Avahi/Bonjour/zeroconf). This requires
  Windows machines to have the Apple Bonjour stack installed to work, and Linux
  machines to have Avahi installed, but works out of the box with OSX.

  The idea is that PME has a mDNS browser that watches for practiprint devices
  to come up, and when it does, it captures their IP addresses. When a print
  job comes through, if that stage device is in the table, PME will issue an
  http request to the stage printer, just as if the NOOK had done it directly
  (basically, PME is a proxy or router).
