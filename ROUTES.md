Clients should only need to listen at the level that interests them. For
instance, the competitor editor don''t care abou bonus or penalties changing.
It does care about categories, classes, and divisions, since those are what can
be assigned to competitors.  Likewise, the division editor doesn''t care about
anything except the divisions changing.

This means that when ''competitors_updated'' message is sent, indicating that
one or more competitors have been modified, then ''matchdef_updated'' and
''match_updated'' need to be sent to let high-level listeners know.

Conversely, when ''match_update'' is sent, the complete tree below need to be
sent so that a client listening only for ''competitors_updated'' knows to pull
the new list of competitors.

For messages that include data, when traversing from the top down, the data 
won''t be available. Clients should test for a null dataset and treat that as
a request to re-request the complete record set (e.g., competitor_updated with
no data should cause the client to then request all competitors, the matchdef, 
or the complete match, as needed).

Messages are not sent as individual messages, but as an object that contains
all these fields, and flags set if they''re in use. This allows the client (say
the competitor editor) to decide that if matchdef is set but competitors_updated
is not, that it can safely ignore this message.

Message heirarchy:
  match_updated
    matchdef_updated
      bonuses_updated
      categories_updated
      classes_updated
      competitors_updated
        competitor_added {data}
        competitor_updated {data}
      divisions_updated
      penalties_updated
      stages_updated
        stage_added {data}
        stage_updated {data}
    matchscores_updated
      stagescores_updated
        score_updated {data}

