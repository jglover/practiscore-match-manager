Various utility scripts that don't have a better place to live

createDB.js
  Processes the psc files in the ./matches directory and stores them into the
  sqlite database. The directory for the matches may be changed by editing the
  pscDirectory variable at the top. This must be run from the ./ directory, 
  and invoked with 'node utils/createDB.js'
