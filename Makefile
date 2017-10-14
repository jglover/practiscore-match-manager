#
#  $Id: Makefile 2241 2016-05-05 10:28:13Z jcw $
#  $Revision: 2241 $
#  $Author: jcw $
#  $Date: 2016-05-05 06:28:13 -0400 (Thu, 05 May 2016) $
#  $HeadURL: http://tinymicros.com/svn_private/practiscore/pme/trunk/Makefile $
#

.SILENT:
.DELETE_ON_ERROR:

#
#  Run jshint on everything that we've written, but not library junk
#
.PHONY: jshint
jshint :
	find . -name \*.js | grep -v libs | grep -v node_modules | grep -v colorpicker | grep -v old_code | xargs jshint

.PHONY: svnprops
svnprops:
	find . -name \*.js | grep -v libs | grep -v node_modules | grep -v colorpicker | xargs svn propset svn:keywords "Id Revision Author Date HeadURL"
	find views -name \*.pug | xargs svn propset svn:keywords "Id Revision Author Date HeadURL"
	svn propset svn:keywords "Id Revision Author Date HeadURL" Makefile

.PHONY: find
find:
	find . -name \*.js | grep -v libs | grep -v node_modules | grep -v colorpicker | xargs grep $(f)

.PHONY: jadefind
jadefind:
	find . -name \*.jade | xargs grep $(f)

.PHONY: pugfind
pugfind:
	find . -name \*.pug | xargs grep $(f)

.PHONY: cssfind
cssfind:
	find public/stylesheets -name \*.css | xargs grep $(f)

.PHONY: zj
zj:
	rm -f ~/Dropbox/Public/pmm_zj.zip
	zip -qr9 ~/Dropbox/Public/pmm_zj.zip . --exclude ".svn*" "node_modules*" logfile.txt pme.sql npm-debug.log "debug*"
