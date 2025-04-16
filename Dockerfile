# Gebruik een officiële Node.js image
FROM node:18

# Stel de werkdirectory in de container in
WORKDIR /app

# Kopieer package.json en package-lock.json
COPY package*.json ./

# Installeer dependencies
RUN npm install

# Kopieer de rest van de applicatie
COPY . .

# Zet environment variabelen (optioneel, anders via .env of docker-compose)
# ENV NODE_ENV=production

# Expose de poort (pas aan naar je daadwerkelijke poort)
EXPOSE 3000

# Start het Node.js-script
CMD [ "node", "app.js" ]