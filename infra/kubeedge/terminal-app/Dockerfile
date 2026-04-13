FROM alpine:3.19

RUN apk add --no-cache \
    mosquitto-clients \
    curl \
    jq \
    bash

EXPOSE 9000

RUN echo '#!/bin/bash' > /health.sh && \
    echo 'curl -sf http://localhost:9000/health' >> /health.sh && \
    chmod +x /health.sh

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
