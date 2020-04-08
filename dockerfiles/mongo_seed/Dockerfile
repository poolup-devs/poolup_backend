FROM node:12

WORKDIR home/nodejs/app

RUN npm install --production
COPY . .

CMD ["npm", "run", "init_db"]