#!/bin/bash

sudo apt-get update

# Get the current version
if [ ! -f ~/version.txt ]; then
    version=0
else
    version=`cat ~/version.txt`
fi

if [ $version -lt 1 ]
then
    sudo apt-get upgrade -y

    # Hide mouse when not moving
    sudo apt-get install -y unclutter
    sudo cp /etc/X11/xinit/xinitrc ~/.xinitrc
    echo "unclutter -idle 2 &" >> ~/.xinitrc

    #Install nano
    sudo apt-get install -y nano

    #Install robotjs dependencies
    sudo apt-get install -y libxtst-dev libpng++-dev

    # Install node
    curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
    sudo apt-get install -y nodejs

    # Install pm2 (process manager for nodebot
    sudo npm install pm2 -g

    # Install git
    sudo apt-get install git -y

    # Install nodebot
    cd ~
    mkdir Projects
    cd Projects
    git clone git://github.com/smithgeek/nodebot.git nodebot
    cd nodebot
    npm run update

    # fix bug in robotjs for scroll wheel
    sed -i -e 's/YTestFakeButtonEvent/XTestFakeButtonEvent/g' ./node_modules/robotjs/src/mouse.c
    sudo npm install -g node-gyp
    cd node_modules/robotjs
    node-gyp rebuild
    cd ../..

    pm2 start src/index.js --name "nodebot"
    sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u linaro --hp /home/linaro

    # Update version
    cd ~
    echo "1" > "version.txt"
fi
