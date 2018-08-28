FROM node:carbon

WORKDIR /usr/src/app

COPY . .

RUN npm i npm@latest -g && \
	npm install

CMD [ "npm", "start" ]
