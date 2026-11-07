#!/bin/sh
set -eu
lan_ip=${LAN_IP:-$(ipconfig getifaddr en0)}
mkdir -p .local
if [ ! -f .local/lan-ca.key ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 3650 -keyout .local/lan-ca.key -out .local/lan-ca.crt -subj '/CN=Qingge ERP Local CA'
fi
openssl req -new -newkey rsa:2048 -nodes -keyout .local/lan-key.pem -out .local/lan.csr -subj "/CN=$lan_ip"
printf 'subjectAltName=IP:%s,IP:127.0.0.1,DNS:localhost\nextendedKeyUsage=serverAuth\n' "$lan_ip" > .local/lan.ext
openssl x509 -req -in .local/lan.csr -CA .local/lan-ca.crt -CAkey .local/lan-ca.key -CAcreateserial -out .local/lan-cert.pem -days 825 -sha256 -extfile .local/lan.ext
security add-trusted-cert -d -r trustRoot -k /Users/qingjiudemac/Library/Keychains/login.keychain-db .local/lan-ca.crt
printf 'LAN HTTPS certificate created for %s\nRoot CA for phone trust: %s/.local/lan-ca.crt\n' "$lan_ip" "$PWD"
