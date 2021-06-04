FROM nvidia/cuda:10.0-cudnn7-devel-ubuntu18.04

RUN apt update -y
ENV DEBIAN_FRONTEND=noninteractive
RUN apt -y install tzdata
RUN apt install wget curl net-tools -y
RUN apt install -y sudo dos2unix

RUN apt -y install curl dirmngr apt-transport-https lsb-release ca-certificates
RUN curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
RUN apt -y install nodejs

RUN mkdir -p /config
RUN mkdir -p /home/Shinobi/plugins/tensorflow
WORKDIR /home/Shinobi/plugins/tensorflow

COPY . /home/Shinobi/plugins/tensorflow
RUN wget https://gitlab.com/Shinobi-Systems/Shinobi/-/raw/dev/plugins/pluginBase.js -O /home/Shinobi/plugins/tensorflow/pluginBase.js
RUN wget https://gitlab.com/Shinobi-Systems/Shinobi/-/raw/dev/tools/modifyConfigurationForPlugin.js -O /home/Shinobi/plugins/tensorflow/modifyConfigurationForPlugin.js
RUN wget https://gitlab.com/Shinobi-Systems/Shinobi/-/raw/dev/plugins/pluginCheck.js -O /home/Shinobi/plugins/pluginCheck.js
RUN ls /home/Shinobi/plugins/tensorflow

RUN apt install -y python build-essential
RUN apt install -y \
                make \
                g++ \
                gcc \
                node-pre-gyp

RUN npm install pm2 -g

RUN npm install --unsafe-perm
RUN npm install @tensorflow/tfjs-backend-cpu@2.7.0 @tensorflow/tfjs-backend-webgl@2.7.0 @tensorflow/tfjs-converter@2.7.0 @tensorflow/tfjs-core@2.7.0 @tensorflow/tfjs-layers@2.7.0 @tensorflow/tfjs-node@2.7.0 --unsafe-perm --force
# RUN npm install @tensorflow/tfjs-node@2.7.0 --unsafe-perm --force
RUN npm install @tensorflow/tfjs-node-gpu@2.7.0 --unsafe-perm --force
RUN npm rebuild @tensorflow/tfjs-node build-addon-from-source

RUN dos2unix /home/Shinobi/plugins/tensorflow/init.sh
RUN dos2unix /home/Shinobi/plugins/tensorflow/pm2.yml
RUN chmod -f +x /home/Shinobi/plugins/tensorflow/init.sh
RUN chmod -f +x /home/Shinobi/plugins/tensorflow/pm2.yml

EXPOSE 8082

ENTRYPOINT ["/home/Shinobi/plugins/tensorflow/init.sh"]

CMD [ "pm2-docker", "/home/Shinobi/plugins/tensorflow/pm2.yml" ]
