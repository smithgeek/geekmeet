#!/bin/bash
curl {url}/update.sh > ~/update.sh
chmod +x ~/update.sh
~/update.sh
rm start.sh