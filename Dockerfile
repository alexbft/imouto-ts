FROM node:17-alpine AS build
RUN apk add --no-cache python2 python3 g++ make
WORKDIR /app
COPY package* tsconfig.json ./
RUN npm install
COPY src ./src/
COPY test ./test/
RUN npx tsc

FROM node:17-alpine
RUN apk add --no-cache python2 python3 g++ make
WORKDIR /app
COPY package* ./
RUN npm install --production
COPY --from=build /app/dist ./dist/
CMD node dist/src/main.js

