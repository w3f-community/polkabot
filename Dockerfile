FROM node:11-alpine

WORKDIR /usr/src/app

COPY . .

RUN npm i npm@latest -g && \
	npm install && \
	npm install -g \
		polkabot-plugin-blockstats \
		polkabot-plugin-blocthday \
		polkabot-plugin-operator \
		polkabot-plugin-stallwatcher \
		polkabot-plugin-reporter \
		polkabot-plugin-validators

CMD [ "npm", "start" ]
