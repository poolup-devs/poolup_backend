FROM node:12

WORKDIR home/nodejs/app

COPY package*.json ./
# RUN npm install
# If you are building your code for production
RUN npm ci --only=production

# Bundle app source
COPY . .

EXPOSE 3000

CMD ["sh","-c","npm run setup && npm run init_db && npm install env-cmd && npm run ci_test"]
