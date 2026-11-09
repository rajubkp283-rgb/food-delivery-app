/* =========================================
   AREAXPRESS PUBLIC CACHE SYSTEM
   IndexedDB + Cache First + Background Refresh
========================================= */

(function () {
    "use strict";

    const DB_NAME = "AreaXpressPublicCache";
    const DB_VERSION = 1;
    const STORE_NAME = "publicData";

    let dbPromise = null;

    // Open IndexedDB
    function openDB() {
        if (!dbPromise) {
            dbPromise = new Promise((resolve, reject) => {

                const request = indexedDB.open(DB_NAME, DB_VERSION);

                request.onupgradeneeded = function () {
                    const db = request.result;

                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME, {
                            keyPath: "key"
                        });
                    }
                };

                request.onsuccess = function () {
                    resolve(request.result);
                };

                request.onerror = function () {
                    reject(request.error);
                };

            }).catch(error => {
                dbPromise = null;
                throw error;
            });
        }

        return dbPromise;
    }

    // Read Cache
    async function get(key) {
        const db = await openDB();

        return new Promise((resolve, reject) => {

            const transaction = db.transaction(
                STORE_NAME,
                "readonly"
            );

            const request = transaction
                .objectStore(STORE_NAME)
                .get(key);

            request.onsuccess = () => {
                resolve(request.result || null);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Save Cache
    async function set(key, data, ttl) {
        const db = await openDB();

        const now = Date.now();

        const entry = {
            key: key,
            data: data,
            savedAt: now,
            expiresAt: now + ttl
        };

        return new Promise((resolve, reject) => {

            const transaction = db.transaction(
                STORE_NAME,
                "readwrite"
            );

            transaction.objectStore(STORE_NAME).put(entry);

            transaction.oncomplete = () => resolve(true);

            transaction.onerror = () => {
                reject(transaction.error);
            };
        });
    }

    // Delete One Cache
    async function remove(key) {
        const db = await openDB();

        return new Promise((resolve, reject) => {

            const transaction = db.transaction(
                STORE_NAME,
                "readwrite"
            );

            transaction.objectStore(STORE_NAME).delete(key);

            transaction.oncomplete = () => resolve(true);

            transaction.onerror = () => {
                reject(transaction.error);
            };
        });
    }

    // Delete Cache By Prefix
    async function removeByPrefix(prefix) {
        const db = await openDB();

        return new Promise((resolve, reject) => {

            const transaction = db.transaction(
                STORE_NAME,
                "readwrite"
            );

            const store = transaction.objectStore(STORE_NAME);
            const request = store.openCursor();

            request.onsuccess = function () {

                const cursor = request.result;

                if (!cursor) return;

                if (String(cursor.key).startsWith(prefix)) {
                    cursor.delete();
                }

                cursor.continue();
            };

            transaction.onerror = () => {
                reject(transaction.error);
            };

            transaction.oncomplete = () => resolve(true);
        });
    }

    // Cache First + Background Refresh
    async function load(options) {

        const key = options.key;
        const url = options.url;
        const render = options.render || function () {};

        const ttl = options.ttl || 5 * 60 * 1000;

        if (!key || !url) {
            throw new Error("Cache key and URL are required");
        }

        let cachedData = null;

        // STEP 1: Show Cached Data
        try {

            const cached = await get(key);

            if (cached && cached.data !== undefined) {

                cachedData = cached.data;

                render(cachedData, {
                    source: "cache",
                    isFresh: Date.now() <= cached.expiresAt
                });
            }

        } catch (error) {
            console.warn("Cache read error:", error);
        }

        // STEP 2: Fetch Fresh Data
        try {

            const response = await fetch(url, {
                ...(options.fetchOptions || {}),
                method: "GET",
                cache: "no-store",
                headers: {
                    Accept: "application/json",
                    ...((options.fetchOptions || {}).headers || {})
                }
            });

            if (!response.ok) {
                throw new Error("Server error: " + response.status);
            }

            const contentType =
                response.headers.get("content-type") || "";

            if (!contentType.includes("application/json")) {
                throw new Error("Invalid API response");
            }

            const freshData = await response.json();

            if (!freshData || freshData.success === false) {
                throw new Error(
                    freshData.message || "API request failed"
                );
            }

            // STEP 3: Save Fresh Data
            try {
                await set(key, freshData, ttl);
            } catch (error) {
                console.warn("Cache save error:", error);
            }

            // STEP 4: Update UI
            render(freshData, {
                source: "network",
                isFresh: true
            });

            return {
                data: freshData,
                source: "network"
            };

        } catch (error) {

            console.warn("Background refresh failed:", error);

            if (cachedData === null && options.onError) {
                options.onError(error);
            }

            return {
                data: cachedData,
                source: cachedData ? "cache" : "none",
                error: error
            };
        }
    }

    // Public API
    window.PublicCache = Object.freeze({

        load: load,
        get: get,
        set: set,
        remove: remove,

        invalidate: remove,

        invalidateByPrefix: removeByPrefix

    });

})();