#
#  Aliases to search Javascript, Jade and CSS files. Use ". alias.sh" to import
#
alias findjs='find . -name \*.js | grep -v '"'"'libs\|node_modules\|colorpicker'"'"' | xargs grep -s'
alias findjade='find . -name \*.jade | xargs grep -s'
alias findcss='find public/stylesheets -name \*.css | xargs grep -s'
