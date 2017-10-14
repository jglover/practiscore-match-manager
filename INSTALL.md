OS X:
  brew install nodejs
  npm install jshint@latest -g
  npm install coffee-script connect debug

Linux:
  apt-get install curl
  curl -sL http://deb.nodesource.com/setup_5.x | sudo bash -
  sudo apt-get install --yes nodejs
  sudo apt-get install --yes build-essential
  sudo apt-get install libavahi-compact-libdnssd-dev
  npm install jshint@latest -g
  npm install coffee-script -g
  npm install connect debug

Windoze:
  Python        - https://www.python.org/download/releases/2.7.3#download
  Bonjour       - https://developer.apple.com/downloads/index.action?q=Bonjour%20SDK%20for%20Windows#
  Visual Studio - http://go.microsoft.com/?linkid=9816758

  Notes for node-odbc:
    Open Windows 7.1 SDK shell
    Make sure node in PATH
    Change to nodejs project directory
    setenv /x86 (selects 32-bit environment)
    Run 'npm install odbc'
    Edit node\_modules/odbc/binding.gyp
    Remove 'UNICODE' in 'defines'
    Run 'npm rebuild' (in nodejs project directory)
    Edit node\_modules/odbc/lib/odbc.js
    Insert 'if (self.conn)' before 'self.conn.close' at line 163
