#!/bin/bash

for D in `find . -type d -maxdepth 1 ! -path .`
do
    echo -e "NPM Linking $D"
    cd $D
    npm link
    cd ..
done
