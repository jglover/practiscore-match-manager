Definitions:
  'public interfaces' - methods
  'extends'           - object this object is built on
  'uses'              - Non-object code used by this object

--------------------------------------------------------------------------------
Config
  public interfaces:
    defaults ([options])
      Resets the configuration to default values
    get (string: group, string: parameter, [function: callback (null, string: parameter)])
      Returns the configuration item specified by 'parameter' from the group 'group'
    save ([options], [function: callback (err)])
      Saves the configuration options somewhere. Returns an error 
    load ([options], [function: callback (err)])
      Loads the configuration options from somewhere.
  extends:
    (none)
  uses:
    (none)
--------------------------------------------------------------------------------
Device
  public interfaces:
    setAutoPoll ()
    setAutoPollOff ()
    setAutoPollOn ()
    getAutoPoll ()
    setPollIntervalNormal ()
    getPollIntervalNormal ()
    setPollIntervalAggressive ()
    getPollIntervalAggressive ()
    setPollAggressively ()
    setPollAggressivelyOff ()
    setPollAggressivelyOn ()
    getPollAggressively ()
    setDebug ()
    getDebug ()
    getAvailable ()
    setAvailable ()
    getAvailableTimestamp ()
    setClientAddress ()
    getClientAddress ()
    setClientPort ()
    getClientPort ()
    getDeviceName ()
    getDeviceID ()
    getDeviceUID ()
    getDeviceType ()
    getBattery ()
    getHasLogs ()
    getLastModified ()
    getMatchID ()
    getMatchName ()
    getLastSyncTime ()
    getViaBonjour ()
    setViaBonjour ()
    clearErrorCount ()
    getErrorCount ()
    getPollCount ()
    getPollInterval ()
    getLastPollTime ()
    getNextPollTime ()
    getLastErrorTime ()
    getNeedsPolling ()
    getMatch ()
    getScores ()
    getLogs ()
    getHeader ()
    destroy ()
    update ()
    sync ()
    syncMatch ()
    syncScores ()
    syncLogs ()
    syncAll ()
  extends:
    (none)
  uses:
    (none)
--------------------------------------------------------------------------------
Devices
  public interfaces:
    scan ()
    devices ()
    destroy ()
    getConfig ()
  extends:
    Device
  uses:
    (none)
--------------------------------------------------------------------------------
File
  public interfaces:
    pscLoad ()
    pscSave ()
    pscList ()
    dbLoad ()
    dbSave ()
    dbList ()
    dbDelete ()
    ezwsLoad ()
    ezwsSave ()
    ezwsList ()
    ssiLoad ()
    ssiSave ()
    ssiList ()
  extends:
    (none)
  uses:
    psc 
    ssi
--------------------------------------------------------------------------------
Kiosk
  public interfaces:
    start ()
    idle ()
    activity ()
  extends:
    (none)
  uses:
    (none)
--------------------------------------------------------------------------------
Match
  public interfaces:
    create ()
    match ()
    scores ()
    logs ()
    lookups ()
    vars ()
    getPendingChanges ()
    setPendingChanges ()
    fixup ()
  extends:
    IDPA
    ProAm
    USPSA
  uses:
    (none)
--------------------------------------------------------------------------------
Shooter
  public interfaces:
    getAge ()
    setAge ()
    getCountryCode ()
    setCountryCode ()
    getDeleted ()
    getDeletedModified ()
    isDeleted ()
    setIsDeleted ()
    setIsNotDeleted ()
    getDQ ()
    setDQModified ()
    isDQ ()
    setDQ ()
    setIsDQ ()
    setIsNotDQ ()
    getDQRule ()
    setDQRule ()
    getDivision ()
    getDivisionModified ()
    setDivision ()
    getEmail ()
    setEmail ()
    getFirstName ()
    setFirstName ()
    getForeign ()
    isForeign ()
    setForeign ()
    setIsForeign ()
    setIsNotForeign ()
    getGender ()
    setGender ()
    setGenderFemale ()
    setGenderMale ()
    getClass ()
    setClass ()
    getMembershipNumber ()
    setMembershipNumber ()
    getLaw ()
    isLaw ()
    setLaw ()
    setIsLaw ()
    setIsNotLaw ()
    getLoggingEmail ()
    isLoggingEmail ()
    setLoggingEmail ()
    setIsLoggingEmail ()
    setIsNotLoggingEmail ()
    getLoggingPhone ()
    isLoggingPhone ()
    setLoggingPhone ()
    setIsLoggingPhone ()
    setIsNotLoggingPhone ()
    getLastName ()
    setLastName ()
    getMilitary ()
    isMilitary ()
    setMilitary ()
    setIsMilitary ()
    setIsNotMilitary ()
    getNumber ()
    setNumber ()
    getPowerFactor ()
    getPowerFactorModified ()
    isPowerFactorMajor ()
    isPowerFactorMinor ()
    setPowerFactor ()
    setPowerFactorMajor ()
    setPowerFactorMinor ()
    getPhone ()
    setPhone ()
    getSquad ()
    getSquadModified ()
    setSquad ()
    getID ()
    setID ()
    getWalkOn ()
    isWalkOn ()
    setWalkOn ()
    setIsWalkOn ()
    setIsNotWalkOn ()
    getProfileModified ()
    setProfileModified ()
    overrideTimestampDeleted ()
    overrideTimestampDQ ()
    overrideTimestampDivision ()
    overrideTimestampPowerFactor ()
    overrideTimestampProfile ()
    overrideTimestampSquad ()
    overrideTimestampShooter ()
    overrideUUID ()
  extends:
    (none)
  uses:
    (none)
