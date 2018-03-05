#!/bin/bash

sudo apt-get update

rebootRequired=false

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
	sudo chown linaro .xinitrc
    echo "unclutter -idle 2 &" >> ~/.xinitrc

	#Start Chromium on boot
	echo 'chromium --homepage "{url}/display.html" --start-fullscreen &' >> ~/.xsessionrc
	#Allow third party cookies so the jitsi meeting stuff actually works
	sudo mkdir /etc/chromium
	sudo mkdir /etc/chromium/policies
	sudo mkdir /etc/chromium/policies/managed
	echo "{" | sudo tee /etc/chromium/policies/managed/policy.json > /dev/null
	echo "  \"HomepageLocation\": \"https://tv.showings.com\"," | sudo tee -a /etc/chromium/policies/managed/policy.json > /dev/null
	echo "  \"BlockThirdPartyCookies\": false" | sudo tee -a /etc/chromium/policies/managed/policy.json > /dev/null
	echo "}" | sudo tee -a /etc/chromium/policies/managed/policy.json > /dev/null

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

	sudo nmcli c add con-name corp_wifi type wifi ifname wlan0 ssid anything
	echo "{wificonfig}" | sudo tee /etc/NetworkManager/system-connections/corp_wifi > /dev/null
	mac=`sudo cat /sys/class/net/wlan0/address`
	sudo sed -i -e "s/{mac}/$mac/g" /etc/NetworkManager/system-connections/corp_wifi
	rebootRequired=true

    # Update version
    cd ~
    echo "1" > "version.txt"
fi

if [ "$rebootRequired" = true ]; then
	sudo reboot
fi
