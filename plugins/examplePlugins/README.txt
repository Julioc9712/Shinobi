

EXAMPLE PLUGINS
  This is a collection of plugins intended to help developers get started with Shinobi plugins. 


CURRENT EXAMPLES

  shinobi-triggersquare.js             
    Constantly draws a simple square and throws a motion trigger.

  shinobi-opencv_Input.js  
    Sets a OpenCV variable to current input frame 


INSTALL
  Run INSTALL.sh from main Shinobi dir.


CONFIGURATION
  cp conf.sample.json conf.json 
  
  Example plugin conf
{
  "plug":"examplePlugins",
  "host":"localhost",
  "port":8080,
  "hostPort":8082,
  "key":"secretkey123",
  "mode":"client",
  "type":"detector"
}

  Example end of Main conf

  "cron":{
      "key":"secret__cron__key"
  },
  "pluginKeys":{
    "examplePlugins": "secretkey123"
  }
}


RUNNING

  With nodejs
    nodejs ./plugins/examplePlugins/shinobi-triggersquare.js 

  With pm2 daemon
    pm2 start ./plugins/examplePlugins/shinobi-opencv_Input.js


  plugins should always be started from main Shinobi dir
