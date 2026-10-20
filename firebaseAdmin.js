
const {
    initializeApp,
    getApps,
    cert
} = require("firebase-admin/app");

const serviceAccount = require("./firebase-service-account.json");

const app = getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount)
    });

module.exports = app;
