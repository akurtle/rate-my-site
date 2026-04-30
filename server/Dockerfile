FROM node:20-alpine

WORKDIR /app

COPY package*.json ./      # copies package.json + package-lock.json if present
RUN npm install            # use npm install instead of npm ci if lock file is absent

COPY . .

EXPOSE 4000
CMD ["node", "src/index.js"]