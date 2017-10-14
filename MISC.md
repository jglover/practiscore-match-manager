find . -depth -name "*.jade" -exec sh -c 'svn mv "$1" "${1%.jade}.pug"' _ {} \;


find . -path ./public/javascripts/libs -prune -o -path ./node_modules -prune -o -path ./.svn -prune -o -path ./public/colorpicker -prune -o -name *.js -print
