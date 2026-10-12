FROM nginx:1.26-alpine

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN mkdir -p /etc/nginx/template-src
COPY default-subdomain.conf.template /etc/nginx/template-src/
COPY default-same-origin.conf.template /etc/nginx/template-src/
COPY default-redirect.conf.template /etc/nginx/template-src/
COPY ssl-subdomain.conf.template /etc/nginx/template-src/
COPY ssl-same-origin.conf.template /etc/nginx/template-src/

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
