FROM node:12

# RUN useradd nodejs
# USER nodejs
# CMD ["nodejs"]

WORKDIR home/nodejs/app

COPY package*.json ./
RUN npm install --production
COPY . .

EXPOSE 3000

# RUN npm run init_db
CMD ["npm", "run", "docker-dev"]