Messages from client(s) to server:
  classifications:get:sc
  classifications:get:uspsa
  classifications:available:sc
  classifications:available:uspsa

  config:defaults
  config:request
  config:validate
  config:save
  config:validate:url

  control:hello
  control:play:fast
  control:play:start
  control:play:stop
  control:reload

  device:autopoll
  device:autopoll:none
  device:clear
  device:hide
  device:info
  device:poll
  device:pollall
  device:scan
  device:unhideall

  categories:add
  categories:delete
  categories:get
  categories:modify
  categories:move

  classes:add
  classes:delete
  classes:get
  classes:modify
  classes:move

  divisions:add
  divisions:delete
  divisions:get
  divisions:modify
  divisions:move

  download:cpc:match
  download:cpc:pins
  download:ssu:club
  download:ssu:credentials
  download:ssu:match
  download:ssu:matchid

  errorlog:critical
  errorlog:debug
  errorlog:error
  errorlog:info
  errorlog:normal
  errorlog:warn
  errorlog:verbose

  file:db:delete
  file:db:load
  file:db:save
  file:db:savenew
  file:db:list
  file:db:logs
  file:ezws:combined:export
  file:ezws:db:export
  file:ezws:db:import
  file:ezws:db:list
  file:ezws:registration:import
  file:ezws:registration:list
  file:ezws:results:export
  file:ezws:scores:export
  file:ezws:scores:import
  file:ezws:scores:list
  file:ezws:squads:export
  file:ezws:squads:import
  file:ezws:squads:list
  file:ezws:stages:export
  file:ezws:stages:import
  file:ezws:stages:list
  file:psc:combine
  file:psc:delete
  file:psc:list
  file:psc:load
  file:psc:merge
  file:psc:save
  file:ssi:delete
  file:ssi:list
  file:ssi:load

  kiosk:activity
  kiosk:idle
  kiosk:image
  kiosk:page
  kiosk:scores
  kiosk:start

  log:dir
  log:getlevel
  log:inspect
  log:log
  log:setlevel

  match:create
  match:get
  match:name
  match:request
  match:type
  match:update

  penalties:add
  penalties:delete
  penalties:get
  penalties:modify
  penalties:move

  practiprint:start
  practiprint:stop

  rolist:get:uspsa:count
  rolist:get:uspsa:records
  rolist:update:uspsa

  scores:present

  settings:awards:load
  settings:awards:save
  settings:labels:load
  settings:labels:save
  settings:projection:load
  settings:projection:save

  shooter:add
  shooter:get
  shooter:new
  shooter:save
  shooter:print:add
  shooter:print:clear
  shooter:print:inqueue
  shooter:print:remove
  shooter:ezws:resequence
  shooter:ezws:reset
  shooter:ezws:set
  shooter:ezws:status
  shooter:squad
  shooter:validate
  shooter:namecase:all
  shooter:namecase:single
  shooter:depersonalize:all
  shooter:depersonalize:single
  shooter:maxnameslength
  shooter:classifications:update

  stage:add
  stage:new
  stage:save
  stage:validate

  sync:logs
  sync:match

  system:supportedmatchtypes

  uspsa:activity:generate
  uspsa:activity:upload
  uspsa:activity:view
  uspsa:scores:generate
  uspsa:scores:upload
  uspsa:scores:view

  utils:interfaces
  utils:jcheck
  utils:jcw:create
  utils:jcw:import
  utils:jcw:mailing
  utils:memory
  utils:showapp
  Message from server to client(s):
  Broadcasted (all clients):
    device_info
      One or more device''s information has changed (autopoll, hidden, clear, etc) (also limited broadcast)
    device_offline {device_id}
      A Bonjour-capable device has gone offline
    device_online {device_id}
      A Bonjour-capable device has come online
    device_scan_status
      Status of devices being scanned
    device_sync_status {data}
      Status messages during device sync process
    device_synced {device_id}
      A Bonjour-capable device match has synced after coming online (but not merged into match)

    logs_updated
      Log files have been updated

    match_updated
      Match data has changed (match, shooters, stages, scores, etc)

  Limited broadcast (all except origin client):
    bonuses_updated -> matchdef_updated -> match_updated (NOT USED)
      The match bonuses have changed

    categories_updated -> matchdef_updated -> match_updated
      Match categories have changed (lady, military, etc)

    classes_updated -> matchdef_updated -> match_updated
      Match classes have changed (A, B, GM, etc)

    competitor_added {competitor} -> competitors_updated -> matchdef_updated -> match_updated
      A competitor has been added to the match
    competitor_updated {competitor} -> competitors_updated -> matchdef_updated -> match_updated
      A competitor has been modified
    competitors_updated -> matchdef_updated -> match_updated
      One or more competitors have been added or modified (no hard deleting yet)

    db_directory_changed
      Database containing matches has had a match added, replaced, or deleted

    device_info
      One or more device''s information has changed (autopoll, hidden, clear, etc)

    divisions_updated -> matchdef_updated -> match_updated
      Match divisions have changed (Open, Practical, Limited, etc)

    match_updated
      Match data has changed (match, shooters, stages, scores, etc)

    matchdef_updated
      Match data (not including scores) has changed (match, shooters, stages, etc)

    penalties_updated -> matchdef_updated -> match_updated (NOT USED)
      The match penalties have changed

    psc_files_changed
      Directory containing match files has had a match added, replaced, or deleted

    reload
      Indicates client should reload the base URL, in case match type changed.
      Will occur after file:db_load, file:psc_load, file:ssi_load, device:sync

    ssi_files_changed
      Directory containing Shoot''n-Score-It match files has had a match added, replaced, or deleted

    stage_added -> stages_updated -> matchdef_updated -> match_updated
      A stage has been added to the match
    stage_updated -> stages_updated -> matchdef_updated -> match_updated
      A stage in the match has been modified

----
  Emitted:
    config_data
    config_saved

    control_hello
    control_play_busy
    control_play_complete
    control_play_started
    control_reload_busy
    control_reload_complete

    database_deleted
    database_list
    database_list_psc
    database_list_ssi
    database_loaded
    database_merged
    database_saved
    database_savedfile
    database_savednew

    edit_competitor_err
    edit_squad_err

    log_getlevel
    logs_loaded

    match_data
    match_name
    match_update_err
    match_updated_ok
    match_create_response

    memory

    scan_inprogress

    system_supportedmatchtypes

    utils_jcheck_results
    utils_jcheck_status

    edit_squad_ok

Internal messages (not sent to web clients)
  device_connected
  device_disconnected
  dir
  log
  logclose
  warn
