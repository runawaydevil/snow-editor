FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY src ./src
ENV NODE_ENV=production
ENV PORT=41738
ENV DATABASE_PATH=/app/data/snow.db
EXPOSE 41738
CMD ["node", "src/server.js"]