--------------------------------------------------------------------------------
Bonus
  public interfaces:
    isSingle ()
    isMultiple ()
    setSingle ()
    setMultiple ()
    getName ()
    setName ()
    getValue ()
    setValue ()
  extends:
    (none)
  uses:
    (none)
--------------------------------------------------------------------------------
Penalty
  public interfaces:
    isSingle ()
    isMultiple ()
    setSingle ()
    setMultiple ()
    getName ()
    setName ()
    getValue ()
    setValue ()
  extends:
    (none)
  uses:
    (none)
--------------------------------------------------------------------------------
Target
  public interfaces:
    getDeleted ()
    isDeleted ()
    setDeleted ()
    setIsDeleted ()
    setIsNotDeleted ()
    getMaxNPMs ()
    setMaxNPMs ()
    getNumber ()
    setNumber ()
    getPrecisionValue ()
    setPrecisionValue ()
    getRequiredHits ()
    setRequiredHits ()
  extends:
    (none)
  uses:
    (none)
--------------------------------------------------------------------------------
Stage
  public interfaces:
    getClassTargets ()
    isClassicTargets ()
    isNotClassicTargets ()
    setClassicTargets ()
    setIsClassicTargets ()
    setIsNotClassicTargets ()
    getClassifier ()
    isClassifier ()
    isNotClassfier ();
    setClassifier ()
    setIsClassifier ()
    setIsNotClassifier ()
    getClassifierCode ()
    setClassifierCode ()
    getMaxStringTime ()
    setMaxStringTime ()
    getName ()
    setName ()
    getNoShoots ()
    setNoShoots ()
    setHasNoShoots ()
    setHasNoNoShoots ()
    hasNoShoots ()
    hasNoNoShoots ()
    getNumber ()
    setNumber ()
    getPoppers ()
    setPoppers ()
    getRemoveWorstString ()
    setRemoveWorstString ()
    setDoRemoveWorstString ()
    setDontRemoveWorstString ()
    getScoringType ()
    setScoringType ()
    getStrings ()
    setStrings ()
    getTargets ()
    setTargets ()
    getTargetCount ()
    setTargetCount ()
    getTarget ()
    addTarget ()
    getStagePoints ()
    setStagePoints ()
    updateStagePoints ()
    getID ()
    overrideID ()
    overrideTimestamp ()
    numberOfTargets ()
  extends:
    (none)
  uses:
    Target
--------------------------------------------------------------------------------
Score
  public interfaces:
    getAdditionalPenalties ()
    setAdditionalPenalties ()
    getApproved ()
    isApproved ()
    setApproved ()
    setIsApproved ()
    setIsNotApproved ()
    getBonuses ()
    getBonusValueByIndex ()
    setBonuses ()
    getBonusesString ()
    setBonusesString ()
    getDeviceIdentifier ()
    setDeviceIdentifier ()
    getDeviceName ()
    setDeviceName ()
    getDNF ()
    isDNF ()
    setDNF ()
    setIsDNF ()
    setIsNotDNF ()
    getDQReason ()
    setDQReason ()
    getPenalties ()
    getPenaltiesValueByIndex ()
    setPenalties ()
    getPenaltiesString ()
    setPenaltiesString ()
    getPenaltiesReason ()
    setPenaltiesReason ()
    getPopperHits ()
    setPopperHits ()
    getPopperMisses ()
    setPopperMisses ()
    getProcedurals ()
    setProcedurals ()
    getShooterID ()
    setShooterID ()
    getStringTimes ();
    setStringTimes ();
    getStringTime ()
    setStringTime ()
    getStringTimesTotal ()
    getTargetScores ()
    setTargetScores ()
    getTargetScore ()
    setTargetScore ()
    getTimestamp ()
    overrideTimestamp ()
    numberOfTargets ()
    numberOfStrings ();
  extends:
    (none)
  uses:
    (none)
--------------------------------------------------------------------------------
StageScores
  public interfaces:
    getNumber ()
    setNumber ()
    getStageScores ()
    setStageScores ()
    addStageScore ()
    getID ()
    overrideID ()
    numberOfScores ()
  extends:
  uses:
    Score
