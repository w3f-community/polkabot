if [ "`which standard`" = "" ]
then
    npm install -g standard 
fi

if [ "`which snazzy`" = "" ]
then
    npm install snazzy -g
fi

if [ "`which babel-eslint`" = "" ]
then
    npm install babel-eslint -g
fi

echo '#!/bin/sh
# Ensure all javascript files staged for commit pass standard code style
if [ "$CHECK" = "0" ]
then
  echo "ignore pre commit check"
  exit
fi
git diff --name-only --cached --relative | grep "\.jsx\?$" | xargs standard --verbose | snazzy
if [ $? -ne 0 ]; then exit 1; fi
' > .git/hooks/pre-commit

chmod +x .git/hooks/pre-commit
