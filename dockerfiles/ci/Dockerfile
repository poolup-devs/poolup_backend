FROM node:12

WORKDIR home/nodejs/app

COPY package.json .
RUN npm ci
COPY . .

EXPOSE 3000

CMD ["npm", "run", "ci_test"]