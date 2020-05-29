#!/bin/bash

for D in `find . -type d -maxdepth 1 ! -path .`
do
    echo -e "NPM UN-Linking $D"
    cd $D
    npm unlink
    cd ..
done
