import admin from "firebase-admin";

// Initialize Firebase Admin SDK only if not already initialized
if (!admin.apps || admin.apps.length == 0) {
  admin.initializeApp();
}

export default admin;
