import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function check() {
  const snap = await db.collection('municipalities').limit(1).get();
  if (snap.empty) {
    console.log('Collection municipalities is empty');
  } else {
    snap.forEach(doc => {
      console.log('Doc ID:', doc.id);
      console.log('Data:', JSON.stringify(doc.data(), null, 2));
    });
  }
}

check().catch(console.error);
