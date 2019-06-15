FROM node:10-alpine

RUN apk update && \
	apk add yarn python g++ make && \
	rm -rf /var/cache/apk/*  && \
	npm i -g babel-cli && \
	echo "alias ll='ls -al'" >> /etc/profile && \
	cp /etc/profile /root/.bash_profile && \
	node --version

# The following prevent right access issues when
# doing global installs
# ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH="/home/node/.npm-global/bin:${PATH}"
WORKDIR /home/node
# USER node

COPY . .
# RUN sudo chwon -R node /home/node
RUN	npm install
	
RUN npm install -g --unsafe-perm=true --allow-root \ 
	./plugins/polkabot-plugin-blocthday \
	./plugins/polkabot-plugin-blockstats \
	./plugins/polkabot-plugin-reporter \
	# ./plugins/polkabot-plugin-stallwatcher \
	./plugins/polkabot-plugin-operator \
	./plugins/polkabot-plugin-validators

RUN cp ./src/config-sample.js ./src/config.js

CMD [ "npm", "start" ]
