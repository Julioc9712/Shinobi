#!/bin/bash
echo "ARM CPU Installation is currently NOT supported! Jetson Nano with GPU enabled is currently only supported."
echo "Jetson Nano may experience \"Unsupported Errors\", you may ignore them. Patches will be applied."
if [[ ! $(head -1 /etc/nv_tegra_release) =~ R32.*4\.[34] ]] ; then
  echo "ERROR: not JetPack-4.4"
  exit 1
fi

cudaCompute=$(cat /sys/module/tegra_fuse/parameters/tegra_chip_id)
# 33 : Nano, TX1
# 24 : TX2
# 25 : Xavier NX and AGX Xavier

DIR=$(dirname $0)
echo $DIR
echo "Replacing package.json for tfjs 2.3.0..."
wget -O $DIR/package.json https://cdn.shinobi.video/binaries/tensorflow/2.3.0/package.json
echo "Removing existing Tensorflow Node.js modules..."
rm -rf $DIR/node_modules
npm install yarn -g --unsafe-perm --force
npm install dotenv


npm install @tensorflow/tfjs-backend-cpu@2.3.0 @tensorflow/tfjs-backend-webgl@2.3.0 @tensorflow/tfjs-converter@2.3.0 @tensorflow/tfjs-core@2.3.0 @tensorflow/tfjs-layers@2.3.0 @tensorflow/tfjs-node@2.3.0 --unsafe-perm --force --legacy-peer-deps
npm install @tensorflow/tfjs-node-gpu@2.3.0 --unsafe-perm
customBinaryLocation="node_modules/@tensorflow/tfjs-node-gpu/scripts/custom-binary.json"
echo '{"tf-lib": "https://cdn.shinobi.video/binaries/tensorflow/2.3.0/libtensorflow.tar.gz"}' > "$customBinaryLocation"
npm rebuild @tensorflow/tfjs-node-gpu --build-addon-from-source --unsafe-perm


# # npm audit fix --force
if [ ! -e "$DIR/conf.json" ]; then
    echo "Creating conf.json"
    sudo cp $DIR/conf.sample.json $DIR/conf.json
else
    echo "conf.json already exists..."
fi

tfjsBuildVal="gpu"

echo "Adding Random Plugin Key to Main Configuration"
node $DIR/../../tools/modifyConfigurationForPlugin.js tensorflow key=$(head -c 64 < /dev/urandom | sha256sum | awk '{print substr($1,1,60)}') tfjsBuild=$tfjsBuildVal

echo "TF_FORCE_GPU_ALLOW_GROWTH=true" > "$DIR/.env"
echo "#CUDA_VISIBLE_DEVICES=0,2" >> "$DIR/.env"
