FROM node:10-alpine

WORKDIR /usr/src/app

COPY . .

RUN npm i npm@latest -g && \
	npm install && \
	npm install -g \
		polkabot-plugin-blockstats \
		polkabot-plugin-operator \
		polkabot-plugin-blocthday \
		polkabot-plugin-stallwatcher \
		&& \
	npm audit fix --force

CMD [ "npm", "start" ]
