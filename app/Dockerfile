FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

RUN chown -R node:node /usr/src/app
USER node

EXPOSE 3000

CMD ["node", "src/index.js"]
