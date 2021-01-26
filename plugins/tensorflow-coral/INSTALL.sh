#!/bin/bash
DIR=`dirname $0`

npm install yarn -g --unsafe-perm --force
npm install --unsafe-perm
if [ ! -e "./conf.json" ]; then
    echo "Creating conf.json"
    sudo cp conf.sample.json conf.json
else
    echo "conf.json already exists..."
fi
echo "Adding Random Plugin Key to Main Configuration"
node $DIR/../../tools/modifyConfigurationForPlugin.js tensorflow-coral key=$(head -c 64 < /dev/urandom | sha256sum | awk '{print substr($1,1,60)}')

echo "!!!IMPORTANT!!!"
echo "IF YOU DON'T HAVE INSTALLED CORAL DEPENDENCIES BEFORE, YOU NEED TO PLUG OUT AND THEN PLUG IN YOUR CORAL USB ACCELERATOR BEFORE USING THIS PLUGIN"
