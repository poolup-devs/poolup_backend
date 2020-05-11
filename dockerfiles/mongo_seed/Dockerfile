FROM node:12

WORKDIR home/nodejs/app

RUN npm install --production
COPY . .

CMD ["sh","-c","npm install env-cmd && npm run init_db"]
