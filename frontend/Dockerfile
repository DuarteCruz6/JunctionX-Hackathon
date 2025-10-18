# Production Dockerfile for frontend (build static files and serve with nginx)

# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --silent
COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html

# Remove default nginx config and use a simple one that serves index.html for SPA
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
