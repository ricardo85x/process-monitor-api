# REALTIME Process Monitor

A secure node web service that monitor server process in real time

It's runs on Linux and macOs platform

### setup on local development server

1 - copy the .env file

```bash
cp .env.example .env
```

2 - install mkcert to create a certificate (homebrew, apt, yum, etc)

3 - install the certificate and place on cert directory

```bash
cd cert
mkcert localhost
mkcert -install
```

4 - install the dependencies

```bash
cd ../
npm install
```

5 - run

```bash
npm run start
```
