FROM node:current-alpine

WORKDIR /opt/app

COPY package.json package-lock.json ./

RUN npm i --silent

COPY . .

ENTRYPOINT [ "node", "." ]