--------------------------------------------------------------------------------
MatchScores
  public interfaces:
    getID ()
    getScores ()
    setScores ()
    getStage ()
    setStage ()
    addStage ()
    getScoresHistory ()
    setScoresHistory ()
    addScoresHistory ()
    overrideID ()
    numberOfStages ()
    nextStageNumber ()
    getPendingChanges ()
    setPendingChanges ()
    fixup ()
  extends:
  uses:
    StageScore
--------------------------------------------------------------------------------
Matchdef
  public interfaces:
    className
    getApproveScores ()
    setApproveScores ()
    getCategories ()
    setCategories ()
    getDivisions ()
    setDivisions ()
    addDivision ()
    getClasses ()
    setClasses ()
    addClass ()
    getClubCode ()
    setClubCode ()
    getClubName ()
    setClubName ()
    getCreationDate ()
    setCreationDate ()
    getDate ()
    setDate ()
    getActiveDivisions ()
    getID ()
    setID ()
    newID ()
    getLogEnabled ()
    isLogEnabled ()
    setLogEnabled ()
    getLogToken ()
    setLogToken ()
    getModifiedDate ()
    setModifiedDate ()
    getName ()
    setName ()
    getOwner ()
    isOwner ()
    setOwner ()
    getReadOnly ()
    isReadOnly ()
    setReadOnly ()
    getShooters ()
    setShooters ()
    getShooterByIndex ()
    getShooterByUUID ()
    cloneShooterWithUUID ()
    newShooter ()
    addShooter ()
    addShooterJSON ()
    updateShooterJSON ()
    getStages ()
    setStages ()
    getStageByIndex ()
    getStageByUUID ()
    newStage ()
    addStage ()
    getType ()
    getTypeLong ()
    getTypeShort ()
    setType ()
    getUnsentLogsWarningCount ()
    setUnsentLogsWarningCount ()
    getOpenSquadding ()
    isOpenSquadding ()
    setOpenSquadding ()
    getVersion ()
    setVersion ()
    numberOfShooters ()
    numberOfStages ()
    getPendingChanges ()
    setPendingChanges ()
    getNewestTimestamp ()
    fixup ()
    merge ()
    getAsGenericObject ()
    parse ()
    compare ()
    exports ()
  extends: ()
    (none)
  uses:
    Bonus
    Penalty
    Shooter
    Stage
--------------------------------------------------------------------------------
IDPA
  public interfaces:
    Lookups ()
  extends:
    Shooter
      (none)
    Target
      (none)
    Stage
      (none)
    Matchdef
      getDivisions ()
      setDivisions ()
    Score
      (none)
    StageScores
      (none)
    MatchScores
      addStage ()
  uses:
    (none)
--------------------------------------------------------------------------------
ProAm
  public interfaces:
    Lookups ()
  extends:
    Shooter
      (none)
    Target
      (none)
    Stage
      (none)
    Matchdef
      getDivisions ()
      setDivisions ()
    Score
      (none)
    StageScores
      (none)
    MatchScores
      addStage ()
  uses:
    (none)
--------------------------------------------------------------------------------
USPSA
  public interfaces:
    Lookups ()
  extends:
    Shooter
      (none)
    Target
      getNPMS ()
      setNPMS ()
    Stage
      getTargetType ()
      usesClassicTargets ()
      usesMetricTargets ()
      setTargetType ()
      setTargetTypeClassic ()
      setTargetTypeMetric ()
      setScoringType ()
      isComstock ()
      isVirginiaCount ()
      isFixedTime ()
    Matchdef
      getLevel ()
      setLevel ()
      getDivisions ()
      setDivisions ()
    Score
      get ()
      set ()
      getA ()
      setA ()
      getB ()
      setB ()
      getC ()
      setC ()
      getD ()
      setD ()
      getNS ()
      setNS ()
      getM ()
      setM ()
      getNPM ()
      setNPM ()
      getAdditionalPenalties ()
      setAdditionalPenalties ()
      getOvertimeShots ()
      setOvertimeShots ()
      getScoredHits ()
    StageScores
      (none)
    MatchScores
      addStage ()
--------------------------------------------------------------------------------
Lookups
  public interfaces:
    (none)
  extends:
    (none)
  uses:
    (none)
--------------------------------------------------------------------------------
Other
  public interfaces:
    jsonCheck ()
  extends:
    (none)
  uses:
    (none)
--------------------------------------------------------------------------------
Print
  public interfaces:
    start ()
    stop ()
  extends:
    (none)
  uses:
    (none)
--------------------------------------------------------------------------------
Server
  public interfaces:
    name ()
    uuid ()
    start ()
    stop ()
  extends:
    (none)
  uses:
    (none)
--------------------------------------------------------------------------------
PMM
  public interfaces:
    config ()
    devices ()
    file ()
    kiosk ()
    match ()
    other ()
    print ()
    server ()
    getCompleteMatch ()
  extends:
    (none)
  uses:
    Config
    Devices
    File
    Kiosk
    Match
    Other
    Server
    Practiprint
