#!/bin/bash
DIR=$(dirname $0)
if [ ! -x "$(command -v node-gyp)" ]; then
  # Check if Ubuntu
  if [ -x "$(command -v apt)" ]; then
      sudo apt install node-gyp -y
      sudo apt-get install gcc g++ build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev -y
  fi
  # Check if Cent OS
  if [ -x "$(command -v yum)" ]; then
      sudo yum install node-gyp -y
      sudo yum install gcc-c++ cairo-devel libjpeg-turbo-devel pango-devel giflib-devel -y
  fi
fi
if [ ! -d "./faces" ]; then
    mkdir faces
fi
if [ ! -d "./weights" ]; then
    mkdir weights
    if [ ! -x "$(command -v wget)" ]; then
        # Check if Ubuntu
        if [ -x "$(command -v apt)" ]; then
            sudo apt install wget -y
        fi
        # Check if Cent OS
        if [ -x "$(command -v yum)" ]; then
            sudo yum install wget -y
        fi
    fi
    cdnUrl="https://cdn.shinobi.video/weights/plugin-face-weights"
    wget -O weights/face_landmark_68_model-shard1 $cdnUrl/face_landmark_68_model-shard1
    wget -O weights/face_landmark_68_model-weights_manifest.json $cdnUrl/face_landmark_68_model-weights_manifest.json
    wget -O weights/face_landmark_68_tiny_model-shard1 $cdnUrl/face_landmark_68_tiny_model-shard1
    wget -O weights/face_landmark_68_tiny_model-weights_manifest.json $cdnUrl/face_landmark_68_tiny_model-weights_manifest.json
    wget -O weights/face_recognition_model-shard1 $cdnUrl/face_recognition_model-shard1
    wget -O weights/face_recognition_model-shard2 $cdnUrl/face_recognition_model-shard2
    wget -O weights/face_recognition_model-weights_manifest.json $cdnUrl/face_recognition_model-weights_manifest.json
    wget -O weights/mtcnn_model-shard1 $cdnUrl/mtcnn_model-shard1
    wget -O weights/mtcnn_model-weights_manifest.json $cdnUrl/mtcnn_model-weights_manifest.json
    wget -O weights/ssd_mobilenetv1_model-shard1 $cdnUrl/ssd_mobilenetv1_model-shard1
    wget -O weights/ssd_mobilenetv1_model-shard2 $cdnUrl/ssd_mobilenetv1_model-shard2
    wget -O weights/ssd_mobilenetv1_model-weights_manifest.json $cdnUrl/ssd_mobilenetv1_model-weights_manifest.json
    wget -O weights/tiny_face_detector_model-shard1 $cdnUrl/tiny_face_detector_model-shard1
    wget -O weights/tiny_face_detector_model-weights_manifest.json $cdnUrl/tiny_face_detector_model-weights_manifest.json
else
    echo "weights found..."
fi
if [ ! -e "$DIR/../../libs/customAutoLoad/faceManagerCustomAutoLoadLibrary" ]; then
    echo "Installing Face Manager customAutoLoad Module..."
    sudo cp -r $DIR/faceManagerCustomAutoLoadLibrary $DIR/../../libs/customAutoLoad/faceManagerCustomAutoLoadLibrary
else
    echo "Face Manager customAutoLoad Module already installed..."
fi
