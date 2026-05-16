# Auto-gerado pelo DeployHub. Compatível com builds Lovable (dist/ ou dist/client/).
# Recomendado no Dokploy: Build Type = Dockerfile.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
RUN if [ -z "$VITE_SUPABASE_PUBLISHABLE_KEY" ]; then export VITE_SUPABASE_PUBLISHABLE_KEY="$VITE_SUPABASE_ANON_KEY"; fi && npm run build
# Normaliza saída: se Lovable gerou dist/client, promove para dist/.
RUN if [ -d dist/client ]; then rm -rf /tmp/_dist && mv dist /tmp/_dist && mv /tmp/_dist/client dist && rm -rf /tmp/_dist; fi

FROM nginx:alpine
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / { try_files $uri $uri/ /index.html; }\n  location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ { expires 1y; add_header Cache-Control "public, immutable"; }\n}\n' > /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
