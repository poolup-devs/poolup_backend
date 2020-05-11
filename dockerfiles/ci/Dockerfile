FROM node:12

WORKDIR home/nodejs/app

COPY package-lock.json .
COPY package.json .
RUN npm ci
COPY . .

EXPOSE 3000

Add start.sh /
RUN chmod +x /start.sh
CMD ["/start.sh"]
