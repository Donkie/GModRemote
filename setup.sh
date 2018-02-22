
nodejs -v

#sudo -H -u steam bash -c 'npm install'

#sudo -H -u steam bash 'mkdir ssl'
#sudo -H -u steam bash 'openssl req -x509 -nodes -days 9999 -newkey rsa:2048 -keyout ssl/gmodremote.key -out ssl/gmodremote.crt'
#sudo -H -u steam bash 'openssl dhparam -out ssl/dhparam.pem 2048'

###sudo cp gmodremote.service /etc/systemd/system/
###sudo systemctl enable gmodremote
###sudo systemctl start gmodremote

sudo npm install pm2 -g
sudo -H -u steam bash -c 'pm2 start server.js'

sudo -H -u steam bash -c 'pm2 startup'

sudo pm2 save

