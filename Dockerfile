FROM node:12 as builder

# RUN apk update && \
# 	apk add yarn python g++ make && \
# 	rm -rf /var/cache/apk/*  && \
# 	npm i -g babel-cli && \
# 	echo "alias ll='ls -al'" >> /etc/profile && \
# 	cp /etc/profile /root/.bash_profile && \
# 	node --version

# The following prevent right access issues when
# doing global installs
# ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
# ENV PATH="/home/node/.npm-global/bin:${PATH}"
WORKDIR /builder
# USER node

COPY . .
# RUN sudo chwon -R node /home/node
RUN	yarn install && yarn build
	
######################################
# FROM node:12-alpine

# WORKDIR /app
# COPY --from=builder /builder/dist /app

CMD [ "yarn", "start" ]
