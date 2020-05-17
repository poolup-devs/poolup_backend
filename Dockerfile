# base image
FROM node:12 AS builder
# default to prod build
ARG ENV=production
# set working directory
WORKDIR /app
# install dependencies
COPY package*.json ./
RUN npm install
# set up config file
RUN npm run setup
# copying soruce files
COPY . .
# building app
RUN npm run build:$REACT_APP_ENV

FROM node:alpine
# set working directory
WORKDIR /app

# install server
RUN npm install -g serve
# copying build files
COPY --from=builder /app/build ./build
# start app
ENTRYPOINT ["serve", "-s", "build"]