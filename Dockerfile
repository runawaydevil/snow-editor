# Build
FROM node:20-alpine AS build
ARG VITE_PUBLIC_ORIGIN=https://snow.pablomurad.com
ARG VITE_ALLOW_SEARCH_INDEXING=false
ENV VITE_PUBLIC_ORIGIN=$VITE_PUBLIC_ORIGIN
ENV VITE_ALLOW_SEARCH_INDEXING=$VITE_ALLOW_SEARCH_INDEXING
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production (static)
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 41737
