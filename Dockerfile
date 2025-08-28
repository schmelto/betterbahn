# Dockerfile

# Stufe 1: Abhängigkeiten installieren
# Wechsel zu einem Debian-basierten Image (node:18) für bessere Kompatibilität.
FROM node:18 AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

# Stufe 2: Die Anwendung bauen
FROM node:18 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stufe 3: Finale, produktive Stufe
FROM node:18 AS runner
WORKDIR /app

# Set timezone to Europe/Berlin (German timezone)
ENV TZ=Europe/Berlin
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

ENV NODE_ENV=production

# Kopieren des Standalone-Outputs aus der Builder-Stufe
# Anpassen des Besitzers an den Standard 'node' Benutzer
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# ---- HINZUGEFÜGT FÜR db-hafas-stations ----
# Kopiert manuell das Modul, dessen Datendateien vom 'standalone'-Modus nicht erfasst werden.
COPY --from=builder --chown=node:node /app/node_modules/db-hafas-stations ./node_modules/db-hafas-stations
# ---- ENDE db-hafas-stations-ZUSATZ ----

# ---- PRÄVENTIVE LÖSUNG FÜR FEHLENDE DATEIEN ----
# HINWEIS: Dieser Ansatz löst Probleme mit fehlenden Dateien (wie .json, .sql etc.),
# führt aber zu einem DEUTLICH GRÖSSEREN Docker-Image, da der Vorteil von 'output: standalone'
# teilweise aufgehoben wird. Dies stellt sicher, dass alle Pakete vollständig sind.
# COPY --from=builder --chown=node:node /app/node_modules ./node_modules
# ---- ENDE PRÄVENTIVE LÖSUNG ----

# Wechsel zum non-root 'node' Benutzer für erhöhte Sicherheit
USER node

EXPOSE 3000
CMD ["node", "server.js"]