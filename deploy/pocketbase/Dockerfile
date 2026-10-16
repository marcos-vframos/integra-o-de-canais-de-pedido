# PocketBase independent backend (persistent /data volume REQUIRED on Railway).
FROM alpine:3.21
ARG PB_VERSION=0.40.5
RUN apk add --no-cache ca-certificates wget unzip \
 && wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" -O /tmp/pocketbase.zip \
 && unzip -q /tmp/pocketbase.zip pocketbase -d /usr/local/bin/ \
 && chmod +x /usr/local/bin/pocketbase \
 && rm -f /tmp/pocketbase.zip
WORKDIR /app
COPY pocketbase/migrations /app/pb_migrations
COPY pocketbase/hooks /app/pb_hooks
EXPOSE 8090
CMD ["/bin/sh", "-c", "exec pocketbase serve --http=0.0.0.0:${PORT:-8090} --dir=/data"]
