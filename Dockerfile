# base image
FROM node:12 AS builder
# default to prod build
ARG API_ENV=production
# set working directory
WORKDIR /app
# install dependencies
COPY package*.json ./
RUN npm install
# copying soruce files
COPY . .
# set up config file
RUN npm run setup

FROM node:alpine
# set working directory
WORKDIR /app
COPY --from=builder . .
COPY package* ./
RUN npm install --production
CMD npm start