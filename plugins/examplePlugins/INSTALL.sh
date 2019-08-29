#!/bin/bash
echo "Shinobi - Do ypu want to let the `opencv4nodejs` npm package install OpenCV? "
echo "Only do this if you do not have OpenCV already or will not use a GPU (Hardware Acceleration)."
echo "(y)es or (N)o"
read nodejsinstall
if [ "$nodejsinstall" = "y" ] || [ "$nodejsinstall" = "Y" ]; then
  unset OPENCV4NODEJS_DISABLE_AUTOBUILD
  npm uninstall opencv-build opencv4nodejs
else
  export OPENCV4NODEJS_DISABLE_AUTOBUILD=1
  npm uninstall opencv-build
fi

npm install opencv4nodejs
