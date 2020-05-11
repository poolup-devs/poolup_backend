FROM node:12

WORKDIR home/nodejs/app

COPY package*.json ./
# RUN npm install
# If you are building your code for production
RUN npm ci --only=production

# Bundle app source
COPY . .

EXPOSE 3000

CMD ["sh","-c","npm run setup && npm install env-cmd && npm run docker-init_db && npm run ci_test"]
