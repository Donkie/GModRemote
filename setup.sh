
nodejs -v

npm install

mkdir ssl
openssl req -x509 -nodes -days 9999 -newkey rsa:2048 -keyout ssl/gmodremote.key -out ssl/gmodremote.crt
openssl dhparam -out ssl/dhparam.pem 2048
