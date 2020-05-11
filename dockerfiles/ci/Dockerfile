FROM node:12

WORKDIR home/nodejs/app

COPY package-lock.json .
COPY package.json .
RUN npm install
COPY . .

EXPOSE 3000

CMD ["sh","-c","npm run setup && npm run ci_test"]
